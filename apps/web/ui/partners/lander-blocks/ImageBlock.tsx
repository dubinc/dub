import { programLanderImageBlockSchema } from "@/lib/zod/schemas/programs";
import { z } from "zod";

export function ImageBlock({
  block,
}: {
  block: z.infer<typeof programLanderImageBlockSchema>;
}) {
  return (
    <div className="py-4">
      <img
        src={block.data.url}
        alt={block.data.alt}
        width={block.data.width}
        height={block.data.height}
        className="block rounded-lg"
      />
    </div>
  );
}
