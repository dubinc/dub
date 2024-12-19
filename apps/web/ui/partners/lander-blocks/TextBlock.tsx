import { programLanderTextBlockSchema } from "@/lib/zod/schemas/program-lander";
import { z } from "zod";
import { BlockMarkdown } from "./BlockMarkdown";
import { BlockTitle } from "./BlockTitle";

export function TextBlock({
  block,
}: {
  block: z.infer<typeof programLanderTextBlockSchema>;
}) {
  return (
    <div>
      <BlockTitle title={block.data.title} />
      <BlockMarkdown className="mt-5">{block.data.content}</BlockMarkdown>
    </div>
  );
}
