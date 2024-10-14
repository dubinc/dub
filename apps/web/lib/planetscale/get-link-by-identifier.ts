import { Link } from "@prisma/client";
import { conn } from "./connection";

// Get link by workspaceId and identifier
export const getLinkByIdentifier = async (
  workspaceId: string,
  identifier: string,
) => {
  const { rows } =
    (await conn.execute(
      "SELECT * FROM Link WHERE projectId = ? AND identifier = ?",
      [workspaceId, identifier],
    )) || {};

  return rows && Array.isArray(rows) && rows.length > 0
    ? (rows[0] as Link)
    : null;
};
