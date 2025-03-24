import { punyEncode } from "@dub/utils";
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
  tenantId,
}: {
  domain?: string;
  key?: string;
  tenantId?: string;
}) => {
  if ((!domain || !key) && !tenantId) {
    throw new Error("Either domain and key or tenantId must be provided.");
  }

  const baseQuery =
    "SELECT Link.id, domain, Link.key, url, projectId, folderId, userId, trackConversion, allowedHostnames FROM Link LEFT JOIN Project ON Link.projectId = Project.id WHERE";

  const { query, params } = tenantId
    ? {
        query: `${baseQuery} tenantId = ?`,
        params: [tenantId],
      }
    : {
        query: `${baseQuery} domain = ? AND \`key\` = ?`,
        params: [domain!, punyEncode(decodeURIComponent(key!))],
      };

  const { rows } = await conn.execute<LinkWithAllowedHostnames>(query, params);

  return rows && Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};
