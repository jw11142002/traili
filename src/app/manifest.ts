import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "traili",
    short_name: "traili",
    description: "Rank the hikes you've done. Friends only.",
    start_url: "/home",
    display: "standalone",
    background_color: "#f8f7f3",
    theme_color: "#3f6b4f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
