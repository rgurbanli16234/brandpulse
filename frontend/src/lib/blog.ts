import type { AppResources } from "@/i18n/locale-types";

export type BlogSlug = keyof AppResources["blog"]["items"];

export type BlogPost = {
  slug: BlogSlug;
  /** ISO date used for the <time> element and formatted with Intl for display. */
  isoDate: string;
  readTimeMinutes: number;
  paragraphCount: number;
};

/**
 * Three short placeholder articles. Titles, summaries and paragraphs live under
 * `blog:items.<slug>` in every language; this file only keeps the stable codes so
 * the URLs stay in English. No invented authors, customers or statistics.
 */
export const POSTS: BlogPost[] = [
  {
    slug: "complaints-you-never-see",
    isoDate: "2026-02-12",
    readTimeMinutes: 4,
    paragraphCount: 4,
  },
  {
    slug: "first-hour-of-a-viral-complaint",
    isoDate: "2026-02-26",
    readTimeMinutes: 5,
    paragraphCount: 5,
  },
  {
    slug: "answering-an-angry-review",
    isoDate: "2026-03-09",
    readTimeMinutes: 4,
    paragraphCount: 5,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((post) => post.slug === slug);
}

/** Narrows a raw route param to one of the known article slugs. */
export function isBlogSlug(value: string): value is BlogSlug {
  return POSTS.some((post) => post.slug === value);
}
