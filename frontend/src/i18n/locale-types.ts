/**
 * Compile-time picture of the English locale files.
 *
 * These are *type-only* imports: nothing is added to the bundle. Because
 * `CustomTypeOptions.resources` is built from them, a key that exists in code but
 * not in `src/locales/en/**` fails `tsc`.
 */

import type enApp from "@/locales/en/app.json";
import type enAudiences from "@/locales/en/audiences.json";
import type enAuth from "@/locales/en/auth.json";
import type enBlog from "@/locales/en/blog.json";
import type enCommon from "@/locales/en/common.json";
import type enErrors from "@/locales/en/errors.json";
import type enLanding from "@/locales/en/landing.json";
import type enNav from "@/locales/en/nav.json";
import type enPricing from "@/locales/en/pricing.json";

export type AppResources = {
  common: typeof enCommon;
  nav: typeof enNav;
  landing: typeof enLanding;
  pricing: typeof enPricing;
  blog: typeof enBlog;
  audiences: typeof enAudiences;
  auth: typeof enAuth;
  app: typeof enApp;
  errors: typeof enErrors;
};
