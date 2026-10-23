import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GGM Retailer Manager",
  description: "Retailer relationship management and field follow-up.",
  applicationName: "GGM Retailer Manager",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/web/favicon.ico", type: "image/x-icon", sizes: "any" },
      { url: "/icons/web/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/web/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/web/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "GGM Retailer Manager",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080807",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
