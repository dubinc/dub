import { conn } from "@/lib/planetscale/connection";
import { WorkspaceProps } from "@/lib/types";

export const getWorkspaceProduct = async (workspaceSlug: string) => {
  try {
    const { rows } =
      (await conn.execute(`SELECT * FROM Project WHERE slug = ?`, [
        workspaceSlug,
      ])) || {};

    const workspace =
      rows && Array.isArray(rows) && rows.length > 0
        ? (rows[0] as WorkspaceProps)
        : null;
    return workspace?.defaultProgramId ? "program" : "links";
  } catch (error) {
    console.error(
      `Error getting workspace product for ${workspaceSlug}:`,
      error,
    );
    return "links"; // fallback to links if there's an error
  }
};
