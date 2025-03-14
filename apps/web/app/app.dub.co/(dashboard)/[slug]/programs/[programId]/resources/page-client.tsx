"use client";

import { deleteProgramResourceAction } from "@/lib/actions/partners/program-resources/delete-program-resource";
import useProgramResources from "@/lib/swr/use-program-resources";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramResourceType } from "@/lib/zod/schemas/program-resources";
import { ResourceCard } from "@/ui/partners/resources/resource-card";
import { ResourceSection } from "@/ui/partners/resources/resource-section";
import { FileContent } from "@dub/ui";
import { capitalize, formatFileSize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useAddColorModal } from "./add-color-modal";
import { useAddFileModal } from "./add-file-modal";
import { useAddLogoModal } from "./add-logo-modal";

export function ProgramResourcesPageClient() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { resources, mutate, isLoading, isValidating } = useProgramResources({
    workspaceId: workspaceId!,
    programId: programId as string,
  });
  const { setShowAddLogoModal, AddLogoModal } = useAddLogoModal();
  const { setShowAddColorModal, AddColorModal } = useAddColorModal();
  const { setShowAddFileModal, AddFileModal } = useAddFileModal();

  const { executeAsync } = useAction(deleteProgramResourceAction, {
    onSuccess: ({ input }) => {
      toast.success(`${capitalize(input.resourceType)} deleted successfully`);
      mutate();
    },
    onError: ({ input, error }) => {
      toast.error(
        error.serverError || `Failed to delete ${input.resourceType}`,
      );
    },
  });

  const handleDelete = async (
    resourceType: ProgramResourceType,
    resourceId: string,
  ) => {
    const result = await executeAsync({
      workspaceId: workspaceId as string,
      programId: programId as string,
      resourceType,
      resourceId,
    });

    return !!result?.data?.success;
  };

  return (
    <>
      <AddLogoModal />
      <AddColorModal />
      <AddFileModal />
      <div className="flex flex-col gap-10">
        <ResourceSection
          resource="logo"
          title="Brand logos"
          description="SVG, JPG, or PNG, max size of 10 MB"
          isLoading={isLoading}
          isValidating={isValidating}
          onAdd={() => setShowAddLogoModal(true)}
        >
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
              onDelete={() => handleDelete("logo", logo.id)}
            />
          ))}
        </ResourceSection>
        <ResourceSection
          resource="color"
          title="Colors"
          description="Provide affiliates with official colors"
          isLoading={isLoading}
          isValidating={isValidating}
          onAdd={() => setShowAddColorModal(true)}
        >
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
              onDelete={() => handleDelete("color", color.id)}
            />
          ))}
        </ResourceSection>
        <ResourceSection
          resource="file"
          title="Additional files"
          description="Any document or zip file, max size 10 MB"
          isLoading={isLoading}
          isValidating={isValidating}
          onAdd={() => setShowAddFileModal(true)}
        >
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
              onDelete={() => handleDelete("file", file.id)}
            />
          ))}
        </ResourceSection>
      </div>
    </>
  );
}
