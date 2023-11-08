"use client";

import useProjects from "@/lib/swr/use-projects";
import ProjectCard from "@/ui/projects/project-card";
import ProjectCardPlaceholder from "./project-card-placeholder";
import NoProjectsPlaceholder from "@/ui/projects/no-projects-placeholder";

export default function ProjectList() {
  const { projects, loading } = useProjects();

  if (loading) {
    return Array.from({ length: 6 }).map((_, i) => (
      <ProjectCardPlaceholder key={i} />
    ));
  }

  if (!projects || projects.length === 0) {
    return <NoProjectsPlaceholder />;
  }

  return projects.map((d) => <ProjectCard key={d.slug} {...d} />);
}
