"use client";

import { useState, useEffect } from "react";

export default function DeviceVerifyPage() {
  const [userCode, setUserCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<
    { organization_id: string; slug: string; name: string; role: string }[]
  >([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"login" | "authorize">("login");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("user_code") || "";
    setUserCode(code);
  }, []);

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

    // Fetch user's orgs
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
    <div style={{ maxWidth: 400, margin: "80px auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Authorize Device</h1>

      {userCode && (
        <div
          style={{
            background: "#f0f0f0",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
            Verify this code matches your CLI
          </div>
          <div style={{ fontSize: 28, fontWeight: "bold", letterSpacing: 4 }}>
            {userCode}
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: "#dc2626", marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {step === "login" && (
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 4,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 4,
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: 10,
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Sign in
          </button>
        </form>
      )}

      {step === "authorize" && (
        <form onSubmit={handleAuthorize}>
          {orgs.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
                Organization
              </label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                }}
              >
                <option value="">Select an organization</option>
                {orgs.map((org) => (
                  <option key={org.organization_id} value={org.organization_id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {orgs.length === 1 && (
            <p style={{ marginBottom: 16, fontSize: 14, color: "#666" }}>
              Authorizing for <strong>{orgs[0].name}</strong>
            </p>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: 10,
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Authorize Device
          </button>
        </form>
      )}
    </div>
  );
}
