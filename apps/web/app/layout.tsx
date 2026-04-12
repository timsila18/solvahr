import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solva HRIS",
  description: "Multi-tenant HR and payroll operating system for Kenyan employers"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
