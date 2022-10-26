import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";
import BlurImage from "@/components/shared/blur-image";
import { ChevronUpDown, PlusCircle, Tick } from "@/components/shared/icons";
import Popover from "@/components/shared/popover";
import useUsage from "@/lib/swr/use-usage";
import { ProjectProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";

export default function ProjectSelect() {
  const { data: projects } = useSWR<ProjectProps[]>("/api/projects", fetcher);
  const { AddProjectModal, setShowAddProjectModal } = useAddProjectModal({});

  const router = useRouter();

  const { data: session } = useSession();

  const selected = useMemo(() => {
    const { slug } = router.query;
    return (
      projects?.find((project) => project.slug === slug) || {
        name: session?.user?.name || session?.user?.email || "User",
        slug: "/",
        domain: "dub.sh",
        logo:
          session?.user?.image ||
          `https://avatars.dicebear.com/api/micah/${session?.user?.email}.svg`,
      }
    );
  }, [router, projects, session]);
  const [openPopover, setOpenPopover] = useState(false);

  if (!projects || !router.isReady)
    return (
      <div className="flex h-12 w-60 animate-pulse items-center justify-end rounded-lg bg-gray-100 px-2">
        <ChevronUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
      </div>
    );

  return (
    <div className="w-60">
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
          className="relative w-60 cursor-pointer rounded-lg bg-white py-1.5 pl-3 pr-10 text-left text-sm transition-all duration-75 hover:bg-gray-100 focus:outline-none active:bg-gray-200"
        >
          <div className="flex items-center justify-start space-x-3">
            <BlurImage
              src={
                selected.logo ||
                `https://www.google.com/s2/favicons?sz=64&domain_url=${selected.domain}`
              }
              alt={selected.slug}
              className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full"
              width={48}
              height={48}
            />
            <span className="block truncate text-sm font-medium">
              {selected.name}
            </span>
          </div>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDown
              className="h-4 w-4 text-gray-400"
              aria-hidden="true"
            />
          </span>
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
    domain: string;
    logo?: string;
  };
  projects: ProjectProps[];
  setShowAddProjectModal?: (show: boolean) => void;
}) {
  const router = useRouter();
  const { plan } = useUsage();

  return (
    <div className="relative mt-1 max-h-60 w-full overflow-auto rounded-md bg-white p-2 text-base sm:w-60 sm:text-sm sm:shadow-lg">
      {projects.map(({ name, slug, domain, logo }) => (
        <button
          key={slug}
          className={`relative flex w-full items-center space-x-2 rounded-md p-2 hover:bg-gray-100 active:bg-gray-200 ${
            selected.slug === slug ? "font-medium" : ""
          } transition-all duration-75`}
          onClick={() => router.push(`/${slug}`)}
        >
          <BlurImage
            src={
              logo ||
              `https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`
            }
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
      {!(plan === "Free" && projects.length >= 5) && (
        <button
          key="add"
          onClick={() => setShowAddProjectModal(true)}
          className="flex w-full cursor-pointer items-center space-x-2 rounded-md p-2 transition-all duration-75 hover:bg-gray-100"
        >
          <PlusCircle className="h-7 w-7 text-gray-600" />
          <span className="block truncate">Add a new project</span>
        </button>
      )}
    </div>
  );
}
