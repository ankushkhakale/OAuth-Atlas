import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "OAuth Atlas — Find your path to ready",
  description:
    "Evidence-backed OAuth setup and approval guides. Explore provider requirements, track setup, and research an unfamiliar app without a paid API.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
