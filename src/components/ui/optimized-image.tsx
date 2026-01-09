import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  fallback?: string;
}

/**
 * Optimized Image Component with lazy loading and error handling
 */
export const OptimizedImage = ({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  onLoad,
  onError,
  fallback = '/placeholder.svg',
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(priority ? src : '');

  useEffect(() => {
    if (!priority) {
      // Lazy load images that are not priority
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.disconnect();
            }
          });
        },
        {
          rootMargin: '50px', // Start loading 50px before the image is visible
        }
      );

      const element = document.getElementById(`img-${src}`);
      if (element) {
        observer.observe(element);
      }

      return () => observer.disconnect();
    }
  }, [src, priority]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    setImageSrc(fallback);
    onError?.();
  };

  return (
    <div
      id={`img-${src}`}
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
        />
      )}

      {hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary text-muted-foreground text-sm">
          Failed to load image
        </div>
      )}
    </div>
  );
};

/**
 * Image gallery component with optimized loading
 */
interface ImageGalleryProps {
  images: string[];
  alt: string;
  className?: string;
}

export const ImageGallery = ({ images, alt, className }: ImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Image */}
      <OptimizedImage
        src={images[currentIndex]}
        alt={`${alt} - Image ${currentIndex + 1}`}
        className="w-full h-96 rounded-lg"
        priority={currentIndex === 0}
      />

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-6 gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'relative h-16 rounded border-2 transition-colors overflow-hidden',
                index === currentIndex
                  ? 'border-accent'
                  : 'border-transparent hover:border-accent/50'
              )}
            >
              <OptimizedImage
                src={image}
                alt={`${alt} thumbnail ${index + 1}`}
                className="w-full h-full"
                priority={index < 6}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Utility to optimize image URL (for CDN or image processing service)
 */
export const getOptimizedImageUrl = (
  src: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): string => {
  // TODO: Integrate with image CDN/processing service (e.g., Cloudinary, imgix)
  // For now, return original URL
  
  // Example with Cloudinary:
  // const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  // if (src.includes('cloudinary')) {
  //   const params = [];
  //   if (options.width) params.push(`w_${options.width}`);
  //   if (options.height) params.push(`h_${options.height}`);
  //   if (options.quality) params.push(`q_${options.quality}`);
  //   if (options.format) params.push(`f_${options.format}`);
  //   
  //   return src.replace('/upload/', `/upload/${params.join(',')}/`);
  // }

  return src;
};
