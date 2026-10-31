import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { POSTS } from "@/lib/blog";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — BrandPulse" },
      {
        name: "description",
        content:
          "Short, practical notes on complaint monitoring for small businesses: finding hidden complaints, handling a viral complaint and answering angry reviews.",
      },
    ],
  }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-10">
        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Blog
          </p>
          <h1 className="mt-4 text-4xl font-serif leading-tight md:text-5xl">
            Notes on listening to customers
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Short reads for people who handle customer feedback themselves. Three placeholder
            articles that show how the blog is structured.
          </p>
        </header>

        <div className="mt-14 space-y-6">
          {POSTS.map((post) => (
            <article
              key={post.slug}
              className="group rounded-3xl border border-border bg-card p-7 transition-shadow hover:shadow-[var(--shadow-panel)]"
            >
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <time dateTime={post.isoDate}>{post.date}</time>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readTime}
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-serif leading-snug">
                <Link to="/blog/$slug" params={{ slug: post.slug }} className="hover:text-primary">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 text-muted-foreground">{post.summary}</p>
              <Link
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                Read the article
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
