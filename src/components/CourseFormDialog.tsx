import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload, Plus, Trash2, FileText, Link as LinkIcon } from "lucide-react";
import { uploadToSupabase } from "@/lib/supabase-storage";
import { uploadCoursePdf } from "@/lib/supabase-server";

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
import { createCourseClient, updateCourseClient, type Course } from "@/lib/admin";
import { useAdminAuth } from "@/hooks/use-admin-auth";

const resourceSchema = z.object({
  label: z.string().min(1, "Label is required"),
  url: z.string().url("Must be a valid URL"),
});

const courseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be positive"),
  originalPrice: z.number().optional(),
  discount: z.number().optional(),
  thumbnail: z.string().optional(),
  instructor: z.string().min(1, "Instructor is required"),
  status: z.enum(["published", "draft"]),
  details: z.string().optional(),
  accessInfo: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  pdfPath: z.string().optional(),
  resources: z.array(resourceSchema).optional(),
  rating: z.number().min(0).max(5).optional(),
  ratingCount: z.number().min(0).optional(),
  publishedDate: z.string().optional(),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
  onSuccess?: () => void;
}



export function CourseFormDialog({
  open,
  onOpenChange,
  course,
  onSuccess,
}: CourseFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const [error, setError] = useState("");
  const { isAdmin, adminUser } = useAdminAuth();

  // Resource link management
  const [resourceLabel, setResourceLabel] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resources, setResources] = useState<{ label: string; url: string }[]>([]);

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
      instructor: "",
      status: "draft",
      details: "",
      accessInfo: "",
      metaTitle: "",
      metaDescription: "",
      pdfPath: "",
      resources: [],
      rating: undefined,
      ratingCount: undefined,
      publishedDate: "",
    },
  });

  const status = watch("status");
  const currentPdfPath = watch("pdfPath");

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
        instructor: course.instructor,
        status: course.status,
        details: course.details || "",
        accessInfo: course.accessInfo || "",
        metaTitle: course.metaTitle || "",
        metaDescription: course.metaDescription || "",
        pdfPath: course.pdfPath || "",
        resources: course.resources || [],
        rating: course.rating,
        ratingCount: course.ratingCount,
        publishedDate: course.publishedDate || "",
      });
      setResources(course.resources || []);
    } else {
      reset();
      setResources([]);
    }
  }, [course, reset]);

  const addResource = () => {
    if (!resourceLabel.trim() || !resourceUrl.trim()) return;
    try {
      new URL(resourceUrl); // validate URL
    } catch {
      return;
    }
    const updated = [...resources, { label: resourceLabel.trim(), url: resourceUrl.trim() }];
    setResources(updated);
    setValue("resources", updated);
    setResourceLabel("");
    setResourceUrl("");
  };

  const removeResource = (index: number) => {
    const updated = resources.filter((_, i) => i !== index);
    setResources(updated);
    setValue("resources", updated);
  };

  const onSubmit = async (values: CourseFormValues) => {
    setIsSubmitting(true);
    setError("");

    try {
      if (!isAdmin || !adminUser) {
        throw new Error("Not authenticated as admin");
      }

      const fileInput = document.getElementById('thumbnail-file') as HTMLInputElement;
      const file = fileInput?.files?.[0];
      
      let thumbnailUrl = values.thumbnail;

      if (file) {
        setIsUploading(true);
        try {
          thumbnailUrl = await uploadToSupabase(file, "course-thumbnails");
          values.thumbnail = thumbnailUrl;
        } catch (uploadErr) {
          throw new Error(
            uploadErr instanceof Error
              ? `Thumbnail upload failed: ${uploadErr.message}`
              : "Thumbnail upload failed. Please try again."
          );
        } finally {
          setIsUploading(false);
        }
      }

      // Handle PDF upload
      const pdfInput = document.getElementById('pdf-file') as HTMLInputElement;
      const pdfFile = pdfInput?.files?.[0];

      if (pdfFile) {
        setIsPdfUploading(true);
        try {
          // Read the file as base64 for server upload
          const base64 = await fileToBase64(pdfFile);
          const courseId = course?.id || `new-${Date.now()}`;
          
          const result = await uploadCoursePdf({
            data: {
              courseId,
              fileName: pdfFile.name,
              fileBase64: base64,
              fileType: pdfFile.type || "application/pdf",
            },
          });
          
          values.pdfPath = result.pdfPath;
        } catch (pdfErr) {
          throw new Error(
            pdfErr instanceof Error
              ? `PDF upload failed: ${pdfErr.message}`
              : "PDF upload failed. Please try again."
          );
        } finally {
          setIsPdfUploading(false);
        }
      }

      // Include resources
      values.resources = resources;

      if (course) {
        // Filter out undefined values to match Course type
        const updateData: Partial<Course> = {};
        Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined) {
            (updateData as any)[key] = value;
          }
        });
        await updateCourseClient(course.id, updateData);
      } else {
        await createCourseClient(values as any);
      }
      
      onSuccess?.();
      onOpenChange(false);
      reset();
      setResources([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save course");
      setIsUploading(false);
      setIsPdfUploading(false);
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
              <Label htmlFor="rating">Rating (0-5)</Label>
              <Input
                id="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="4.8"
                {...register("rating", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ratingCount">Rating Count</Label>
              <Input
                id="ratingCount"
                type="number"
                min="0"
                step="1"
                placeholder="1200"
                {...register("ratingCount", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publishedDate">Published Date</Label>
              <Input
                id="publishedDate"
                type="date"
                {...register("publishedDate")}
              />
            </div>
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
              <Label htmlFor="thumbnail-file">Thumbnail Picture</Label>
              <Input
                id="thumbnail-file"
                type="file"
                accept="image/*"
                className="cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail">Or Thumbnail URL</Label>
              <Input
                id="thumbnail"
                placeholder="https://example.com/image.jpg"
                {...register("thumbnail")}
              />
            </div>
          </div>

          {/* Course PDF Upload */}
          <div className="space-y-2 rounded-lg border border-border p-4">
            <Label htmlFor="pdf-file" className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-4 w-4" />
              Course PDF
            </Label>
            <p className="text-xs text-muted-foreground">
              Upload a PDF file for this course. It will be stored securely and only accessible to enrolled students via signed URLs.
            </p>
            <Input
              id="pdf-file"
              type="file"
              accept=".pdf,application/pdf"
              className="cursor-pointer"
            />
            {currentPdfPath && (
              <p className="text-xs text-green-600">
                ✓ Existing PDF: <code className="bg-secondary px-1 py-0.5 rounded text-xs">{currentPdfPath}</code>
              </p>
            )}
            {isPdfUploading && (
              <p className="text-xs text-brand-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Uploading PDF...
              </p>
            )}
          </div>

          {/* Course Resources (external links) */}
          <div className="space-y-3 rounded-lg border border-border p-4">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <LinkIcon className="h-4 w-4" />
              Course Resources
            </Label>
            <p className="text-xs text-muted-foreground">
              Add external resource links (YouTube, GitHub, documentation, etc.)
            </p>

            {/* Existing resources */}
            {resources.length > 0 && (
              <div className="space-y-2">
                {resources.map((res, index) => (
                  <div key={index} className="flex items-center gap-2 rounded bg-secondary/50 p-2 text-sm">
                    <span className="font-medium flex-shrink-0">{res.label}:</span>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 truncate hover:underline"
                    >
                      {res.url}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => removeResource(index)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new resource */}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="resource-label" className="text-xs">Label</Label>
                <Input
                  id="resource-label"
                  placeholder="e.g., YouTube Tutorial"
                  value={resourceLabel}
                  onChange={(e) => setResourceLabel(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-[2] space-y-1">
                <Label htmlFor="resource-url" className="text-xs">URL</Label>
                <Input
                  id="resource-url"
                  placeholder="https://..."
                  value={resourceUrl}
                  onChange={(e) => setResourceUrl(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={addResource}
                disabled={!resourceLabel.trim() || !resourceUrl.trim()}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
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
            <Button type="submit" disabled={isSubmitting || isUploading || isPdfUploading}>
              {isSubmitting || isUploading || isPdfUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isPdfUploading ? "Uploading PDF..." : isUploading ? "Uploading..." : course ? "Update Course" : "Create Course"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Convert a File to a base64 string (data only, no prefix) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:mime;base64, prefix
      const base64 = result.split(",")[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}