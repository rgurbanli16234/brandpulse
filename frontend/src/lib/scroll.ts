/** Landing-page section ids that the public navigation can scroll to. */
export const SECTION_IDS = ["features", "how-it-works", "use-cases", "pricing"] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/** True when the visitor asked the OS to reduce motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Scroll a landing-page section into view. Returns false when the section is not
 * on the current page, so callers can navigate to "/" first and retry.
 */
export function scrollToSection(id: string): boolean {
  if (typeof document === "undefined") return false;
  const element = document.getElementById(id);
  if (!element) return false;
  element.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
  return true;
}
