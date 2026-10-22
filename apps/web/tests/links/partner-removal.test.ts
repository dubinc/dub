import { partnerRemovalOverrides } from "@/lib/api/links/partner-removal";
import { updateLinkBodySchema } from "@/lib/zod/schemas/links";
import { buildLinkBody } from "@/ui/links/link-builder/build-link-body";
import { describe, expect, test } from "vitest";

describe("partnerRemovalOverrides", () => {
  test("leaves an update that does not clear the partner unchanged", () => {
    expect(partnerRemovalOverrides({})).toEqual({});
    expect(partnerRemovalOverrides({ partnerId: "pn_1" })).toEqual({});
    expect(
      partnerRemovalOverrides({ partnerId: "pn_1", programId: "prog_1" }),
    ).toEqual({});
  });

  test("clears the program when the partner is removed and no new program is sent", () => {
    expect(partnerRemovalOverrides({ partnerId: null })).toEqual({
      partnerId: null,
      programId: null,
    });
    expect(
      partnerRemovalOverrides({ partnerId: null, programId: null }),
    ).toEqual({
      partnerId: null,
      programId: null,
    });
  });

  test("keeps an explicit program so a tenant can still enroll a partner", () => {
    expect(
      partnerRemovalOverrides({ partnerId: null, programId: "prog_1" }),
    ).toEqual({});
  });
});

describe("buildLinkBody", () => {
  const link = {
    url: "https://example.com",
    domain: "dub.sh",
    key: "hello",
    tags: [{ id: "tag_1" }],
    folderId: "fold_1",
    expiredUrl: "",
    ios: "",
    android: "",
    externalId: "",
    tenantId: "tenant_1",
    programId: "prog_1",
    partnerId: "pn_1",
  } as any;

  test("assigns the workspace program when a partner is set", () => {
    expect(
      buildLinkBody({
        data: link,
        defaultProgramId: "prog_default",
      }),
    ).toMatchObject({
      programId: "prog_default",
      partnerId: "pn_1",
      tenantId: "tenant_1",
    });
  });

  test("clears the stored program and partner when the partner is removed", () => {
    const body = buildLinkBody({
      data: { ...link, partnerId: null },
      defaultProgramId: "prog_default",
    });

    expect(body.partnerId).toBeNull();
    expect(body.programId).toBeNull();
    expect(body.tenantId).toBe("tenant_1");
    expect(body.folderId).toBe("fold_1");
    expect(body.tagIds).toEqual(["tag_1"]);
  });
});

describe("updateLinkBodySchema partner removal", () => {
  test("keeps null and treats an empty string as a removal", () => {
    expect(updateLinkBodySchema.parse({ partnerId: null })).toMatchObject({
      partnerId: null,
    });
    expect(updateLinkBodySchema.parse({ partnerId: "" })).toMatchObject({
      partnerId: null,
    });
    expect(
      updateLinkBodySchema.parse({ url: "https://example.com" }),
    ).not.toHaveProperty("partnerId");
  });
});
