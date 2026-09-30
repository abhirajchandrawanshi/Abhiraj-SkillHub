"use client";

import { Check, Clock, Loader2, MessageSquarePlus, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TactileButton } from "@/components/ui/tactile-button";

const COOLDOWN_KEY = "abhiacademy_feedback_last_submitted";
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCooldownRemaining(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(COOLDOWN_KEY);
  if (!raw) return 0;
  const last = parseInt(raw, 10);
  if (isNaN(last)) return 0;
  return Math.max(0, COOLDOWN_MS - (Date.now() - last));
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface FeedbackCardProps {
  onSubmit: (name: string, feedback: string) => Promise<void>;
}

export const FeedbackCard = ({ onSubmit }: FeedbackCardProps) => {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);

  // Check cooldown on mount and refresh every minute
  useEffect(() => {
    const check = () => setCooldownMs(getCooldownRemaining());
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (textRef.current) textRef.current.value = "";
      if (nameRef.current) nameRef.current.value = "";
    }
  }, [isOpen]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let submissionStateTimeout: ReturnType<typeof setTimeout> | null = null;

    if (isSent) {
      setIsSubmitted(true);
      // Persist submission timestamp for 24-hour cooldown
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      setCooldownMs(COOLDOWN_MS);

      timeout = setTimeout(() => {
        setIsOpen(false);
        if (textRef.current) textRef.current.value = "";
        if (nameRef.current) nameRef.current.value = "";
      }, 2000);

      submissionStateTimeout = setTimeout(() => {
        setIsSubmitted(false);
        setIsSent(false);
      }, 2400);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
      if (submissionStateTimeout) clearTimeout(submissionStateTimeout);
    };
  }, [isSent]);

  const handleSubmit = async () => {
    if (cooldownMs > 0) return;
    const name = nameRef.current?.value.trim() || "";
    const feedback = textRef.current?.value.trim() || "";
    if (!name || !feedback) return;
    setIsLoading(true);
    try {
      await onSubmit(name, feedback);
      setIsSent(true);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  const isCoolingDown = cooldownMs > 0;

  return (
    <motion.div
      layout
      initial={{ borderRadius: "2rem" }}
      animate={isOpen ? { borderRadius: "0.75rem" } : { borderRadius: "2rem" }}
      className={cn("w-full max-w-md mx-auto overflow-hidden border border-border bg-card shadow-md")}
    >
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 pl-5 pr-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MessageSquarePlus className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold text-foreground">Any suggestion to Improve?</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>

      <motion.div
        aria-hidden={!isOpen}
        initial={{ height: 0 }}
        animate={isOpen ? { height: "auto" } : { height: 0 }}
        transition={{ ease: "easeInOut", duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4">
          <AnimatePresence mode="wait">
            {isCoolingDown ? (
              /* ── Cooldown locked state ── */
              <motion.div
                key="cooldown"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center gap-3 py-8 text-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
                <p className="font-semibold text-foreground">You&apos;ve already submitted feedback</p>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  To keep feedback meaningful, you can submit again in{" "}
                  <span className="font-bold text-amber-500">{formatRemaining(cooldownMs)}</span>.
                </p>
              </motion.div>
            ) : !isSubmitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3 pt-2"
              >
                <p className="text-sm text-muted-foreground mb-0.5">
                  Something to add next? We would love to hear it.
                </p>
                <input
                  ref={nameRef}
                  type="text"
                  placeholder="Your name"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition"
                />
                <textarea
                  ref={textRef}
                  placeholder="Share your idea or suggestion..."
                  rows={4}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition"
                />
                <div className="flex justify-end pt-1">
                  <TactileButton
                    className="w-full sm:w-[180px] h-[52px]"
                    onClick={!isLoading ? handleSubmit : undefined}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />SENDING...</>
                    ) : (
                      "SUBMIT"
                    )}
                  </TactileButton>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                variants={container}
                initial="hidden"
                animate="show"
                className="flex flex-col items-center justify-center gap-2 py-8 text-sm"
              >
                <motion.div
                  variants={item}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary"
                >
                  <Check strokeWidth={2.5} size={16} className="stroke-primary-foreground" />
                </motion.div>
                <motion.div variants={item} className="font-semibold text-foreground">
                  Feedback received!
                </motion.div>
                <motion.div variants={item} className="text-muted-foreground text-xs">
                  Thank you &mdash; every idea helps.
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

const container = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { y: 10, opacity: 0 },
  show: { y: 0, opacity: 1 },
};
