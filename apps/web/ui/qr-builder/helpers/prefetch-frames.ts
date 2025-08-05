import { StaticImageData } from "next/image";

export function prefetchFrames(frames: StaticImageData[]): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  frames.forEach(frame => {
    const { src } = frame;
    
    const existingLink = document.querySelector(`link[href="${src}"][rel="prefetch"]`);
    if (existingLink) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = src;
    link.as = 'image';
    
    link.setAttribute('crossorigin', 'anonymous');
    
    document.head.appendChild(link);
  });
}

export function removePrefetchFrames(frames: StaticImageData[]): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  frames.forEach(frame => {
    const { src } = frame;
    const link = document.querySelector(`link[href="${src}"][rel="prefetch"]`);
    if (link) {
      link.remove();
    }
  });
} 