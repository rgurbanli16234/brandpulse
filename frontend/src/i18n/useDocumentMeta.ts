/**
 * Keeps `<title>` and the meta description in sync with both the current route and
 * the active language. Route `head()` values stay as the prerendered English
 * fallback; this effect replaces them as soon as the language is known.
 */

import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { isAudienceSlug } from "@/lib/audiences";
import { isBlogSlug } from "@/lib/blog";

type ResolvedMeta = { title: string; description: string };

const AUDIENCE_PATH = /^\/for\/([^/]+)$/;
const BLOG_POST_PATH = /^\/blog\/([^/]+)$/;
const THREAD_DETAIL_PATH = /^\/threads\/\d+$/;

export function useDocumentMeta(): void {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { t, i18n } = useTranslation(["common", "audiences", "blog"]);

  useEffect(() => {
    const audienceMatch = AUDIENCE_PATH.exec(pathname);
    const blogMatch = BLOG_POST_PATH.exec(pathname);

    let meta: ResolvedMeta | null = null;

    if (pathname === "/") {
      meta = { title: t("common:meta.landing.title"), description: t("common:meta.landing.description") };
    } else if (pathname === "/pricing") {
      meta = { title: t("common:meta.pricing.title"), description: t("common:meta.pricing.description") };
    } else if (pathname === "/blog") {
      meta = { title: t("common:meta.blog.title"), description: t("common:meta.blog.description") };
    } else if (blogMatch) {
      const slug = decodeURIComponent(blogMatch[1] ?? "");
      meta = isBlogSlug(slug)
        ? {
            title: t("common:meta.blogPost.title", { title: t(`blog:items.${slug}.title`) }),
            description: t("common:meta.blogPost.description", {
              summary: t(`blog:items.${slug}.summary`),
            }),
          }
        : {
            title: t("common:meta.blogMissing.title"),
            description: t("common:meta.blogMissing.description"),
          };
    } else if (audienceMatch) {
      const slug = decodeURIComponent(audienceMatch[1] ?? "");
      meta = isAudienceSlug(slug)
        ? {
            title: t("common:meta.audience.title", { label: t(`audiences:${slug}.menuLabel`) }),
            description: t("common:meta.audience.description", { intro: t(`audiences:${slug}.intro`) }),
          }
        : {
            title: t("common:meta.audienceMissing.title"),
            description: t("common:meta.audienceMissing.description"),
          };
    } else if (pathname === "/login") {
      meta = { title: t("common:meta.login.title"), description: t("common:meta.login.description") };
    } else if (pathname === "/onboarding") {
      meta = {
        title: t("common:meta.onboarding.title"),
        description: t("common:meta.onboarding.description"),
      };
    } else if (pathname === "/dashboard") {
      meta = {
        title: t("common:meta.dashboard.title"),
        description: t("common:meta.dashboard.description"),
      };
    } else if (pathname === "/mentions") {
      meta = { title: t("common:meta.mentions.title"), description: t("common:meta.mentions.description") };
    } else if (pathname === "/threads") {
      meta = { title: t("common:meta.threads.title"), description: t("common:meta.threads.description") };
    } else if (THREAD_DETAIL_PATH.test(pathname)) {
      meta = {
        title: t("common:meta.threadDetail.title"),
        description: t("common:meta.threadDetail.description"),
      };
    } else if (pathname === "/alerts") {
      meta = { title: t("common:meta.alerts.title"), description: t("common:meta.alerts.description") };
    } else if (pathname === "/playground") {
      meta = {
        title: t("common:meta.playground.title"),
        description: t("common:meta.playground.description"),
      };
    } else if (pathname === "/settings") {
      meta = { title: t("common:meta.settings.title"), description: t("common:meta.settings.description") };
    }

    if (!meta) return;

    document.title = meta.title;
    let tag = document.head.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", meta.description);
  }, [pathname, t, i18n.resolvedLanguage]);
}
