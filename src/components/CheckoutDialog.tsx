import { useState } from "react";
import { Loader2, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";

import { COURSE_ID, INTERNSHIP_ID } from "@/lib/course";
import { loadRazorpayCheckout } from "@/lib/load-razorpay";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay";
import { sendResourceEmail } from "@/lib/brevo";
import type { CourseAccess } from "@/lib/access";
import { grantFirestoreAccess, grantCourseAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";



export function CheckoutDialog({
  open,
  onOpenChange,
  price,
  title,
  onPaymentSuccess,
  courseId = COURSE_ID,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  price: number;
  title: string;
  onPaymentSuccess: (access: CourseAccess) => void;
  courseId?: typeof COURSE_ID | typeof INTERNSHIP_ID;
}) {
  const [paymentError, setPaymentError] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPaymentError("");
    setStatus("processing");

    try {
      const order = await createRazorpayOrder({
        data: {
          courseId: courseId,
          name: "John Doe",
          email: "john.doe@example.com",
        },
      });

      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error("Razorpay Checkout could not be loaded.");

      console.log("Opening Razorpay Checkout with order:", order.orderId);

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "John Doe",
        description: title,
        order_id: order.orderId,
        prefill: { name: "John Doe", email: "john.doe@example.com" },
        theme: { color: "#e85d04" },
        handler: async (response) => {
          try {
            console.log("Razorpay success handler called:", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature?.substring(0, 20) + "...",
            });
            
            console.log("Calling verifyRazorpayPayment...");
            const verified = await verifyRazorpayPayment({
              data: {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
            });
            console.log("Payment verification succeeded:", verified);
            
            const access = {
              email: "john.doe@example.com",
              paymentId: verified.paymentId,
              orderId: verified.orderId,
              grantedAt: new Date().toISOString(),
              courseId: courseId,
            };
            
            console.log("Granting access to:", access.email, "for course:", courseId);
            
            // Save to Firestore
            try {
              await grantFirestoreAccess(access, courseId);
            } catch (firestoreError) {
              console.error("Firestore access grant failed, using localStorage fallback:", firestoreError);
              // Fallback to localStorage if Firestore fails
              grantCourseAccess(access);
            }
            
            // Send resource email via Brevo
            try {
              console.log("Sending resource email to:", access.email);
              await sendResourceEmail({
                data: {
                  email: access.email,
                  name: "John Doe",
                  courseId: courseId,
                },
              });
              console.log("Resource email sent successfully");
            } catch (emailError) {
              console.error("Failed to send resource email:", emailError);
              // Don't fail the payment flow if email sending fails
            }
            
            onPaymentSuccess(access);
            setStatus("done");
          } catch (error) {
            console.error("Payment verification error:", error);
            console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
            const errorMessage = error instanceof Error ? error.message : "Payment could not be verified. Please contact support before trying again.";
            setPaymentError(errorMessage);
            setStatus("idle");
          }
        },
        modal: { 
          ondismiss: function() {
            console.log("Razorpay modal dismissed");
            setStatus("idle");
          },
        },
      });
      
      razorpay.on("payment.failed", (payload) => {
        console.error("Payment failed event received:", payload.error);
        const reason = payload.error.description?.trim() || payload.error.reason?.trim();
        const errorCode = payload.error.code?.trim();
        setPaymentError(
          reason
            ? `Payment failed: ${reason} ${errorCode ? `(${errorCode})` : ""}`
            : "Payment failed. No amount was charged. Please try again.",
        );
        setStatus("idle");
      });
      
      console.log("Calling razorpay.open()");
      razorpay.open();
      console.log("razorpay.open() completed");
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
              Your payment is verified. The complete PDF is now unlocked.
            </DialogDescription>
            <Button className="mt-6 w-full" size="lg" onClick={() => close(false)}>
              Read the PDF
            </Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle className="text-2xl">Secure checkout</DialogTitle>
              <DialogDescription>{title} — one-time payment, lifetime access.</DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-4">
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
  on: (event: "payment.failed", handler: (payload: RazorpayFailurePayload) => void) => void;
};

type RazorpayFailurePayload = {
  error: {
    description?: string;
    reason?: string;
    code?: string;
  };
};
