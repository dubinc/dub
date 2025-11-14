// Normalize email for comparison
export function normalizeEmail(email: string): string {
  const trimmed = email.toLowerCase().trim();
  const parts = trimmed.split("@");

  if (parts.length !== 2) {
    return trimmed;
  }

  let [username, domain] = parts;

  // Strip plus addressing for all domains
  const plusIndex = username.indexOf("+");
  if (plusIndex !== -1) {
    username = username.substring(0, plusIndex);
  }

  // Gmail and Google Mail treat dots as irrelevant
  if (domain === "gmail.com" || domain === "googlemail.com") {
    username = username.replace(/\./g, "");
  }

  return `${username}@${domain}`;
}

// Normalize name for comparison
// Handles name order, initials, middle names, and hyphens
export function normalizeName(name: string): string {
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
export function extractEmailParts(email: string) {
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
export function checkDomainSimilarity(domain1: string, domain2: string) {
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
export function calculateSimilarity(str1: string, str2: string): number {
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
export function levenshteinDistance(str1: string, str2: string): number {
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
