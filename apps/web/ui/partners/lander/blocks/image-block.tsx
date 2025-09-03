import { programLanderImageBlockSchema } from "@/lib/zod/schemas/program-lander";
import { ZoomImage } from "@/ui/shared/zoom-image";
import { z } from "zod";

export function ImageBlock({
  block,
}: {
  block: z.infer<typeof programLanderImageBlockSchema>;
}) {
  return (
    <ZoomImage
      src={block.data.url}
      alt={block.data.alt}
      width={block.data.width}
      height={block.data.height}
    />
  );
}
