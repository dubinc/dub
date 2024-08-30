import { UserProps } from "@/lib/types";
import { getRefreshedUser } from "./get-refreshed-user";

export async function getDefaultWorkspace(user: UserProps) {
  let defaultWorkspace = user?.defaultWorkspace;

  if (!defaultWorkspace) {
    const refreshedUser = await getRefreshedUser(user);

    defaultWorkspace =
      refreshedUser?.defaultWorkspace ||
      refreshedUser?.projects[0]?.project?.slug ||
      undefined;
  }

  return defaultWorkspace;
}
