import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Idan & Gurdeep's Wedding",
    short_name: "Our Night!",
    description: "Capture and share wedding memories together.",
    start_url: "/welcome",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/app_icon.jpg",
        sizes: "1200x1200",
        type: "image/jpeg",
      },
    ],
  };
}
