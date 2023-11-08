"use client";

import { PlanProps, ProjectWithDomainProps } from "@/lib/types";
import { ModalContext } from "@/ui/modals/provider";
import PlanBadge from "@/ui/projects/plan-badge";
import { Avatar, Popover, Tick } from "@dub/ui";
import { GOOGLE_FAVICON_URL } from "@dub/utils";
import { ChevronsUpDown, PlusCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useCallback, useContext, useMemo, useState } from "react";
import useProjects from "@/lib/swr/use-projects";

export default function ProjectSelect() {
  const { projects } = useProjects();
  const { data: session, status } = useSession();
  const { slug, key } = useParams() as {
    slug?: string;
    key?: string;
  };

  const selected = useMemo(() => {
    const selectedProject = projects?.find((project) => project.slug === slug);

    if (slug && projects && selectedProject) {
      return {
        ...selectedProject,
        image:
          selectedProject?.logo ||
          `${GOOGLE_FAVICON_URL}${selectedProject?.primaryDomain?.slug}`,
      };

      // return personal account selector if there's no project or error (user doesn't have access to project)
    } else {
      return {
        name: session?.user?.name || session?.user?.email,
        slug: "/",
        image:
          session?.user?.image ||
          `https://api.dicebear.com/7.x/micah/svg?seed=${session?.user?.email}`,
        plan: "free",
      };
    }
  }, [slug, projects, session]) as {
    id?: string;
    name: string;
    slug: string;
    image: string;
    plan: PlanProps;
  };

  const [openPopover, setOpenPopover] = useState(false);

  if (!projects || status === "loading") {
    return <ProjectSelectPlaceholder />;
  }

  return (
    <div>
      <Popover
        content={
          <ProjectList
            selected={selected}
            projects={projects}
            setOpenPopover={setOpenPopover}
          />
        }
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <button
          onClick={() => setOpenPopover(!openPopover)}
          className="flex items-center justify-between rounded-lg bg-white p-1.5 text-left text-sm transition-all duration-75 hover:bg-gray-100 focus:outline-none active:bg-gray-200"
        >
          <div className="flex items-center space-x-3 pr-2">
            <img
              src={selected.image}
              referrerPolicy="no-referrer"
              alt={selected.id || selected.name}
              className="h-8 w-8 flex-none overflow-hidden rounded-full"
            />
            <div
              className={`${
                key ? "hidden" : "flex"
              } items-center space-x-3 sm:flex`}
            >
              <span className="inline-block max-w-[100px] truncate text-sm font-medium sm:max-w-[200px]">
                {selected.name}
              </span>
              {selected.slug !== "/" && <PlanBadge plan={selected.plan} />}
            </div>
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

function ProjectList({
  selected,
  projects,
  setOpenPopover,
}: {
  selected: {
    name: string;
    slug: string;
    image: string;
    plan: PlanProps;
  };
  projects: ProjectWithDomainProps[];
  setOpenPopover: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const { setShowAddProjectModal } = useContext(ModalContext);
  const { domain, key } = useParams() as { domain?: string; key?: string };
  const pathname = usePathname();

  const href = useCallback(
    (slug: string) => {
      if (domain || key || selected.slug === "/") {
        // if we're on a link page, navigate back to the project root
        return `/${slug}`;
      } else {
        // else, we keep the path but remove all query params
        return pathname?.replace(selected.slug, slug).split("?")[0] || "/";
      }
    },
    [domain, key, pathname, selected.slug],
  );

  return (
    <div className="relative mt-1 max-h-72 w-full space-y-0.5 overflow-auto rounded-md bg-white p-2 text-base sm:w-60 sm:text-sm sm:shadow-lg">
      <div className="p-2 text-xs text-gray-500">Personal Account</div>
      <Link
        key="personal"
        className={`relative flex w-full items-center space-x-2 rounded-md px-2 py-1.5 hover:bg-gray-100 active:bg-gray-200 ${
          selected.slug === "/" ? "font-medium" : ""
        } transition-all duration-75`}
        href="/links"
        onClick={() => setOpenPopover(false)}
      >
        <Avatar user={session?.user} className="h-7 w-7" />
        <span
          className={`block truncate pr-8 text-sm ${
            selected.slug === "/" ? "font-medium" : "font-normal"
          }`}
        >
          {session?.user?.name || session?.user?.email}
        </span>
        {selected.slug === "/" ? (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-black">
            <Tick className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
      </Link>
      <div className="p-2 text-xs text-gray-500">Custom Projects</div>
      {projects.map(({ id, name, slug, logo, primaryDomain }) => (
        <Link
          key={slug}
          className={`relative flex w-full items-center space-x-2 rounded-md px-2 py-1.5 hover:bg-gray-100 active:bg-gray-200 ${
            selected.slug === slug ? "font-medium" : ""
          } transition-all duration-75`}
          href={href(slug)}
          shallow={false}
          onClick={() => setOpenPopover(false)}
        >
          <img
            src={logo || `${GOOGLE_FAVICON_URL}${primaryDomain?.slug}`}
            alt={id}
            className="h-7 w-7 overflow-hidden rounded-full"
          />
          <span
            className={`block truncate text-sm ${
              selected.slug === slug ? "font-medium" : "font-normal"
            }`}
          >
            {name}
          </span>
          {selected.slug === slug ? (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-black">
              <Tick className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
        </Link>
      ))}
      <button
        key="add"
        onClick={() => {
          setOpenPopover(false);
          setShowAddProjectModal(true);
        }}
        className="flex w-full cursor-pointer items-center space-x-2 rounded-md p-2 transition-all duration-75 hover:bg-gray-100"
      >
        <PlusCircle className="h-6 w-6 text-gray-500" />
        <span className="block truncate">Add a new project</span>
      </button>
    </div>
  );
}

function ProjectSelectPlaceholder() {
  return (
    <div className="flex animate-pulse items-center space-x-1.5 rounded-lg px-1.5 py-2 sm:w-60">
      <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
      <div className="hidden h-8 w-28 animate-pulse rounded-md bg-gray-200 sm:block sm:w-40" />
      <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
    </div>
  );
}
