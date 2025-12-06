"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  editable?: boolean;
  onImageChange?: (newImageUrl: string | null) => void;
  className?: string;
}

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-32 w-32",
};

const iconSizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-10 w-10",
};

export function ProfileAvatar({
  src,
  name,
  size = "md",
  editable = false,
  onImageChange,
  className,
}: ProfileAvatarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(src);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate initials from name
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please upload a JPEG, PNG, WebP, or GIF image.",
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "Maximum file size is 5MB.",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/auth/profile-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to upload image");
      }

      setImageUrl(data.data.profileImageUrl);
      onImageChange?.(data.data.profileImageUrl);
      
      toast.success("Profile picture updated", {
        description: "Your new profile picture has been saved.",
      });
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Failed to upload image",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    setIsUploading(true);

    try {
      const response = await fetch("/api/auth/profile-image", {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to remove image");
      }

      setImageUrl(null);
      onImageChange?.(null);
      
      toast.success("Profile picture removed");
    } catch (error) {
      toast.error("Failed to remove image", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("relative group", className)}>
      <Avatar className={cn(sizeClasses[size], "border-2 border-border")}>
        <AvatarImage src={imageUrl || undefined} alt={name || "Profile"} />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {isUploading ? (
            <Loader2 className={cn(iconSizeClasses[size], "animate-spin")} />
          ) : (
            getInitials(name)
          )}
        </AvatarFallback>
      </Avatar>

      {editable && (
        <>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />

          {/* Edit overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className={cn(
              "absolute inset-0 bg-black/50 rounded-full",
              sizeClasses[size]
            )} />
            <div className="relative flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Camera className="h-4 w-4" />
              </Button>
              {imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white/20 hover:bg-destructive/80 text-white"
                  onClick={handleRemoveImage}
                  disabled={isUploading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Camera badge for small sizes */}
          {size === "sm" && (
            <button
              type="button"
              className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Camera className="h-3 w-3" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
