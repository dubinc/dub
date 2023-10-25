import { getProjects } from "@/lib/fetchers";
import ProjectSelectClient from "./client";

export default async function ProjectSelect() {
  const projects = await getProjects();
  return <ProjectSelectClient projects={projects || []} />;
}
