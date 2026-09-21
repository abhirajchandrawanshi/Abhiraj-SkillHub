import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  Loader2,
  X,
  Check,
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

export const Route = createFileRoute("/admin/offers")({
  head: () => ({ meta: [{ title: "Bundle Offers | Admin" }] }),
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
  const [selectedIds, setSelectedIds] = useState<string[]>(offer?.courseIds ?? []);
  const [bundlePrice, setBundlePrice] = useState<string>(offer?.bundlePrice?.toString() ?? "");
  const [active, setActive] = useState(offer?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleCourse = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const individualTotal = selectedIds.reduce((sum, id) => {
    const c = allCourses.find((c) => c.id === id);
    return sum + (c?.price ?? 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) { setError("Title is required"); return; }
    if (selectedIds.length < 2) { setError("Select at least 2 courses for a bundle"); return; }
    const price = parseFloat(bundlePrice);
    if (!bundlePrice || isNaN(price) || price <= 0) { setError("Enter a valid bundle price"); return; }
    if (price >= individualTotal) {
      setError(`Bundle price (₹${price}) must be less than individual total (₹${individualTotal})`);
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await updateBundleOfferClient(offer!.id, {
          title: title.trim(),
          courseIds: selectedIds,
          bundlePrice: price,
          active,
        });
      } else {
        await createBundleOfferClient({
          title: title.trim(),
          courseIds: selectedIds,
          bundlePrice: price,
          active,
        });
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Bundle Offer" : "Create Bundle Offer"}</DialogTitle>
          <DialogDescription>
            Select 2+ courses and set a discounted bundle price.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="offer-title">Offer Title</Label>
            <Input
              id="offer-title"
              placeholder="e.g. Python + C++ Bundle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Course selection */}
          <div className="space-y-2">
            <Label>Select Courses ({selectedIds.length} selected)</Label>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {allCourses.map((course) => {
                const selected = selectedIds.includes(course.id);
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => toggleCourse(course.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/50 transition-colors ${
                      selected ? "bg-primary/5 border-l-2 border-primary" : ""
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{course.title}</p>
                      <p className="text-xs text-muted-foreground">₹{course.price}</p>
                    </div>
                    {selected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
              {allCourses.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No published courses found
                </div>
              )}
            </div>
            {selectedIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Individual total: ₹{individualTotal}
              </p>
            )}
          </div>

          {/* Bundle price */}
          <div className="space-y-1.5">
            <Label htmlFor="bundle-price">Bundle Price (₹)</Label>
            <Input
              id="bundle-price"
              type="number"
              min="1"
              step="0.01"
              placeholder="e.g. 19"
              value={bundlePrice}
              onChange={(e) => setBundlePrice(e.target.value)}
            />
            {selectedIds.length >= 2 && bundlePrice && !isNaN(parseFloat(bundlePrice)) && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Discount: ₹{(individualTotal - parseFloat(bundlePrice)).toFixed(0)} off
                ({Math.round((1 - parseFloat(bundlePrice) / individualTotal) * 100)}% savings)
              </p>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Show this offer to customers</p>
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
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Separator />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isEditing ? "Save Changes" : "Create Offer"}
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
  });

  const { data: coursesData } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => getCoursesClient(),
    enabled: isAdmin && !!adminUser && typeof window !== "undefined",
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

  const getCourseTitle = (id: string) =>
    allCourses.find((c) => c.id === id)?.title ?? id;

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
              <Tag className="h-6 w-6 text-primary" />
              Bundle Offers
            </h2>
            <p className="text-muted-foreground mt-1">
              Create discounted bundles when users purchase multiple courses together
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Offer
          </Button>
        </div>

        {/* Info card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-foreground/80">
              <strong>How it works:</strong> When a user adds courses to their cart that match an active bundle, 
              the discounted bundle price is automatically applied at checkout. You can create any combination — 
              e.g. Python + C++ together for ₹19 instead of ₹9 + ₹9.
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
              <Tag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">No bundle offers yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first offer to give customers a discount on course bundles
              </p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create First Offer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {offers.map((offer) => {
              const individualTotal = getIndividualTotal(offer);
              const savings = individualTotal - offer.bundlePrice;
              const savingsPct = individualTotal > 0
                ? Math.round((savings / individualTotal) * 100)
                : 0;

              return (
                <Card key={offer.id} className={`transition-shadow hover:shadow-md ${!offer.active ? "opacity-60" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{offer.title}</CardTitle>
                          <Badge variant={offer.active ? "default" : "secondary"}>
                            {offer.active ? "Active" : "Inactive"}
                          </Badge>
                          {savings > 0 && (
                            <Badge variant="outline" className="text-green-600 border-green-300 dark:border-green-700">
                              {savingsPct}% off
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1.5">
                          {offer.courseIds.length} courses included
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Toggle active */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMutation.mutate({ id: offer.id, active: !offer.active })}
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

                  <CardContent>
                    {/* Course list */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {offer.courseIds.map((id) => (
                        <span
                          key={id}
                          className="text-xs bg-secondary rounded-full px-2.5 py-1 font-medium"
                        >
                          {getCourseTitle(id)}
                        </span>
                      ))}
                    </div>

                    <Separator className="mb-4" />

                    {/* Pricing */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Individual Total</p>
                        <p className="font-display text-lg font-bold text-muted-foreground line-through">₹{individualTotal}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bundle Price</p>
                        <p className="font-display text-lg font-bold text-primary">₹{offer.bundlePrice}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Savings</p>
                        <p className="font-display text-lg font-bold text-green-600 dark:text-green-400">₹{savings}</p>
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
          onOpenChange={(open) => { if (!open) setEditingOffer(null); }}
          offer={editingOffer}
          allCourses={allCourses.filter((c) => c.status === "published")}
          onSuccess={() => {
            invalidate();
            setEditingOffer(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle Offer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the bundle offer. Existing purchases are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }}
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
