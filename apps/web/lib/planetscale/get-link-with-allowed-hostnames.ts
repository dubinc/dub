import { punyEncode } from "@dub/utils";
import { conn } from "./connection";

export const getLinkWithAllowedHostnames = async (
  domain: string,
  key: string,
) => {
  const { rows } = await conn.execute<{
    id: string;
    url: string;
    projectId: string;
    folderId: string | null;
    userId: string;
    allowedHostnames: string[];
    trackConversion: boolean;
  }>(
    "SELECT Link.id, Link.url, projectId, folderId, userId, allowedHostnames, trackConversion FROM Link LEFT JOIN Project ON Link.projectId = Project.id WHERE domain = ? AND `key` = ?",
    [domain, punyEncode(decodeURIComponent(key))],
  );

  return rows && Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};
