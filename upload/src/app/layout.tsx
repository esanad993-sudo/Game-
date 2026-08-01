import type { Metadata } from "next";
import { Geist, Geist_Mono, Titan_One, Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const titanOne = Titan_One({
  variable: "--font-titan-one",
  weight: "400",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  weight: ["700", "800", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Turbo Rush Brain Edition — Educational Racing Game",
  description: "A high-octane 3D racing game that quizzes you as you drive. Solo practice, live class games, and async homework — built for middle and high school classrooms.",
  keywords: ["educational game", "classroom game", "Gimkit", "Blooket", "quiz game", "racing game", "middle school", "high school"],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${titanOne.variable} ${nunito.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-nunito), var(--font-geist-sans), ui-rounded, system-ui, sans-serif" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
