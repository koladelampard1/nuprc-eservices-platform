import type { Metadata } from "next";
import "./globals.css";

import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Chairman-demo-ready MVP foundation for NUPRC digital e-services"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AuthSessionProvider>{children}</AuthSessionProvider></body>
    </html>
  );
}
