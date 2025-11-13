import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";
import { FraudReason } from "../types";

const contextSchema = z.object({
  partner: z.object({
    email: z.string().nullable().default(null),
    name: z.string().nullable().default(null),
  }),
  customer: z.object({
    email: z.string().nullable().default(null),
    name: z.string().nullable().default(null),
  }),
});

const configSchema = z.object({
  similarityThreshold: z.number().min(0).max(1),
  checkLevenshtein: z.boolean(),
  checkDomainVariations: z.boolean(),
  checkExactMatch: z.boolean(),
  checkEmailMatch: z.boolean(),
  checkNameMatch: z.boolean(),
});

export const checkSelfReferralRule = defineFraudRule({
  type: "selfReferral",
  contextSchema,
  configSchema,
  defaultConfig: {
    similarityThreshold: 0.8,
    checkLevenshtein: true,
    checkDomainVariations: true,
    checkExactMatch: true,
    checkEmailMatch: true,
    checkNameMatch: true,
  },
  evaluate: async (context, config) => {
    console.log("Evaluating checkSelfReferralRule...", context, config);

    const { partner, customer } = context;

    const metadata: Record<string, unknown> & {
      checksPerformed: string[];
      emailMatch: boolean;
      nameMatch: boolean;
    } = {
      checksPerformed: [],
      emailMatch: false,
      nameMatch: false,
    };

    // Check email match if enabled
    if (config.checkEmailMatch && partner.email && customer.email) {
      const emailResult = checkEmailMatch(
        partner.email,
        customer.email,
        config,
        metadata,
      );

      if (emailResult.triggered) {
        return {
          triggered: true,
          reason: emailResult.reason,
          metadata,
        };
      }
    }

    // Check name match if enabled
    if (config.checkNameMatch && partner.name && customer.name) {
      const nameResult = checkNameMatch(
        partner.name,
        customer.name,
        config,
        metadata,
      );

      if (nameResult.triggered) {
        return {
          triggered: true,
          reason: nameResult.reason,
          metadata,
        };
      }
    }

    return {
      triggered: false,
      metadata,
    };
  },
});

// Check if partner email matches customer email
function checkEmailMatch(
  partnerEmail: string,
  customerEmail: string,
  ruleConfig: z.infer<typeof configSchema>,
  metadata: Record<string, unknown> & {
    checksPerformed: string[];
    emailMatch: boolean;
    nameMatch: boolean;
  },
): { triggered: boolean; reason?: FraudReason } {
  // Normalize emails (handles Gmail-style dots and plus tags)
  const normalizedPartnerEmail = normalizeEmail(partnerEmail);
  const normalizedCustomerEmail = normalizeEmail(customerEmail);

  metadata.partnerEmail = normalizedPartnerEmail;
  metadata.customerEmail = normalizedCustomerEmail;

  // Check exact match
  if (ruleConfig.checkExactMatch) {
    if (normalizedPartnerEmail === normalizedCustomerEmail) {
      metadata.checksPerformed.push("email_exact_match");
      metadata.emailMatch = true;

      return {
        triggered: true,
        reason: "selfReferralEmailExactMatch",
      };
    }
  }

  // Extract email parts
  const partnerParts = extractEmailParts(normalizedPartnerEmail);
  const customerParts = extractEmailParts(normalizedCustomerEmail);

  if (!partnerParts || !customerParts) {
    return {
      triggered: false,
    };
  }

  // Check domain variations
  if (ruleConfig.checkDomainVariations) {
    const domainSimilarity = checkDomainSimilarity(
      partnerParts.domain,
      customerParts.domain,
    );

    if (domainSimilarity.isSimilar) {
      metadata.checksPerformed.push("email_domain_variation");
      metadata.domainSimilarity = domainSimilarity;

      // Check if usernames match exactly or are similar
      const usernameMatch =
        partnerParts.username === customerParts.username ||
        (ruleConfig.checkLevenshtein &&
          calculateSimilarity(partnerParts.username, customerParts.username) >=
            ruleConfig.similarityThreshold);

      if (usernameMatch) {
        metadata.emailMatch = true;
        metadata.usernameMatch = true;

        return {
          triggered: true,
          reason: "selfReferralEmailDomainVariation",
        };
      }
    }
  }

  // Check Levenshtein similarity
  if (ruleConfig.checkLevenshtein) {
    const emailSimilarity = calculateSimilarity(
      normalizedPartnerEmail,
      normalizedCustomerEmail,
    );

    metadata.checksPerformed.push("email_levenshtein");
    metadata.emailSimilarityScore = emailSimilarity;

    if (emailSimilarity >= ruleConfig.similarityThreshold) {
      metadata.emailMatch = true;

      return {
        triggered: true,
        reason: "selfReferralEmailLevenshtein",
      };
    }
  }

  return {
    triggered: false,
  };
}

