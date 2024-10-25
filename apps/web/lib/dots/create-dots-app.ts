import { Project } from "@prisma/client";
import z from "../zod";
import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

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
  const response = await fetch(`${DOTS_API_URL}/apps`, {
    method: "POST",
    headers: dotsHeaders(),
    body: JSON.stringify({
      name: workspace.name,
      metadata: {
        workspaceId: workspace.id,
      },
    }),
  });

  if (!response.ok) {
    console.error(await response.text());

    throw new Error(
      `Failed to create Dots app for the workspace ${workspace.id}.`,
    );
  }

  return schema.parse(await response.json());
};
