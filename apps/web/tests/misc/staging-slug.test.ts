import { isSlugUniqueConstraintError } from "@/lib/sandbox/staging-slug";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

function uniqueConstraintError(meta: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed on the (not available)",
    {
      code: "P2002",
      clientVersion: "6.19.1",
      meta,
    },
  );
}

describe("isSlugUniqueConstraintError", () => {
  it("detects a slug conflict from meta.target", () => {
    expect(
      isSlugUniqueConstraintError(uniqueConstraintError({ target: ["slug"] })),
    ).toBe(true);
  });

  it("detects a slug conflict from the driver adapter's original message", () => {
    const error = uniqueConstraintError({
      modelName: "Project",
      driverAdapterError: {
        cause: {
          kind: "UniqueConstraintViolation",
          originalCode: "1062",
          originalMessage:
            "Duplicate entry 'acme-staging' for key 'Project.Project_slug_key' (errno 1062) (sqlstate 23000)",
        },
      },
    });

    expect(isSlugUniqueConstraintError(error)).toBe(true);
  });

  it("detects a slug conflict from the driver adapter's constraint index", () => {
    const error = uniqueConstraintError({
      modelName: "Program",
      driverAdapterError: {
        cause: {
          kind: "UniqueConstraintViolation",
          constraint: { index: "Program_slug_key" },
        },
      },
    });

    expect(isSlugUniqueConstraintError(error)).toBe(true);
  });

  it("ignores a conflict on another unique key", () => {
    const error = uniqueConstraintError({
      modelName: "Project",
      driverAdapterError: {
        cause: {
          kind: "UniqueConstraintViolation",
          originalCode: "1062",
          originalMessage:
            "Duplicate entry 'abc12345' for key 'Project.Project_invoicePrefix_key' (errno 1062) (sqlstate 23000)",
        },
      },
    });

    expect(isSlugUniqueConstraintError(error)).toBe(false);
  });

  it("ignores errors that are not unique constraint violations", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "6.19.1",
    });

    expect(isSlugUniqueConstraintError(error)).toBe(false);
    expect(isSlugUniqueConstraintError(new Error("boom"))).toBe(false);
  });
});
