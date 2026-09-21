import { useState } from "react";
import { Loader2, Lock, ShieldCheck, CheckCircle2, Mail, ShoppingCart } from "lucide-react";
import { createSignedPdfUrl } from "@/services/storage/supabase-server";

import { loadRazorpayCheckout } from "@/services/payments/load-razorpay";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/services/payments/razorpay";
import { sendResourceEmail } from "@/services/email/brevo";
import type { CourseAccess } from "@/services/access/access";
import { grantCourseAccess } from "@/services/access/access";
import type { Course } from "@/services/database/firebase-courses";
import type { BundleOffer } from "@/lib/bundle-offers";

import { useAuth } from "@/features/auth/use-auth";
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
  // Single course mode (legacy / Buy Now)
  price,
  title,
  courseId,
  accessInfo,
  pdfPath,
  // Multi-course / cart mode
  courses,
  matchedOffer,
  onPaymentSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Single course props
  price?: number | undefined;
  title?: string | undefined;
  courseId?: string | undefined;
  accessInfo?: string | undefined;
  pdfPath?: string | undefined;
  resources?: { label: string; url: string }[] | undefined;
  // Multi course props
  courses?: Course[] | undefined;
  matchedOffer?: BundleOffer | null | undefined;
  onPaymentSuccess: (access: CourseAccess) => void;

}) {
  const { user } = useAuth();
  const [paymentError, setPaymentError] = useState("");
  const [emailStatus, setEmailStatus] = useState<"none" | "sending" | "success" | "failed">("none");
  const [emailError, setEmailError] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");

  // Determine if we are in multi-course (cart) mode
  const isCartMode = !!courses && courses.length > 0;
  const allCourseIds = isCartMode
    ? courses.map((c) => c.id)
    : courseId
      ? [courseId]
      : [];
  
  const displayTitle = isCartMode
    ? courses!.length === 1
      ? (courses![0]?.title ?? "")
      : `${courses!.length} Courses Bundle`
    : (title ?? "");

  const displayPrice = isCartMode
    ? (matchedOffer ? matchedOffer.bundlePrice : courses!.reduce((s, c) => s + c.price, 0))
    : (price ?? 0);

  const originalTotal = isCartMode
    ? courses!.reduce((s, c) => s + c.price, 0)
    : displayPrice;

  const savings = originalTotal - displayPrice;

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!email) {
      setEmailError("Please enter your email address to receive the resources");
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (allCourseIds.length === 0) {
      setPaymentError("No courses selected.");
      return;
    }
    setEmailError("");
    setPaymentError("");
    setStatus("processing");

    try {
      const userName = email.split('@')[0] || "Guest";
      const userEmail = email;

      console.log("Creating Razorpay order with:", { courseIds: allCourseIds, displayTitle, displayPrice });
      
      const order = await createRazorpayOrder({
        data: {
          courseIds: allCourseIds,
          bundlePrice: matchedOffer ? matchedOffer.bundlePrice : undefined,
          bundleOfferId: matchedOffer?.id,
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
        description: displayTitle,
        order_id: order.orderId,
        modal: {
          ondismiss: function() {
            console.log("Razorpay modal dismissed");
            setStatus("idle");
          },
        },
        theme: { color: "#e85d04" },
        handler: async (response) => {
          try {
            console.log("Razorpay success handler called:", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
            });
            const finalEmail = userEmail;
            const finalUserName = userName;
            const userId = user?.uid || finalEmail;
            const isGuest = !user?.uid;
            
            const verified = await verifyRazorpayPayment({
              data: {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                userId,
                isGuest,
              },
            });
            console.log("Payment verification succeeded:", verified);

            // Grant access for EVERY course purchased
            const lastAccess: CourseAccess = {
              userId,
              email: finalEmail,
              paymentId: verified.paymentId,
              orderId: verified.orderId,
              grantedAt: new Date().toISOString(),
              courseId: allCourseIds[allCourseIds.length - 1] ?? "",
            };

            for (const cId of allCourseIds) {
              const access: CourseAccess = {
                userId,
                email: finalEmail,
                paymentId: verified.paymentId,
                orderId: verified.orderId,
                grantedAt: new Date().toISOString(),
                courseId: cId,
              };
              grantCourseAccess(access);
            }

            // Send ONE combined email for ALL purchased courses
            if (finalEmail) {
              try {
                setEmailStatus("sending");
                console.log("Sending resource email for courses:", allCourseIds);
                const emailResult = await sendResourceEmail({
                  data: {
                    email: finalEmail,
                    name: finalUserName,
                    courseIds: allCourseIds,
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
              } catch (emailErr) {
                setEmailStatus("failed");
                setEmailError(emailErr instanceof Error ? emailErr.message : "Unknown error");
                console.error("Failed to send resource email:", emailErr);
              }
            }
            
            onPaymentSuccess(lastAccess);
            setStatus("done");
          } catch (error) {
            console.error("Payment verification error:", error);
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

  const handleAccessNow = async () => {
    // For single course with PDF, open it
    if (!isCartMode && pdfPath) {
      try {
        const userId = user?.uid || email;
        if (userId) {
          const result = await createSignedPdfUrl({
            data: {
              courseId: courseId!,
              pdfPath,
              userId,
            },
          });
          window.open(result.signedUrl, "_blank");
        }
      } catch (err) {
        console.error("Failed to get signed PDF URL:", err);
      }
    } else if (!isCartMode && resources && resources.length > 0 && resources[0].url) {
      window.open(resources[0].url, "_blank");
    } else if (!isCartMode && accessInfo && (accessInfo.startsWith("http") || accessInfo.startsWith("/"))) {
      window.open(accessInfo, "_blank");
    }
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        {status === "done" ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
            <DialogTitle className="mt-4 text-2xl">Payment successful</DialogTitle>
            <DialogDescription className="mt-2">
              {isCartMode && courses!.length > 1
                ? `All ${courses!.length} courses are now unlocked.`
                : "Your course content is now unlocked."}
            </DialogDescription>

            {isCartMode && courses!.length > 1 && (
              <div className="mt-4 text-left space-y-1.5 rounded-lg bg-secondary/50 p-3 border border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Courses unlocked:</p>
                {courses!.map((c) => (
                  <div key={c.id} className="text-sm flex items-center gap-1.5">
                    <span className="text-green-500">✓</span> {c.title}
                  </div>
                ))}
              </div>
            )}
            
            {emailStatus === "success" && (
              <p className="mt-4 text-sm text-green-600 font-medium">
                ✓ Resource{allCourseIds.length > 1 ? "s" : ""} email sent successfully!
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
            
            <Button className="mt-6 w-full" size="lg" onClick={handleAccessNow}>
              {isCartMode && courses!.length > 1 ? "Go to Courses" : "Access Now"}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                {isCartMode && courses!.length > 1 && (
                  <ShoppingCart className="h-5 w-5 text-primary" />
                )}
                Secure checkout
              </DialogTitle>
              <DialogDescription>
                {isCartMode && courses!.length > 1
                  ? `${courses!.length} courses · One-time payment · Lifetime access`
                  : `${displayTitle} — one-time payment, lifetime access.`}
              </DialogDescription>
            </DialogHeader>

            {/* Course list for multi-course */}
            {isCartMode && courses!.length > 1 && (
              <div className="mt-4 space-y-1.5 rounded-lg bg-secondary/40 p-3 border border-border">
                {courses!.map((c) => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="text-foreground">{c.title}</span>
                    <span className="text-muted-foreground">₹{c.price}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bundle savings */}
            {matchedOffer && savings > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-sm">
                <span className="text-green-600 dark:text-green-400 font-medium">🎉 Bundle deal: saving ₹{savings}!</span>
              </div>
            )}

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

            {/* Price summary */}
            <div className="space-y-1.5">
              {matchedOffer && savings > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Original total</span>
                  <span className="line-through">₹{originalTotal.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total due today</span>
                <span className="font-display text-2xl font-bold">
                  ₹{displayPrice.toLocaleString("en-IN")}
                </span>
              </div>
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
                  <Lock className="h-4 w-4" /> Pay ₹{displayPrice.toLocaleString("en-IN")}
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
