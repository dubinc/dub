import { conn } from "./connection";
import { EdgeProgramProps } from "./types";

// Fetch program and its default rewards
export const getProgramViaEdge = async ({ slug }: { slug: string }) => {
  const { rows } = await conn.execute(
    `SELECT Program.*, Reward.event, Reward.type, Reward.amount, Reward.maxDuration
      FROM Program
      LEFT JOIN Reward ON Reward.programId = Program.id AND Reward.default = 1
      WHERE slug = ?`,
    [slug],
  );

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const program = rows[0] as EdgeProgramProps;

  const rewards = rows.map((row) => ({
    event: row.event,
    type: row.type,
    amount: row.amount,
    maxDuration: row.maxDuration,
  }));

  return {
    id: program.id,
    name: program.name,
    slug: program.slug,
    logo: program.logo,
    wordmark: program.wordmark,
    brandColor: program.brandColor,
    landerData: program.landerData,
    rewards,
  };
};
