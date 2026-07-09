import type { Metadata, Viewport } from "next";
import { getMetadataBase, siteSeo } from "@/lib/siteMetadata";
import { ROOT_CRITICAL_CSS } from "@/lib/rootCriticalCss";
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
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: "/favicon-32.png",
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
      <body className="min-h-full antialiased max-md:overscroll-y-none">
        <style dangerouslySetInnerHTML={{ __html: ROOT_CRITICAL_CSS }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=window.matchMedia("(max-width:767px)");if(!m.matches)return;var d=document.createElement("div");d.style.cssText="position:fixed;left:-9999px;bottom:0;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px)";document.documentElement.appendChild(d);var px=parseFloat(getComputedStyle(d).paddingBottom)||0;document.documentElement.removeChild(d);document.documentElement.style.setProperty("--mobile-safe-bottom-fixed",px+"px")}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
