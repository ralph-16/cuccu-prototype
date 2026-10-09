-- ============================================================
-- CUCCU-POS: cash-only Supabase-direct backend fixes (001)
-- Run ONCE in Supabase Dashboard -> SQL Editor -> New query.
-- Safe to re-run: all statements are CREATE OR REPLACE / CREATE IF NOT EXISTS
-- style guards, touches no seed data.
--
-- What this fixes (Supabase-direct, PayMongo skipped):
--   1. Data API exposure: explicit GRANTs for anon/authenticated
--      (required since 2026-04-28 breaking change: new tables in public
--      are NO LONGER exposed to the Data API by default; enforced all
--      projects 2026-10-30).
--   2. FK indexes: Postgres does not auto-index FK columns. Without these,
--      JOINs + ON DELETE CASCADE scan full tables.
--   3. RLS performance: wrap auth.uid() in (select auth.uid()) so the
--      function is evaluated once, not per-row.
--   4. Trigger hardening: inventory functions run as the order-completing
--      user (cashier). They INSERT into owner-only inventory_transactions
--      and UPDATE ingredients, so they MUST be SECURITY DEFINER with
--      fixed search_path. Includes quantity guards + negative-stock guard.
--   5. Cash-only constraint note: orders.payment_method CHECK already
--      allows cash/gcash/maya. Frontend restricts to cash while PayMongo
--      is skipped; no DB change needed.
--
-- Verify after running (as owner):
--   SELECT * FROM public.get_sales_summary();
-- ============================================================

-- ------------------------------------------------------------
-- 0. Performance: get_user_role() — evaluate auth.uid() once
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role
    FROM public.profiles
    WHERE id = (select auth.uid());
$$;

-- ------------------------------------------------------------
-- 1. Data API exposure (explicit grants; RLS still enforces rows)
-- ------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT SELECT ON public.addons TO anon, authenticated;
GRANT SELECT ON public.ingredients TO anon, authenticated;
GRANT SELECT ON public.recipes TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_item_addons TO authenticated;
GRANT SELECT ON public.orders TO anon;
GRANT SELECT ON public.order_items TO anon;
GRANT SELECT ON public.order_item_addons TO anon;

-- Profiles: readable by owner policy + self policy; grant table access,
-- RLS decides rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Inventory ledger: owner-only via RLS; grant table access so RLS can run.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;

-- Payments table stays (PayMongo skipped, cash-only for now). Keep grants
-- so the later Edge Function can reuse update_payment_status without a new
-- migration; RLS keeps cashiers from reading other rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;

-- Identity sequences for inserts via Data API
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ------------------------------------------------------------
-- 2. FK indexes (Postgres does not auto-index FK columns)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_variant_id ON public.recipes(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_id ON public.recipes(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ingredient_id ON public.inventory_transactions(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_orders_profile_id ON public.orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_item_addons_order_item_id ON public.order_item_addons(order_item_id);
CREATE INDEX IF NOT EXISTS idx_item_addons_addon_id ON public.order_item_addons(addon_id);
-- payments indexes already exist in master (order_id, status); keep idempotent:
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
-- profiles role lookup used by every RLS policy via get_user_role():
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ------------------------------------------------------------
-- 3. Trigger hardening: stock ledger (SECURITY DEFINER required)
--
-- Why DEFINER here (not the usual INVOKER rule): these are trigger
-- functions, not direct API endpoints. A cashier completing a cash order
-- fires deduct_inventory_for_completed_order(), which must INSERT into
-- the owner-only inventory_transactions ledger and UPDATE ingredients.
-- No RLS policy can allow that without letting cashiers forge ledger
-- rows directly. DEFINER + fixed search_path + quantity guards is the
-- narrowest correct pattern. These functions return TRIGGER so they are
-- NOT callable via supabase.rpc() / PostgREST.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_ingredient_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_stock numeric;
BEGIN
    IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'inventory quantity must be > 0 (got %)', NEW.quantity;
    END IF;

    IF NEW.transaction_type = 'stock_in' THEN
        UPDATE public.ingredients
        SET stock_quantity = stock_quantity + NEW.quantity
        WHERE id = NEW.ingredient_id
        RETURNING stock_quantity INTO v_new_stock;

    ELSIF NEW.transaction_type = 'stock_out' THEN
        UPDATE public.ingredients
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.ingredient_id
        RETURNING stock_quantity INTO v_new_stock;

        IF v_new_stock IS NULL THEN
            RAISE EXCEPTION 'ingredient id % not found', NEW.ingredient_id;
        END IF;
        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'insufficient stock for ingredient id % (would be %)', NEW.ingredient_id, v_new_stock;
        END IF;

    ELSIF NEW.transaction_type = 'adjustment' THEN
        -- Adjustment rows are audit-only; stock corrections must be new
        -- stock_in/stock_out rows so history stays append-only.
        NULL;
    ELSE
        RAISE EXCEPTION 'invalid transaction_type: %', NEW.transaction_type;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_ingredient_stock ON public.inventory_transactions;
CREATE TRIGGER trigger_update_ingredient_stock
AFTER INSERT ON public.inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_ingredient_stock();

CREATE OR REPLACE FUNCTION public.deduct_inventory_for_completed_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only run on transition INTO completed (not every update)
    IF NEW.order_status = 'completed'
       AND OLD.order_status IS DISTINCT FROM 'completed' THEN

        INSERT INTO public.inventory_transactions (
            ingredient_id,
            transaction_type,
            quantity,
            reference_type,
            reference_id,
            notes
        )
        SELECT
            r.ingredient_id,
            'stock_out',
            r.quantity * oi.quantity,
            'ORDER',
            NEW.id,
            'Automatic deduction for completed order #' || NEW.id
        FROM public.order_items oi
        JOIN public.recipes r
            ON r.product_variant_id = oi.product_variant_id
        WHERE oi.order_id = NEW.id;

    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_deduct_inventory_on_completed_order ON public.orders;
CREATE TRIGGER trigger_deduct_inventory_on_completed_order
AFTER UPDATE OF order_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.deduct_inventory_for_completed_order();

-- ------------------------------------------------------------
-- 4. Quick self-checks (run manually after applying)
-- ------------------------------------------------------------
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public' ORDER BY tablename;
-- SELECT * FROM public.get_sales_summary();
-- -- Cash order smoke test (as cashier JWT, via app — NOT raw SQL):
-- -- 1. INSERT orders (pending, cash) 2. INSERT order_items
-- -- 3. UPDATE orders SET order_status='completed'
-- -- 4. SELECT * FROM inventory_transactions WHERE reference_type='ORDER' ORDER BY id DESC LIMIT 5;
