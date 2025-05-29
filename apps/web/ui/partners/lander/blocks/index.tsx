import z from "@/lib/zod";
import { programLanderBlockSchema } from "@/lib/zod/schemas/program-lander";
import { AccordionBlock } from "@/ui/partners/lander/blocks/accordion-block";
import { FilesBlock } from "@/ui/partners/lander/blocks/files-block";
import { ImageBlock } from "@/ui/partners/lander/blocks/image-block";
import { TextBlock } from "@/ui/partners/lander/blocks/text-block";
import { EarningsCalculatorBlock } from "./earnings-calculator-block";

export const BLOCK_COMPONENTS: Record<
  z.infer<typeof programLanderBlockSchema>["type"],
  any
> = {
  image: ImageBlock,
  text: TextBlock,
  files: FilesBlock,
  accordion: AccordionBlock,
  "earnings-calculator": EarningsCalculatorBlock,
};
