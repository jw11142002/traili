import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "traili — rank the hikes you've done", template: "%s · traili" },
  description: "A personal hiking journal. Rank every hike you've done, Beli-style, and steal ideas from friends.",
  applicationName: "traili",
  appleWebApp: { capable: true, title: "traili", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f7f3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
