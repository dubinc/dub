import { getSession } from "@/lib/auth-app";
import { getProjects } from "@/lib/fetchers";
import ProjectSelectClient from "./client";

export default async function ProjectSelect() {
  const [session, projects] = await Promise.all([getSession(), getProjects()]);
  return <ProjectSelectClient session={session} projects={projects || []} />;
}
