import { programResourcesSchema } from "@/lib/zod/schemas/program-resources";
import { ResourceCard } from "@/ui/partners/resources/resource-card";
import { ResourceSection } from "@/ui/partners/resources/resource-section";
import { FileContent, TAB_ITEM_ANIMATION_SETTINGS } from "@dub/ui";
import {
  formatFileSize,
  getApexDomain,
  getFileExtension,
  GOOGLE_FAVICON_URL,
} from "@dub/utils";
import { motion } from "motion/react";
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
              description={`${getFileExtension(logo.url) || "Unknown"}・${formatFileSize(logo.size, 0)}`}
              downloadUrl={logo.url}
            />
          ))}
        </ResourceSection>
      )}

      {!!resources?.links?.length && (
        <ResourceSection resource="link" title="Links">
          {resources?.links?.map((link) => (
            <ResourceCard
              key={link.id}
              resourceType="link"
              icon={
                <div className="flex size-full items-center justify-center bg-neutral-50">
                  <img
                    src={`${GOOGLE_FAVICON_URL}${getApexDomain(link.url)}`}
                    alt={link.name}
                    className="size-6 rounded-full object-contain"
                  />
                </div>
              }
              title={link.name}
              description={link.url}
              copyText={link.url}
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
              description={`${getFileExtension(file.url) || "Unknown"}・${formatFileSize(file.size, 0)}`}
              downloadUrl={file.url}
            />
          ))}
        </ResourceSection>
      )}
    </motion.div>
  );
}
