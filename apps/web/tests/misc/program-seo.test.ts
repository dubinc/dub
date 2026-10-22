import { shouldIndexProgramLander } from "@/lib/sandbox/program-seo";
import { WorkspaceEnvironment } from "@prisma/client";
import { describe, expect, it } from "vitest";

describe("shouldIndexProgramLander", () => {
  it("indexes published production landers only", () => {
    expect(
      shouldIndexProgramLander({
        environment: WorkspaceEnvironment.production,
        landerPublishedAt: new Date(),
      }),
    ).toBe(true);
  });

  it("does not index unpublished production landers", () => {
    expect(
      shouldIndexProgramLander({
        environment: WorkspaceEnvironment.production,
        landerPublishedAt: null,
      }),
    ).toBe(false);
  });

  it("does not index published staging or sandbox landers", () => {
    for (const environment of [
      WorkspaceEnvironment.staging,
      WorkspaceEnvironment.sandbox,
    ]) {
      expect(
        shouldIndexProgramLander({
          environment,
          landerPublishedAt: new Date(),
        }),
      ).toBe(false);
    }
  });
});
