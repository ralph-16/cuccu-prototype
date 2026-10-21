import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/cuccupos-logo.svg";

/**
 * Bare olive CuccuPOS mark for light/cream surfaces (login card, empty states).
 * The SVG ships with a transparent background, so it sits on any tint.
 */
export function LogoImage({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src={LOGO_SRC}
      alt="CuccuPOS"
      width={448}
      height={448}
      priority={priority}
      className={cn("size-11", className)}
    />
  );
}

/** Cream rounded-square badge holding the mark — for the olive sidebar. */
export function LogoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-2xl bg-cream-50 shadow-[0_2px_10px_rgba(0,0,0,0.22)]",
        className
      )}
    >
      <Image src={LOGO_SRC} alt="" width={448} height={448} className="size-[30px]" aria-hidden="true" />
    </span>
  );
}

/** "CuccuPOS" wordmark: cream "Cuccu" + dark-olive "POS", matching the reference. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[26px] leading-none font-bold tracking-tight text-cream-50", className)}>
      Cuccu<span className="text-olive-950">POS</span>
    </span>
  );
}

/** Full sidebar lockup: badge + wordmark, linked home. */
export function Logo({
  href = "/dashboard",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)} aria-label="CuccuPOS home">
      <LogoBadge />
      {!compact && <Wordmark />}
    </Link>
  );
}
