import { ChevronsUpDown, PlusCircle, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { PlanProps, WorkspaceProps } from "../types";
import { BlurImage, Popover } from "../../ui";
import IconMenu from "../../public/IconMenu";
import SlashIcon from "../../public/icons/slash";
import { useAuth } from "../auth/useAuth";
import useWorkspaces from "../../hooks/use-Workspaces";
import PlanBadge from "../../ui/src/plan-badge";
const DICEBEAR_AVATAR_URL = "https://api.dicebear.com/7.x/initials/svg?backgroundType=gradientLinear&fontFamily=Helvetica&fontSize=40&seed=";

interface showWorkspaceProps{
    id?: string,
    name: string;
    slug: string;
    image: string;
    plan: PlanProps;
}


export default function UserSpace() {
  const {workspaces} = useWorkspaces();
  const { user, loading } = useAuth();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>();
  const [openPopover, setOpenPopover] = useState(false);

   if(!loading){
    return (<UserPlaceholder />)
   }else if(!user){
    return (
      <a
      href="https://app.dub.co/login"
      className="text-sm text-black pl-2 underline-none hover:no-underline"
    >
      Login
    </a>
    );    
   }

  const selected = useMemo(() => {
    const workspace = workspaces?.find(workspace => workspace.name === selectedWorkspace);
    if (workspace) {
      return {
        ...workspace,
        image: workspace.logo || `${DICEBEAR_AVATAR_URL}${workspace.name}`,
        plan: workspace.plan,
      };
    } 
    return null;
  }, [selectedWorkspace, workspaces])as showWorkspaceProps;

  return (
    <div className="flex flex-row justify-between items-center"           onClick={() => setOpenPopover(!openPopover)}
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
          className="flex items-center justify-between rounded-lg bg-white p-1 text-left text-sm transition-all duration-75 hover:bg-gray-100 focus:outline-none active:bg-gray-200"
        >
        <div className="flex items-center pr-2">
          <img
              src={user.image || `https://api.dicebear.com/7.x/micah/svg?seed` }
              alt="user"
              className="h-10 w-10  overflow-hidden rounded-full"
          />
         {selected &&
            (<>
            <IconMenu icon={<SlashIcon />} />
            <BlurImage
              src={selected.image}
              alt={selected.id || selected.name}
              className="h-7 w-7 flex-none overflow-hidden rounded-full"
            />
            <div className="flex items-center pl-2 space-x-3 sm:flex">
              <span className="inline-block overflow-hidden max-w-[100px] truncate text-xs font-medium sm:max-w-[200px]">
                {selected.name}
              </span>
              <PlanBadge plan={selected.plan} />
            </div></>)
            }
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

function WorkspaceList({
  selected,
  workspaces,
  setSelectedWorkspace,
  setOpenPopover,
}: {
  selected: showWorkspaceProps;
  workspaces: WorkspaceProps[] | undefined | null;
  setSelectedWorkspace: (name: string) => void;
  setOpenPopover: (open: boolean) => void;
}) {

  return (
    <div className="relative w-full overflow-auto rounded-md bg-white text-base sm:text-sm max-w-[400px]">
      <div className="p-2 text-xs text-gray-500">My Workspaces</div>
      {workspaces?.length ? (workspaces.map(({ id, name, logo }) => (
        <div
          key={id}
          className={`relative flex w-full items-center space-x-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-gray-100 active:bg-gray-200 ${
            selected?.name === name ? "font-medium" : ""
          } transition-all duration-75`}
          onClick={() => {
            setSelectedWorkspace(name);
            setOpenPopover(false);
          }}
        >
          <BlurImage
            src={logo || `${DICEBEAR_AVATAR_URL}${name}`}
            alt={id}
            className="h-5 w-5 shrink-0 overflow-hidden rounded-full"
          />
          <span
            className={`block truncate text-sm overflow-auto  ${
              selected?.name === name ? "font-medium pr-5" : "font-normal"
            }`}
          >
            {name}
          </span>
          {selected?.name === name && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-black">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </div>)))
      :  <div style={{ fontSize: '0.7rem' }} className="text-center mx-2 text-black overflow-hidden">No workspaces</div>

    }
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

function UserPlaceholder() {
  return (
    <div className="flex animate-pulse items-center space-x-1.5 rounded-lg px-1.5 py-2 sm:w-60">
      <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
      <div className="hidden h-8 w-28 animate-pulse rounded-md bg-gray-200 sm:block sm:w-40" />
      <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
    </div>
  );
}