'use client'

import { useMemo, useState } from "react";
import { Pencil, Search, Trash2, UserPlus } from "lucide-react";
import { Panel, RoleBadge, TableShell } from "@/components/owner/widgets";
import {
  addStaff,
  deactivateStaffProfile,
  getProfiles,
  updateStaffProfile,
  type StaffProfile,
} from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

type UIRole = "Owner" | "Cashier";
interface UIRow {
  id: string;
  name: string;
  role: UIRole;
}

const FILTERS = ["All Roles", "Owner", "Cashier"] as const;
const ROLES: UIRole[] = ["Owner", "Cashier"];

const toRow = (u: StaffProfile): UIRow => ({
  id: u.id,
  name: u.full_name,
  role: u.role === "owner" ? "Owner" : "Cashier",
});
const toDbRole = (r: UIRole): "owner" | "cashier" => (r === "Owner" ? "owner" : "cashier");

const inputClass =
  "h-11 w-full rounded-xl border border-olive-900/20 bg-white px-3 text-sm text-olive-950 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none";

export interface NewStaff {
  name: string;
  email: string;
  password: string;
  role: UIRole;
}

function UserModal({
  title,
  mode,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  mode: "add" | "edit";
  initial: { name: string; email: string; role: UIRole };
  onClose: () => void;
  onSave: (user: NewStaff) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UIRole>(initial.role);
  const [error, setError] = useState<string | null>(null);

  function save() {
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Full name is required.");
      return;
    }
    if (mode === "add") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())) {
        setError("Enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        setError("Temporary password must be at least 6 characters.");
        return;
      }
    }
    onSave({ name: cleanName, email: email.trim().toLowerCase(), password, role });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-olive-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-cream-50 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-olive-950">{title}</h2>
        <div className="mt-4 flex flex-col gap-3.5">
          <div>
            <label htmlFor="user-name" className="mb-1 block text-[13px] font-semibold text-olive-950">
              Full Name
            </label>
            <input
              id="user-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="e.g. Juan Dela Cruz"
              autoComplete="name"
              className={inputClass}
            />
          </div>
          {mode === "add" ? (
            <>
              <div>
                <label htmlFor="user-email" className="mb-1 block text-[13px] font-semibold text-olive-950">
                  Email
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="name@example.com…"
                  autoComplete="email"
                  spellCheck={false}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="user-password" className="mb-1 block text-[13px] font-semibold text-olive-950">
                  Temporary Password
                </label>
                <input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="6+ characters"
                  autoComplete="new-password"
                  className={inputClass}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-stone-500">
              Email lives in Supabase Auth and can&apos;t change here.
            </p>
          )}
          <div>
            <label htmlFor="user-role" className="mb-1 block text-[13px] font-semibold text-olive-950">
              Role
            </label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UIRole)}
              className={`${inputClass} cursor-pointer`}
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone-500">
              {role === "Owner" && "Full access, including user management."}
              {role === "Cashier" && "Takes orders and views stock. No management access."}
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>
          ) : null}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 cursor-pointer rounded-xl border border-olive-700 font-bold text-olive-800 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="h-11 flex-1 cursor-pointer rounded-xl bg-olive-700 font-bold text-cream-50 transition-colors hover:bg-olive-800 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Save User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ModalState =
  | { kind: "add" }
  | { kind: "edit"; user: UIRow }
  | { kind: "remove"; user: UIRow }
  | null;

