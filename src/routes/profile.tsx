import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Save, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/use-auth";
import { getAuthInstance } from "@/services/database/firebase";
import {
  getUserProfile,
  updateUserNotificationPreference,
  updateUserProfileName,
} from "@/services/database/user-profile";
import { requestEmailChangeOtp, verifyEmailChangeOtp } from "@/services/auth/email-change-server";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading, signOutUser } = useAuth();
  
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // OTP flow state
  const [otpStep, setOtpStep] = useState<"initial" | "requesting" | "verify" | "verifying">("initial");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.uid],
    queryFn: () => user?.uid ? getUserProfile(user.uid) : null,
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (userProfile) {
      setNotificationsEnabled(userProfile.notificationsEnabled);
      if (userProfile.name) {
        setUserName(userProfile.name);
      }
    }
  }, [userProfile]);

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      // Save name
      await updateUserProfileName(user.uid, userName.trim());
      // Save notifications
      await updateUserNotificationPreference(user.uid, user.email || "", notificationsEnabled);
      
      queryClient.setQueryData(["user-profile", user.uid], (old: any) => 
        old ? { ...old, name: userName.trim(), notificationsEnabled } : undefined
      );

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!user?.uid) return;
    
    if (!email.trim() || email.trim() === user.email) {
      toast.error("Please enter a new email address.");
      return;
    }

    setOtpStep("requesting");
    try {
      const res = await requestEmailChangeOtp({ data: { uid: user.uid, newEmail: email.trim() } });
      if (res.success) {
        setOtpStep("verify");
        toast.success("OTP sent to your new email.");
      } else {
        toast.error(res.error || "Failed to send OTP.");
        setOtpStep("initial");
      }
    } catch (error: any) {
      console.error("Error requesting OTP:", error);
      toast.error(error.message || "Failed to send OTP.");
      setOtpStep("initial");
    }
  };

  const handleVerifyOtp = async () => {
    if (!user?.uid) return;
    if (otp.length < 6) {
      toast.error("Please enter the 6-digit OTP.");
      return;
    }

    setOtpStep("verifying");
    try {
      const res = await verifyEmailChangeOtp({ data: { uid: user.uid, otp: otp.trim() } });
      if (res.success) {
        toast.success("Email changed successfully!");
        setOtpStep("initial");
        setOtp("");
        
        // Update the client-side user object without reloading the page
        const auth = getAuthInstance();
        if (auth.currentUser) {
          await auth.currentUser.reload();
          if ('newEmail' in res && res.newEmail) {
            setEmail(res.newEmail as string);
          }
        }
      } else {
        toast.error(res.error || "Invalid OTP.");
        setOtpStep("verify");
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast.error(error.message || "Failed to verify OTP.");
      setOtpStep("verify");
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden text-foreground selection:bg-primary/20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background via-background to-secondary/20 -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-foreground/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your account settings and notification preferences.
            </p>
          </div>

          <div className="space-y-6 bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-sm">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="max-w-md"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2 pt-4 border-t border-border">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="max-w-md"
                  disabled={otpStep === "verify" || otpStep === "verifying"}
                />
                {otpStep === "initial" || otpStep === "requesting" ? (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => void handleRequestOtp()}
                    disabled={otpStep === "requesting" || email === user?.email}
                  >
                    {otpStep === "requesting" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Change Email
                  </Button>
                ) : null}
              </div>

              {otpStep === "verify" || otpStep === "verifying" ? (
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="space-y-1 w-full max-w-[200px]">
                    <Label htmlFor="otp">Enter 6-digit OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="tracking-widest font-mono"
                    />
                  </div>
                  <div className="flex items-end h-[60px] pb-1 gap-2">
                    <Button 
                      type="button" 
                      onClick={() => void handleVerifyOtp()}
                      disabled={otpStep === "verifying" || otp.length < 6}
                    >
                      {otpStep === "verifying" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Verify OTP
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setOtpStep("initial");
                        setOtp("");
                      }}
                      disabled={otpStep === "verifying"}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground mt-2">
                We will send an OTP to your new email to verify it. If an account already exists with that email, it will be replaced.
              </p>
            </div>

            {/* Notifications Toggle */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications" className="text-base cursor-pointer">
                    New Course Alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified earliest for our newly released courses
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t border-border flex flex-col sm:flex-row gap-3 justify-end items-center mt-8">
              <Button 
                variant="ghost" 
                onClick={() => void signOutUser()} 
                className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
              <Button 
                onClick={() => void handleSaveProfile()} 
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Profile Settings
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
