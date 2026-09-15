import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Calendar Automation — Image to recurring calendar events",
  description: "Upload a schedule photo, let AI extract every class slot, review and edit, then generate weekly recurring calendar events as an .ics file that imports into Google Calendar, Outlook, or iCal.",
  keywords: ["calendar", "schedule", "AI vision", "ICS", "RRULE", "Google Calendar", "class schedule", "recurring events"],
  authors: [{ name: "Calendar Automation" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Calendar Automation",
    description: "Image in. Calendar events out. AI vision + ICS RRULE recurring events.",
    siteName: "Calendar Automation",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calendar Automation",
    description: "Image in. Calendar events out.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
