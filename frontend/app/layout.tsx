import type { Metadata, Viewport } from "next";
import { getMetadataBase, siteSeo } from "@/lib/siteMetadata";
import { dmSans, literata, unbounded } from "@/lib/fonts";
import "@/index.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: siteSeo.titleDefault,
    template: `%s · ${siteSeo.siteName}`,
  },
  description: siteSeo.description,
  keywords: [...siteSeo.keywords],
  applicationName: siteSeo.siteName,
  openGraph: {
    type: "website",
    locale: "el_GR",
    url: "/",
    siteName: siteSeo.siteName,
    title: siteSeo.titleDefault,
    description: siteSeo.description,
    images: [
      {
        url: siteSeo.ogImagePath,
        width: 1200,
        height: 630,
        alt: siteSeo.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteSeo.titleDefault,
    description: siteSeo.description,
    images: [siteSeo.ogImagePath],
  },
  icons: {
    icon: "/favicon.ico",
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
    <html lang="el" className="h-full">
      <body
        className={`${dmSans.variable} ${literata.variable} ${unbounded.variable} min-h-full antialiased max-md:overscroll-y-none`}
      >
        {children}
      </body>
    </html>
  );
}
