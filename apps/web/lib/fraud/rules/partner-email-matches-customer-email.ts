import { z } from "zod";
import { FraudRuleContext, FraudRuleEvaluationResult } from "../types";
import { partnerEmailMatchesCustomerEmailConfigSchema } from "./schemas";

const contextSchema = z.object({
  partnerEmail: z.string().nullable().default(null),
  customerEmail: z.string().nullable().default(null),
});

// Check if partner email matches or is similar to customer email
// This detects potential self-referral fraud
export async function checkPartnerEmailMatchesCustomerEmail(
  context: FraudRuleContext,
  config: unknown,
): Promise<FraudRuleEvaluationResult> {
  const ruleConfig = partnerEmailMatchesCustomerEmailConfigSchema.parse(
    config || {},
  );

  const { partnerEmail, customerEmail } = contextSchema.parse(context);

  if (!partnerEmail || !customerEmail) {
    return {
      triggered: false,
    };
  }

  const normalizedPartnerEmail = partnerEmail.toLowerCase().trim();
  const normalizedCustomerEmail = customerEmail.toLowerCase().trim();

  const metadata: Record<string, unknown> = {
    partnerEmail: normalizedPartnerEmail,
    customerEmail: normalizedCustomerEmail,
    checksPerformed: [],
  };

  // Check exact match
  if (ruleConfig.checkExactMatch) {
    if (normalizedPartnerEmail === normalizedCustomerEmail) {
      metadata.checksPerformed.push("exact_match");
      return {
        triggered: true,
        reason: `Partner email exactly matches customer email: ${normalizedPartnerEmail}`,
        metadata,
      };
    }
  }

  // Extract email parts
  const partnerParts = extractEmailParts(normalizedPartnerEmail);
  const customerParts = extractEmailParts(normalizedCustomerEmail);

  if (!partnerParts || !customerParts) {
    return { triggered: false, metadata };
  }

  // Check domain variations
  if (ruleConfig.checkDomainVariations) {
    const domainSimilarity = checkDomainSimilarity(
      partnerParts.domain,
      customerParts.domain,
    );

    if (domainSimilarity.isSimilar) {
      metadata.checksPerformed.push("domain_variation");
      metadata.domainSimilarity = domainSimilarity;

      // If domains are similar and usernames are similar, it's suspicious
      if (partnerParts.username === customerParts.username) {
        return {
          triggered: true,
          reason: `Partner email domain variation matches customer email: ${normalizedPartnerEmail} vs ${normalizedCustomerEmail}`,
          metadata,
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

    metadata.checksPerformed.push("levenshtein");
    metadata.similarityScore = emailSimilarity;

    if (emailSimilarity >= ruleConfig.similarityThreshold) {
      return {
        triggered: true,
        reason: `Partner email is ${(emailSimilarity * 100).toFixed(1)}% similar to customer email (threshold: ${(ruleConfig.similarityThreshold * 100).toFixed(1)}%)`,
        metadata,
      };
    }
  }

  return { triggered: false, metadata };
}

/**
 * Extract username and domain from email
 */
function extractEmailParts(email: string): {
  username: string;
  domain: string;
} | null {
  const parts = email.split("@");
  if (parts.length !== 2) {
    return null;
  }
  return {
    username: parts[0],
    domain: parts[1],
  };
}

/**
 * Check if two domains are similar (common typosquatting patterns)
 */
function checkDomainSimilarity(
  domain1: string,
  domain2: string,
): { isSimilar: boolean; reason?: string } {
  // Exact match
  if (domain1 === domain2) {
    return { isSimilar: true, reason: "exact_match" };
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

  return { isSimilar: false };
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
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

/**
 * Calculate Levenshtein distance between two strings
 */
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
