import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  Loader2,
  X,
  Check,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Percent,
  Eye,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { AdminShell } from "@/components/layout/AdminShell";
import { useAdminAuth } from "@/features/auth/use-admin-auth";
import {
  getBundleOffersClient,
  createBundleOfferClient,
  updateBundleOfferClient,
  deleteBundleOfferClient,
  type BundleOffer,
} from "@/lib/bundle-offers";
import { getCoursesClient, type Course } from "@/services/database/admin";
import { uploadToSupabase } from "@/services/storage/supabase-storage";

export const Route = createFileRoute("/admin/offers")({
  head: () => ({ meta: [{ title: "Exclusive Bundle Offers | Admin" }] }),
  component: AdminOffers,
});

// ---- Offer Form Dialog ----
function OfferFormDialog({
  open,
  onOpenChange,
  offer,
  allCourses,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: BundleOffer | null;
  allCourses: Course[];
  onSuccess: () => void;
}) {
  const isEditing = !!offer;
  const [title, setTitle] = useState(offer?.title ?? "");
  const [subtitle, setSubtitle] = useState(offer?.subtitle ?? "");
  const [imageUrl, setImageUrl] = useState(offer?.imageUrl ?? "");
  const [isExclusiveBanner, setIsExclusiveBanner] = useState(offer?.isExclusiveBanner ?? true);
  const [selectedIds, setSelectedIds] = useState<string[]>(offer?.courseIds ?? []);
  const [bundlePrice, setBundlePrice] = useState<string>(offer?.bundlePrice?.toString() ?? "");
  const [active, setActive] = useState(offer?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(offer?.title ?? "");
      setSubtitle(offer?.subtitle ?? "");
      setImageUrl(offer?.imageUrl ?? "");
      setIsExclusiveBanner(offer?.isExclusiveBanner ?? true);
      setSelectedIds(offer?.courseIds ?? []);
      setBundlePrice(offer?.bundlePrice?.toString() ?? "");
      setActive(offer?.active ?? true);
      setError("");
    }
  }, [open, offer]);

  const toggleCourse = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const individualTotal = selectedIds.reduce((sum, id) => {
    const c = allCourses.find((c) => c.id === id);
    return sum + (c?.price ?? 0);
  }, 0);

  const parsedPrice = parseFloat(bundlePrice);
  const validPrice = !isNaN(parsedPrice) && parsedPrice > 0;
  const savingsAmount = validPrice ? Math.max(0, individualTotal - parsedPrice) : 0;
  const savingsPercent =
    individualTotal > 0 && validPrice
      ? Math.round((savingsAmount / individualTotal) * 100)
      : 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    setError("");

    try {
      const publicUrl = await uploadToSupabase(file, "course-thumbnails", "exclusive-offers");
      setImageUrl(publicUrl);
    } catch (uploadErr) {
      setError(
        uploadErr instanceof Error
          ? `Image upload failed: ${uploadErr.message}`
          : "Failed to upload banner image. You can also paste an image URL directly."
      );
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Title is optional - banner image can stand alone
    if (selectedIds.length < 2) {
      setError("Select at least 2 courses for a bundle");
      return;
    }
    if (!validPrice) {
      setError("Enter a valid bundle price");
      return;
    }
    if (parsedPrice >= individualTotal) {
      setError(
        `Bundle price (₹${parsedPrice}) must be less than individual total (₹${individualTotal}) to provide savings`
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        imageUrl: imageUrl.trim(),
        isExclusiveBanner,
        courseIds: selectedIds,
        bundlePrice: parsedPrice,
        active,
      };

      if (isEditing) {
        await updateBundleOfferClient(offer!.id, payload);
      } else {
        await createBundleOfferClient(payload);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save offer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {isEditing ? "Edit Exclusive Offer" : "Create Exclusive Offer"}
          </DialogTitle>
          <DialogDescription>
            Bundle multiple courses together at any promotional price. You can attach a rectangular
            banner that appears directly on the home page between the Navbar and "Learn. Build. Grow.".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="offer-title" className="font-semibold">
              Offer Title <span className="text-xs text-muted-foreground font-normal">(optional — not needed if your banner image already has text)</span>
            </Label>
            <Input
              id="offer-title"
              placeholder="e.g. Master Developer Bundle (leave blank if banner image has text)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Subtitle / Tagline */}
          <div className="space-y-1.5">
            <Label htmlFor="offer-subtitle" className="font-semibold">
              Tagline / Subtitle <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="offer-subtitle"
              placeholder="e.g. Limited Festive Deal — Unlock lifetime access to all 3 courses!"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>

          {/* Rectangular Banner Image Upload & Preview */}
          <div className="space-y-3 rounded-xl border border-border/80 bg-secondary/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  Rectangular Banner Image
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Appears in wide rectangle format on the home page (recommended ratio: 16:6 or 21:9)
                </p>
              </div>
              {imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setImageUrl("")}
                  className="text-xs text-destructive hover:text-destructive h-7 px-2"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Remove Image
                </Button>
              )}
            </div>

            {/* Banner preview if image exists */}
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-border shadow-sm group bg-black/10">
                <div className="aspect-[21/9] sm:aspect-[16/6] w-full max-h-48 overflow-hidden relative">
                  <img
                    src={imageUrl}
                    alt="Offer Banner Preview"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                    <span className="text-xs text-white/90 font-medium truncate">
                      {title || "Offer Banner Preview"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="offer-banner-upload"
                  disabled={uploadingImage}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs font-semibold h-9"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-2" /> Upload Banner File
                    </>
                  )}
                </Button>
              </div>

              <div>
                <Input
                  placeholder="Or paste image URL (https://...)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Feature as Home Page Banner Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-bold text-foreground">Feature on Home Page</p>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Top Banner
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground max-w-md">
                Display this rectangular banner between Navbar and "Learn. Build. Grow.". Clicking it
                instantly adds all bundled courses into the visitor's cart locked at this price!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsExclusiveBanner((v) => !v)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isExclusiveBanner ? "bg-amber-500" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isExclusiveBanner ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Course selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Select Bundled Courses *</Label>
              <span className="text-xs font-semibold text-primary">
                {selectedIds.length} course{selectedIds.length === 1 ? "" : "s"} selected
              </span>
            </div>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border bg-card">
              {allCourses.map((course) => {
                const selected = selectedIds.includes(course.id);
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => toggleCourse(course.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/50 transition-colors ${
                      selected ? "bg-primary/5 border-l-4 border-primary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                          selected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{course.title}</p>
                        <p className="text-xs text-muted-foreground">Original: ₹{course.price}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">₹{course.price}</span>
                  </button>
                );
              })}
              {allCourses.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No published courses found
                </div>
              )}
            </div>
          </div>

          {/* Bundle pricing & Profit preview */}
          <div className="space-y-3 rounded-xl border border-border/80 bg-secondary/15 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bundle-price" className="font-semibold">Bundle Offer Price (₹) *</Label>
                <Input
                  id="bundle-price"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 19"
                  value={bundlePrice}
                  onChange={(e) => setBundlePrice(e.target.value)}
                  className="font-bold text-base"
                />
              </div>

              <div className="space-y-1 text-xs sm:text-right flex flex-col justify-end">
                <span className="text-muted-foreground">Individual Courses Total:</span>
                <span className="text-base font-extrabold text-foreground">₹{individualTotal}</span>
              </div>
            </div>

            {/* Live Profit / Savings Calculations Box */}
            {selectedIds.length >= 2 && validPrice && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-green-700 dark:text-green-300">
                  <span className="flex items-center gap-1.5">
                    <Percent className="h-4 w-4 text-green-600 dark:text-green-400" />
                    Customer Profit / Savings:
                  </span>
                  <span className="text-sm font-black text-green-600 dark:text-green-400">
                    {savingsPercent}% OFF
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-green-700 dark:text-green-300">
                  <span>Buyer Saves:</span>
                  <span className="font-extrabold text-sm">₹{savingsAmount.toFixed(0)}</span>
                </div>
                <p className="text-[11px] text-green-600/90 dark:text-green-400/90 pt-0.5">
                  ✓ Buyers get {selectedIds.length} courses worth ₹{individualTotal} for only ₹{parsedPrice}!
                </p>
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Offer Status: {active ? "Active" : "Inactive"}</p>
              <p className="text-xs text-muted-foreground">
                {active
                  ? "Offer is live and eligible to be applied in cart and shown on home page."
                  : "Offer is disabled and will not show or apply."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                active ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive font-medium">
              {error}
            </div>
          )}

          <Separator />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploadingImage} className="font-bold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isEditing ? "Save Changes" : "Create Exclusive Offer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Main Page ----
