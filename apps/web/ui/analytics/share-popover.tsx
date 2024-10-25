import useWorkspace from "@/lib/swr/use-workspace";
import {
  AnimatedSizeContainer,
  Button,
  Copy,
  Popover,
  ReferredVia,
  Tick,
} from "@dub/ui";
import { APP_DOMAIN, fetcher, getPrettyUrl } from "@dub/utils";
import { useContext, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { AnalyticsContext } from "./analytics-provider";

export default function SharePopover() {
  const { id: workspaceId } = useWorkspace();
  const [removing, setRemoving] = useState(false);
  const [openSharePopover, setopenSharePopoverPopover] = useState(false);

  const { queryString } = useContext(AnalyticsContext) as {
    queryString: string;
  };

  const { data, mutate, isLoading } = useSWR<{ id: string }>(
    `/api/analytics/share?${queryString}`,
    fetcher,
  );

  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    const res = await fetch(`/api/analytics/share?${queryString}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      toast.error("Failed to create shared dashboard");
      return;
    }
    if (res.status === 200) {
      const data = await res.json();
      await mutate();
      toast.success(
        "Successfully created shared dashboard! Copied link to clipboard.",
      );
      navigator.clipboard.writeText(`${APP_DOMAIN}/share/${data.id}`);
    }
    setIsCreating(false);
  };

  const handleRemove = async () => {
    if (!data) {
      return;
    }

    setRemoving(true);

    const res = await fetch(
      `/api/analytics/share/${data.id}?workspaceId=${workspaceId}`,
      {
        method: "DELETE",
      },
    );

    if (!res.ok) {
      toast.error("Failed to remove shared dashboard.");
      return;
    }

    await mutate();
    toast.success("Removed shared dashboard.");
    setRemoving(false);
    setopenSharePopoverPopover(false);
  };

  if (isLoading) {
    return null;
  }

  return (
    <Popover
      content={
        <AnimatedSizeContainer height>
          <div className="grid w-full gap-2 p-4 text-sm md:max-w-xs">
            <p className="font-semibold text-gray-800">
              Shared Analytics Dashboard
            </p>
            <p className="text-gray-500">
              Share this link's analytics with anyone via a shared dashboard –
              no signup required.
            </p>

            {data ? (
              <>
                <div className="divide-x-200 flex items-center justify-between divide-x overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                  <div className="scrollbar-hide overflow-scroll pl-3">
                    <p className="whitespace-nowrap text-gray-400">
                      {getPrettyUrl(`${APP_DOMAIN}/share/${data.id}`)}
                    </p>
                  </div>
                  <button
                    className="h-8 flex-none border-l bg-white px-2 hover:bg-gray-50 active:bg-gray-100"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${APP_DOMAIN}/share/${data.id}`,
                      );
                      setCopied(true);
                      toast.success("Copied to clipboard");
                      setTimeout(() => setCopied(false), 3000);
                    }}
                  >
                    {copied ? (
                      <Tick className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>

                <div className="flex justify-start">
                  <Button
                    text={removing ? "Removing..." : "Remove link"}
                    variant="outline"
                    className="w-fit"
                    loading={removing}
                    onClick={handleRemove}
                  />
                </div>
              </>
            ) : (
              <Button
                text="Create dashboard"
                className="h-9"
                onClick={handleCreate}
                loading={isCreating}
              />
            )}
          </div>
        </AnimatedSizeContainer>
      }
      align="end"
      openPopover={openSharePopover}
      setOpenPopover={setopenSharePopoverPopover}
    >
      <Button
        variant="secondary"
        onClick={() => setopenSharePopoverPopover(!openSharePopover)}
        icon={<ReferredVia className="h-4 w-4" />}
        text="Share"
        className="w-fit"
      />
    </Popover>
  );
}
