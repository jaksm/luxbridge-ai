"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { use } from "react";

interface CompletePageProps {
  params: Promise<{ platform: string }>;
}

const PLATFORM_CONFIG = {
  "splint-invest": {
    name: "Splint Invest",
    color: "from-purple-600 to-purple-800",
    category: "Alternative Assets",
  },
  masterworks: {
    name: "Masterworks",
    color: "from-blue-600 to-blue-800",
    category: "Art & Collectibles",
  },
  realt: {
    name: "RealT",
    color: "from-green-600 to-green-800",
    category: "Real Estate",
  },
} as const;

export default function AuthCompletePage({ params }: CompletePageProps) {
  const { platform } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get("status");
  const sessionId = searchParams.get("session");

  const platformConfig =
    PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
  const isSuccess = status === "success";

  const handleGoBack = () => {
    router.push(`/auth/${platform}?session=${sessionId}`);
  };

  const handleCloseWindow = () => {
    if (typeof window !== "undefined") {
      window.close();
    }
  };

  if (!platformConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">
              Platform Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>The platform "{platform}" is not supported.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            {isSuccess ? (
              <div className="flex flex-col items-center space-y-4">
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-r ${platformConfig.color} flex items-center justify-center shadow-lg`}
                >
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-r ${platformConfig.color} flex items-center justify-center shadow-lg opacity-50`}
                >
                  <ExternalLink className="w-8 h-8 text-white" />
                </div>
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-destructive" />
                </div>
              </div>
            )}
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              {isSuccess ? "Connection Successful!" : "Connection Failed"}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              {isSuccess
                ? `Your ${platformConfig.name} account has been successfully linked to LuxBridge.`
                : `Failed to connect your ${platformConfig.name} account. Please check your credentials and try again.`}
            </p>

            {isSuccess && (
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  ✅ You can now access your {platformConfig.name} portfolio
                  through LuxBridge MCP tools.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {isSuccess ? (
              <Button onClick={handleCloseWindow} className="w-full" size="lg">
                Close Window & Return to MCP
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={handleGoBack}
                  variant="default"
                  className="w-full"
                  size="lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={handleCloseWindow}
                  variant="outline"
                  className="w-full"
                >
                  Close Window
                </Button>
              </div>
            )}
          </div>

          {isSuccess && (
            <div className="mt-6 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                🎉 Account successfully linked! You can now:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• View your {platformConfig.name} portfolio via MCP</li>
                <li>• Search assets across platforms</li>
                <li>• Perform cross-platform analysis</li>
              </ul>
            </div>
          )}

          {sessionId && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                Session:{" "}
                <code className="bg-background px-1 py-0.5 rounded text-xs">
                  {sessionId}
                </code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
