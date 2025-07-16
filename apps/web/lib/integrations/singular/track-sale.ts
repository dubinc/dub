import { z } from "zod";

const singularRevenueEventSchema = z.object({
  event_name: z.string().min(1),
  revenue: z.number(),
});

export const trackSingularSaleEvent = async (
  searchParams: Record<string, string>,
) => {
  console.log("[Singular] Revenue event received", searchParams);

  const { event_name: eventName, revenue } =
    singularRevenueEventSchema.parse(searchParams);
};
