import { getAppSession } from "@/lib/auth";
import { getProjects } from "@/lib/fetchers";
import ProjectSelectClient from "./client";

export default async function ProjectSelect() {
  const [session, projects] = await Promise.all([
    getAppSession(),
    getProjects(),
  ]);
  return <ProjectSelectClient session={session} projects={projects || []} />;
}