function ConfirmModal({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={`Remove ${name}`}
      aria-describedby="remove-desc"
      className="fixed inset-0 z-50 grid place-items-center bg-olive-950/60 p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-sm rounded-3xl bg-cream-50 p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-100 text-red-700" aria-hidden="true">
          <Trash2 className="size-6" />
        </span>
        <h2 className="mt-3 text-lg font-bold text-olive-950">Remove {name}?</h2>
        <p id="remove-desc" className="mt-1 text-sm text-stone-500">
          They lose app access immediately. Their past orders stay in history. Reversible in SQL.
        </p>
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="h-11 flex-1 cursor-pointer rounded-xl border border-olive-700 font-bold text-olive-800 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 flex-1 cursor-pointer rounded-xl bg-red-600 font-bold text-white transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export function UsersClient({ initial, selfId }: { initial: StaffProfile[]; selfId: string }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<(typeof FILTERS)[number]>("All Roles");
  const [rows, setRows] = useState<UIRow[]>(initial.map(toRow));
  const [modal, setModal] = useState<ModalState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(
    () =>
      rows.filter(
        (u) =>
          (role === "All Roles" || u.role === role) &&
          u.name.toLowerCase().includes(query.toLowerCase())
      ),
    [query, role, rows]
  );

  async function refresh(message: string) {
    const { data, error } = await getProfiles();
    if (error || !data) {
      setNotice(error ?? "Could not reload users.");
      return;
    }
    setRows(data.map(toRow));
    setModal(null);
    setNotice(message);
  }

  async function handleAdd(user: NewStaff) {
    if (busy) return;
    setBusy(true);
    const { error } = await addStaff({
      email: user.email,
      password: user.password,
      full_name: user.name,
      role: toDbRole(user.role),
    });
    setBusy(false);
    if (error) {
      setNotice(error);
      return;
    }
    await refresh(`${user.name} added as ${user.role}.`);
  }

  async function handleRemove() {
    if (busy || modal?.kind !== "remove") return;
    setBusy(true);
    const { error } = await deactivateStaffProfile(modal.user.id);
    setBusy(false);
    if (error) {
      setNotice(error);
      return;
    }
    await refresh(`${modal.user.name} removed.`);
  }

  async function handleEdit(updated: NewStaff) {
    if (busy || modal?.kind !== "edit") return;
    const target = modal.user;
    if (target.id === selfId && toDbRole(updated.role) !== toDbRole(target.role)) {
      setNotice("You cannot change your own role — ask another owner.");
      return;
    }
    setBusy(true);
    const { error } = await updateStaffProfile(target.id, {
      full_name: updated.name,
      role: toDbRole(updated.role),
    });
    setBusy(false);
    if (error) {
      setNotice(error);
      return;
    }
    await refresh(`${updated.name}'s details updated.`);
  }

  return (
    <div className="flex flex-col gap-4">
      {notice ? (
        <p role="status" className="rounded-2xl bg-olive-100 px-4 py-2.5 text-sm font-semibold text-olive-800">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search user…"
            aria-label="Search users"
            className="h-10 w-full rounded-xl border border-olive-900/20 bg-white pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
          />
        </div>
        <button
          type="button"
          className="h-10 cursor-pointer rounded-xl bg-olive-950 px-4 text-sm font-bold text-cream-50 transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          ⌕ Search
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by role">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setRole(f)}
              aria-pressed={role === f}
              className={cn(
                "h-9 cursor-pointer rounded-lg border px-3.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none",
                role === f
                  ? "border-olive-950 bg-olive-950 text-cream-50"
                  : "border-olive-900/25 bg-cream-50 text-olive-900 hover:bg-olive-100"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setNotice(null); setModal({ kind: "add" }); }}
          className="ml-auto flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-olive-950 px-4 text-sm font-bold text-cream-50 transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <UserPlus className="size-4" aria-hidden="true" /> Add User
        </button>
      </div>

      <Panel className="p-3 sm:p-5">
        {visible.length === 0 ? (
          <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-stone-500">
            No users match the current search or role filter.
          </p>
        ) : (
          <TableShell headers={["User Name", "Role", "Action"]}>
            {visible.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-cream-100/70">
                <td className="px-4 py-2.5 font-semibold whitespace-nowrap text-olive-950">
                  ○ {u.name}
                  {u.id === selfId ? <span className="ml-2 text-xs font-medium text-stone-400">(you)</span> : null}
                </td>
                <td className="px-4 py-2.5">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Edit ${u.name}`}
                      onClick={() => { setNotice(null); setModal({ kind: "edit", user: u }); }}
                      className="grid size-8 cursor-pointer place-items-center rounded-lg bg-olive-200/70 text-olive-800 transition-colors hover:bg-olive-300 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${u.name}`}
                      onClick={() => { setNotice(null); setModal({ kind: "remove", user: u }); }}
                      className="grid size-8 cursor-pointer place-items-center rounded-lg bg-red-200/70 text-red-700 transition-colors hover:bg-red-300 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </TableShell>
        )}
        <p className="mt-3 text-center text-xs text-stone-400">
          Removing a user happens in Supabase Dashboard → Authentication (deletes login + profile).
        </p>
      </Panel>

      {modal?.kind === "add" ? (
        <UserModal
          title="Add User"
          mode="add"
          initial={{ name: "", email: "", role: "Cashier" }}
          onClose={() => setModal(null)}
          onSave={handleAdd}
        />
      ) : null}
      {modal?.kind === "edit" ? (
        <UserModal
          title={`Edit ${modal.user.name}`}
          mode="edit"
          initial={{ name: modal.user.name, email: "", role: modal.user.role }}
          onClose={() => setModal(null)}
          onSave={handleEdit}
        />
      ) : null}
      {modal?.kind === "remove" ? (
        <ConfirmModal name={modal.user.name} onClose={() => setModal(null)} onConfirm={handleRemove} />
      ) : null}
    </div>
  );
}
