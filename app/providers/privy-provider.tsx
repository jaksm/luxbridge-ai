"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export function PrivyClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={{
        embeddedWallets: {
          createOnLogin: "all-users",
        },
        loginMethods: ["email"],
        appearance: {
          theme: "light",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
