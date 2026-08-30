import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createCourse, updateCourse, type Course } from "@/lib/admin";

const courseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be positive"),
  originalPrice: z.number().optional(),
  discount: z.number().optional(),
  thumbnail: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  instructor: z.string().min(1, "Instructor is required"),
  duration: z.string().min(1, "Duration is required"),
  status: z.enum(["published", "draft"]),
  details: z.string().optional(),
  accessInfo: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
  onSuccess?: () => void;
}

const categories = [
  "Programming",
  "Web Development",
  "Data Science",
  "Mobile Development",
  "Design",
  "Business",
  "Marketing",
  "Other",
];

export function CourseFormDialog({
  open,
  onOpenChange,
  course,
  onSuccess,
}: CourseFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      description: "",
      price: 0,
      originalPrice: undefined,
      discount: undefined,
      thumbnail: "",
      category: "",
      instructor: "",
      duration: "",
      status: "draft",
      details: "",
      accessInfo: "",
      metaTitle: "",
      metaDescription: "",
    },
  });

  const status = watch("status");

  // Populate form when editing
  useEffect(() => {
    if (course) {
      reset({
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        price: course.price,
        originalPrice: course.originalPrice,
        discount: course.discount,
        thumbnail: course.thumbnail || "",
        category: course.category,
        instructor: course.instructor,
        duration: course.duration,
        status: course.status,
        details: course.details || "",
        accessInfo: course.accessInfo || "",
        metaTitle: course.metaTitle || "",
        metaDescription: course.metaDescription || "",
      });
    } else {
      reset();
    }
  }, [course, reset]);

  const onSubmit = async (values: CourseFormValues) => {
    setIsSubmitting(true);
    setError("");

    try {
      const { auth } = await import("@/firebase");
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Not authenticated as admin");

      if (course) {
        await updateCourse({ id: course.id, ...values, idToken });
      } else {
        await createCourse({ ...values, idToken });
      }
      
      onSuccess?.();
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save course");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{course ? "Edit Course" : "Add New Course"}</DialogTitle>
          <DialogDescription>
            {course ? "Update course information" : "Create a new course for your platform"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Complete Python Masterclass"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor *</Label>
              <Input
                id="instructor"
                placeholder="e.g., John Doe"
                {...register("instructor")}
              />
              {errors.instructor && (
                <p className="text-sm text-destructive">{errors.instructor.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle *</Label>
            <Input
              id="subtitle"
              placeholder="e.g., From beginner to advanced in 12 weeks"
              {...register("subtitle")}
            />
            {errors.subtitle && (
              <p className="text-sm text-destructive">{errors.subtitle.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Detailed description of the course..."
              rows={4}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1"
                placeholder="999"
                {...register("price", { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="originalPrice">Original Price (₹)</Label>
              <Input
                id="originalPrice"
                type="number"
                min="0"
                step="1"
                placeholder="1999"
                {...register("originalPrice", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="50"
                {...register("discount", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={watch("category")}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration *</Label>
              <Input
                id="duration"
                placeholder="e.g., 12 weeks, 8 hours"
                {...register("duration")}
              />
              {errors.duration && (
                <p className="text-sm text-destructive">{errors.duration.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail URL</Label>
            <Input
              id="thumbnail"
              placeholder="https://example.com/image.jpg"
              {...register("thumbnail")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Course Details</Label>
            <Textarea
              id="details"
              placeholder="Additional course information, curriculum details, etc."
              rows={3}
              {...register("details")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessInfo">Access Information</Label>
            <Textarea
              id="accessInfo"
              placeholder="What users get after purchase (lifetime access, certificates, etc.)"
              rows={2}
              {...register("accessInfo")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="metaTitle">Meta Title (SEO)</Label>
              <Input
                id="metaTitle"
                placeholder="SEO title for search engines"
                {...register("metaTitle")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">Meta Description (SEO)</Label>
              <Input
                id="metaDescription"
                placeholder="SEO description for search engines"
                {...register("metaDescription")}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="status"
              checked={status === "published"}
              onCheckedChange={(checked) =>
                setValue("status", checked ? "published" : "draft")
              }
            />
            <Label htmlFor="status">Publish immediately</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {course ? "Update Course" : "Create Course"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}