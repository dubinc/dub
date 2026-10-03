import { createId } from "@/lib/api/create-id";
import { getOrCreatePartner } from "@/lib/api/partners/get-or-create-partner";
import { prisma } from "@/lib/prisma";
import { expect } from "@playwright/test";
import { randomPartnerEmail } from "../../utils";
import { test } from "../fixtures";
import { deletePartner } from "./helpers";

test("getOrCreatePartner – concurrent same email shares one partner", async () => {
  const email = randomPartnerEmail();

  try {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        getOrCreatePartner({
          email,
          create: {
            id: createId({ prefix: "pn_" }),
            name: email,
            email,
          },
        }),
      ),
    );

    const partnerIds = new Set(results.map((result) => result.partner.id));

    expect(partnerIds.size).toBe(1);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(results.every((result) => result.partner.email === email)).toBe(
      true,
    );

    const rows = await prisma.partner.findMany({
      where: {
        email,
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(results[0].partner.id);
  } finally {
    const rows = await prisma.partner.findMany({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    await Promise.all(rows.map((row) => deletePartner(row.id)));
  }
});
