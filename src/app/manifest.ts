import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Solva HR",
    short_name: "Solva HR",
    description: "Installable payroll and HR workspace for Solva HR tenants and employee ESS users.",
    start_url: "/login",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui", "browser"],
    background_color: "#f5f8ff",
    theme_color: "#1d4ed8",
    orientation: "portrait",
    icons: [
      {
        src: "/tenant-logos/solva-hr-logo.jpg",
        sizes: "192x192",
        type: "image/jpeg",
      },
      {
        src: "/tenant-logos/solva-hr-logo.jpg",
        sizes: "512x512",
        type: "image/jpeg",
      },
    ],
  };
}
