import { Project } from "@dub/prisma";
import { conn } from "./connection";

// Get workspace by publishable key
export const getWorkspaceByPublishableKey = async (publishableKey: string) => {
  const { rows } =
    (await conn.execute(
      "SELECT * FROM Project WHERE publishableKey = ? LIMIT 1",
      [publishableKey],
    )) || {};

  return rows && Array.isArray(rows) && rows.length > 0
    ? (rows[0] as Project)
    : null;
};
