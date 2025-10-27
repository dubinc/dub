import { StaticImageData } from "next/image";

export const frameMemoryCache = new Map<string, HTMLElement>();

export async function loadAndCacheFrame(frame: StaticImageData): Promise<HTMLElement | null> {
  const { src } = frame;

  if (frameMemoryCache.has(src)) {
    return frameMemoryCache.get(src)!;
  }

  try {    
    const res = await fetch(src, {
      cache: 'force-cache',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const svgText = await res.text();
    const parsed = new DOMParser().parseFromString(
      svgText,
      "image/svg+xml"
    ).documentElement;

    frameMemoryCache.set(src, parsed);

    return parsed;
  } catch (error) {
    console.error(`Failed to load frame SVG: ${src}`, error);
    return null;
  }
}

export function clearFrameMemoryCache(): void {
  frameMemoryCache.clear();
} 