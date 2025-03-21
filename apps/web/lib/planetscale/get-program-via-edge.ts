import { conn } from "./connection";
import { EdgeProgramProps } from "./types";

export const getProgramViaEdge = async ({ slug }: { slug: string }) => {
  const { rows } =
    (await conn.execute(
      `SELECT Program.*,
        Reward.event AS rewardEvent, Reward.type AS rewardType, Reward.amount AS rewardAmount, Reward.maxDuration as rewardMaxDuration
        FROM Program
        LEFT JOIN Reward ON Reward.id = Program.defaultRewardId
        WHERE slug = ?`,
      [slug],
    )) || {};

  const program =
    rows && Array.isArray(rows) && rows.length > 0
      ? (rows[0] as EdgeProgramProps)
      : null;

  return program;
};
