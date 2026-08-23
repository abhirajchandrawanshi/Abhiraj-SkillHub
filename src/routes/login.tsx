import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RecaptchaVerifier, type ConfirmationResult } from "firebase/auth";
import { ArrowLeft, Loader2, Mail, Phone, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login | Abhiraj Courses" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, signInWithGoogle, sendResetEmail, sendPhoneCode } =
    useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [phoneMode, setPhoneMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const recaptcha = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (user && !loading) void navigate({ to: "/" });
  }, [loading, navigate, user]);

  useEffect(() => () => recaptcha.current?.clear(), []);

  const run = async (action: () => Promise<unknown>, successMessage?: string) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
      if (successMessage) setMessage(successMessage);
      else void navigate({ to: "/" });
    } catch (error) {
      setMessage(authError(error));
    } finally {
      setBusy(false);
    }
  };

  const startPhone = () =>
    run(async () => {
      recaptcha.current ??= new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
      setConfirmation(await sendPhoneCode(phone.trim(), recaptcha.current));
    }, "Code sent. Enter the OTP to continue.");

  const verifyPhone = () =>
    run(async () => {
      if (!confirmation) throw new Error("Request a new code first.");
      await confirmation.confirm(code.trim());
    });

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );

  return (
    <main className="min-h-screen bg-[#faf9ff] px-5 py-10 sm:py-16">
      <div className="mx-auto max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
        <section className="mt-8 rounded-xl border border-border bg-white p-6 shadow-lift sm:p-8">
          <div className="mb-7">
            <p className="text-sm font-semibold text-brand-foreground">Abhiraj Courses</p>
            <h1 className="mt-2 font-display text-3xl font-bold">
              {isSignup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Use your account to keep your course access connected.
            </p>
          </div>
          {phoneMode ? (
            <PhoneForm
              phone={phone}
              code={code}
              hasCode={Boolean(confirmation)}
              setPhone={setPhone}
              setCode={setCode}
              onSend={startPhone}
              onVerify={verifyPhone}
              busy={busy}
            />
          ) : (
            <EmailForm
              email={email}
              password={password}
              setEmail={setEmail}
              setPassword={setPassword}
              isSignup={isSignup}
              onSubmit={() =>
                run(() =>
                  isSignup ? signUp(email.trim(), password) : signIn(email.trim(), password),
                )
              }
              busy={busy}
              onForgot={() => run(() => sendResetEmail(email.trim()), "Password reset email sent.")}
            />
          )}
          <div id="recaptcha-container" />
          {message ? (
            <p role="alert" className="mt-4 text-center text-sm text-destructive">
              {message}
            </p>
          ) : null}
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => run(signInWithGoogle)}
          >
            <span className="text-base font-bold">G</span> Continue with Google
          </Button>
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-semibold text-brand-foreground hover:underline"
            onClick={() => {
              setPhoneMode((value) => !value);
              setConfirmation(null);
              setMessage("");
            }}
          >
            {phoneMode ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}{" "}
            {phoneMode ? "Use email instead" : "Continue with phone OTP"}
          </button>
          {!phoneMode ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignup ? "Already have an account?" : "New here?"}{" "}
              <button
                type="button"
                className="font-semibold text-brand-foreground hover:underline"
                onClick={() => {
                  setIsSignup((value) => !value);
                  setMessage("");
                }}
              >
                {isSignup ? "Log in" : "Sign up"}
              </button>
            </p>
          ) : null}
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Securely managed by Firebase
          </p>
        </section>
      </div>
    </main>
  );
}

function EmailForm({
  email,
  password,
  setEmail,
  setPassword,
  isSignup,
  onSubmit,
  onForgot,
  busy,
}: {
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  isSignup: boolean;
  onSubmit: () => void;
  onForgot: () => void;
  busy: boolean;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
        />
      </div>
      <Button type="submit" variant="brand" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isSignup ? "Create Account" : "Log in"}
      </Button>
      {!isSignup ? (
        <button
          type="button"
          className="w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground"
          onClick={onForgot}
        >
          Forgot password?
        </button>
      ) : null}
    </form>
  );
}

function PhoneForm({
  phone,
  code,
  hasCode,
  setPhone,
  setCode,
  onSend,
  onVerify,
  busy,
}: {
  phone: string;
  code: string;
  hasCode: boolean;
  setPhone: (value: string) => void;
  setCode: (value: string) => void;
  onSend: () => void;
  onVerify: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={hasCode}
          required
        />
      </div>
      {hasCode ? (
        <div className="space-y-2">
          <Label htmlFor="otp">Verification code</Label>
          <Input
            id="otp"
            inputMode="numeric"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </div>
      ) : null}
      <Button
        type="button"
        variant="brand"
        className="w-full"
        disabled={busy}
        onClick={hasCode ? onVerify : onSend}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {hasCode ? "Verify OTP" : "Send OTP"}
      </Button>
    </div>
  );
}

function authError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "Email or password is incorrect.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-phone-number": "Enter a valid phone number with country code.",
    "auth/invalid-verification-code": "That OTP is incorrect. Try again.",
    "auth/code-expired": "That OTP has expired. Request a new code.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Allow popups in your browser to continue with Google.",
    "auth/account-exists-with-different-credential":
      "An account already exists with another sign-in method.",
    "auth/captcha-check-failed": "reCAPTCHA could not be verified. Refresh and try again.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/operation-not-allowed":
      "This sign-in method or SMS region is disabled in Firebase Console.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
  };
  return (
    messages[code] ??
    (error instanceof Error ? error.message : "Authentication failed. Please try again.")
  );
}
