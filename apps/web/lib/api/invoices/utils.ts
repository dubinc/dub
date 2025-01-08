import { prisma } from "@dub/prisma";
import { generateRandomString } from "@dub/utils";

export async function generateInvoicePrefix() {
  const invoicePrefix = generateRandomString(8);

  const existingPrefix = await prisma.project.findUnique({
    where: {
      invoicePrefix,
    },
  });

  if (existingPrefix) {
    return generateInvoicePrefix();
  }

  return invoicePrefix;
}
