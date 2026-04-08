import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proof",
  description: "Vetted academic sources powered by real educators.",
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
