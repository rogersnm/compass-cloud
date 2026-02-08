"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DeviceVerifyPage() {
  const [userCode] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("user_code") || "";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<
    { organization_id: string; slug: string; name: string; role: string }[]
  >([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"login" | "authorize">("login");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || "Login failed");
      return;
    }

    const { data } = await res.json();
    setAccessToken(data.access_token);

    const meRes = await fetch("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    if (meRes.ok) {
      const meData = await meRes.json();
      setOrgs(meData.data?.memberships || []);
      if (meData.data?.memberships?.length === 1) {
        setSelectedOrg(meData.data.memberships[0].organization_id);
      }
    }

    setStep("authorize");
  }

  async function handleAuthorize(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedOrg) {
      setError("Please select an organization");
      return;
    }

    const res = await fetch("/api/v1/auth/device/authorize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        user_code: userCode,
        organization_id: selectedOrg,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || "Authorization failed");
      return;
    }

    window.location.href = "/auth/device/success";
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Authorize Device</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {userCode && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="mb-1 text-xs text-muted-foreground">
                Verify this code matches your CLI
              </p>
              <p className="text-3xl font-bold tracking-widest">{userCode}</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device-email">Email</Label>
                <Input
                  id="device-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="device-password">Password</Label>
                <Input
                  id="device-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          )}

          {step === "authorize" && (
            <form onSubmit={handleAuthorize} className="space-y-4">
              {orgs.length > 1 && (
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgs.map((org) => (
                        <SelectItem
                          key={org.organization_id}
                          value={org.organization_id}
                        >
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {orgs.length === 1 && (
                <p className="text-sm text-muted-foreground">
                  Authorizing for <strong>{orgs[0].name}</strong>
                </p>
              )}
              <Button type="submit" className="w-full">
                Authorize Device
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
