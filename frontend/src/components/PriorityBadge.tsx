import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { TIER_CLASSES } from "@/lib/format";
import { PRIORITY_KEYS } from "@/lib/enums";
import type { PriorityTier } from "@/lib/api";

/** Priority tier chip (Low / Medium / High / Critical) with the shared color scale. */
export function PriorityBadge({ tier, className }: { tier: PriorityTier; className?: string }) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        TIER_CLASSES[tier],
        className,
      )}
    >
      {t(PRIORITY_KEYS[tier])}
    </span>
  );
}
