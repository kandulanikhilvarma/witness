import type { Metadata } from "next";

/**
 * One place for the canonical origin, the per-page metadata shape, and the
 * structured data. Search engines read the JSON-LD; answer engines read it and
 * the plain prose around it. Both want the same facts, stated once.
 */
export const SITE = "https://witness-kandula.vercel.app";

export const APP_ID = `${SITE}/#app`;
export const MAKER_ID = `${SITE}/#maker`;

interface PageMetaInput {
  title: string;
  description: string;
  /** Route path with a leading slash, "/taxonomy". */
  path: string;
  keywords?: string[];
  /** Reference pages that should not be indexed, sign-in and per-record reports. */
  noindex?: boolean;
}

/**
 * Per-page metadata. The canonical URL is the point: without it every page
 * inherits the root canonical from the layout and the reference pages compete
 * with the landing page for the same query.
 */
export function pageMeta({ title, description, path, keywords, noindex }: PageMetaInput): Metadata {
  const url = `${SITE}${path}`;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      url,
      siteName: "Witness",
      title: `${title} · Witness`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · Witness`,
      description,
    },
  };
}

/** Emits one JSON-LD graph. Server component, no client cost. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Trail from the landing page to the current page. */
export function breadcrumb(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Witness", path: "/" }, ...trail].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE}${item.path}`,
    })),
  };
}

/**
 * A controlled vocabulary, which is what an ISO failure catalogue is. Naming it
 * as one lets a search or answer engine cite a single clause rather than the
 * whole page.
 */
export function definedTermSet(opts: {
  id: string;
  name: string;
  description: string;
  path: string;
  terms: { code: string; label: string; description: string }[];
}) {
  return {
    "@type": "DefinedTermSet",
    "@id": `${SITE}${opts.path}#${opts.id}`,
    name: opts.name,
    description: opts.description,
    url: `${SITE}${opts.path}`,
    hasDefinedTerm: opts.terms.map((t) => ({
      "@type": "DefinedTerm",
      termCode: t.code,
      name: t.label,
      description: t.description,
      inDefinedTermSet: `${SITE}${opts.path}#${opts.id}`,
    })),
  };
}

/** Question and answer pairs, verbatim from the page prose. */
export function faqPage(qa: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: qa.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/** Wraps a set of nodes as one graph, with the shared app and maker references. */
export function graph(nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/** The article shape for a documentation page, attributed to the maker. */
export function techArticle(opts: {
  headline: string;
  description: string;
  path: string;
  section: string;
}) {
  return {
    "@type": "TechArticle",
    headline: opts.headline,
    description: opts.description,
    url: `${SITE}${opts.path}`,
    articleSection: opts.section,
    inLanguage: "en",
    isPartOf: { "@id": APP_ID },
    author: { "@id": MAKER_ID },
    publisher: { "@id": MAKER_ID },
  };
}
