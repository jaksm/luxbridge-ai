import { Metadata } from "next";
import { PrivyClientProvider } from "./providers/privy-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP OAuth Server",
  description: "Model Context Protocol server with OAuth 2.1 authentication",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PrivyClientProvider>{children}</PrivyClientProvider>
      </body>
    </html>
  );
}
