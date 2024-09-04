import { Project } from "@prisma/client";
import { getDotsEnv } from "./env";
import { getEncodedCredentials } from "./utils";

export const createDotsApp = async ({
  workspace,
}: {
  workspace: Pick<Project, "id" | "name">;
}) => {
  const { DOTS_API_URL } = getDotsEnv();

  const response = await fetch(`${DOTS_API_URL}/apps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${getEncodedCredentials()}`,
    },
    body: JSON.stringify({
      name: workspace.name,
      metadata: {
        workspaceId: workspace.id,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to create Dots app: ${data}`);
  }

  console.log("createDotsApp", data);

  return data;
};
