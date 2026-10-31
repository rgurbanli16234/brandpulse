import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { getPost, POSTS } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const post = getPost(params.slug);
    return {
      meta: [
        { title: post ? `${post.title} — BrandPulse Blog` : "Article not found — BrandPulse" },
        {
          name: "description",
          content: post ? post.summary : "This BrandPulse blog article could not be found.",
        },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { slug } = Route.useParams();
  const post = getPost(slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <main className="mx-auto max-w-2xl px-6 pb-24 pt-40 text-center md:px-10">
          <h1 className="text-3xl font-serif">We could not find that article</h1>
          <p className="mt-4 text-muted-foreground">
            The link may be out of date. The blog index has everything we have published.
          </p>
          <Link
            to="/blog"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to the blog
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
          All articles
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <time dateTime={post.isoDate}>{post.date}</time>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {post.readTime}
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-serif leading-tight md:text-4xl">{post.title}</h1>
          <p className="mt-5 text-lg text-muted-foreground">{post.summary}</p>
        </header>

        <article className="mt-10 space-y-6 text-base leading-relaxed text-foreground/80">
          {post.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </article>

        <div className="mt-14 rounded-3xl border border-border bg-card p-7">
          <h2 className="text-xl font-serif">Want this working on your own mentions?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The prototype is free to use with demo data — no payment is taken.
          </p>
          <Link
            to="/login"
            search={{ tab: "signup" }}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Sign up free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className="mt-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Keep reading
          </h2>
          <div className="mt-5 space-y-4">
            {others.map((item) => (
              <Link
                key={item.slug}
                to="/blog/$slug"
                params={{ slug: item.slug }}
                className="block rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-panel)]"
              >
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
