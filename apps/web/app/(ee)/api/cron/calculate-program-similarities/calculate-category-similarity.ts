import { prisma } from "@dub/prisma";

// Calculate category similarity using Jaccard similarity
export async function calculateCategorySimilarity(
  program1Id: string,
  program2Id: string,
): Promise<number> {
  const [categories1, categories2] = await Promise.all([
    prisma.programCategory.findMany({
      where: {
        programId: program1Id,
      },
      select: {
        category: true,
      },
    }),

    prisma.programCategory.findMany({
      where: {
        programId: program2Id,
      },
      select: {
        category: true,
      },
    }),
  ]);

  const categories1Set = new Set(categories1.map(({ category }) => category));

  const categories2Set = new Set(categories2.map(({ category }) => category));

  const sharedCategories = [...categories1Set].filter((c) =>
    categories2Set.has(c),
  );

  const categorySimilarityScore =
    sharedCategories.length > 0
      ? sharedCategories.length /
        Math.max(categories1Set.size, categories2Set.size)
      : 0;

  return categorySimilarityScore;
}
