import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The console is a live demo, not indexable content. The reports are one
      // tenant's warranty documents.
      disallow: ["/console", "/login", "/report/", "/api/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
