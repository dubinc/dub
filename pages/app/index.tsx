import NoProjectsPlaceholder from "@/components/app/projects/no-projects-placeholder";
import ProjectCard from "@/components/app/projects/project-card";
import ProjectCardPlaceholder from "@/components/app/projects/project-card-placeholder";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";
import useProjects from "@/lib/swr/use-projects";
import { useContext } from "react";
import { ModalContext } from "#/ui/modal-provider";

export default function App() {
  const { projects } = useProjects();
  const { setShowAddProjectModal } = useContext(ModalContext);

  return (
    <AppLayout>
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">My Projects</h1>
            <button
              onClick={() => setShowAddProjectModal(true)}
              className="rounded-md border border-black bg-black px-5 py-2 text-sm font-medium text-white transition-all duration-75 hover:bg-white hover:text-black active:scale-95"
            >
              Create project
            </button>
          </div>
        </MaxWidthWrapper>
      </div>
      <MaxWidthWrapper>
        <div
          className={`my-10 grid grid-cols-1 ${
            projects?.length === 0 ? "" : "lg:grid-cols-3"
          } gap-5`}
        >
          {projects ? (
            projects.length > 0 ? (
              projects.map((d) => <ProjectCard key={d.slug} {...d} />)
            ) : (
              <NoProjectsPlaceholder />
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
