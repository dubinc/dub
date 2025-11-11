import { z } from "zod";
import type { FraudReasonCode } from "../fraud-reason-codes";
import { FraudRuleContext, FraudRuleEvaluationResult } from "../types";

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
  similarityThreshold: z.number().min(0).max(1).default(0.8),
  checkLevenshtein: z.boolean().default(true),
  checkDomainVariations: z.boolean().default(true),
  checkExactMatch: z.boolean().default(true),
  checkEmailMatch: z.boolean().default(true),
  checkNameMatch: z.boolean().default(true),
});

// Check if partner email or name matches or is similar to customer email or name
// This detects potential self-referral fraud
export async function checkSelfReferral(
  context: FraudRuleContext,
  config: unknown,
): Promise<FraudRuleEvaluationResult> {
  const { partner, customer } = contextSchema.parse(context);

  const metadata: Record<string, unknown> & {
    checksPerformed: string[];
    emailMatch: boolean;
    nameMatch: boolean;
  } = {
    checksPerformed: [],
    emailMatch: false,
    nameMatch: false,
  };

  const ruleConfig = configSchema.parse(config || {});

  // Check email match if enabled
  if (ruleConfig.checkEmailMatch && partner.email && customer.email) {
    const emailResult = checkEmailMatch(
      partner.email,
      customer.email,
      ruleConfig,
      metadata,
    );

    if (emailResult.triggered) {
      return {
        triggered: true,
        reasonCode: emailResult.reasonCode,
        metadata,
      };
    }
  }

  // Check name match if enabled
  if (ruleConfig.checkNameMatch && partner.name && customer.name) {
    const nameResult = checkNameMatch(
      partner.name,
      customer.name,
      ruleConfig,
      metadata,
    );

    if (nameResult.triggered) {
      return {
        triggered: true,
        reasonCode: nameResult.reasonCode,
        metadata,
      };
    }
  }

  return {
    triggered: false,
    metadata,
  };
}

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
): { triggered: boolean; reasonCode?: FraudReasonCode } {
  const normalizedPartnerEmail = partnerEmail.toLowerCase().trim();
  const normalizedCustomerEmail = customerEmail.toLowerCase().trim();

  metadata.partnerEmail = normalizedPartnerEmail;
  metadata.customerEmail = normalizedCustomerEmail;

  // Check exact match
  if (ruleConfig.checkExactMatch) {
    if (normalizedPartnerEmail === normalizedCustomerEmail) {
      metadata.checksPerformed.push("email_exact_match");
      metadata.emailMatch = true;
      return {
        triggered: true,
        reasonCode: "self_referral_email_exact_match",
      };
    }
  }

  // Extract email parts
  const partnerParts = extractEmailParts(normalizedPartnerEmail);
  const customerParts = extractEmailParts(normalizedCustomerEmail);

  if (!partnerParts || !customerParts) {
    return { triggered: false };
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

      // If domains are similar and usernames are similar, it's suspicious
      if (partnerParts.username === customerParts.username) {
        metadata.emailMatch = true;
        return {
          triggered: true,
          reasonCode: "self_referral_email_domain_variation",
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
        reasonCode: "self_referral_email_levenshtein",
      };
    }
  }

  return { triggered: false };
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
): { triggered: boolean; reasonCode?: FraudReasonCode } {
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
        reasonCode: "self_referral_name_exact_match",
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
        reasonCode: "self_referral_name_levenshtein",
      };
    }
  }

  return { triggered: false };
}

// Normalize name for comparison (lowercase, trim, remove extra spaces)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " "); // Replace multiple spaces with single space
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

// Check if two domains are similar (common typosquatting patterns)
function checkDomainSimilarity(domain1: string, domain2: string) {
  // Exact match
  if (domain1 === domain2) {
    return {
      isSimilar: true,
      reason: "exact_match",
    };
  }

  // Common domain variations
  const variations: Record<string, string[]> = {
    "gmail.com": ["gmial.com", "gmaill.com", "gmai.com"],
    "yahoo.com": ["yhoo.com", "yahooo.com"],
    "hotmail.com": ["hotmial.com", "hotmai.com"],
    "outlook.com": ["outlok.com", "outllook.com"],
  };

  // Check if domains are known variations
  for (const [baseDomain, variantList] of Object.entries(variations)) {
    if (
      (domain1 === baseDomain && variantList.includes(domain2)) ||
      (domain2 === baseDomain && variantList.includes(domain1))
    ) {
      return { isSimilar: true, reason: "known_variation" };
    }
  }

  // Check Levenshtein distance for domains
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
