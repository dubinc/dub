import z from "@/lib/zod";
import { programLanderBlockSchema } from "@/lib/zod/schemas/program-lander";
import { AccordionBlock } from "@/ui/partners/lander-blocks/AccordionBlock";
import { FilesBlock } from "@/ui/partners/lander-blocks/FilesBlock";
import { ImageBlock } from "@/ui/partners/lander-blocks/ImageBlock";
import { TextBlock } from "@/ui/partners/lander-blocks/TextBlock";

export const BLOCK_COMPONENTS: Record<
  z.infer<typeof programLanderBlockSchema>["type"],
  any
> = {
  image: ImageBlock,
  text: TextBlock,
  files: FilesBlock,
  accordion: AccordionBlock,
};
