import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Solva HR",
    short_name: "Solva HR",
    description: "Installable payroll and HR workspace for Solva HR tenants and employee ESS users.",
    start_url: "/login",
    scope: "/",
    lang: "en-KE",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui", "browser"],
    background_color: "#f5f8ff",
    theme_color: "#1d4ed8",
    orientation: "portrait",
    categories: ["business", "productivity", "finance"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/pwa-icons/solva-hr-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pwa-icons/solva-hr-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
