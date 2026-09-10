import type { Metadata } from "next";
import {
  Space_Grotesk,
  Archivo,
  JetBrains_Mono,
  Fraunces,
} from "next/font/google";
import "./globals.css";

// next/font downloads and self-hosts these at build time. The browser never
// requests a font CDN. All four are OFL.

// Display. Space Grotesk carries the drawing-office character the product wants
// — squared terminals, a single-storey g, tight apertures — without the novelty
// that would date a tool meant to be read every shift.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Body. Archivo is a grotesque drawn for high performance at small sizes, which
// is the whole job here: dense tables, long clause names, a bench light that is
// never as good as the design studio's.
const archivo = Archivo({
  variable: "--font-archivo",
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

export const metadata: Metadata = {
  title: {
    default: "Witness — read the damage, name the cause",
    template: "%s · Witness",
  },
  description:
    "Defect intelligence for rotating equipment. Photographs of returned gearbox parts become ISO 15243 and ISO 10825 failure records, linked to the batch that produced them.",
  applicationName: "Witness",
  authors: [{ name: "Nikhilvarma Kandula", url: "https://kandula.studio" }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${archivo.variable} ${jetbrains.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
