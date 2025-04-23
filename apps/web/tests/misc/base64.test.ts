import { base64ImageSchema } from "@/lib/zod/schemas/misc";
import { describe, expect, it } from "vitest";

describe("base64ImageSchema", () => {
  it("should validate a correct base64 PNG image", () => {
    const validBase64Image =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    expect(() => base64ImageSchema.parse(validBase64Image)).not.toThrow();
  });

  it("should reject an invalid image type", () => {
    const invalidImageType =
      "data:image/invalid;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    expect(() => base64ImageSchema.parse(invalidImageType)).toThrow(
      "Invalid image format",
    );
  });

  it("should reject malformed base64 data", () => {
    const malformedBase64 = "data:image/png;base64,invalid-base64-data";
    expect(() => base64ImageSchema.parse(malformedBase64)).toThrow(
      "Invalid base64 content",
    );
  });

  it("should reject a string without data URI prefix", () => {
    const noPrefix =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    expect(() => base64ImageSchema.parse(noPrefix)).toThrow(
      "Invalid image format",
    );
  });

  it("should reject URLs", () => {
    const url = "https://github.com/dubinc/dub";
    expect(() => base64ImageSchema.parse(url)).toThrow("Invalid image format");
  });

  it("should reject URLs with image extensions", () => {
    const imageUrl = "https://example.com/image.png";
    expect(() => base64ImageSchema.parse(imageUrl)).toThrow(
      "Invalid image format",
    );
  });

  it("should reject URLs with data URI prefix but invalid format", () => {
    const invalidDataUri =
      "data:image/png;base64,https://example.com/image.png";
    expect(() => base64ImageSchema.parse(invalidDataUri)).toThrow(
      "Invalid base64 content",
    );
  });
});
