import useSWR from "swr";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";
import NoProjectsPlaceholder from "@/components/app/no-projects-placeholder";
import ProjectCard from "@/components/app/project-card";
import ProjectCardPlaceholder from "@/components/app/project-card-placeholder";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Tooltip, { TooltipContent } from "@/components/shared/tooltip";
import AppLayout from "components/layout/app";
import { FREE_PLAN_PROJECT_LIMIT } from "@/lib/constants";
import useUsage from "@/lib/swr/use-usage";
import { ProjectProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";

export default function App() {
  const { data } = useSWR<ProjectProps[]>(`/api/projects`, fetcher);
  const { setShowAddProjectModal, AddProjectModal } = useAddProjectModal({});
  const { plan } = useUsage();

  return (
    <AppLayout>
      <AddProjectModal />
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">My Projects</h1>
            {plan === "Free" && data?.length >= FREE_PLAN_PROJECT_LIMIT ? (
              <Tooltip
                content={
                  <TooltipContent
                    title={`You can only have ${FREE_PLAN_PROJECT_LIMIT} projects on the Free plan. Upgrade to the Pro plan create more.`}
                    cta="Upgrade"
                    ctaLink={`/settings`}
                  />
                }
              >
                <div className="cursor-not-allowed rounded-md border border-gray-200 px-5 py-2 text-sm font-medium text-gray-300 transition-all duration-75">
                  Add
                </div>
              </Tooltip>
            ) : (
              <button
                onClick={() => setShowAddProjectModal(true)}
                className="rounded-md border border-black bg-black px-5 py-2 text-sm font-medium text-white transition-all duration-75 hover:bg-white hover:text-black active:scale-95"
              >
                Add
              </button>
            )}
          </div>
        </MaxWidthWrapper>
      </div>
      <MaxWidthWrapper>
        <div
          className={`my-10 grid grid-cols-1 ${
            data?.length === 0 ? "" : "lg:grid-cols-3"
          } gap-5`}
        >
          {data ? (
            data.length > 0 ? (
              data.map((d) => <ProjectCard key={d.slug} {...d} />)
            ) : (
              <NoProjectsPlaceholder
                setShowAddProjectModal={setShowAddProjectModal}
              />
            )
          ) : (
            Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardPlaceholder key={i} />
            ))
          )}
        </div>
      </MaxWidthWrapper>
    </AppLayout>
  );
}
