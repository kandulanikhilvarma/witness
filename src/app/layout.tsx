import type { Metadata, Viewport } from "next";
import { Metamorphous, Jost, Cabin, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";

// next/font downloads and self-hosts these at build time. The browser never
// requests a font CDN. All are OFL.

// Display. Metamorphous is an engraved, high-contrast display face: pointed
// serifs and a stamped, nameplate character. It carries the brand headings and
// the wordmark. It is a single weight, so hierarchy comes from size, not weight.
const metamorphous = Metamorphous({
  variable: "--font-metamorphous",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

// Technical labels. Jost is a geometric sans in the Futura/Kabel line: circular
// bowls, near-monoline strokes. It labels the drawings and gauges, where the
// display face would be too ornate to read at small sizes.
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Body. Cabin sits in the humanist tradition of Edward Johnston and Eric Gill:
// open apertures, a warm axis, high legibility at small sizes. That is the whole
// job here, dense tables, long clause names, a bench light that is never as good
// as the design studio's.
const cabin = Cabin({
  variable: "--font-cabin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Data. The requirement that actually matters: unambiguous 0/O and 1/l/I in
// batch codes, part numbers, and ISO clause numbers.
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

// Editorial. Used only for pull quotes and the standards commentary, where the
// page stops being an interface and starts being a document.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const SITE = "https://witness-kandula.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Witness, read the damage, name the cause",
    template: "%s · Witness",
  },
  description:
    "Defect intelligence for rotating equipment. Photographs of returned gearbox parts become ISO 15243 and ISO 10825 failure records, linked to the batch that produced them.",
  applicationName: "Witness",
  keywords: [
    "ISO 15243",
    "ISO 10825",
    "bearing failure analysis",
    "gear failure analysis",
    "rotating equipment",
    "defect intelligence",
    "warranty analysis",
    "anomaly detection",
    "PatchCore",
    "condition monitoring",
  ],
  authors: [{ name: "Nikhilvarma Kandula", url: "https://kandula.studio" }],
  creator: "Nikhilvarma Kandula",
  publisher: "Kandula Studio",
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Witness",
    url: SITE,
    title: "Witness, read the damage, name the cause",
    description:
      "Photographs of returned gearbox parts become ISO 15243 and ISO 10825 failure records, linked to the batch that produced them.",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Witness, read the damage, name the cause",
    description:
      "Defect intelligence for rotating equipment. ISO 15243 and ISO 10825 failure records, linked to the batch that produced them.",
    creator: "@kandulanikhil",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f2ea",
  colorScheme: "light",
};

// Structured data. A JSON-LD graph so search engines and answer engines (GEO)
// can state what Witness is, what standards it uses, and who makes it, without
// scraping the prose. Kept in one graph so the entities cross-reference.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE}/#app`,
      name: "Witness",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE,
      description:
        "Defect intelligence for rotating equipment. Photographs of returned gearbox parts become ISO 15243 and ISO 10825 failure records, linked to the batch that produced them.",
      featureList: [
        "ISO 15243 rolling-bearing damage classification",
        "ISO 10825 gear-tooth damage classification",
        "PatchCore anomaly detection",
        "Batch-linked warranty records",
        "Printable warranty report and JSON export",
      ],
      creator: { "@id": `${SITE}/#maker` },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "Person",
      "@id": `${SITE}/#maker`,
      name: "Nikhilvarma Kandula",
      url: "https://kandula.studio",
      jobTitle: "Founder and AI engineer",
      description:
        "Founder and AI engineer based in Germany who builds data systems and products.",
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${metamorphous.variable} ${jost.variable} ${cabin.variable} ${jetbrains.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
