import { useState } from "react";
import { CreditCard, Loader2, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100, "Name is too long"),
  email: z.string().trim().email("Enter a valid email").max(255, "Email is too long"),
  card: z
    .string()
    .trim()
    .regex(/^[0-9 ]{16,23}$/, "Enter a valid 16-digit card number"),
  expiry: z.string().trim().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Use MM/YY"),
  cvc: z.string().trim().regex(/^\d{3,4}$/, "3 or 4 digits"),
});

type Errors = Partial<Record<keyof z.infer<typeof checkoutSchema>, string>>;

export function CheckoutDialog({
  open,
  onOpenChange,
  price,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  price: number;
  title: string;
}) {
  const [form, setForm] = useState({ name: "", email: "", card: "", expiry: "", cvc: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0] as keyof Errors] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setStatus("processing");
    // Placeholder for Stripe / Razorpay checkout session creation.
    window.setTimeout(() => setStatus("done"), 1600);
  };

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) window.setTimeout(() => setStatus("idle"), 200);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        {status === "done" ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
            <DialogTitle className="mt-4 text-2xl">Payment successful</DialogTitle>
            <DialogDescription className="mt-2">
              You're enrolled in {title}. A receipt and course access link are on their way to{" "}
              {form.email}.
            </DialogDescription>
            <Button className="mt-6 w-full" size="lg" onClick={() => close(false)}>
              Start learning
            </Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle className="text-2xl">Secure checkout</DialogTitle>
              <DialogDescription>
                {title} — one-time payment, lifetime access.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              <Field
                id="name"
                label="Full name"
                placeholder="Abhiraj Chandrawanshi"
                value={form.name}
                onChange={set("name")}
                error={errors.name}
              />
              <Field
                id="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set("email")}
                error={errors.email}
              />
              <Field
                id="card"
                label="Card number"
                placeholder="4242 4242 4242 4242"
                value={form.card}
                onChange={set("card")}
                error={errors.card}
                icon
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  id="expiry"
                  label="Expiry"
                  placeholder="12/28"
                  value={form.expiry}
                  onChange={set("expiry")}
                  error={errors.expiry}
                />
                <Field
                  id="cvc"
                  label="CVC"
                  placeholder="123"
                  value={form.cvc}
                  onChange={set("cvc")}
                  error={errors.cvc}
                />
              </div>
            </div>

            <Separator className="my-5" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total due today</span>
              <span className="font-display text-2xl font-bold">₹{price.toLocaleString("en-IN")}</span>
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-5 w-full"
              disabled={status === "processing"}
            >
              {status === "processing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Pay ₹{price.toLocaleString("en-IN")}
                </>
              )}
            </Button>

            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Demo checkout — connect Stripe or Razorpay to
              go live.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  icon = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  placeholder?: string;
  type?: string;
  icon?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className={icon ? "pl-9" : ""}
          aria-invalid={Boolean(error)}
        />
        {icon ? (
          <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
