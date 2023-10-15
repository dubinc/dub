import { getAppSession } from "@/lib/auth";
import { getProjects } from "@/lib/fetchers";
import { ChevronsUpDown } from "lucide-react";
import ProjectSelectClient from "./client";

export default async function ProjectSelect() {
  const [session, projects] = await Promise.all([
    getAppSession(),
    getProjects(),
  ]);
  return <ProjectSelectClient session={session} projects={projects || []} />;
}

export function ProjectSelectPlaceholder() {
  return (
    <div className="flex animate-pulse items-center space-x-1.5 rounded-lg px-1.5 py-2 sm:w-60">
      <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
      <div className="hidden h-8 w-28 animate-pulse rounded-md bg-gray-200 sm:block sm:w-40" />
      <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
    </div>
  );
}