function AdminOffers() {
  const { isAdmin, adminUser } = useAdminAuth();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<BundleOffer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ["admin-bundle-offers"],
    queryFn: getBundleOffersClient,
    enabled: isAdmin && !!adminUser && typeof window !== "undefined",
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: coursesData } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => getCoursesClient(),
    enabled: isAdmin && !!adminUser && typeof window !== "undefined",
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const allCourses = coursesData?.courses ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateBundleOfferClient(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-bundle-offers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBundleOfferClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bundle-offers"] });
      setDeleteTarget(null);
    },
  });

  const getCourseTitle = (id: string) => allCourses.find((c) => c.id === id)?.title ?? id;

  const getIndividualTotal = (offer: BundleOffer) =>
    offer.courseIds.reduce((sum, id) => {
      const c = allCourses.find((c) => c.id === id);
      return sum + (c?.price ?? 0);
    }, 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-bundle-offers"] });
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" />
              Exclusive Offers & Bundles
            </h2>
            <p className="text-muted-foreground mt-1">
              Create bundled course deals at promotional prices with rectangular home page banners
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            New Offer
          </Button>
        </div>

        {/* Info card */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-foreground/85 leading-relaxed">
              <strong>How Exclusive Offers work:</strong> Bundle 2 or more courses together at any
              custom price and attach a rectangular promotional banner. When visitors click the
              banner on the home page (located between Navbar and "Learn. Build. Grow."), all bundled
              courses are automatically placed in their cart locked at the offer price, showing them
              their exact total profit & savings percentage!
            </p>
          </CardContent>
        </Card>

        {/* Offers list */}
        {offersLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : offers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">No exclusive bundle offers yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first offer to give customers bundle discounts with home page banner promotions
              </p>
              <Button className="mt-4 font-semibold" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create First Offer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5">
            {offers.map((offer) => {
              const individualTotal = getIndividualTotal(offer);
              const savings = Math.max(0, individualTotal - offer.bundlePrice);
              const savingsPct =
                individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;

              return (
                <Card
                  key={offer.id}
                  className={`overflow-hidden transition-all hover:shadow-lg border-border ${
                    !offer.active ? "opacity-60 bg-muted/20" : "bg-card"
                  }`}
                >
                  {/* Rectangular Banner Image if uploaded */}
                  {offer.imageUrl && (
                    <div className="relative w-full h-36 sm:h-44 overflow-hidden bg-black/10 border-b border-border">
                      <img
                        src={offer.imageUrl}
                        alt={offer.title || "Exclusive Offer"}
                        className="w-full h-full object-cover"
                      />
                      {offer.title && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
                          <div>
                            <p className="text-white font-bold text-lg drop-shadow-sm">{offer.title}</p>
                            {offer.subtitle && (
                              <p className="text-white/80 text-xs drop-shadow-sm mt-0.5">{offer.subtitle}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!offer.imageUrl && (
                            <CardTitle className="text-lg font-bold">
                              {offer.title || "Exclusive Course Bundle"}
                            </CardTitle>
                          )}
                          {offer.imageUrl && !offer.title && (
                            <CardTitle className="text-sm font-semibold text-muted-foreground italic">
                              Image Banner Offer ({offer.courseIds.length} courses)
                            </CardTitle>
                          )}
                          <Badge variant={offer.active ? "default" : "secondary"}>
                            {offer.active ? "Active" : "Inactive"}
                          </Badge>
                          {offer.isExclusiveBanner && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold">
                              <Sparkles className="h-3 w-3" /> Featured Home Banner
                            </Badge>
                          )}
                          {savings > 0 && (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-300 dark:border-green-700 bg-green-500/10 font-bold"
                            >
                              {savingsPct}% PROFIT / SAVINGS
                            </Badge>
                          )}
                        </div>
                        {offer.subtitle && !offer.imageUrl && (
                          <CardDescription className="mt-1 text-sm text-foreground/80">
                            {offer.subtitle}
                          </CardDescription>
                        )}
                        <CardDescription className="mt-1 text-xs">
                          {offer.courseIds.length} courses included in this bundle
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Toggle active */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleMutation.mutate({ id: offer.id, active: !offer.active })
                          }
                          disabled={toggleMutation.isPending}
                          title={offer.active ? "Deactivate" : "Activate"}
                        >
                          {offer.active ? (
                            <X className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingOffer(offer)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(offer.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Course list */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {offer.courseIds.map((id) => (
                        <span
                          key={id}
                          className="text-xs bg-secondary rounded-lg px-2.5 py-1 font-medium text-foreground flex items-center gap-1.5 border border-border"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                          {getCourseTitle(id)}
                        </span>
                      ))}
                    </div>

                    <Separator className="mb-4" />

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-3 gap-4 text-center rounded-xl bg-secondary/30 p-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Individual Total</p>
                        <p className="font-display text-lg font-bold text-muted-foreground line-through">
                          ₹{individualTotal}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Exclusive Bundle Price</p>
                        <p className="font-display text-xl font-black text-primary">
                          ₹{offer.bundlePrice}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Customer Profit / Savings</p>
                        <p className="font-display text-lg font-bold text-green-600 dark:text-green-400">
                          ₹{savings} ({savingsPct}%)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Offer Dialog */}
      <OfferFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        offer={null}
        allCourses={allCourses.filter((c) => c.status === "published")}
        onSuccess={invalidate}
      />

      {/* Edit Offer Dialog */}
      {editingOffer && (
        <OfferFormDialog
          open={!!editingOffer}
          onOpenChange={(open) => {
            if (!open) setEditingOffer(null);
          }}
          offer={editingOffer}
          allCourses={allCourses.filter((c) => c.status === "published")}
          onSuccess={() => {
            invalidate();
            setEditingOffer(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle Offer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the bundle offer. Existing purchases will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
