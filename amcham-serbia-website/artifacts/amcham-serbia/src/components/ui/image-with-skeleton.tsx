import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  skeletonClassName?: string;
}

/** Drop-in <img> replacement for a sized, relatively-positioned parent — shows a pulse skeleton until the image loads instead of a blank gap. */
export function ImageWithSkeleton({ className, skeletonClassName, onLoad, onError, ...props }: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && <Skeleton className={cn('absolute inset-0 rounded-none', skeletonClassName)} />}
      <img
        {...props}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          // A broken image should stop hiding behind a permanently-pulsing skeleton.
          setLoaded(true);
          onError?.(e);
        }}
        className={cn(className, 'transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
      />
    </>
  );
}
