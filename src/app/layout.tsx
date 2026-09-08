import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Archivo_Narrow,
  JetBrains_Mono,
  Newsreader,
} from "next/font/google";
import "./globals.css";

// next/font downloads and self-hosts these at build time. The browser never
// requests a font CDN. All four are OFL.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const archivoNarrow = Archivo_Narrow({
  variable: "--font-archivo-narrow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Substituted for Commit Mono, which is OFL but not distributed via Google
// Fonts. JetBrains Mono keeps the type stack on one mechanism and satisfies the
// requirement that actually matters here: unambiguous 0/O and 1/l/I in batch
// codes and ISO clause numbers.
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
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
      className={`${bricolage.variable} ${archivoNarrow.variable} ${jetbrains.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
