import type { FraudRuleType } from "@dub/prisma/client";

const FRAUD_RESOLUTION_COMMENT_PREFIX = "[[dub-fraud-resolution:";
const FRAUD_RESOLUTION_COMMENT_SUFFIX = "]]";

export interface FraudResolutionCommentMetadata {
  groupId: string;
  type: FraudRuleType;
}

export function serializeFraudResolutionComment({
  metadata,
  note,
}: {
  metadata: FraudResolutionCommentMetadata;
  note: string;
}) {
  return `${FRAUD_RESOLUTION_COMMENT_PREFIX}${JSON.stringify(metadata)}${FRAUD_RESOLUTION_COMMENT_SUFFIX}\n${note}`;
}

export function parseFraudResolutionComment(text: string): {
  metadata: FraudResolutionCommentMetadata | null;
  note: string;
} {
  if (!text.startsWith(FRAUD_RESOLUTION_COMMENT_PREFIX)) {
    return {
      metadata: null,
      note: text,
    };
  }

  const suffixIndex = text.indexOf(FRAUD_RESOLUTION_COMMENT_SUFFIX);

  if (suffixIndex === -1) {
    return {
      metadata: null,
      note: text,
    };
  }

  const metadataString = text.slice(
    FRAUD_RESOLUTION_COMMENT_PREFIX.length,
    suffixIndex,
  );

  try {
    const metadata = JSON.parse(metadataString) as FraudResolutionCommentMetadata;

    if (
      !metadata ||
      typeof metadata.groupId !== "string" ||
      typeof metadata.type !== "string"
    ) {
      return {
        metadata: null,
        note: text,
      };
    }

    const contentStart = suffixIndex + FRAUD_RESOLUTION_COMMENT_SUFFIX.length;
    const hasNewLine = text.charAt(contentStart) === "\n";

    return {
      metadata,
      note: text.slice(hasNewLine ? contentStart + 1 : contentStart),
    };
  } catch {
    return {
      metadata: null,
      note: text,
    };
  }
}
