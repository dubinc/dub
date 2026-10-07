import { createId } from "@/lib/api/create-id";
import { hashToken } from "@/lib/auth/hash-token";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { Prisma, type PayoutMode, type PayoutStatus } from "@prisma/client";
import { inflateSync } from "zlib";
import { apiError, randomName, randomPartnerEmail } from "../../utils";
import { PLAYWRIGHT_PARTNERS_API_BASE } from "../constants";
import { test, type ApiClient } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";

test.describe.configure({ mode: "serial" });

const invoiceSettings = {
  companyName: "Acme Invoice Co",
  address: "100 Market Street",
  taxId: "US-EIN-123456789",
};

async function createInvoicePartner(api: ApiClient, groupId: string) {
  const { status, data: partner } = await createPartner(api, { groupId });
  expect(status).toEqual(201);

  const token = `dub_pw_partner_${nanoid()}`;
  const user = await prisma.user.create({
    data: {
      id: createId({ prefix: "user_" }),
      email: randomPartnerEmail(),
      name: randomName("invoice-partner"),
      emailVerified: new Date(),
      defaultPartnerId: partner.id,
      partners: {
        create: {
          partnerId: partner.id,
          role: "owner",
        },
      },
      tokens: {
        create: {
          name: "Playwright invoice",
          hashedKey: await hashToken(token),
          partialKey: `${token.slice(0, 3)}...${token.slice(-4)}`,
        },
      },
    },
  });

  return { partnerId: partner.id, userId: user.id, token };
}

async function deleteInvoicePartner(
  auth: { partnerId: string; userId: string } | undefined,
) {
  if (!auth) return;

  await deletePartner(auth.partnerId);
  await prisma.token.deleteMany({ where: { userId: auth.userId } });
  await prisma.user.deleteMany({ where: { id: auth.userId } });
}

async function createPayout({
  programId,
  partnerId,
  status = "completed",
  mode,
}: {
  programId: string;
  partnerId: string;
  status?: PayoutStatus;
  mode?: PayoutMode;
}) {
  return prisma.payout.create({
    data: {
      id: createId({ prefix: "po_" }),
      programId,
      partnerId,
      amount: 50_000,
      status,
      mode,
      paidAt: status === "completed" ? new Date() : undefined,
    },
  });
}

async function setInvoiceSettings(
  programId: string,
  value: typeof invoiceSettings | null,
) {
  await prisma.program.update({
    where: { id: programId },
    data: {
      invoiceSettings: value ?? Prisma.DbNull,
    } as Prisma.ProgramUpdateInput,
  });
}

