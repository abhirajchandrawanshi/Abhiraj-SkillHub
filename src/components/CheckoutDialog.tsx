import { useState } from "react";
import { Loader2, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { z } from "zod";

import { COURSE_ID } from "@/lib/course";
import { loadRazorpayCheckout } from "@/lib/load-razorpay";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay";
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
});

type Errors = Partial<Record<keyof z.infer<typeof checkoutSchema>, string>>;

export function CheckoutDialog({
  open,
  onOpenChange,
  price,
  title,
  onPaymentSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  price: number;
  title: string;
  onPaymentSuccess: (email: string) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [paymentError, setPaymentError] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: React.FormEvent) => {
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
    setPaymentError("");
    setStatus("processing");

    try {
      const order = await createRazorpayOrder({
        data: {
          courseId: COURSE_ID,
          name: parsed.data.name,
          email: parsed.data.email,
        },
      });

      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error("Razorpay Checkout could not be loaded.");

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Abhiraj Chandrawanshi",
        description: title,
        order_id: order.orderId,
        prefill: { name: parsed.data.name, email: parsed.data.email },
        theme: { color: "#e85d04" },
        handler: async (response) => {
          try {
            await verifyRazorpayPayment({
              data: {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
            });
            onPaymentSuccess(parsed.data.email.trim().toLowerCase());
            setStatus("done");
          } catch {
            setPaymentError(
              "Payment could not be verified. Please contact support before trying again.",
            );
            setStatus("idle");
          }
        },
        modal: { ondismiss: () => setStatus("idle") },
      });
      razorpay.on("payment.failed", () => {
        setPaymentError("Payment failed. No amount was charged. Please try again.");
        setStatus("idle");
      });
      razorpay.open();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Unable to start payment.");
      setStatus("idle");
    }
  };

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next)
      window.setTimeout(() => {
        setStatus("idle");
        setPaymentError("");
      }, 200);
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
              <DialogDescription>{title} — one-time payment, lifetime access.</DialogDescription>
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
              <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
                Razorpay securely handles cards, UPI, net banking, and wallets after you continue.
              </p>
            </div>

            <Separator className="my-5" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total due today</span>
              <span className="font-display text-2xl font-bold">
                ₹{price.toLocaleString("en-IN")}
              </span>
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

            {paymentError ? (
              <p className="mt-3 text-center text-xs text-destructive">{paymentError}</p>
            ) : null}

            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Secured by Razorpay
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  placeholder?: string;
  type?: string;
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
          aria-invalid={Boolean(error)}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
};

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: () => void) => void;
};
