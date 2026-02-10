"use server";

import { ToltApi } from "@/lib/tolt/api";
import { toltImporter } from "@/lib/tolt/importer";
import { ToltProgram } from "@/lib/tolt/types";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  toltProgramId: z.string().trim().min(1),
  token: z.string().trim().min(1),
});

export const setToltTokenAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { token, toltProgramId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const toltApi = new ToltApi({ token });
    let program: ToltProgram | undefined;

    try {
      program = await toltApi.getProgram({
        programId: toltProgramId,
      });
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Invalid Tolt token or program ID.",
      );
    }

    await toltImporter.setCredentials(workspace.id, {
      token,
    });

    return {
      program,
    };
  });
