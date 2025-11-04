/**
 * Optimized Image Component
 *
 * A wrapper around Next.js Image component with additional optimizations:
 * - Lazy loading by default
 * - Blur placeholder
 * - Automatic format optimization (WebP/AVIF)
 * - Responsive sizing
 * - Error handling
 */

"use client";

import NextImage, { ImageProps as NextImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<NextImageProps, "placeholder"> {
  fallback?: string;
  containerClassName?: string;
  showPlaceholder?: boolean;
  aspectRatio?: "square" | "video" | "portrait" | "auto";
}

const aspectRatioClasses = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
  auto: "",
};

export function OptimizedImage({
  src,
  alt,
  fallback = "/placeholder.png",
  containerClassName,
  className,
  showPlaceholder = true,
  aspectRatio = "auto",
  loading = "lazy",
  quality = 85,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const imageSrc = error ? fallback : src;

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        aspectRatio && aspectRatioClasses[aspectRatio],
        containerClassName
      )}
    >
      {isLoading && showPlaceholder && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <NextImage
        src={imageSrc}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        loading={loading}
        quality={quality}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
        {...props}
      />
    </div>
  );
}

/**
 * Avatar Image Component
 * Optimized for user avatars with circular crop
 */
export function AvatarImage({
  src,
  alt,
  size = 40,
  className,
  ...props
}: Omit<OptimizedImageProps, "width" | "height"> & { size?: number }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      aspectRatio="square"
      {...props}
    />
  );
}

/**
 * Background Image Component
 * Optimized for background images with cover/contain modes
 */
export function BackgroundImage({
  src,
  alt = "Background",
  objectFit = "cover",
  className,
  ...props
}: OptimizedImageProps & { objectFit?: "cover" | "contain" }) {
  return (
    <div className="absolute inset-0">
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className={cn(
          objectFit === "cover" ? "object-cover" : "object-contain",
          className
        )}
        priority
        {...props}
      />
    </div>
  );
}

/**
 * Responsive Image Component
 * Automatically adjusts to container width
 */
export function ResponsiveImage({
  src,
  alt,
  aspectRatio = "video",
  ...props
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={1920}
      height={1080}
      aspectRatio={aspectRatio}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      {...props}
    />
  );
}
