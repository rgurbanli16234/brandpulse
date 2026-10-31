import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLanguage } from "@/i18n";
import { LANGUAGES, LANGUAGE_CODES, normalizeLanguage, type Language } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** Literal keys keep the translation keys type-checked. */
const LANGUAGE_NAME_KEYS = {
  en: "language.names.en",
  az: "language.names.az",
  ru: "language.names.ru",
} as const;

/** The language i18next is currently rendering. */
export function useLanguage(): Language {
  const { i18n } = useTranslation();
  return normalizeLanguage(i18n.resolvedLanguage) ?? normalizeLanguage(i18n.language) ?? "en";
}

/**
 * EN / AZ / RU switcher. Switching downloads the missing locale chunks first and
 * then re-renders in place: the route, the scroll position and the filters stay
 * exactly where they were, and the choice is persisted.
 */
export function LanguageSwitcher({
  className,
  align = "end",
}: {
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={t("language.current", { language: t(LANGUAGE_NAME_KEYS[language]) })}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span>{LANGUAGE_CODES[language]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[11rem]">
        <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={language}
          onValueChange={(value) => {
            const next = normalizeLanguage(value);
            if (next) void setLanguage(next);
          }}
        >
          {LANGUAGES.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} className="cursor-pointer">
              <span className="truncate">{t(LANGUAGE_NAME_KEYS[code])}</span>
              <span className="ml-auto pl-3 text-xs font-semibold tracking-widest text-muted-foreground">
                {LANGUAGE_CODES[code]}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Inline radio list of the three languages. Used where a dropdown would be
 * awkward — the mobile menu and the settings page.
 */
export function LanguageOptions({ className }: { className?: string }) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("language.switchLabel")}
      className={cn("flex flex-col gap-1", className)}
    >
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={language === code}
          onClick={() => void setLanguage(code)}
          className={cn(
            "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-secondary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            language === code ? "text-primary" : "text-foreground/80",
          )}
        >
          <span>{t(LANGUAGE_NAME_KEYS[code])}</span>
          <span className="text-xs font-bold tracking-widest text-muted-foreground">
            {LANGUAGE_CODES[code]}
          </span>
        </button>
      ))}
    </div>
  );
}
