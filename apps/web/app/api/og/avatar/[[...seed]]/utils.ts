import { THEMES } from "./themes";

// Simple but effective hash function for strings
function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Get theme based on seed
export function getTheme(seed?: string | null) {
  if (!seed) {
    // If no seed provided, return random theme
    return THEMES[Math.floor(Math.random() * THEMES.length)];
  }
  // Use hash function to get deterministic index
  const index = hashCode(seed) % THEMES.length;
  return THEMES[index];
}
