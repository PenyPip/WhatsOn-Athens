import type { Metadata } from "next";
import "@/index.css";

export const metadata: Metadata = {
  title: "WhatSON Athens — Movies & Theater in Greece",
  description:
    "Your modern guide to movies, theater, and entertainment in Athens & Thessaloniki.",
  openGraph: {
    title: "WhatSON Athens — Movies & Theater",
    description:
      "Your modern guide to movies, theater, and entertainment in Athens & Thessaloniki.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el">
      <body className="antialiased">{children}</body>
    </html>
  );
}
