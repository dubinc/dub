import { getProjects } from "@/lib/fetchers";
import NoProjectsPlaceholder from "@/ui/projects/no-projects-placeholder";
import ProjectCard from "@/ui/projects/project-card";

export default async function ProjectList() {
  const projects = await getProjects();

  if (!projects || projects.length === 0) {
    return <NoProjectsPlaceholder />;
  }

  return projects.map((d) => <ProjectCard key={d.slug} {...d} />);
}
