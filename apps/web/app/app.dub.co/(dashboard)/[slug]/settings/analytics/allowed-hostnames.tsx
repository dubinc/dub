"use client";

import { isValidDomain } from "@/lib/api/domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  CardList,
  InfoTooltip,
  LoadingSpinner,
  Popover,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { CheckCircle, Delete } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { toast } from "sonner";

export const HostnamesContext = createContext<{
  openMenu: string | null;
  setOpenMenu: Dispatch<SetStateAction<string | null>>;
}>({
  openMenu: null,
  setOpenMenu: () => {},
});

export const AllowedHostnames = () => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { allowedHostnames, loading } = useWorkspace();

  return (
    <div className="grid gap-5 divide-yellow-200 pt-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-black">
          Allowed Hostnames
        </h2>
        <p className="text-sm text-gray-500">
          Allow click tracking from specific hostnames.{" "}
          <Link
            href="https://dub.co/help/article/default-dub-domains"
            target="_blank"
            className="underline transition-colors hover:text-gray-800"
          >
            Learn more.
          </Link>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <AddHostnameForm />
        <HostnamesContext.Provider value={{ openMenu, setOpenMenu }}>
          <CardList variant="compact" loading={loading}>
            {allowedHostnames?.map((hostname) => (
              <AllowedHostnameCard key={hostname} hostname={hostname} />
            ))}
          </CardList>
        </HostnamesContext.Provider>
      </div>
    </div>
  );
};

const AddHostnameForm = () => {
  const [hostname, setHostname] = useState("");
  const [processing, setProcessing] = useState(false);
  const { id, allowedHostnames, mutate } = useWorkspace();

  const addHostname = async () => {
    if (allowedHostnames?.includes(hostname)) {
      toast.error("Hostname already exists.");
      return;
    }

    if (!isValidDomain(hostname)) {
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

  const isHostnameValid = isValidDomain(hostname);

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        addHostname();
      }}
    >
      <div className="flex-1">
        <label htmlFor="name" className="flex items-center space-x-2">
          <h2 className="text-sm font-medium text-gray-900">Hostname</h2>
          <InfoTooltip content="Allow click tracking from specific hostnames." />
        </label>
        <div className="relative mt-2 rounded-md shadow-sm">
          <input
            type="text"
            required
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            autoFocus
            autoComplete="off"
            placeholder="example.com"
            className={cn(
              "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
            )}
          />
        </div>
      </div>

      <Button
        text="Add Hostname"
        variant="primary"
        onClick={addHostname}
        disabled={!isHostnameValid || hostname.length === 0}
        loading={processing}
        className="w-fit"
      />
    </form>
  );
};

const AllowedHostnameCard = ({ hostname }: { hostname: string }) => {
  const { id, allowedHostnames, mutate } = useWorkspace();
  const [processing, setProcessing] = useState(false);
  const { openMenu, setOpenMenu } = useContext(HostnamesContext);

  const setOpenPopover = (open: boolean) => {
    setOpenMenu(open ? hostname : null);
  };

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

  const openPopover = openMenu === hostname;

  return (
    <CardList.Card
      key={hostname}
      innerClassName={cn(
        "flex items-center justify-between gap-5 sm:gap-8 md:gap-12 text-sm transition-opacity",
        processing && "opacity-50",
      )}
    >
      <div className="flex min-w-0 grow items-center gap-3">
        <CheckCircle className="size-4 text-green-500" />
        <span className="min-w-0 truncate whitespace-nowrap text-gray-800">
          {hostname}
        </span>
      </div>

      <div className="flex items-center gap-5 sm:gap-8 md:gap-12">
        <Popover
          content={
            <div className="grid w-full gap-px p-2 sm:w-48">
              <Button
                text="Delete"
                variant="danger-outline"
                onClick={() => {
                  setOpenPopover(false);
                  deleteHostname();
                }}
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
            onClick={() => setOpenPopover(!openPopover)}
          />
        </Popover>
      </div>
    </CardList.Card>
  );
};
