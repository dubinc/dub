"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { UtmTemplateWithUserProps } from "@/lib/types";
import { UTM_PARAMETERS } from "@/ui/links/utm-builder";
import { useAddEditUtmTemplateModal } from "@/ui/modals/add-edit-utm-template.modal";
import { Delete, ThreeDots } from "@/ui/shared/icons";
import {
  Avatar,
  Button,
  CardList,
  Popover,
  Tooltip,
  useKeyboardShortcut,
} from "@dub/ui";
import {
  DiamondTurnRight,
  LoadingSpinner,
  PenWriting,
} from "@dub/ui/src/icons";
import { cn, formatDate } from "@dub/utils";
import { Fragment, useContext, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { TemplatesListContext } from "./page-client";

export function TemplateCard({
  template,
}: {
  template: UtmTemplateWithUserProps;
}) {
  const { id } = useWorkspace();

  const { openMenuTemplateId, setOpenMenuTemplateId } =
    useContext(TemplatesListContext);
  const openPopover = openMenuTemplateId === template.id;
  const setOpenPopover = (open: boolean) => {
    setOpenMenuTemplateId(open ? template.id : null);
  };

  const [processing, setProcessing] = useState(false);

  const { AddEditUtmTemplateModal, setShowAddEditUtmTemplateModal } =
    useAddEditUtmTemplateModal({
      props: template,
    });

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    setProcessing(true);
    fetch(`/api/utm/${template.id}?workspaceId=${id}`, {
      method: "DELETE",
    })
      .then(async (res) => {
        if (res.ok) {
          await mutate(`/api/utm?workspaceId=${id}`);
          toast.success("Template deleted");
        } else {
          const { error } = await res.json();
          toast.error(error.message);
        }
      })
      .finally(() => setProcessing(false));
  };

  const includedParams = UTM_PARAMETERS.filter(({ key }) => template[key]);

  return (
    <>
      <AddEditUtmTemplateModal />

      <CardList.Card
        onClick={() => setShowAddEditUtmTemplateModal(true)}
        innerClassName={cn(
          "flex items-center justify-between gap-5 sm:gap-8 md:gap-12 text-sm transition-opacity",
          processing && "opacity-50",
        )}
      >
        <div className="flex min-w-0 grow items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <DiamondTurnRight className="size-5 shrink-0 text-gray-500" />
            <span className="min-w-0 truncate whitespace-nowrap font-medium text-gray-800">
              {template.name}
            </span>
          </div>
          <div className="shrink-0">
            <UserAvatar template={template} />
          </div>
        </div>

        <Tooltip
          content={
            <div className="grid max-w-[225px] grid-cols-[1fr,minmax(0,min-content)] gap-x-2 gap-y-1 whitespace-nowrap p-2 text-sm sm:min-w-[150px]">
              {includedParams.map(({ key, label, icon: Icon }) => (
                <Fragment key={key}>
                  <span className="font-medium text-gray-600">{label}</span>
                  <span className="truncate text-gray-500">
                    {template[key]}
                  </span>
                </Fragment>
              ))}
            </div>
          }
        >
          <div className="xs:flex hidden shrink-0 items-center gap-1 px-2 text-gray-500">
            {includedParams.map(({ icon: Icon }) => (
              <Icon className="size-3.5" />
            ))}
          </div>
        </Tooltip>

        <div className="hidden text-sm text-gray-500 sm:block">
          {formatDate(template.updatedAt, { month: "short" })}
        </div>

        <div className="flex items-center gap-5 sm:gap-8 md:gap-12">
          <Popover
            content={
              <div className="grid w-full gap-px p-2 sm:w-48">
                <Button
                  text="Edit"
                  variant="outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowAddEditUtmTemplateModal(true);
                  }}
                  icon={<PenWriting className="h-4 w-4" />}
                  shortcut="E"
                  className="h-9 px-2 font-medium"
                />
                <Button
                  text="Delete"
                  variant="danger-outline"
                  onClick={handleDelete}
                  icon={<Delete className="h-4 w-4" />}
                  shortcut="X"
                  className="h-9 px-2 font-medium"
                />
              </div>
            }
            align="end"
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          >
            <Button
              variant="secondary"
              className={cn(
                "h-8 px-1.5 outline-none transition-all duration-200",
                "border-transparent data-[state=open]:border-gray-500 sm:group-hover/card:data-[state=closed]:border-gray-200",
              )}
              icon={
                processing ? (
                  <LoadingSpinner className="h-5 w-5 shrink-0" />
                ) : (
                  <ThreeDots className="h-5 w-5 shrink-0" />
                )
              }
              onClick={() => {
                setOpenPopover(!openPopover);
              }}
            />
          </Popover>
        </div>

        {/* Use consumer + separate component to use hovered state from CardList.Card context */}
        <CardList.Card.Context.Consumer>
          {({ hovered }) => (
            <TemplateCardKeyboardShortcuts
              enabled={openPopover || (hovered && openMenuTemplateId === null)}
              onKeyDown={(e) => {
                setOpenPopover(false);
                switch (e.key) {
                  case "e":
                    setShowAddEditUtmTemplateModal(true);
                    break;
                  case "x":
                    handleDelete();
                    break;
                }
              }}
            />
          )}
        </CardList.Card.Context.Consumer>
      </CardList.Card>
    </>
  );
}

function TemplateCardKeyboardShortcuts({
  enabled,
  onKeyDown,
}: {
  enabled: boolean;
  onKeyDown: (e: KeyboardEvent) => void;
}) {
  useKeyboardShortcut(["e", "x"], onKeyDown, {
    enabled,
  });

  return null;
}

function UserAvatar({ template }: { template: UtmTemplateWithUserProps }) {
  const { user } = template;

  return (
    <Tooltip
      content={
        <div className="w-full p-3">
          <Avatar user={user} className="h-8 w-8" />
          <div className="mt-2 flex items-center gap-1.5">
            <p className="text-sm font-semibold text-gray-700">
              {user?.name || user?.email || "Anonymous User"}
            </p>
          </div>
          <div className="flex flex-col gap-1 text-xs text-gray-500">
            {user?.name && user.email && <p>{user.email}</p>}
          </div>
        </div>
      }
    >
      <div>
        <Avatar user={user} className="h-4 w-4" />
      </div>
    </Tooltip>
  );
}
