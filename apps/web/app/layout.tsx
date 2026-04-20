import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solva HR",
  description: "Premium Kenyan cloud HR and payroll operating system for multi-company teams",
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