// Check if partner name matches customer name
function checkNameMatch(
  partnerName: string,
  customerName: string,
  ruleConfig: z.infer<typeof configSchema>,
  metadata: Record<string, unknown> & {
    checksPerformed: string[];
    emailMatch: boolean;
    nameMatch: boolean;
  },
): { triggered: boolean; reason?: FraudReason } {
  const normalizedPartnerName = normalizeName(partnerName);
  const normalizedCustomerName = normalizeName(customerName);

  metadata.partnerName = normalizedPartnerName;
  metadata.customerName = normalizedCustomerName;

  // Check exact match
  if (ruleConfig.checkExactMatch) {
    if (normalizedPartnerName === normalizedCustomerName) {
      metadata.checksPerformed.push("name_exact_match");
      metadata.nameMatch = true;

      return {
        triggered: true,
        reason: "selfReferralNameExactMatch",
      };
    }
  }

  // Check Levenshtein similarity
  if (ruleConfig.checkLevenshtein) {
    const nameSimilarity = calculateSimilarity(
      normalizedPartnerName,
      normalizedCustomerName,
    );

    metadata.checksPerformed.push("name_levenshtein");
    metadata.nameSimilarityScore = nameSimilarity;

    if (nameSimilarity >= ruleConfig.similarityThreshold) {
      metadata.nameMatch = true;

      return {
        triggered: true,
        reason: "selfReferralNameLevenshtein",
      };
    }
  }

  return {
    triggered: false,
  };
}

// Normalize email for comparison
function normalizeEmail(email: string): string {
  const trimmed = email.toLowerCase().trim();
  const parts = trimmed.split("@");

  if (parts.length !== 2) {
    return trimmed;
  }

  let [username, domain] = parts;

  // Providers that support plus addressing (Gmail, Outlook, Yahoo, etc.)
  const plusAddressingProviders = [
    "gmail.com",
    "googlemail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "yahoo.com",
  ];

  // Strip plus tags for providers that support it
  if (plusAddressingProviders.includes(domain)) {
    const plusIndex = username.indexOf("+");
    if (plusIndex !== -1) {
      username = username.substring(0, plusIndex);
    }
  }

  // Gmail and Google Mail treat dots as irrelevant
  if (domain === "gmail.com" || domain === "googlemail.com") {
    username = username.replace(/\./g, "");
  }

  return `${username}@${domain}`;
}

// Normalize name for comparison
// Handles name order, initials, middle names, and hyphens
function normalizeName(name: string): string {
  // Basic normalization: lowercase, trim, remove extra spaces
  let normalized = name.toLowerCase().trim().replace(/\s+/g, " ");

  // Remove common punctuation
  normalized = normalized.replace(/[,;]/g, "");

  // Normalize hyphens and dashes
  normalized = normalized.replace(/[-–—]/g, " ");

  // Split into name parts
  const parts = normalized
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => part.trim());

  if (parts.length === 0) {
    return "";
  }

  // Sort parts alphabetically to handle name order variations
  // This helps catch "John Smith" vs "Smith John" and "John M. Smith" vs "Smith, John M."
  // Separate initials (single characters) from full names
  const initials = parts.filter((p) => p.length === 1);
  const fullNames = parts.filter((p) => p.length > 1);

  // Sort full names alphabetically, then append initials
  const sortedFullNames = [...fullNames].sort();
  const sortedInitials = [...initials].sort();

  return [...sortedFullNames, ...sortedInitials].join(" ");
}

// Extract username and domain from email
function extractEmailParts(email: string) {
  const parts = email.split("@");

  if (parts.length !== 2) {
    return null;
  }

  return {
    username: parts[0],
    domain: parts[1],
  };
}

// Check if two domains are similar using Levenshtein distance
// Removed hardcoded variations - relies on similarity algorithm
function checkDomainSimilarity(domain1: string, domain2: string) {
  // Exact match
  if (domain1 === domain2) {
    return {
      isSimilar: true,
      reason: "exact_match",
    };
  }

  // Check Levenshtein distance for domains
  // Threshold of 0.85 catches typosquatting patterns
  const domainSimilarity = calculateSimilarity(domain1, domain2);
  if (domainSimilarity > 0.85) {
    return {
      isSimilar: true,
      reason: `high_similarity_${(domainSimilarity * 100).toFixed(0)}%`,
    };
  }

  return {
    isSimilar: false,
  };
}

// Calculate similarity between two strings using Levenshtein distance
// Returns a value between 0 (completely different) and 1 (identical)
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) {
    return 1;
  }

  if (str1.length === 0 || str2.length === 0) {
    return 0;
  }

  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1, str2);

  return 1 - distance / maxLength;
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
