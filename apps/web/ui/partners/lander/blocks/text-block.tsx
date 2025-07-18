import { programLanderTextBlockSchema } from "@/lib/zod/schemas/program-lander";
import { z } from "zod";
import { BlockMarkdown } from "./block-markdown";
import { BlockTitle } from "./block-title";

export function TextBlock({
  block,
}: {
  block: z.infer<typeof programLanderTextBlockSchema>;
}) {
  return (
    <div className="space-y-5">
      <BlockTitle title={block.data.title} />
      <BlockMarkdown>{block.data.content}</BlockMarkdown>
    </div>
  );
}
