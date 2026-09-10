import type { MetadataRoute } from "next";

const SITE = "https://witness-kandula.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The console is a live demo, not indexable content.
      disallow: ["/console", "/login", "/api/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
