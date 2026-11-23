import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://crm.brand360s.co"),
  title: "Brand360s CRM | Client Relationship Management",
  description:
    "Manage clients, projects, contracts, invoices, payments and business operations efficiently with Brand360s CRM.",
  alternates: {
    canonical: "https://crm.brand360s.co",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/avatar.webp", type: "image/webp" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/avatar.webp",
    apple: "/avatar.webp",
  },
  openGraph: {
    title: "Brand360s CRM | Client Relationship Management",
    description:
      "Manage clients, projects, contracts, invoices, payments and business operations efficiently with Brand360s CRM.",
    url: "https://crm.brand360s.co",
    siteName: "Brand360s CRM",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Brand360s CRM Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brand360s CRM | Client Relationship Management",
    description:
      "Manage clients, projects, contracts, invoices, payments and business operations efficiently with Brand360s CRM.",
    images: ["/og-image.png"],
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



