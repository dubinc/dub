import { Project } from "@prisma/client";
import z from "../zod";
import { getDotsEnv } from "./env";
import { getEncodedCredentials } from "./utils";

const dotsAppSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
});

export const createNewDotsApp = async ({
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

  if (!response.ok) {
    console.error(await response.text());
    throw new Error("Failed to create Dots app.");
  }

  return dotsAppSchema.parse(await response.json());
};