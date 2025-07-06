"use client";

import { useLoginWithEmail, useToken, useUser } from "@privy-io/react-auth";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

function OAuthAuthFormContent() {
  const searchParams = useSearchParams();
  const response_type = searchParams?.get("response_type");
  const client_id = searchParams?.get("client_id");
  const redirect_uri = searchParams?.get("redirect_uri");
  const state = searchParams?.get("state");
  const scope = searchParams?.get("scope");
  const code_challenge = searchParams?.get("code_challenge");
  const code_challenge_method = searchParams?.get("code_challenge_method");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [step, setStep] = useState<"params" | "email" | "verify" | "success">(
    "params",
  );

  const { sendCode, loginWithCode } = useLoginWithEmail();
  const { getAccessToken } = useToken();
  const { user } = useUser();

  const handleAuthenticationComplete = React.useCallback(async () => {
    setIsLoading(true);

    try {
      const privyToken = await getAccessToken();

      // Get wallet address from either wallet or embeddedWallet
      const walletAddress =
        user?.wallet?.address ||
        (
          user?.linkedAccounts?.find(
            (account) => account.type === "wallet",
          ) as any
        )?.address ||
        null;

      const requestBody = {
        auth_code: authCode,
        privy_token: privyToken,
        user_data: {
          email: user?.email?.address,
          privy_user_id: user?.id,
          wallet_address: walletAddress,
        },
      };

      const response = await fetch("/api/oauth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        setStep("success");

        const verifyAuthCode = async () => {
          try {
            const response = await fetch(`/api/oauth/verify-auth-code`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ auth_code: authCode }),
            });

            if (response.ok) {
              const data = await response.json();

              if (data.hasUserId) {
                const redirectUrl = new URL(redirect_uri as string);
                redirectUrl.searchParams.set("code", authCode as string);
                if (state)
                  redirectUrl.searchParams.set("state", state as string);

                setTimeout(() => {
                  window.location.href = redirectUrl.toString();
                  window.close();
                }, 500);
              } else {
                setTimeout(verifyAuthCode, 1000);
              }
            } else {
              setError("Failed to verify authorization code");
              setIsLoading(false);
            }
          } catch (error) {
            setError("Error verifying authorization code");
            setIsLoading(false);
          }
        };

        verifyAuthCode();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Authentication failed");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError("Authentication error occurred");
      setIsLoading(false);
    }
  }, [authCode, redirect_uri, state, getAccessToken, user]);

  useEffect(() => {
    if (response_type === "code" && client_id && redirect_uri) {
      const generatedAuthCode =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      setAuthCode(generatedAuthCode);

      const storeAuthCode = async () => {
        try {
          const response = await fetch("/api/oauth/store-auth-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              auth_code: generatedAuthCode,
              client_id,
              redirect_uri,
              state,
              scope,
              code_challenge,
              code_challenge_method,
            }),
          });

          if (response.ok) {
            setStep("email");
          } else {
            setError("Failed to initialize OAuth flow");
          }
        } catch (err) {
          setError("Error initializing OAuth flow");
        }
      };

      storeAuthCode();
    }
  }, [
    response_type,
    client_id,
    redirect_uri,
    state,
    scope,
    code_challenge,
    code_challenge_method,
  ]);

  const handleSendCode = async () => {
    if (!email) return;

    setIsLoading(true);
    setError("");

    try {
      await sendCode({ email });
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) return;

    setIsLoading(true);
    setError("");

    try {
      await loginWithCode({ code });
    } catch (err: any) {
      setError("Invalid verification code. Please try again.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only auto-complete authentication if user has completed verification
    // This ensures new users go through the verification flow
    if (user && step === "verify" && code) {
      // Check if user has a wallet (embedded or external)
      const hasWallet =
        user.wallet?.address ||
        user.linkedAccounts?.some((account) => account.type === "wallet");

      // For new users, wait for wallet creation
      if (!hasWallet) {
        console.log("Waiting for wallet creation...");
        // The wallet will be created automatically due to createOnLogin: "all-users"
        // We'll check again on next render
        return;
      }

      // Wait a moment to ensure Privy has processed everything
      setTimeout(() => {
        handleAuthenticationComplete();
      }, 1000);
    }
  }, [user, step, code, handleAuthenticationComplete]);

  if (
    step === "params" &&
    (response_type !== "code" || !client_id || !redirect_uri)
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Invalid OAuth Request
            </CardTitle>
            <CardDescription className="text-center">
              Missing required OAuth 2.1 parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This page requires valid OAuth 2.1 parameters. Please ensure
                your request includes response_type, client_id, and
                redirect_uri.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Expected:</strong> response_type=code
              </p>
              <p>
                <strong>Received:</strong> {response_type || "missing"}
              </p>
              <p>
                <strong>Client ID:</strong> {client_id || "missing"}
              </p>
              <p>
                <strong>Redirect URI:</strong> {redirect_uri || "missing"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-6">
            <Spinner size="lg" />
            <div className="space-y-2">
              <CardTitle className="text-xl">Completing OAuth Flow</CardTitle>
              <CardDescription>
                Finalizing authentication with MCP server...
              </CardDescription>
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>
                <strong>Client:</strong> {client_id}
              </p>
              <p>
                <strong>User:</strong> {user.email?.address || user.id}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">LuxBridge</CardTitle>
          <CardDescription>OAuth 2.1 Authentication</CardDescription>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Authorizing:</strong> {client_id}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "success" && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Authentication successful! Redirecting to Claude Desktop...
              </AlertDescription>
            </Alert>
          )}

          {step === "email" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>

              <Button
                onClick={handleSendCode}
                disabled={!email || isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? "Sending..." : "Send Verification Code"}
              </Button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleVerifyCode}
                  disabled={!code || isLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isLoading ? "Authenticating..." : "Complete Authentication"}
                </Button>

                <Button
                  onClick={() => setStep("email")}
                  disabled={isLoading}
                  variant="secondary"
                  className="w-full"
                  size="lg"
                >
                  Back to Email
                </Button>
              </div>
            </div>
          )}

          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <CardTitle className="text-sm mb-2">OAuth 2.1 Flow:</CardTitle>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Verify your email with Privy</li>
                <li>Complete secure authentication</li>
                <li>Return to Claude Desktop with authorization</li>
              </ol>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OAuthAuthForm() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <OAuthAuthFormContent />
    </Suspense>
  );
}
