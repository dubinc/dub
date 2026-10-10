import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { apiError } from "../../utils";
import { test, type ApiClient } from "../fixtures";
import { createPartner, deletePartner } from "./helpers";

async function attributeReferral(
  api: ApiClient,
  partnerId: string,
  referredByPartnerId: string,
) {
  return api.post<{
    partnerId: string;
    referredByPartnerId: string;
  }>(`/api/partners/${partnerId}/referral`, { referredByPartnerId });
}

test("POST /partners/:partnerId/referral", async ({ api, program }) => {
  let partnerId: string | undefined;
  let referredByPartnerId: string | undefined;

  try {
    const [{ data: partner }, { data: referrer }] = await Promise.all([
      createPartner(api, { groupId: program.defaultGroupId }),
      createPartner(api, { groupId: program.defaultGroupId }),
    ]);
    partnerId = partner.id;
    referredByPartnerId = referrer.id;

    const { status, data } = await attributeReferral(
      api,
      partnerId,
      referredByPartnerId,
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({ partnerId, referredByPartnerId });

    const { status: getStatus, data: referral } = await api.get<{
      referredBy: { id: string } | null;
    }>(`/api/partners/${partnerId}/referral`);

    expect(getStatus).toEqual(200);
    expect(referral.referredBy).toMatchObject({ id: referredByPartnerId });
  } finally {
    await deletePartner(partnerId);
    await deletePartner(referredByPartnerId);
  }
});

test("POST /partners/:partnerId/referral – self-referral", async ({
  api,
  program,
}) => {
  let partnerId: string | undefined;

  try {
    const { data: partner } = await createPartner(api, {
      groupId: program.defaultGroupId,
    });
    partnerId = partner.id;

    expect(await attributeReferral(api, partnerId, partnerId)).toEqual(
      apiError({
        code: "bad_request",
        message:
          "A partner cannot be attributed to themselves as a referring partner.",
      }),
    );
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /partners/:partnerId/referral – already attributed", async ({
  api,
  program,
}) => {
  let partnerId: string | undefined;
  let referredByPartnerId: string | undefined;

  try {
    const [{ data: partner }, { data: referrer }] = await Promise.all([
      createPartner(api, { groupId: program.defaultGroupId }),
      createPartner(api, { groupId: program.defaultGroupId }),
    ]);
    partnerId = partner.id;
    referredByPartnerId = referrer.id;

    const { status } = await attributeReferral(
      api,
      partnerId,
      referredByPartnerId,
    );
    expect(status).toEqual(200);

    expect(
      await attributeReferral(api, partnerId, referredByPartnerId),
    ).toEqual(
      apiError({
        code: "bad_request",
        message:
          "This partner has already been attributed to another referring partner.",
      }),
    );
  } finally {
    await deletePartner(partnerId);
    await deletePartner(referredByPartnerId);
  }
});

test("POST /partners/:partnerId/referral – referrer not enrolled", async ({
  api,
  program,
}) => {
  let partnerId: string | undefined;
  const referredByPartnerId = `pn_${nanoid()}`;

  try {
    const { data: partner } = await createPartner(api, {
      groupId: program.defaultGroupId,
    });
    partnerId = partner.id;

    expect(
      await attributeReferral(api, partnerId, referredByPartnerId),
    ).toEqual(
      apiError({
        code: "not_found",
        message: `Partner ${referredByPartnerId} is not enrolled in program ${program.id}.`,
      }),
    );
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /partners/:partnerId/referral – missing referredByPartnerId", async ({
  api,
}) => {
  expect(await api.post("/api/partners/pn_test/referral", {})).toEqual(
    apiError({
      code: "unprocessable_entity",
      message:
        "invalid_type: referredByPartnerId: Invalid input: expected string, received undefined",
    }),
  );
});

test("POST /partners/:partnerId/referral – referral loop", async ({
  api,
  program,
}) => {
  let partnerId: string | undefined;
  let referredByPartnerId: string | undefined;

  try {
    const [{ data: partner }, { data: referrer }] = await Promise.all([
      createPartner(api, { groupId: program.defaultGroupId }),
      createPartner(api, { groupId: program.defaultGroupId }),
    ]);
    partnerId = partner.id;
    referredByPartnerId = referrer.id;

    const { status } = await attributeReferral(
      api,
      partnerId,
      referredByPartnerId,
    );
    expect(status).toEqual(200);

    expect(
      await attributeReferral(api, referredByPartnerId, partnerId),
    ).toEqual(
      apiError({
        code: "bad_request",
        message:
          "This referral relationship is not allowed because it would create a referral loop.",
      }),
    );
  } finally {
    await deletePartner(partnerId);
    await deletePartner(referredByPartnerId);
  }
});
