import { programResourcesSchema } from "@/lib/zod/schemas/program-resources";
import { ResourceCard } from "@/ui/partners/resources/resource-card";
import { ResourceSection } from "@/ui/partners/resources/resource-section";
import { FileContent } from "@dub/ui";
import { formatFileSize, TAB_ITEM_ANIMATION_SETTINGS } from "@dub/utils";
import { motion } from "framer-motion";
import { z } from "zod";

export function ReferralsEmbedResources({
  resources,
}: {
  resources: z.infer<typeof programResourcesSchema>;
}) {
  return (
    <motion.div
      className="flex flex-col gap-4"
      {...TAB_ITEM_ANIMATION_SETTINGS}
    >
      {!!resources?.logos?.length && (
        <ResourceSection resource="logo" title="Brand logos">
          {resources?.logos?.map((logo) => (
            <ResourceCard
              key={logo.id}
              resourceType="logo"
              icon={
                <div className="relative size-8 overflow-hidden">
                  <img
                    src={logo.url}
                    alt="thumbnail"
                    className="size-full object-contain"
                  />
                </div>
              }
              title={logo.name || "Logo"}
              description={formatFileSize(logo.size, 0)}
              downloadUrl={logo.url}
            />
          ))}
        </ResourceSection>
      )}
      {!!resources?.colors?.length && (
        <ResourceSection resource="color" title="Colors">
          {resources?.colors?.map((color) => (
            <ResourceCard
              key={color.id}
              resourceType="color"
              icon={
                <div
                  className="size-full"
                  style={{ backgroundColor: color.color }}
                />
              }
              title={color.name || "Color"}
              description={color.color.toUpperCase()}
              copyText={color.color.toUpperCase()}
            />
          ))}
        </ResourceSection>
      )}
      {!!resources?.files?.length && (
        <ResourceSection resource="file" title="Additional files">
          {resources?.files?.map((file) => (
            <ResourceCard
              key={file.id}
              resourceType="file"
              icon={
                <div className="flex size-full items-center justify-center bg-neutral-50">
                  <FileContent className="size-4 text-neutral-800" />
                </div>
              }
              title={file.name || "File"}
              description={formatFileSize(file.size, 0)}
              downloadUrl={file.url}
            />
          ))}
        </ResourceSection>
      )}
    </motion.div>
  );
}
