import { punyEncode } from "@dub/utils";
import { normalizeWorkspaceId } from "../api/workspace-id";
import { conn } from "./connection";

export interface LinkWithAllowedHostnames {
  id: string;
  domain: string;
  key: string;
  url: string;
  projectId: string;
  folderId: string | null;
  userId: string;
  trackConversion: boolean;
  allowedHostnames: string[];
}

export const getLinkWithAllowedHostnames = async ({
  domain,
  key,
  linkId,
  externalId,
  workspaceId,
}: {
  domain?: string;
  key?: string;
  linkId?: string;
  externalId?: string;
  workspaceId?: string;
}) => {
  const baseQuery =
    "SELECT Link.id, domain, Link.key, url, projectId, folderId, userId, trackConversion, allowedHostnames FROM Link LEFT JOIN Project ON Link.projectId = Project.id WHERE";

  const { query, params } =
    domain && key
      ? {
          query: `${baseQuery} domain = ? AND \`key\` = ?`,
          params: [domain!, punyEncode(decodeURIComponent(key!))],
        }
      : linkId
        ? {
            query: `${baseQuery} Link.id = ?`,
            params: [linkId],
          }
        : {
            query: `${baseQuery} projectId = ? AND externalId = ?`,
            params: [normalizeWorkspaceId(workspaceId!), externalId],
          };

  const { rows } = await conn.execute<LinkWithAllowedHostnames>(query, params);

  return rows && Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};
