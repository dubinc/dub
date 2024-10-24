import { Project } from "@prisma/client";
import { DOTS_API_URL } from "./env";
import { dotsAppSchema } from "./schemas";
import { getBasicAuthToken } from "./utils";

export const createDotsApp = async ({
  workspace,
}: {
  workspace: Pick<Project, "id" | "name">;
}) => {
  const response = await fetch(`${DOTS_API_URL}/apps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${getBasicAuthToken()}`,
    },
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

  return dotsAppSchema.parse(await response.json());
};