async function getPayoutInvoice(token: string, payoutId: string) {
  const response = await fetch(
    `${PLAYWRIGHT_PARTNERS_API_BASE}/invoices/${payoutId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const contentType = response.headers.get("content-type") ?? "";
  const contentDisposition = response.headers.get("content-disposition") ?? "";

  if (contentType.includes("application/pdf")) {
    const body = new Uint8Array(await response.arrayBuffer());
    return {
      status: response.status,
      contentType,
      contentDisposition,
      data: null,
      pdfContains: (value: string) => pdfContains(body, value),
    };
  }

  return {
    status: response.status,
    contentType,
    contentDisposition,
    data: await response.json(),
    pdfContains: () => false,
  };
}

function decodePdfLiteralStrings(source: string) {
  return [...source.matchAll(/\((?:\\.|[^\\)])*\)/g)]
    .map((match) =>
      match[0]
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\(.)/g, "$1"),
    )
    .join("");
}

function decodePdfHexStrings(source: string) {
  return [...source.matchAll(/<([0-9A-Fa-f]+)>/g)]
    .map((match) => {
      try {
        return Buffer.from(match[1], "hex").toString("latin1");
      } catch {
        return "";
      }
    })
    .join("");
}

function pdfContains(bytes: Uint8Array, value: string) {
  const raw = Buffer.from(bytes).toString("latin1");
  const chunks = [raw];

  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      chunks.push(
        inflateSync(Uint8Array.from(Buffer.from(match[1], "latin1"))).toString(
          "latin1",
        ),
      );
    } catch {
      // stream is not flate-encoded
    }
  }

  const haystack = [
    ...chunks,
    ...chunks.map(decodePdfLiteralStrings),
    ...chunks.map(decodePdfHexStrings),
  ].join("\n");
  const compactHaystack = haystack.replace(/\s+/g, "");
  const compactValue = value.replace(/\s+/g, "");

  return haystack.includes(value) || compactHaystack.includes(compactValue);
}

test("GET /invoices/:payoutId – program invoice settings", async ({
  api,
  program,
}) => {
  let auth: Awaited<ReturnType<typeof createInvoicePartner>> | undefined;

  try {
    auth = await createInvoicePartner(api, program.defaultGroupId);
    const payout = await createPayout({
      programId: program.id,
      partnerId: auth.partnerId,
    });
    await setInvoiceSettings(program.id, invoiceSettings);

    const invoice = await getPayoutInvoice(auth.token, payout.id);

    expect(invoice.status).toEqual(200);
    expect(invoice.contentType).toContain("application/pdf");
    expect(invoice.contentDisposition).toContain(
      `filename="payout-invoice-${payout.id}.pdf"`,
    );
    expect(invoice.pdfContains("Dub Technologies INC")).toBe(true);
    expect(invoice.pdfContains(invoiceSettings.companyName)).toBe(true);
    expect(invoice.pdfContains(invoiceSettings.address)).toBe(true);
    expect(invoice.pdfContains(invoiceSettings.taxId)).toBe(true);
  } finally {
    await setInvoiceSettings(program.id, null);
    await deleteInvoicePartner(auth);
  }
});

test("GET /invoices/:payoutId – falls back to Dub details", async ({
  api,
  program,
}) => {
  let auth: Awaited<ReturnType<typeof createInvoicePartner>> | undefined;

  try {
    auth = await createInvoicePartner(api, program.defaultGroupId);
    const payout = await createPayout({
      programId: program.id,
      partnerId: auth.partnerId,
    });
    await setInvoiceSettings(program.id, null);

    const invoice = await getPayoutInvoice(auth.token, payout.id);

    expect(invoice.status).toEqual(200);
    expect(invoice.contentType).toContain("application/pdf");
    expect(invoice.contentDisposition).toContain(
      `filename="payout-invoice-${payout.id}.pdf"`,
    );
    expect(invoice.pdfContains("Dub Technologies INC")).toBe(true);
    expect(invoice.pdfContains("2261 Market Street STE 5906")).toBe(true);
    expect(invoice.pdfContains(`Payout invoice ${payout.id}`)).toBe(true);
  } finally {
    await deleteInvoicePartner(auth);
  }
});

test("GET /invoices/:payoutId – pending payout", async ({ api, program }) => {
  let auth: Awaited<ReturnType<typeof createInvoicePartner>> | undefined;

  try {
    auth = await createInvoicePartner(api, program.defaultGroupId);
    const payout = await createPayout({
      programId: program.id,
      partnerId: auth.partnerId,
      status: "pending",
    });

    const invoice = await getPayoutInvoice(auth.token, payout.id);

    expect(invoice.status).toEqual(400);
    expect(invoice.data).toEqual(
      apiError({
        code: "bad_request",
        message:
          "This payout is not completed yet, hence no invoice is generated.",
      }).data,
    );
  } finally {
    await deleteInvoicePartner(auth);
  }
});

test("GET /invoices/:payoutId – external payout", async ({ api, program }) => {
  let auth: Awaited<ReturnType<typeof createInvoicePartner>> | undefined;

  try {
    auth = await createInvoicePartner(api, program.defaultGroupId);
    const payout = await createPayout({
      programId: program.id,
      partnerId: auth.partnerId,
      mode: "external",
    });

    const invoice = await getPayoutInvoice(auth.token, payout.id);

    expect(invoice.status).toEqual(400);
    expect(invoice.data).toEqual(
      apiError({
        code: "bad_request",
        message:
          "This payout is made externally, hence no invoice is generated.",
      }).data,
    );
  } finally {
    await deleteInvoicePartner(auth);
  }
});

test("GET /invoices/:payoutId – other partner", async ({ api, program }) => {
  let owner: Awaited<ReturnType<typeof createInvoicePartner>> | undefined;
  let other: Awaited<ReturnType<typeof createInvoicePartner>> | undefined;

  try {
    owner = await createInvoicePartner(api, program.defaultGroupId);
    other = await createInvoicePartner(api, program.defaultGroupId);
    const payout = await createPayout({
      programId: program.id,
      partnerId: owner.partnerId,
    });

    const invoice = await getPayoutInvoice(other.token, payout.id);

    expect(invoice.status).toEqual(401);
    expect(invoice.data).toEqual(
      apiError({
        code: "unauthorized",
        message: "You are not authorized to view this payout.",
      }).data,
    );
  } finally {
    await deleteInvoicePartner(owner);
    await deleteInvoicePartner(other);
  }
});

test("GET /invoices/:payoutId – not found", async ({ api, program }) => {
  let auth: Awaited<ReturnType<typeof createInvoicePartner>> | undefined;

  try {
    auth = await createInvoicePartner(api, program.defaultGroupId);

    const invoice = await getPayoutInvoice(auth.token, "po_missing");

    expect(invoice.status).toEqual(404);
    expect(invoice.data).toMatchObject({
      error: {
        code: "not_found",
      },
    });
  } finally {
    await deleteInvoicePartner(auth);
  }
});
