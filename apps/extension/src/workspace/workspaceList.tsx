import { DICEBEAR_AVATAR_URL } from "@dub/utils";
import { Check, PlusCircle } from "lucide-react";
import { BlurImage } from "../../ui";
import { ChooseWorkspaceProps, WorkspaceProps } from "../types";

export default function WorkspaceList({
  selected,
  workspaces,
  setSelectedWorkspace,
  setOpenPopover,
}: {
  selected: ChooseWorkspaceProps;
  workspaces: WorkspaceProps[] | undefined | null;
  setSelectedWorkspace: (workspace: WorkspaceProps) => void;
  setOpenPopover: (open: boolean) => void;
}) {
  return (
    <div className="relative w-full max-w-[400px] overflow-auto rounded-md bg-white text-base sm:text-sm">
      <div className="p-2 text-xs text-gray-500">My Workspaces</div>
      {workspaces?.length ? (
        workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className={`relative flex w-full cursor-pointer items-center space-x-2 rounded-md px-2 py-1.5 hover:bg-gray-100 active:bg-gray-200 ${
              selected?.name === workspace.name ? "font-medium" : ""
            } transition-all duration-75`}
            onClick={() => {
              setSelectedWorkspace(workspace);
              setOpenPopover(false);
            }}
          >
            <BlurImage
              src={workspace.logo || `${DICEBEAR_AVATAR_URL}${workspace.name}`}
              alt={workspace.id}
              className="h-5 w-5 shrink-0 overflow-hidden rounded-full"
            />
            <span
              className={`block overflow-auto truncate text-sm  ${
                selected?.name === workspace.name
                  ? "pr-5 font-medium"
                  : "font-normal"
              }`}
            >
              {workspace.name}
            </span>
            {selected?.name === workspace.name && (
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-black">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
          </div>
        ))
      ) : (
        <div
          style={{ fontSize: "0.7rem" }}
          className="mx-2 overflow-hidden text-center text-black"
        >
          No workspaces
        </div>
      )}
      <button
        key="add"
        onClick={() => {
          setOpenPopover(false);
        }}
        className="flex w-full cursor-pointer items-center space-x-1 rounded-md p-2 transition-all duration-75 hover:bg-gray-100"
      >
        <PlusCircle className="h-5 w-5 text-gray-500" />
        <span className="block truncate text-xs">Add a new workspace</span>
      </button>
    </div>
  );
}
