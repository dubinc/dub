import { prisma } from "@dub/prisma";
import { IndustryInterest, ProgramIndustryInterest } from "@dub/prisma/client";
import "dotenv-flow/config";
import * as fs from "fs";
import * as path from "path";

interface ProgramData {
  id: string;
  name: string;
  url?: string;
  categories: string[];
}

// script to backfill program IndustryInterest
async function main() {
  try {
    // Read the JSON file - adjust the path as needed
    const jsonFilePath = path.join(__dirname, "program-categories.json");

    if (!fs.existsSync(jsonFilePath)) {
      console.error(`JSON file not found at: ${jsonFilePath}`);
      return;
    }

    const jsonData = fs.readFileSync(jsonFilePath, "utf-8");
    const programCategoriesData: ProgramData[] = JSON.parse(jsonData);

    console.log(`Processing ${programCategoriesData.length} programs...`);

    // Build all industry interest records
    const programIndustryInterests: ProgramIndustryInterest[] = [];

    for (const programData of programCategoriesData) {
      const { id: programId, categories } = programData;

      if (!categories || categories.length === 0) {
        continue;
      }

      const industryInterestRecords = categories.map((category) => ({
        programId,
        industryInterest: category as IndustryInterest,
      }));

      programIndustryInterests.push(...industryInterestRecords);
    }

    console.log(
      `Creating ${programIndustryInterests.length} industry interest records...`,
      programIndustryInterests,
    );

    const result = await prisma.programIndustryInterest.createMany({
      data: programIndustryInterests,
      skipDuplicates: true,
    });

    console.log(
      `Migration completed! Created ${result.count} new industry interest records.`,
    );
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
