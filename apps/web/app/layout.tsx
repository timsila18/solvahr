import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solva HR",
  description: "Multi-tenant HR and payroll operating system for Kenyan employers",
  icons: {
    icon: "/brand/solva-hr-app-icon.svg",
    shortcut: "/brand/solva-hr-app-icon.svg",
    apple: "/brand/solva-hr-app-icon.svg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
