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
import { Loader2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { use } from "react";

interface RegisterPageProps {
  params: Promise<{ platform: string }>;
}

const PLATFORM_CONFIG = {
  "splint-invest": {
    name: "Splint Invest",
    description:
      "Create your Splint Invest account to access wine and luxury asset investments",
    color: "from-purple-600 to-purple-800",
    category: "Alternative Assets",
  },
  masterworks: {
    name: "Masterworks",
    description:
      "Create your Masterworks account to include art investments in your portfolio",
    color: "from-blue-600 to-blue-800",
    category: "Art & Collectibles",
  },
  realt: {
    name: "RealT",
    description:
      "Create your RealT account to access tokenized real estate holdings",
    color: "from-green-600 to-green-800",
    category: "Real Estate",
  },
} as const;

export default function PlatformRegisterPage({ params }: RegisterPageProps) {
  const { platform } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const sessionId = searchParams.get("session");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const platformConfig =
    PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];

  useEffect(() => {
    if (!sessionId) {
      setError(
        "Invalid session. Please restart the linking process from your MCP client.",
      );
    }
  }, [sessionId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const validateForm = () => {
    if (
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.name
    ) {
      setError("All fields are required.");
      return false;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionId) {
      setError("Invalid session. Please restart the linking process.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/${platform}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Registration Successful",
          description: `Your ${platformConfig?.name} account has been created. You can now sign in.`,
        });

        // Redirect back to auth page with session preserved
        router.push(`/auth/${platform}?session=${sessionId}`);
      } else {
        if (response.status === 409) {
          setError(
            "An account with this email already exists. Please sign in instead.",
          );
        } else {
          setError(result.message || "Registration failed. Please try again.");
        }
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
            <p>The platform "{platform}" is not supported.</p>
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
              Create {platformConfig.name} Account
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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                required
                value={formData.name}
                onChange={handleInputChange}
                disabled={loading}
                className="transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                required
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
                className="transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password (min 6 characters)"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="transition-colors pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="transition-colors pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                !formData.email ||
                !formData.password ||
                !formData.confirmPassword ||
                !formData.name
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                `Create ${platformConfig.name} Account`
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() =>
                  router.push(`/auth/${platform}?session=${sessionId}`)
                }
                disabled={loading}
              >
                Sign in here
              </Button>
            </p>
          </div>

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
