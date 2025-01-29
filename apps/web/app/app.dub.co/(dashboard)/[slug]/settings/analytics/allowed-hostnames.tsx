"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, CardList, CircleCheck, LoadingSpinner, Trash } from "@dub/ui";
import { cn, validDomainRegex } from "@dub/utils";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export const AllowedHostnames = () => {
  const { allowedHostnames, loading } = useWorkspace();

  return (
    <div className="grid gap-5 rounded-lg border border-neutral-200 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-black">
          Allowed Hostnames
        </h2>
        <p className="text-sm text-neutral-500">
          Specify a list of hostnames where client-side click tracking will be
          allowed on.{" "}
          <Link
            href="https://dub.co/docs/conversions/clicks/introduction#client-side-click-tracking"
            target="_blank"
            className="underline transition-colors hover:text-neutral-800"
          >
            Learn more.
          </Link>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <AddHostnameForm />
        <CardList variant="compact" loading={loading}>
          {allowedHostnames?.map((hostname) => (
            <AllowedHostnameCard key={hostname} hostname={hostname} />
          ))}
        </CardList>
      </div>
    </div>
  );
};

const AddHostnameForm = () => {
  const [hostname, setHostname] = useState("");
  const [processing, setProcessing] = useState(false);
  const { id, allowedHostnames, mutate, role } = useWorkspace();

  const { error: permissionsError } = clientAccessCheck({
    action: "workspaces.write",
    role,
    customPermissionDescription: "add hostnames",
  });

  const addHostname = async () => {
    if (allowedHostnames?.includes(hostname)) {
      toast.error("Hostname already exists.");
      return;
    }

    const isHostnameValid =
      validDomainRegex.test(hostname) || hostname === "localhost";

    if (!isHostnameValid) {
      toast.error("Enter a valid domain.");
      return;
    }

    setProcessing(true);

    const response = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        allowedHostnames: [...(allowedHostnames || []), hostname],
      }),
    });

    if (response.ok) {
      toast.success("Hostname added.");
    } else {
      const { error } = await response.json();
      toast.error(error.message);
    }

    mutate();
    setProcessing(false);
    setHostname("");
  };

  const isHostnameValid =
    validDomainRegex.test(hostname) || hostname === "localhost";

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        addHostname();
      }}
    >
      <div className="relative mt-2 flex-1 rounded-md shadow-sm">
        <input
          type="text"
          required
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          autoComplete="off"
          placeholder="example.com"
          className={cn(
            "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
          )}
        />
      </div>

      <Button
        text="Add Hostname"
        variant="primary"
        onClick={addHostname}
        disabled={!isHostnameValid || hostname.length === 0}
        loading={processing}
        className="w-40"
        disabledTooltip={permissionsError || undefined}
      />
    </form>
  );
};

const AllowedHostnameCard = ({ hostname }: { hostname: string }) => {
  const { id, allowedHostnames, mutate, role } = useWorkspace();
  const [processing, setProcessing] = useState(false);

  const { error: permissionsError } = clientAccessCheck({
    action: "workspaces.write",
    role,
    customPermissionDescription: "delete hostnames",
  });

  const deleteHostname = async () => {
    if (!confirm("Are you sure you want to delete this hostname?")) {
      return;
    }

    setProcessing(true);

    const response = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        allowedHostnames: allowedHostnames?.filter((h) => h !== hostname),
      }),
    });

    if (response.ok) {
      toast.success("Hostname deleted.");
    } else {
      const { error } = await response.json();
      toast.error(error.message);
    }

    mutate();
    setProcessing(false);
  };

  return (
    <CardList.Card
      key={hostname}
      innerClassName={cn(
        "flex items-center justify-between gap-5 sm:gap-8 md:gap-12 text-sm transition-opacity",
        processing && "opacity-50",
      )}
      hoverStateEnabled={false}
    >
      <div className="flex min-w-0 grow items-center gap-3">
        <CircleCheck className="size-4 text-green-500" />
        <span className="min-w-0 truncate whitespace-nowrap font-medium text-neutral-800">
          {hostname}
        </span>
      </div>

      <div className="flex items-center gap-5 sm:gap-8 md:gap-12">
        <Button
          variant="outline"
          className={cn(
            "h-8 px-1.5 outline-none transition-all duration-200",
            "border-transparent data-[state=open]:border-neutral-500 sm:group-hover/card:data-[state=closed]:border-neutral-200",
          )}
          icon={
            processing ? (
              <LoadingSpinner className="size-4 shrink-0" />
            ) : (
              <Trash className="size-4" />
            )
          }
          onClick={deleteHostname}
          disabledTooltip={permissionsError || undefined}
        />
      </div>
    </CardList.Card>
  );
};
