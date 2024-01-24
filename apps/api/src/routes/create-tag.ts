import { createRoute, z } from "@hono/zod-openapi";

import { prisma } from "@dub/database";
import { DubApiError, PlanProps, exceededLimitError } from "../lib/errors";
import { HonoApp } from "../lib/hono";
import { authorizeAndRetrieveProject } from "../lib/project";
import { TagSchema } from "../lib/schemas/dub";
import { openApiErrorResponses } from "../lib/schemas/openapi";

// TODO: Move to a shared package
export type TagColorProps =
  | "red"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "brown";

// TODO: Move to a shared package
export const COLORS_LIST: { color: TagColorProps; css: string }[] = [
  {
    color: "red",
    css: "bg-red-100 text-red-600",
  },
  {
    color: "yellow",
    css: "bg-yellow-100 text-yellow-600",
  },
  {
    color: "green",
    css: "bg-green-100 text-green-600",
  },
  {
    color: "blue",
    css: "bg-blue-100 text-blue-600",
  },
  {
    color: "purple",
    css: "bg-purple-100 text-purple-600",
  },
  {
    color: "brown",
    css: "bg-brown-100 text-brown-600",
  },
];

// TODO: Move to a shared package
export function randomBadgeColor() {
  const randomIndex = Math.floor(Math.random() * COLORS_LIST.length);
  return COLORS_LIST[randomIndex].color;
}

// Create a new tag
const route = createRoute({
  method: "post",
  path: "/api/v1/projects/{projectSlug}/tags",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            tag: z.string().min(1).openapi({
              description: "The name of the tag to create.",
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Tag created",
      content: {
        "application/json": {
          schema: TagSchema,
        },
      },
    },
  },
  ...openApiErrorResponses,
});

export const createTagApi = (app: HonoApp) => {
  app.openapi(route, async (c) => {
    const { project } = await authorizeAndRetrieveProject(c);

    const tagsCount = await prisma.tag.count({
      where: {
        projectId: project.id,
      },
    });

    if (tagsCount >= project.tagsLimit) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: exceededLimitError({
          plan: project.plan as PlanProps,
          limit: project.tagsLimit,
          type: "tags",
        }),
      });
    }

    const { tag } = c.req.valid("json");

    const response = await prisma.tag.create({
      data: {
        name: tag,
        color: randomBadgeColor(),
        projectId: project.id,
      },
      select: {
        id: true,
        color: true,
        name: true,
      },
    });

    return c.json(response);
  });
};
