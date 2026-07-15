import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoBD — Multi-Pillar Car Marketplace",
  description:
    "Buy new, used, or Japanese reconditioned cars in Bangladesh with transparent landed cost.",
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
      className="h-full antialiased"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
