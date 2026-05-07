import { submittedLeadFormSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { readFileSync } from "fs";

async function main() {
  const programId = "prog_1K2J9DRWPPJ2F1RX53N92TSGA";
  const jsonFilePath = "./scripts/lead-form-sample.json";

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
    validatedData = submittedLeadFormSchema.parse(formData);
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
