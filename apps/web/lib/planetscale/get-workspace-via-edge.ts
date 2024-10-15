import { WorkspaceProps } from "../types";
import { conn } from "./connection";

export const getWorkspaceViaEdge = async (workspaceId: string) => {
  const { rows } =
    (await conn.execute<WorkspaceProps>(
      "SELECT * FROM Project WHERE id = ? LIMIT 1",
      [workspaceId.replace("ws_", "")],
    )) || {};

  return rows && Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};
