import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";
import BlurImage from "#/ui/blur-image";
import { ChevronUpDown, PlusCircle, Tick } from "@/components/shared/icons";
import Popover from "@/components/shared/popover";
import { PlanProps, ProjectWithDomainProps } from "@/lib/types";
import useProjects from "@/lib/swr/use-projects";
import PlanBadge from "@/components/app/settings/plan-badge";
import { GOOGLE_FAVICON_URL } from "@/lib/constants";

export default function ProjectSelect() {
  const { projects } = useProjects();
  const { AddProjectModal, setShowAddProjectModal } = useAddProjectModal();

  const router = useRouter();
  const { slug } = router.query as {
    slug?: string;
  };

  const { data: session } = useSession();

  const selected = useMemo(() => {
    if (slug && projects) {
      const selectedProject = projects?.find(
        (project) => project.slug === slug,
      );
      return {
        ...selectedProject,
        image:
          selectedProject?.logo ||
          `${GOOGLE_FAVICON_URL}${selectedProject?.primaryDomain?.slug}`,
      };
    } else {
      return {
        name: session?.user?.name || session?.user?.email,
        slug: "/",
        image:
          session?.user?.image ||
          `https://avatars.dicebear.com/api/micah/${session?.user?.email}.svg`,
        plan: "free",
      };
    }
  }, [slug, projects, session]) as {
    name: string;
    slug: string;
    image: string;
    plan: PlanProps;
  };

  const [openPopover, setOpenPopover] = useState(false);

  if (!projects || !router.isReady)
    return (
      <div className="flex h-12 w-32 animate-pulse items-center justify-end rounded-lg bg-gray-100 px-2 sm:w-60">
        <ChevronUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
      </div>
    );

  return (
    <div>
      <AddProjectModal />
      <Popover
        content={
          <ProjectList
            selected={selected}
            projects={projects}
            setShowAddProjectModal={setShowAddProjectModal}
          />
        }
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <button
          onClick={() => setOpenPopover(!openPopover)}
          className="flex w-60 items-center justify-between rounded-lg bg-white p-1.5 text-left text-sm transition-all duration-75 hover:bg-gray-100 focus:outline-none active:bg-gray-200"
        >
          <div className="flex items-center space-x-3 pr-2">
            <BlurImage
              src={selected.image}
              alt={selected.slug}
              className="h-6 w-6 flex-none overflow-hidden rounded-full sm:h-8 sm:w-8"
              width={48}
              height={48}
            />
            <span className="truncate text-sm font-medium">
              {selected.name}
            </span>
            {selected.slug !== "/" && <PlanBadge plan={selected.plan} />}
          </div>
          <ChevronUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </button>
      </Popover>
    </div>
  );
}

function ProjectList({
  selected,
  projects,
  setShowAddProjectModal,
}: {
  selected: {
    name: string;
    slug: string;
    image: string;
    plan: PlanProps;
  };
  projects: ProjectWithDomainProps[];
  setShowAddProjectModal: (show: boolean) => void;
}) {
  const router = useRouter();

  return (
    <div className="relative mt-1 max-h-60 w-full overflow-auto rounded-md bg-white p-2 text-base sm:w-60 sm:text-sm sm:shadow-lg">
      {projects.map(({ name, slug, logo, primaryDomain }) => (
        <button
          key={slug}
          className={`relative flex w-full items-center space-x-2 rounded-md p-2 hover:bg-gray-100 active:bg-gray-200 ${
            selected.slug === slug ? "font-medium" : ""
          } transition-all duration-75`}
          onClick={() => router.push(`/${slug}`)}
        >
          <BlurImage
            src={logo || `${GOOGLE_FAVICON_URL}${primaryDomain?.slug}`}
            alt={slug}
            className="h-7 w-7 overflow-hidden rounded-full"
            width={48}
            height={48}
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
        </button>
      ))}
      <button
        key="add"
        onClick={() => setShowAddProjectModal(true)}
        className="flex w-full cursor-pointer items-center space-x-2 rounded-md p-2 transition-all duration-75 hover:bg-gray-100"
      >
        <PlusCircle className="h-7 w-7 text-gray-600" />
        <span className="block truncate">Add a new project</span>
      </button>
    </div>
  );
}
