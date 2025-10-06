import {
  calculatePartnerProgramPerformances,
  calculateProgramSimilarities,
} from "@/lib/api/network/program-similarity-calculator";

async function main() {
  console.log(
    "🚀 Starting initial program similarity and performance calculation...",
  );

  try {
    // Calculate program similarities first
    console.log("📊 Calculating program similarities...");
    await calculateProgramSimilarities();

    // Then calculate partner program performances
    console.log("🎯 Calculating partner program performances...");
    await calculatePartnerProgramPerformances();

    console.log("✅ Initial calculation completed successfully!");
  } catch (error) {
    console.error("❌ Error during initial calculation:", error);
    process.exit(1);
  }
}

main();
