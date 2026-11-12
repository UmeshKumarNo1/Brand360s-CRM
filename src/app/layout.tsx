import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://brand360scrm.netlify.app"),
  title: "BRAND 360s CRM",
  description: "Enterprise CRM for BRAND 360s client management, registrations, and billing.",
  icons: {
    icon: [
      { url: "/avatar.webp", type: "image/webp" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/avatar.webp",
    apple: "/avatar.webp",
  },
  openGraph: {
    title: "BRAND 360s CRM",
    description: "Enterprise CRM for BRAND 360s client management, registrations, and billing.",
    url: "https://brand360scrm.netlify.app",
    siteName: "BRAND 360s CRM",
    images: [
      {
        url: "/logo.webp",
        width: 1200,
        height: 630,
        alt: "BRAND 360s CRM Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BRAND 360s CRM",
    description: "Enterprise CRM for BRAND 360s client management, registrations, and billing.",
    images: ["/logo.webp"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[#F5F8FC] font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}



