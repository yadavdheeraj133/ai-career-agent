import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Career Agent",
  description: "Your personal AI career agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}