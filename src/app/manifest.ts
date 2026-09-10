import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Witness",
    short_name: "Witness",
    description:
      "Defect intelligence for rotating equipment. ISO 15243 and ISO 10825 failure records, linked to the batch that produced them.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f2ea",
    theme_color: "#f6f2ea",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
