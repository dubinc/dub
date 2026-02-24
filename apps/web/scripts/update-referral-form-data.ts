import { referralFormSchema } from "@/lib/zod/schemas/referral-form";
import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";
import "dotenv-flow/config";
import { readFileSync } from "fs";

async function main() {
  const programId = ACME_PROGRAM_ID;
  const jsonFilePath = "./scripts/referral-form-sample.json";

  // Read and parse JSON file
  let formData;
  try {
    const fileContent = readFileSync(jsonFilePath, "utf-8");
    formData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading JSON file: ${error}`);
    process.exit(1);
  }

  // Validate JSON against schema
  let validatedData;
  try {
    validatedData = referralFormSchema.parse(formData);
  } catch (error) {
    console.error("Validation failed:", error);
    process.exit(1);
  }

  await prisma.program.update({
    where: {
      id: programId,
    },
    data: {
      referralFormData: validatedData,
    },
  });
}

main();
