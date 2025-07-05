"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthPageProps {
  params: { platform: string };
}

const PLATFORM_CONFIG = {
  "splint-invest": {
    name: "Splint Invest",
    description:
      "Connect your Splint Invest account to access wine and luxury asset investments",
    color: "from-purple-600 to-purple-800",
    category: "Alternative Assets",
  },
  masterworks: {
    name: "Masterworks",
    description:
      "Link your Masterworks account to include art investments in your portfolio",
    color: "from-blue-600 to-blue-800",
    category: "Art & Collectibles",
  },
  realt: {
    name: "RealT",
    description: "Connect RealT to access your tokenized real estate holdings",
    color: "from-green-600 to-green-800",
    category: "Real Estate",
  },
} as const;

export default function PlatformAuthPage({ params }: AuthPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const sessionId = searchParams.get("session");

  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const platformConfig =
    PLATFORM_CONFIG[params.platform as keyof typeof PLATFORM_CONFIG];

  useEffect(() => {
    if (!sessionId) {
      setError(
        "Invalid session. Please restart the linking process from your MCP client.",
      );
    }
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      setError("Invalid session. Please restart the linking process.");
      return;
    }

    if (!credentials.email || !credentials.password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/auth/platforms/${params.platform}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            email: credentials.email,
            password: credentials.password,
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Connection Successful",
          description: `Your ${platformConfig?.name} account has been linked to LuxBridge.`,
        });
        router.push(
          `/auth/${params.platform}/complete?status=success&session=${sessionId}`,
        );
      } else {
        setError(
          result.message ||
            "Authentication failed. Please check your credentials.",
        );
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
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
            <p>The platform "{params.platform}" is not supported.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Supported platforms: splint-invest, masterworks, realt
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Session</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              No valid session found. Please start the authentication process
              from your MCP client.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div
            className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${platformConfig.color} flex items-center justify-center shadow-lg`}
          >
            <ExternalLink className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              Connect {platformConfig.name}
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              {platformConfig.description}
            </CardDescription>
            <div className="mt-2">
              <span className="inline-block px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-full">
                {platformConfig.category}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{platformConfig.name} Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                required
                value={credentials.email}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, email: e.target.value }))
                }
                disabled={loading}
                className="transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                required
                value={credentials.password}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                disabled={loading}
                className="transition-colors"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !credentials.email || !credentials.password}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting to {platformConfig.name}...
                </>
              ) : (
                `Connect ${platformConfig.name} Account`
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              🔒 Your credentials are encrypted and stored securely.
              <br />
              You can disconnect this account at any time from your MCP client.
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Session ID:{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                {sessionId}
              </code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
