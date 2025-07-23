import z from "../zod";
import { analyticsFilterTB } from "../zod/schemas/analytics";
import { tb } from "./client";

export const getLinksCount = tb.buildPipe({
  pipe: "get_links_count",
  parameters: analyticsFilterTB.pick({
    workspaceId: true,
    folderId: true,
    start: true,
    end: true,
    timezone: true,
  }),
  data: z.object({
    count: z.number(),
  }),
});
