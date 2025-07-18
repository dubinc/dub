import { z } from "zod";

const programLanderBlockTitleSchema = z.string().optional();

export const programLanderBlockCommonSchema = z.object({
  id: z.string(),
});

export const programLanderImageBlockSchema =
  programLanderBlockCommonSchema.extend({
    type: z.literal("image"),
    data: z.object({
      url: z.string().url(),
      alt: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  });

export const programLanderTextBlockSchema =
  programLanderBlockCommonSchema.extend({
    type: z.literal("text"),
    data: z.object({
      title: programLanderBlockTitleSchema,
      content: z.string(),
    }),
  });

export const programLanderFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
  external: z.boolean().optional(),
});

export const programLanderFilesBlockSchema =
  programLanderBlockCommonSchema.extend({
    type: z.literal("files"),
    data: z.object({
      title: programLanderBlockTitleSchema,
      items: z.array(programLanderFileSchema),
    }),
  });

export const programLanderAccordionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
});

export const programLanderAccordionBlockSchema =
  programLanderBlockCommonSchema.extend({
    type: z.literal("accordion"),
    data: z.object({
      title: programLanderBlockTitleSchema,
      items: z.array(programLanderAccordionItemSchema),
    }),
  });

export const programLanderEarningsCalculatorBlockSchema =
  programLanderBlockCommonSchema.extend({
    type: z.literal("earnings-calculator"),
    data: z.object({
      productPrice: z.number().describe("Average product price in cents"),
    }),
  });

export const programLanderBlockSchema = z.discriminatedUnion("type", [
  programLanderImageBlockSchema,
  programLanderTextBlockSchema,
  programLanderFilesBlockSchema,
  programLanderAccordionBlockSchema,
  programLanderEarningsCalculatorBlockSchema,
]);

export const programLanderRewardsSchema = z.object({
  saleRewardId: z.string().or(z.literal("none")).optional(),
  leadRewardId: z.string().or(z.literal("none")).optional(),
  clickRewardId: z.string().or(z.literal("none")).optional(),
  discountId: z.string().or(z.literal("none")).optional(),
});

export const programLanderSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  rewards: programLanderRewardsSchema.optional(),
  blocks: z.array(programLanderBlockSchema),
});

// Simpler schemas for AI generation
export const programLanderSimpleBlockSchema = z.discriminatedUnion("type", [
  programLanderImageBlockSchema,
  programLanderTextBlockSchema,
  programLanderAccordionBlockSchema,
  programLanderEarningsCalculatorBlockSchema,
]);

export const programLanderSimpleSchema = z.object({
  blocks: z.array(programLanderSimpleBlockSchema),
});
