import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proof",
  description: "A curated academic source database for student research.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
