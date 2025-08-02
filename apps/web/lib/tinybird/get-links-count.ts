import z from "../zod";
import { analyticsFilterTB } from "../zod/schemas/analytics";
import { tb } from "./client";

const parameters = analyticsFilterTB.pick({
  workspaceId: true,
  folderId: true,
  start: true,
  end: true,
  timezone: true,
});

const data = z.object({
  count: z.number(),
});

export const getLinksCountTB = tb.buildPipe({
  pipe: "get_links_count",
  parameters,
  data,
});
