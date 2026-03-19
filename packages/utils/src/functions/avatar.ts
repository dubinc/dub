const AVATAR_THEMES = [
  // Blues
  { bg: "#DBEAFE", fg: "#2B7FFF" },
  { bg: "#DFF2FE", fg: "#00A6F4" },
  // Greens
  { bg: "#DCFCE7", fg: "#00C951" },
  { bg: "#ECFCCA", fg: "#7CCF00" },
  { bg: "#D0FAE5", fg: "#00BC7D" },
  { bg: "#CBFBF1", fg: "#00BBA7" },
  { bg: "#CEFAFE", fg: "#00B8DB" },
  // Purples
  { bg: "#E0E7FF", fg: "#615FFF" },
  { bg: "#EDE9FE", fg: "#8E51FF" },
  { bg: "#F3E8FF", fg: "#AD46FF" },
  // Pinks
  { bg: "#FAE8FF", fg: "#E12AFB" },
  { bg: "#FCE7F3", fg: "#F6339A" },
  // Reds
  { bg: "#FFE2E2", fg: "#FB2C36" },
  { bg: "#FFE4E6", fg: "#FF2056" },
  // Oranges & Yellows
  { bg: "#FFEDD4", fg: "#FF6900" },
  { bg: "#FEF3C6", fg: "#FD9A00" },
  { bg: "#FEF9C2", fg: "#EFB100" },
  // Grays
  { bg: "#F5F5F5", fg: "#404040" },
  { bg: "#FAFAFA", fg: "#FAFAFA" },
] as const;

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getAvatarTheme(
  seed?: string | null,
): (typeof AVATAR_THEMES)[number] {
  if (!seed) {
    return AVATAR_THEMES[Math.floor(Math.random() * AVATAR_THEMES.length)];
  }
  const index = hashCode(seed) % AVATAR_THEMES.length;
  return AVATAR_THEMES[index];
}
