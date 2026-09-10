import type { MetadataRoute } from "next";

const SITE = "https://witness-kandula.vercel.app";

// Public, unauthenticated routes only. The console lives behind sign-in and is
// not a search target.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, freq: "monthly" },
    { path: "/about", priority: 0.9, freq: "monthly" },
    { path: "/taxonomy", priority: 0.8, freq: "monthly" },
    { path: "/transparency", priority: 0.7, freq: "yearly" },
    { path: "/model-card", priority: 0.7, freq: "monthly" },
  ];
  return routes.map((r) => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
