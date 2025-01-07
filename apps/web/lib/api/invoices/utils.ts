import { prisma } from "@dub/prisma";
import { randomBytes } from "crypto";

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

// TODO:
// Move this to shared utils
function generateRandomString(length: number): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomBytesArray = randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytesArray[i] % charset.length;
    result += charset[randomIndex];
  }

  return result;
}
