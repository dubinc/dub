import { DICEBEAR_AVATAR_URL } from "@dub/utils";
import { ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import useWorkspaces from "../../lib/swr/use-Workspaces";
import IconMenu from "../../public/IconMenu";
import SlashIcon from "../../public/icons/slash";
import { BlurImage, Popover } from "../../ui";
import PlanBadge from "../../ui/shared/plan-badge";
import { useAuth } from "../auth/use-Auth";
import { ChooseWorkspaceProps } from "../types";
import { useSelectedWorkspace } from "../workspace/workspace-now";
import WorkspaceList from "../workspace/workspaceList";

export default function UserSpace() {
  const { workspaces } = useWorkspaces()
  const { user, loading } = useAuth();
  const { selectedWorkspace, setSelectedWorkspace } = useSelectedWorkspace();
  const [openPopover, setOpenPopover] = useState(false);

  if (!loading) {
    return <UserPlaceholder />;
  } else if (!user) {
    return (
      <a
        href="https://app.dub.co/login"
        className="underline-none pl-2 text-sm text-black hover:no-underline"
      >
        Login
      </a>
    );
  }

  const selected = useMemo(() => {
    const workspace = workspaces?.find(
      (workspace) => workspace === selectedWorkspace,
    );
    if (workspace) {
      return {
        ...workspace,
        image: workspace.logo || `${DICEBEAR_AVATAR_URL}${workspace.name}`,
        plan: workspace.plan,
      };
    }
    return null;
  }, [selectedWorkspace, workspaces]) as ChooseWorkspaceProps;

  return (
    <div
      className="flex flex-row items-center justify-between"
      onClick={() => setOpenPopover(!openPopover)}
    >
      <Popover
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        content={
          <WorkspaceList
            selected={selected}
            workspaces={workspaces}
            setSelectedWorkspace={setSelectedWorkspace}
            setOpenPopover={setOpenPopover}
          />
        }
      >
        <button
          onClick={() => setOpenPopover(!openPopover)}
          className="flex items-center justify-between border-none rounded-lg bg-white p-1 text-left text-sm transition-all duration-75 hover:bg-gray-100 focus:outline-none active:bg-gray-200"
        >
          <div className="flex items-center pr-2">
            <img
              src={
                user?.image
                  ? user?.image
                  : `https://api.dicebear.com/7.x/micah/svg?seed=alpha`
              }
              alt="user"
              className="h-10 w-10 overflow-hidden rounded-full"
            />
            {selected && (
              <>
                <IconMenu icon={<SlashIcon />} />
                <BlurImage
                  src={selected.image}
                  alt={selected.id || selected.name}
                  className="h-7 w-7 flex-none overflow-hidden rounded-full"
                />
                <div className="flex items-center space-x-3 pl-2 sm:flex">
                  <span className="inline-block max-w-[100px] overflow-hidden truncate text-xs font-medium sm:max-w-[200px]">
                    {selected.name}
                  </span>
                  <PlanBadge plan={selected.plan} />
                </div>
              </>
            )}
          </div>
          <ChevronsUpDown
            className="h-4 w-4 text-gray-400"
            aria-hidden="true"
          />
        </button>
      </Popover>
    </div>
  );
}

function UserPlaceholder() {
  return (
    <div className="flex animate-pulse items-center space-x-1.5 rounded-lg px-1.5 py-2 sm:w-60">
      <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
      <div className="hidden h-8 w-28 animate-pulse rounded-md bg-gray-200 sm:block sm:w-40" />
      <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
    </div>
  );
}
