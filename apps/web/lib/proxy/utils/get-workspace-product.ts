import { conn } from "@/lib/planetscale/connection";
import { WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { after } from "next/server";

export const getWorkspaceProduct = async (workspaceSlug: string) => {
  try {
    let workspaceProduct = await redis.get<"program" | "links">(
      `workspace:product:${workspaceSlug}`,
    );
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

    workspaceProduct = workspace?.defaultProgramId ? "program" : "links";

    after(async () => {
      await redis.set(`workspace:product:${workspaceSlug}`, workspaceProduct, {
        ex: 60 * 60 * 24 * 30, // cache for 30 days
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
