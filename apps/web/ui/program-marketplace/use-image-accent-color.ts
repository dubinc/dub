"use client";

import { useEffect, useState } from "react";

// Mix a color toward white to produce a soft, "50"-level tint that keeps
// dark content readable on top.
function rgbToTint(r: number, g: number, b: number, whiteMix = 0.88) {
  const mix = (c: number) => Math.round(c + (255 - c) * whiteMix);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function extractTint(img: HTMLImageElement): string | null {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const buckets = new Map<
    string,
    { count: number; r: number; g: number; b: number }
  >();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 125) continue; // skip transparent

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Ignore near-white and near-black so backgrounds/sky don't win.
    if (r > 232 && g > 232 && b > 232) continue;
    if (r < 24 && g < 24 && b < 24) continue;

    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }

  let best: { r: number; g: number; b: number } | null = null;
  let bestScore = -1;

  for (const bucket of buckets.values()) {
    const r = bucket.r / bucket.count;
    const g = bucket.g / bucket.count;
    const b = bucket.b / bucket.count;
    // Favor vivid colors over merely frequent muddy ones.
    const score = bucket.count * (0.2 + saturation(r, g, b));
    if (score > bestScore) {
      bestScore = score;
      best = { r, g, b };
    }
  }

  return best ? rgbToTint(best.r, best.g, best.b) : null;
}

// Persist results across mounts so an image is only decoded once per session.
// `null` means "extracted but no usable color"; `undefined` means "not computed".
const cache = new Map<string, string | null>();

export type ImageAccentColor = {
  color: string | null;
  ready: boolean;
};

export function useImageAccentColor(src?: string | null): ImageAccentColor {
  const [state, setState] = useState<ImageAccentColor>(() => {
    if (!src) {
      return { color: null, ready: true };
    }

    if (src && cache.has(src)) {
      return { color: cache.get(src) ?? null, ready: true };
    }
    return { color: null, ready: false };
  });

  useEffect(() => {
    if (!src) {
      setState({ color: null, ready: true });
      return;
    }

    if (cache.has(src)) {
      setState({ color: cache.get(src) ?? null, ready: true });
      return;
    }

    setState({ color: null, ready: false });

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    const finish = (color: string | null) => {
      cache.set(src, color);
      if (!cancelled) setState({ color, ready: true });
    };

    img.onload = () => {
      try {
        finish(extractTint(img));
      } catch {
        finish(null);
      }
    };
    img.onerror = () => finish(null);

    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return state;
}
