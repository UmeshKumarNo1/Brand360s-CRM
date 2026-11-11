import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRAND 360s CRM",
  description: "Enterprise CRM for BRAND 360s client management, registrations, and billing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#F5F8FC]">
        {children}
      </body>
    </html>
  );
}

