import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { LiveBackground } from "@/components/LiveBackground";
import { Interactions } from "@/components/Interactions";
import { SITE_URL } from "@/lib/site";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AutoBD — Multi-Pillar Car Marketplace for Bangladesh",
    template: "%s · AutoBD",
  },
  description:
    "AutoBD is Bangladesh's multi-pillar car marketplace: buy new, used, and Japanese reconditioned cars, book service and modifications, and see the full landed cost with NBR import duty — all in one place.",
  applicationName: "AutoBD",
  keywords: [
    "AutoBD",
    "car marketplace Bangladesh",
    "used cars Bangladesh",
    "reconditioned cars Bangladesh",
    "Japanese car import Bangladesh",
    "new cars BD",
    "car auction Bangladesh",
    "landed cost calculator",
    "BRTA",
    "NBR import duty",
  ],
  openGraph: {
    type: "website",
    siteName: "AutoBD",
    title: "AutoBD — Multi-Pillar Car Marketplace for Bangladesh",
    description:
      "Buy new, used, and Japanese reconditioned cars in Bangladesh with transparent landed cost.",
    images: ["/landing/hero-car.png"],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoBD — Multi-Pillar Car Marketplace for Bangladesh",
    description:
      "Buy new, used, and Japanese reconditioned cars in Bangladesh with transparent landed cost.",
    images: ["/landing/hero-car.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // Set GOOGLE_SITE_VERIFICATION in Vercel to verify the site in Search Console.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

// Applied before paint so the stored theme doesn't flash the wrong palette.
const themeScript = `(function(){try{var t=localStorage.getItem('autobd-app-theme');document.documentElement.dataset.theme=(t==='dark'||t==='light')?t:'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // themeScript rewrites data-theme before hydration, so the server's
    // default will legitimately differ from the client's stored theme.
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`h-full antialiased ${sans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <LiveBackground />
        {children}
        <Interactions />
      </body>
    </html>
  );
}
