"use client";

import { deleteProgramResourceAction } from "@/lib/actions/partners/program-resources/delete-program-resource";
import useProgramResources from "@/lib/swr/use-program-resources";
import useWorkspace from "@/lib/swr/use-workspace";
import { PROGRAM_RESOURCE_TYPES } from "@/lib/zod/schemas/program-resources";
import { ThreeDots } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  LoadingSpinner,
  Popover,
  Trash,
} from "@dub/ui";
import { capitalize, cn, formatFileSize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { PropsWithChildren, ReactNode, useState } from "react";
import { toast } from "sonner";
import { useAddLogoModal } from "./add-logo-modal";

export function ProgramResourcesPageClient() {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { resources, mutate } = useProgramResources();
  const { setShowAddLogoModal, AddLogoModal } = useAddLogoModal();

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
    resourceType: (typeof PROGRAM_RESOURCE_TYPES)[number],
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
      <div className="flex flex-col gap-10">
        <Section
          resource="logo"
          title="Brand logos"
          description="SVG, JPG, or PNG, max size of 10 MB"
          onAdd={() => setShowAddLogoModal(true)}
        >
          {resources?.logos?.map((logo) => (
            <ResourceCard
              key={logo.id}
              resourceId={logo.id}
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
              onDelete={() => handleDelete("logo", logo.id)}
            />
          ))}
        </Section>
        <Section
          resource="color"
          title="Colors"
          description="Provide affiliates with official colors"
        ></Section>
        <Section
          resource="file"
          title="Additional files"
          description="Any document file format, max size 10 MB"
        ></Section>
      </div>
    </>
  );
}

function Section({
  resource,
  title,
  description,
  onAdd,
  children,
}: PropsWithChildren<{
  resource: string;
  title: string;
  description: string;
  onAdd?: () => void;
}>) {
  const { isLoading, isValidating } = useProgramResources();

  return (
    <div className="grid grid-cols-1 rounded-lg border border-neutral-200 p-6 sm:grid-cols-2">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
      <div className="-m-1">
        <AnimatedSizeContainer
          height
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <div
            className={cn(
              "flex flex-col items-end gap-4 p-1 transition-opacity",
              isValidating && "opacity-50",
            )}
          >
            {children}
            <Button
              type="button"
              text={`Add ${resource}`}
              onClick={onAdd || (() => alert("WIP"))}
              className="h-8 w-fit px-3"
            />
          </div>
        </AnimatedSizeContainer>
      </div>
    </div>
  );
}

function ResourceCard({
  resourceId,
  resourceType,
  title,
  description,
  icon,
  onDelete,
}: {
  resourceId: string;
  resourceType: "logo" | "color" | "file";
  title: string;
  description: string;
  icon: ReactNode;
  onDelete?: () => Promise<boolean>;
}) {
  const [openPopover, setOpenPopover] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className="flex w-full items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-md border border-neutral-200">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-neutral-800">{title}</span>
          <span className="text-xs text-neutral-500">{description}</span>
        </div>
      </div>
      <div className="relative">
        {onDelete && (
          <Popover
            content={
              <div className="w-full sm:w-48">
                <div className="grid gap-px p-2">
                  <Button
                    text={`Delete ${resourceType}`}
                    variant="danger-outline"
                    onClick={async () => {
                      setOpenPopover(false);

                      if (
                        !confirm(
                          "Are you sure you want to delete this resource?",
                        )
                      )
                        return;

                      setIsDeleting(true);
                      const success = await onDelete();
                      if (success) setIsDeleting(false);
                    }}
                    icon={<Trash className="size-4" />}
                    className="h-9 justify-start px-2 font-medium"
                  />
                </div>
              </div>
            }
            align="end"
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          >
            <Button
              variant="secondary"
              className={cn(
                "h-8 px-1.5 text-neutral-500 outline-none transition-all duration-200",
                "border-transparent data-[state=open]:border-neutral-500 sm:group-hover/card:data-[state=closed]:border-neutral-200",
              )}
              icon={
                isDeleting ? (
                  <LoadingSpinner className="size-4 shrink-0" />
                ) : (
                  <ThreeDots className="size-4 shrink-0" />
                )
              }
              onClick={() => {
                setOpenPopover(!openPopover);
              }}
            />
          </Popover>
        )}
      </div>
    </div>
  );
}
