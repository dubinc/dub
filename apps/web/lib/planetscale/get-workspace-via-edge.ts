import { normalizeWorkspaceId } from "../api/workspace-id";
import { WorkspaceProps } from "../types";
import { conn } from "./connection";

type WorkspaceColumns = keyof WorkspaceProps;

export const getWorkspaceViaEdge = async <T extends WorkspaceColumns[]>(
  workspaceId: string,
  columns?: T,
) => {
  const selectClause = columns && columns.length > 0 ? columns.join(", ") : "*";

  const { rows } =
    (await conn.execute<Pick<WorkspaceProps, T[number]>>(
      `SELECT ${selectClause} FROM Project WHERE id = ? LIMIT 1`,
      [normalizeWorkspaceId(workspaceId)],
    )) || {};

  return rows && Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};
