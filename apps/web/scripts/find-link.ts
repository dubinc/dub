import { prisma } from "@dub/prisma";
import { currencyFormatter } from "@dub/utils";
import "dotenv-flow/config";

const PROGRAM_ID = "prog_1K0A6SX71Q3ZRC1HYFMXQGWJ8";

// Table data: Invoice ID -> expected commission amount (USD cents)
const EXPECTED_COMMISSION_BY_INVOICE_ID: Record<string, number> = {
  "508542": 11880, // $118.80
  "506161": 2346, // $23.46
  "508363": 1100, // $11.00
  "508294": 106, // $1.06
  "507722": 936, // $9.36
  "507692": 6000, // $60.00
  "507596": 16200, // $162.00
  "507579": 6565, // $65.65
  "507452": 180, // $1.80
  "507444": 870, // $8.70
  "507254": 540, // $5.40
  "507236": 8280, // $82.80
  "507185": 3105, // $31.05
  "507180": 530, // $5.30
  "506974": 463, // $4.63
  "506925": 180, // $1.80
  "506853": 195, // $1.95
  "506814": 1080, // $10.80
  "506715": 7615, // $76.15
  "506694": 31680, // $316.80
  "506601": 2760, // $27.60
  "506570": 412, // $4.12
  "506539": 463, // $4.63
  "506377": 1080, // $10.80
  "506367": 2070, // $20.70
  "506348": 23760, // $237.60
  "506235": 360, // $3.60
  "506208": 435, // $4.35
  "506197": 6030, // $60.30
  "506072": 2760, // $27.60
  "506036": 14683, // $146.83
  "506021": 11880, // $118.80
  "505685": 4508, // $45.08
  "505634": 3240, // $32.40
  "505609": 1927, // $19.27
  "505401": 900, // $9.00
  "505215": 10560, // $105.60
  "504939": 32400, // $324.00
  "504837": 79380, // $793.80
  "504640": 3304, // $33.04
  "504627": 435, // $4.35
  "504621": 49725, // $497.25
  "504510": 2760, // $27.60
  "504508": 1080, // $10.80
  "504415": 295, // $2.95
  "504412": 7080, // $70.80
  "504375": 5175, // $51.75
  "504182": 1035, // $10.35
  "503995": 5520, // $55.20
  "503994": 14160, // $141.60
  "503972": 435, // $4.35
  "503922": 255, // $2.55
  "503799": 5443, // $54.43
  "503762": 2199, // $21.99
  "503691": 3240, // $32.40
  "503518": 1035, // $10.35
  "503188": 2937, // $29.37
  "502940": 21812, // $218.12
  "502810": 2070, // $20.70
  "502726": 4595, // $45.95
  "502330": 1080, // $10.80
};

const INVOICE_IDS = Object.keys(EXPECTED_COMMISSION_BY_INVOICE_ID);

async function main() {
  const commissions = await prisma.commission.findMany({
    where: {
      programId: PROGRAM_ID,
      invoiceId: { in: INVOICE_IDS },
    },
    select: {
      id: true,
      invoiceId: true,
      amount: true,
      earnings: true,
      type: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(
    `Expected commissions from table: ${INVOICE_IDS.length} invoice(s)\n`,
  );
  console.log(
    `Found ${commissions.length} commission(s) in DB for program ${PROGRAM_ID} (filtered by invoiceId)\n`,
  );

  const mismatches: Array<{
    id: string;
    invoiceId: string | null;
    earnings: number;
    expectedCents: number;
    diff: number;
  }> = [];

  const matchedInvoiceIds = new Set<string>();

  for (const c of commissions) {
    if (!c.invoiceId) continue;
    const expectedCents = EXPECTED_COMMISSION_BY_INVOICE_ID[c.invoiceId];
    if (expectedCents === undefined) continue;

    matchedInvoiceIds.add(c.invoiceId);

    if (c.earnings !== expectedCents) {
      mismatches.push({
        id: c.id,
        invoiceId: c.invoiceId,
        earnings: c.earnings,
        expectedCents,
        diff: c.earnings - expectedCents,
      });
    }
  }

  const missingInDb = INVOICE_IDS.filter((id) => !matchedInvoiceIds.has(id));

  if (mismatches.length > 0) {
    console.log("Mismatches (DB earnings ≠ table commission amount):");
    console.table(
      mismatches.map((m) => ({
        id: m.id,
        invoiceId: m.invoiceId,
        earnings: currencyFormatter(m.earnings),
        expected: currencyFormatter(m.expectedCents),
        diff: currencyFormatter(m.diff),
      })),
    );
    console.log(`\nTotal mismatches: ${mismatches.length}`);
  } else {
    console.log(
      "All commissions match the table (earnings = expected commission amount).",
    );
  }

  if (missingInDb.length > 0) {
    console.log("\nInvoice IDs in table but not found in DB:");
    console.log(missingInDb.join(", "));
    console.log(`Count: ${missingInDb.length}`);
  }

  console.log("\nAll filtered commissions:");
  console.table(
    commissions.map((c) => ({
      id: c.id,
      invoiceId: c.invoiceId,
      amount: currencyFormatter(c.amount),
      earnings: currencyFormatter(c.earnings),
      expected: c.invoiceId
        ? currencyFormatter(EXPECTED_COMMISSION_BY_INVOICE_ID[c.invoiceId] ?? 0)
        : "-",
      match: c.invoiceId
        ? c.earnings === (EXPECTED_COMMISSION_BY_INVOICE_ID[c.invoiceId] ?? -1)
          ? "✓"
          : "✗"
        : "-",
      status: c.status,
      createdAt: c.createdAt.toISOString().slice(0, 10),
    })),
  );
}

main();
