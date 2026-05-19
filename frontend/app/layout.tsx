import type { Metadata } from "next";
import "@/index.css";

export const metadata: Metadata = {
  title: "37Ν",
  description:
    "Your modern guide to movies, theater, and entertainment in Athens & Thessaloniki.",
  openGraph: {
    title: "37Ν",
    description:
      "Your modern guide to movies, theater, and entertainment in Athens & Thessaloniki.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  other: {
    "google-adsense-account": "ca-pub-8631379283489562",
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
