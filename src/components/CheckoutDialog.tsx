import { useState } from "react";
import { Loader2, Lock, ShieldCheck, CheckCircle2, Mail } from "lucide-react";

import { COURSE_ID, INTERNSHIP_ID, TESTING_ID, TESTING_TITLE, TESTING_PRICE_INR, INTERNSHIP_TITLE, INTERNSHIP_PRICE_INR, COURSE_TITLE, COURSE_PRICE_INR } from "@/lib/course";
import { loadRazorpayCheckout } from "@/lib/load-razorpay";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay";
import { sendResourceEmail } from "@/lib/brevo";
import type { CourseAccess } from "@/lib/access";
import { grantFirestoreAccess, grantCourseAccess } from "@/lib/access";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  courseId?: typeof COURSE_ID | typeof INTERNSHIP_ID | typeof TESTING_ID;
}) {
  const { user } = useAuth();
  const [paymentError, setPaymentError] = useState("");
  const [emailStatus, setEmailStatus] = useState<"none" | "sending" | "success" | "failed">("none");
  const [emailError, setEmailError] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");

  // Override title and price based on courseId for internal consistency
  const actualTitle = courseId === TESTING_ID ? TESTING_TITLE : courseId === INTERNSHIP_ID ? INTERNSHIP_TITLE : title;
  const actualPrice = courseId === TESTING_ID ? TESTING_PRICE_INR : courseId === INTERNSHIP_ID ? INTERNSHIP_PRICE_INR : price;

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate email - it's now required
    if (!email) {
      setEmailError("Please enter your email address to receive the resources");
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");
    
    setPaymentError("");
    setStatus("processing");

    try {
      const userName = email.split('@')[0] || "Guest";
      const userEmail = email;

      const order = await createRazorpayOrder({
        data: {
          courseId: courseId,
          name: userName,
          email: userEmail,
        },
      });

      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error("Razorpay Checkout could not be loaded.");

      console.log("Opening Razorpay Checkout with order:", order.orderId);

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: userName,
        description: actualTitle,
        order_id: order.orderId,
        modal: {
          ondismiss: function() {
            console.log("Razorpay modal dismissed");
            setStatus("idle");
          },
        },
        theme: { color: courseId === TESTING_ID ? "#dc2626" : "#e85d04" },
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
            
            // Use the email from the form (user-provided) since Razorpay doesn't reliably return it
            const finalEmail = userEmail;
            const finalUserName = userName;
            
            // Use Firebase UID if user is authenticated, otherwise use email as userId for guest purchases
            const userId = user?.uid || finalEmail;
            const isGuest = !user?.uid; // Guest purchase if no Firebase UID
            
            const access = {
              userId: userId,
              email: finalEmail,
              paymentId: verified.paymentId,
              orderId: verified.orderId,
              grantedAt: new Date().toISOString(),
              courseId: courseId,
            };
            
            console.log("Granting access to:", access.email, "for course:", courseId, "isGuest:", isGuest);
            
            // Save to Firestore (with guest flag for temporary access)
            try {
              await grantFirestoreAccess(access, courseId, isGuest);
            } catch (firestoreError) {
              console.error("Firestore access grant failed, using localStorage fallback:", firestoreError);
              // Fallback to localStorage if Firestore fails
              grantCourseAccess(access);
            }
            
            // Send resource email via Brevo (if email was provided)
            if (finalEmail) {
              try {
                setEmailStatus("sending");
                console.log("Sending resource email to:", finalEmail);
                const emailResult = await sendResourceEmail({
                  data: {
                    email: finalEmail,
                    name: finalUserName,
                    courseId: courseId,
                  },
                });
                
                if (emailResult.success) {
                  setEmailStatus("success");
                  console.log("Resource email sent successfully");
                } else {
                  setEmailStatus("failed");
                  setEmailError(emailResult.error || "Unknown error");
                  console.error("Failed to send resource email:", emailResult.error);
                }
              } catch (emailError) {
                setEmailStatus("failed");
                setEmailError(emailError instanceof Error ? emailError.message : "Unknown error");
                console.error("Failed to send resource email:", emailError);
                // Don't fail the payment flow if email sending fails
              }
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
        setEmailStatus("none");
        setEmailError("");
        setEmail("");
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
            
            {emailStatus === "success" && (
              <p className="mt-4 text-sm text-green-600 font-medium">
                ✓ Resource email sent successfully!
              </p>
            )}
            
            {emailStatus === "failed" && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 font-medium">
                  ⚠️ Email sending failed
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  {emailError || "Please contact support for resources"}
                </p>
              </div>
            )}
            
            <Button className="mt-6 w-full" size="lg" onClick={() => close(false)}>
              Access Now
            </Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {courseId === TESTING_ID ? "Testing Course Checkout" : "Secure checkout"}
              </DialogTitle>
              <DialogDescription>
                {courseId === TESTING_ID 
                  ? "This is a ₹1 test payment to verify the complete payment and access system."
                  : `${actualTitle} — one-time payment, lifetime access.`
                }
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  required
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Resources will be sent to this email after successful payment
                </p>
              </div>
              <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
                Razorpay securely handles cards, UPI, net banking, and wallets.
              </p>
            </div>

            <Separator className="my-5" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total due today</span>
              <span className="font-display text-2xl font-bold">
                ₹{actualPrice.toLocaleString("en-IN")}
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
                  <Lock className="h-4 w-4" /> Pay ₹{actualPrice.toLocaleString("en-IN")}
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
  prefill?: { name?: string; email?: string; contact?: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss: () => void };
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
