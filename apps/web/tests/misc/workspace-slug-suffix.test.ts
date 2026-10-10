import { createWorkspaceSchema } from "@/lib/zod/schemas/workspaces";
import { describe, expect, it } from "vitest";

function parseSlug(slug: string) {
  return createWorkspaceSchema.safeParseAsync({ name: "Acme", slug });
}

describe("createWorkspaceSchema slug", () => {
  it("rejects slugs ending in -staging or -sandbox", async () => {
    for (const slug of ["acme-staging", "acme-sandbox"]) {
      const result = await parseSlug(slug);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        "Slugs ending in -staging or -sandbox are reserved",
      );
    }
  });

  it("allows staging or sandbox elsewhere in the slug", async () => {
    for (const slug of ["acme", "staging-acme", "acme-sandboxes"]) {
      const result = await parseSlug(slug);

      expect(result.success).toBe(true);
    }
  });
});
