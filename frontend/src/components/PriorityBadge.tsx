import { cn } from "@/lib/utils";
import { TIER_CLASSES } from "@/lib/format";
import type { PriorityTier } from "@/lib/api";

/** Priority tier chip (Low / Medium / High / Critical) with the shared color scale. */
export function PriorityBadge({ tier, className }: { tier: PriorityTier; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        TIER_CLASSES[tier],
        className,
      )}
    >
      {tier}
    </span>
  );
}
