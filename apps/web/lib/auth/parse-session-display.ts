export type SessionDeviceType = "desktop" | "mobile" | "tablet";

export type SessionDisplay = {
  device: string;
  deviceType: SessionDeviceType;
  ipAddress: string | null;
};

const BROWSER_PATTERNS: {
  test: RegExp;
  name: string;
  unless?: RegExp;
}[] = [
  { test: /Edg(?:e|A|iOS)?\//i, name: "Edge" },
  { test: /OPR\/|Opera\//i, name: "Opera" },
  { test: /Firefox\/|FxiOS\//i, name: "Firefox" },
  {
    test: /Chrome\/|CriOS\//i,
    name: "Chrome",
    unless: /Chromium\//i,
  },
  {
    test: /Safari\//i,
    name: "Safari",
    unless: /Chrome\/|CriOS\/|Chromium\//i,
  },
];

const OS_PATTERNS: { test: RegExp; name: string }[] = [
  { test: /iPhone|iPad|iPod/i, name: "iOS" },
  { test: /Android/i, name: "Android" },
  { test: /Macintosh|Mac OS X/i, name: "macOS" },
  { test: /Windows NT|Windows/i, name: "Windows" },
  { test: /CrOS/i, name: "Chrome OS" },
  { test: /Linux/i, name: "Linux" },
];

export function parseSessionDisplay({
  userAgent,
  ipAddress,
}: {
  userAgent?: string | null;
  ipAddress?: string | null;
}): SessionDisplay {
  return {
    device: formatSessionDevice(userAgent),
    deviceType: getSessionDeviceType(userAgent),
    ipAddress: formatSessionIp(ipAddress),
  };
}

function formatSessionDevice(userAgent: string | null | undefined): string {
  if (!userAgent?.trim()) {
    return "Unknown device";
  }

  const browser = getBrowserName(userAgent);
  const os = getOsName(userAgent);

  if (browser && os) {
    return `${browser} on ${os}`;
  }

  return browser ?? os ?? "Unknown device";
}

function getBrowserName(userAgent: string): string | null {
  for (const { test, name, unless } of BROWSER_PATTERNS) {
    if (test.test(userAgent) && !unless?.test(userAgent)) {
      return name;
    }
  }

  return null;
}

function getOsName(userAgent: string): string | null {
  for (const { test, name } of OS_PATTERNS) {
    if (test.test(userAgent)) {
      return name;
    }
  }

  return null;
}

function getSessionDeviceType(
  userAgent: string | null | undefined,
): SessionDeviceType {
  if (!userAgent) {
    return "desktop";
  }

  if (
    /iPad|Tablet/i.test(userAgent) ||
    (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))
  ) {
    return "tablet";
  }

  if (/Mobile|iPhone|iPod|Android/i.test(userAgent)) {
    return "mobile";
  }

  return "desktop";
}

function formatSessionIp(ipAddress: string | null | undefined): string | null {
  if (!ipAddress?.trim()) {
    return null;
  }

  const ip = ipAddress.trim().replace(/^\[|\]$/g, "");

  if (isLocalIp(ip)) {
    return "Local";
  }

  if (ip.includes(":")) {
    return compactIpv6(ip);
  }

  return ip;
}

function isLocalIp(ip: string): boolean {
  const value = ip.toLowerCase();

  if (
    value === "127.0.0.1" ||
    value === "0.0.0.0" ||
    value === "::1" ||
    value === "::" ||
    value.startsWith("127.")
  ) {
    return true;
  }

  if (value.includes(".")) {
    const mapped = value.match(/:ffff:([\d.]+)$/i)?.[1];
    if (mapped) {
      return isLocalIp(mapped);
    }
  }

  if (value.includes(":") && !value.includes(".")) {
    return /^[0:]+$/.test(value) || /^[0:]+1$/.test(value);
  }

  return false;
}

function compactIpv6(ip: string): string {
  if (ip.includes("::") || ip.includes(".")) {
    return ip;
  }

  const hextets = ip
    .split(":")
    .map((part) => part.replace(/^0+(?=\w)/, "") || "0");

  if (hextets.length !== 8) {
    return ip;
  }

  let bestStart = -1;
  let bestLength = 0;
  let runStart = -1;
  let runLength = 0;

  for (let index = 0; index <= hextets.length; index++) {
    if (index < hextets.length && hextets[index] === "0") {
      if (runStart === -1) {
        runStart = index;
      }
      runLength++;
      continue;
    }

    if (runLength > bestLength) {
      bestStart = runStart;
      bestLength = runLength;
    }
    runStart = -1;
    runLength = 0;
  }

  if (bestLength < 2) {
    return hextets.join(":");
  }

  const left = hextets.slice(0, bestStart).join(":");
  const right = hextets.slice(bestStart + bestLength).join(":");
  return `${left}::${right}`;
}
