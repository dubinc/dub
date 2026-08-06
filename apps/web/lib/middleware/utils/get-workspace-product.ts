import { workspaceProductCache } from "@/lib/api/workspaces/workspace-product-cache";
import { conn } from "@/lib/planetscale/connection";
import { WorkspaceProps } from "@/lib/types";
import { after } from "next/server";

export const getWorkspaceProduct = async (workspaceSlug: string) => {
  try {
    let workspaceProduct = await workspaceProductCache.get({
      slug: workspaceSlug,
    });
    if (workspaceProduct) {
      return workspaceProduct;
    }

    const { rows } =
      (await conn.execute(`SELECT * FROM Project WHERE slug = ?`, [
        workspaceSlug,
      ])) || {};

    const workspace =
      rows && Array.isArray(rows) && rows.length > 0
        ? (rows[0] as WorkspaceProps)
        : null;

    workspaceProduct =
      workspace?.defaultProduct ??
      (workspace?.defaultProgramId ? "program" : "links");

    after(async () => {
      await workspaceProductCache.set({
        slug: workspaceSlug,
        product: workspaceProduct,
      });
    });

    return workspaceProduct;
  } catch (error) {
    console.error(
      `Error getting workspace product for ${workspaceSlug}:`,
      error,
    );
    return "links"; // fallback to links if there's an error
  }
};
