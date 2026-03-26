import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Women's Month Photobooth",
  description:
    "Capture a vertical photo strip (event template or scrapbook) and save it with a shareable link.",
};

export default function PhotoboothLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
