import { normalizeWorkspaceId } from "../api/workspace-id";
import { WorkspaceProps } from "../types";
import { conn } from "./connection";

export const getWorkspaceViaEdge = async ({
  workspaceId,
  includeDomains = false,
}: {
  workspaceId: string;
  includeDomains?: boolean;
}) => {
  const query = includeDomains
    ? `
      SELECT 
        w.*,
        d.slug,
        d.verified
      FROM Project w
      LEFT JOIN Domain d ON w.id = d.projectId
      WHERE w.id = ?
    `
    : `
      SELECT 
        w.* 
      FROM Project w 
      WHERE w.id = ? 
      LIMIT 1
    `;

  const { rows } =
    (await conn.execute(query, [normalizeWorkspaceId(workspaceId)])) || {};

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  if (!includeDomains) {
    return rows[0] as WorkspaceProps;
  }

  const firstRow = rows[0] as any;
  const workspaceData = { ...firstRow };
  const domains: { slug: string; verified: boolean }[] = [];

  // Process all rows to collect domains
  rows.forEach((row: any) => {
    if (row.slug && row.verified) {
      domains.push({
        slug: row.slug,
        verified: row.verified,
      });
    }
  });

  // Remove domain fields from workspace object
  const { slug, verified, ...cleanWorkspaceData } = workspaceData;

  return {
    ...cleanWorkspaceData,
    domains,
  } as WorkspaceProps & { domains: { slug: string; verified: boolean }[] };
};
