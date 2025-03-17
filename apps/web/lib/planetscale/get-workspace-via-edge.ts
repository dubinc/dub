import { getWorkspaceId } from "../api/workspace-id";
import { WorkspaceProps } from "../types";
import { conn } from "./connection";

export const getWorkspaceViaEdge = async (workspaceId: string) => {
  const { rows } =
    (await conn.execute<WorkspaceProps>(
      "SELECT * FROM Project WHERE id = ? LIMIT 1",
      [getWorkspaceId(workspaceId)],
    )) || {};

  return rows && Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};
