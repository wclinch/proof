import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proof",
  description: "Curated academic sources for students. Real, cited, nothing filler.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
