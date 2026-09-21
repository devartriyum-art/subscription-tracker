import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Abonelik Takip",
  description: "artriyum abonelik ve lisans takip paneli",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
