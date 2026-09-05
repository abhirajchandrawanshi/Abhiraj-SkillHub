import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock, Shield } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/hooks/use-admin-auth";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login | Abhiraj Courses" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { isAdmin, loading, adminLogin } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in as admin
  if (isAdmin && !loading) {
    void navigate({ to: "/admin/dashboard" });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await adminLogin(email, password);
      void navigate({ to: "/admin/dashboard" });
    } catch (err) {
      // Map Firebase error codes to friendly messages
      const errorMsg =
        err instanceof Error ? err.message : "Login failed";
      if (errorMsg.includes("auth/invalid-credential") || errorMsg.includes("auth/invalid-email")) {
        setError("Invalid email or password");
      } else if (errorMsg.includes("auth/too-many-requests")) {
        setError("Too many attempts. Please try again later.");
      } else if (errorMsg.includes("Access denied")) {
        setError("Access denied. Admin account required.");
      } else {
        setError(errorMsg);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-5 py-10 sm:py-16">
      <div className="mx-auto max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to website
        </Link>

        <section className="mt-8 rounded-xl border border-border bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-primary">Admin Panel</p>
            <h1 className="mt-2 font-display text-3xl font-bold">
              Admin Login
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Secure access to course management
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              {busy ? "Authenticating..." : "Secure Login"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Protected admin access
          </div>
        </section>
      </div>
    </main>
  );
}
