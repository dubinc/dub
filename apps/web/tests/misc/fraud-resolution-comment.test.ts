import {
  parseFraudResolutionComment,
  serializeFraudResolutionComment,
} from "@/lib/fraud-resolution-comment";
import { describe, expect, it } from "vitest";

describe("serializeFraudResolutionComment", () => {
  it("should serialize metadata and note", () => {
    const result = serializeFraudResolutionComment({
      metadata: { groupId: "group-123", type: "customerEmailMatch" as any },
      note: "Looks fraudulent",
    });

    expect(result).toBe(
      '[[dub-fraud-resolution:{"groupId":"group-123","type":"customerEmailMatch"}]]\nLooks fraudulent',
    );
  });

  it("should handle empty note", () => {
    const result = serializeFraudResolutionComment({
      metadata: { groupId: "group-123", type: "customerEmailMatch" as any },
      note: "",
    });

    expect(result).toBe(
      '[[dub-fraud-resolution:{"groupId":"group-123","type":"customerEmailMatch"}]]\n',
    );
  });
});

describe("parseFraudResolutionComment", () => {
  it("should round-trip serialize and parse", () => {
    const original = {
      metadata: { groupId: "group-123", type: "customerEmailMatch" as any },
      note: "Looks fraudulent",
    };

    const serialized = serializeFraudResolutionComment(original);
    const parsed = parseFraudResolutionComment(serialized);

    expect(parsed.metadata).toEqual(original.metadata);
    expect(parsed.note).toBe(original.note);
  });

  it("should round-trip with empty note", () => {
    const original = {
      metadata: { groupId: "group-123", type: "customerEmailMatch" as any },
      note: "",
    };

    const serialized = serializeFraudResolutionComment(original);
    const parsed = parseFraudResolutionComment(serialized);

    expect(parsed.metadata).toEqual(original.metadata);
    expect(parsed.note).toBe("");
  });

  it("should return plain text for regular comments", () => {
    const result = parseFraudResolutionComment("Just a regular comment");

    expect(result.metadata).toBeNull();
    expect(result.note).toBe("Just a regular comment");
  });

  it("should return plain text for empty string", () => {
    const result = parseFraudResolutionComment("");

    expect(result.metadata).toBeNull();
    expect(result.note).toBe("");
  });

  it("should handle missing suffix gracefully", () => {
    const result = parseFraudResolutionComment(
      '[[dub-fraud-resolution:{"groupId":"x","type":"y"}missing suffix',
    );

    expect(result.metadata).toBeNull();
  });

  it("should handle malformed JSON gracefully", () => {
    const result = parseFraudResolutionComment(
      "[[dub-fraud-resolution:not-json]]\nsome note",
    );

    expect(result.metadata).toBeNull();
    expect(result.note).toBe(
      "[[dub-fraud-resolution:not-json]]\nsome note",
    );
  });

  it("should handle missing groupId", () => {
    const result = parseFraudResolutionComment(
      '[[dub-fraud-resolution:{"type":"customerEmailMatch"}]]\nnote',
    );

    expect(result.metadata).toBeNull();
  });

  it("should handle missing type", () => {
    const result = parseFraudResolutionComment(
      '[[dub-fraud-resolution:{"groupId":"x"}]]\nnote',
    );

    expect(result.metadata).toBeNull();
  });

  it("should handle multiline notes", () => {
    const original = {
      metadata: { groupId: "group-123", type: "customerEmailMatch" as any },
      note: "Line one\nLine two\nLine three",
    };

    const serialized = serializeFraudResolutionComment(original);
    const parsed = parseFraudResolutionComment(serialized);

    expect(parsed.note).toBe("Line one\nLine two\nLine three");
  });

  it("should handle prefix-like content in the note", () => {
    const result = parseFraudResolutionComment(
      "This comment mentions [[dub-fraud-resolution: but is not structured",
    );

    expect(result.metadata).toBeNull();
    expect(result.note).toBe(
      "This comment mentions [[dub-fraud-resolution: but is not structured",
    );
  });
});
