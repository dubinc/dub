import { genericEmailDomains } from "@/lib/emails";
import { destructureEmail } from "@dub/utils";
import * as ipaddr from "ipaddr.js";

// Helper function to normalize name for comparison
const normalizeName = (name?: string) => {
  if (!name) {
    return "";
  }

  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
};

// Helper function to calculate string similarity (Levenshtein distance)
const calculateSimilarity = (str1: string, str2: string) => {
  if (str1 === str2) {
    return 1;
  }

  if (str1.length === 0 || str2.length === 0) {
    return 0;
  }

  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  const maxLength = Math.max(str1.length, str2.length);

  return 1 - matrix[str2.length][str1.length] / maxLength;
};

// Helper function to check for common email patterns
const checkEmailPatterns = (customerEmail: string, partnerEmail: string) => {
  const { username: customerUsername, domain: customerDomain } =
    destructureEmail(customerEmail);
  const { username: partnerUsername, domain: partnerDomain } =
    destructureEmail(partnerEmail);

  let score = 0;
  const reasons: string[] = [];

  // Check for identical emails
  if (customerEmail.toLowerCase() === partnerEmail.toLowerCase()) {
    score += 1.0;
    reasons.push("Identical email addresses");

    return {
      score,
      reasons,
    };
  }

  // Check for identical domains (for non-generic email domains like gmail.com)
  if (
    customerDomain === partnerDomain &&
    !genericEmailDomains.includes(customerDomain)
  ) {
    score += 0.3;
    reasons.push("Identical email domains");
  }

  // Check for similar usernames
  const usernameSimilarity = calculateSimilarity(
    customerUsername,
    partnerUsername,
  );
  if (usernameSimilarity > 0.8) {
    score += 0.4;
    reasons.push(
      `Very similar usernames (${Math.round(usernameSimilarity * 100)}% similarity)`,
    );
  } else if (usernameSimilarity > 0.6) {
    score += 0.2;
    reasons.push(
      `Similar usernames (${Math.round(usernameSimilarity * 100)}% similarity)`,
    );
  }

  // Check for common variations (adding numbers, common suffixes)
  const baseUsername = customerUsername.replace(/[0-9]+$/, ""); // Remove trailing numbers
  const partnerBaseUsername = partnerUsername.replace(/[0-9]+$/, "");

  if (baseUsername === partnerBaseUsername) {
    score += 0.3;
    reasons.push("Same base username with different suffixes");
  }

  // Check for common variations like "john" vs "john.doe" or "john_doe"
  const customerParts = customerUsername.split(/[._-]/);
  const partnerParts = partnerUsername.split(/[._-]/);

  const commonParts = customerParts.filter((part) =>
    partnerParts.some(
      (partnerPart) => calculateSimilarity(part, partnerPart) > 0.8,
    ),
  );

  if (
    commonParts.length > 0 &&
    customerParts.length > 1 &&
    partnerParts.length > 1
  ) {
    score += 0.15;
    reasons.push("Shared username components");
  }

  return {
    score,
    reasons,
  };
};

// Helper function to check for similar names
const checkNameSimilarity = (customerName?: string, partnerName?: string) => {
  if (!customerName || !partnerName) {
    return {
      score: 0,
      reasons: [],
    };
  }

  const normalizedCustomerName = normalizeName(customerName);
  const normalizedPartnerName = normalizeName(partnerName);

  if (normalizedCustomerName === normalizedPartnerName) {
    return {
      score: 0.5,
      reasons: ["Identical names"],
    };
  }

  const nameSimilarity = calculateSimilarity(
    normalizedCustomerName,
    normalizedPartnerName,
  );

  if (nameSimilarity > 0.8) {
    return {
      score: 0.4,
      reasons: [
        `Very similar names (${Math.round(nameSimilarity * 100)}% similarity)`,
      ],
    };
  } else if (nameSimilarity > 0.6) {
    return {
      score: 0.2,
      reasons: [
        `Similar names (${Math.round(nameSimilarity * 100)}% similarity)`,
      ],
    };
  }

  return {
    score: 0,
    reasons: [],
  };
};

// Helper function to check IP address similarity
const checkIpSimilarity = (clickIp?: string, partnerIp?: string) => {
  const reasons: string[] = [];

  if (!clickIp || !partnerIp) {
    return { score: 0, reasons };
  }

  try {
    const clickAddr = ipaddr.parse(clickIp);
    const partnerAddr = ipaddr.parse(partnerIp);

    // Convert IPv4-mapped IPv6 (::ffff:192.168.0.1) to plain IPv4
    let clickNormalized = clickAddr.toNormalizedString();
    let partnerNormalized = partnerAddr.toNormalizedString();

    if (clickAddr.kind() === "ipv6" && (clickAddr as any).isIPv4MappedAddress()) {
      clickNormalized = (clickAddr as any).toIPv4Address().toString();
    }

    if (partnerAddr.kind() === "ipv6" && (partnerAddr as any).isIPv4MappedAddress()) {
      partnerNormalized = (partnerAddr as any).toIPv4Address().toString();
    }

    const isIdentical = clickNormalized === partnerNormalized;

    if (isIdentical) {
      reasons.push("Identical IP addresses (normalized)");
    }

    return {
      score: isIdentical ? 0.8 : 0,
      reasons,
    };
  } catch (err) {
    return { 
      score: 0, 
      reasons 
    };
  }
};

export const isSelfReferral = async ({
  partner,
  customer,
  click,
}: {
  partner: {
    email: string | null;
    name?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  customer: {
    email: string | null;
    name?: string | null;
  };
  click: {
    ip?: string | null;
  };
}) => {
  let confidence = 0;
  const reasons: string[] = [];

  // Check email patterns
  if (customer.email && partner.email) {
    const emailCheck = checkEmailPatterns(customer.email, partner.email);
    confidence += emailCheck.score;
    reasons.push(...emailCheck.reasons);
  }

  // Check name similarity
  if (customer.name && partner.name) {
    const nameCheck = checkNameSimilarity(customer.name, partner.name);
    confidence += nameCheck.score;
    reasons.push(...nameCheck.reasons);
  }

  // Check IP address similarity
  if (click.ip && partner.ipAddress) {
    const ipCheck = checkIpSimilarity(click.ip, partner.ipAddress);
    confidence += ipCheck.score;
    reasons.push(...ipCheck.reasons);
  }

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  // Determine if it's a self-referral based on confidence threshold
  const selfReferral = confidence > 0;

  return {
    selfReferral,
    confidence,
    reasons,
  };
};
