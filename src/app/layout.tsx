import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Branchline — Release rehearsal",
  description: "Evidence-led release impact rehearsal for local Git changes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
