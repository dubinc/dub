"use client";

import { deleteProgramResourceAction } from "@/lib/actions/partners/program-resources/delete-program-resource";
import useProgramResources from "@/lib/swr/use-program-resources";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramResourceType } from "@/lib/zod/schemas/program-resources";
import { ResourceCard } from "@/ui/partners/resources/resource-card";
import { AnimatedSizeContainer, FileContent, LoadingSpinner } from "@dub/ui";
import { capitalize, formatFileSize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { SettingsRow } from "../../program-settings-row";
import { useAddColorModal } from "./add-color-modal";
import { useAddFileModal } from "./add-file-modal";
import { useAddLogoModal } from "./add-logo-modal";

export function ProgramBrandAssets() {
  const { id: workspaceId } = useWorkspace();

  const { resources, mutate, isLoading, isValidating } = useProgramResources();
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
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="p-6">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-900">
            Brand Assets
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Logos, colors, and additional documents for your partners to
            download and use
          </p>
        </div>

        <div className="divide-y divide-neutral-200 border-t border-neutral-200 px-6">
          <SettingsRow
            heading="Brand Logos"
            description="SVG, JPG, or PNG, max size of 10 MB"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-2">
                  {isLoading && <LoadingSpinner className="h-4 w-4" />}
                  <button
                    type="button"
                    onClick={() => setShowAddLogoModal(true)}
                    className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                  >
                    Add Logo
                  </button>
                </div>
              </div>

              <AnimatedSizeContainer
                height
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {resources?.logos && resources.logos.length > 0 && (
                  <div className="grid gap-2">
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
                  </div>
                )}
              </AnimatedSizeContainer>
            </div>
          </SettingsRow>

          <SettingsRow
            heading="Colors"
            description="Provide affiliates with official colors"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-2">
                  {isLoading && <LoadingSpinner className="h-4 w-4" />}
                  <button
                    type="button"
                    onClick={() => setShowAddColorModal(true)}
                    className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                  >
                    Add Color
                  </button>
                </div>
              </div>
              <AnimatedSizeContainer
                height
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {resources?.colors && resources.colors.length > 0 && (
                  <div className="grid gap-2">
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
                  </div>
                )}
              </AnimatedSizeContainer>
            </div>
          </SettingsRow>

          <SettingsRow
            heading="Additional Files"
            description="Any document or zip file, max size 10 MB"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-2">
                  {isLoading && <LoadingSpinner className="h-4 w-4" />}
                  <button
                    type="button"
                    onClick={() => setShowAddFileModal(true)}
                    className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                  >
                    Add File
                  </button>
                </div>
              </div>
              <AnimatedSizeContainer
                height
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {resources?.files && resources.files.length > 0 && (
                  <div className="grid gap-2">
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
                  </div>
                )}
              </AnimatedSizeContainer>
            </div>
          </SettingsRow>
        </div>
      </div>
    </>
  );
}
