import { Project } from "@dub/prisma";
import z from "../zod";
import { dotsFetch } from "./fetch";

const schema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
});

export const createDotsApp = async ({
  workspace,
}: {
  workspace: Pick<Project, "id" | "name">;
}) => {
  const response = await dotsFetch("/apps", {
    method: "POST",
    body: {
      name: workspace.name,
      metadata: {
        workspaceId: workspace.id,
      },
    },
  });

  return schema.parse(response);
};
