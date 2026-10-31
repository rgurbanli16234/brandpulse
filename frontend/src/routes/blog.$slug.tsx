import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { formatDate } from "@/i18n/format";
import enBlog from "@/locales/en/blog.json";
import { getPost, POSTS } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  // English fallback for the prerendered HTML; `useDocumentMeta` replaces it with
  // the active language as soon as the app mounts.
  head: ({ params }) => {
    const post = getPost(params.slug);
    return {
      meta: [
        {
          title: post
            ? `${enBlog.items[post.slug].title} — BrandPulse Blog`
            : "Article not found — BrandPulse",
        },
        {
          name: "description",
          content: post
            ? enBlog.items[post.slug].summary
            : "This BrandPulse blog article could not be found.",
        },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { t } = useTranslation("blog");
  const { slug } = Route.useParams();
  const post = getPost(slug);

  // i18next's typed keys do not enumerate array items, so paragraph lookups take
  // a plain string path. Every other string on this page stays type-checked.
  const translateParagraph = (key: string): string =>
    (t as unknown as (path: string) => string)(key);

  if (!post) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <main className="mx-auto max-w-2xl px-6 pb-24 pt-40 text-center md:px-10">
          <h1 className="text-3xl font-serif">{t("post.notFoundTitle")}</h1>
          <p className="mt-4 text-muted-foreground">{t("post.notFoundBody")}</p>
          <Link
            to="/blog"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("post.backToIndex")}
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const others = POSTS.filter((item) => item.slug !== post.slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 pb-20 pt-32 md:px-10">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("post.backToBlog")}
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <time dateTime={post.isoDate}>{formatDate(post.isoDate)}</time>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t("post.readTime", { count: post.readTimeMinutes })}
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-serif leading-tight md:text-4xl">
            {t(`items.${post.slug}.title`)}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">{t(`items.${post.slug}.summary`)}</p>
        </header>

        <article className="mt-10 space-y-6 text-base leading-relaxed text-foreground/80">
          {Array.from({ length: post.paragraphCount }, (_, index) => (
            <p key={index}>
              {/* Paragraphs are a JSON array; i18next resolves the index at runtime. */}
              {translateParagraph(`items.${post.slug}.paragraphs.${index}`)}
            </p>
          ))}
        </article>

        <div className="mt-14 rounded-3xl border border-border bg-card p-7">
          <h2 className="text-xl font-serif">{t("post.ctaTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("post.ctaBody")}</p>
          <Link
            to="/login"
            search={{ tab: "signup" }}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            {t("post.ctaButton")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className="mt-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("post.keepReading")}
          </h2>
          <div className="mt-5 space-y-4">
            {others.map((item) => (
              <Link
                key={item.slug}
                to="/blog/$slug"
                params={{ slug: item.slug }}
                className="block rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-panel)]"
              >
                <p className="font-semibold">{t(`items.${item.slug}.title`)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t(`items.${item.slug}.summary`)}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
