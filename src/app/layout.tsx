import "@/styles/globals.css";
import { AuthUIProvider } from "@providers/AuthUI";

import type { Metadata } from "next";
import { Geist, DM_Sans, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const jetbrainsMonoHeading = JetBrains_Mono({subsets:['latin'],variable:'--font-heading'});

const dmSans = DM_Sans({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Lunar CS",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={cn(geist.variable, "font-sans", dmSans.variable, jetbrainsMonoHeading.variable)} lang="en">
      <body>
        <AuthUIProvider>{children}</AuthUIProvider>
      </body>
    </html>
  );
}
