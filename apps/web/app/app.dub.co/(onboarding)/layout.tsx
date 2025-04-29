import { getSession } from "@/lib/auth";
import Toolbar from "@/ui/layout/toolbar/toolbar";
import { NewBackground } from "@/ui/shared/new-background";
import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";

export default async function Layout({ children }: PropsWithChildren) {
  const session = await getSession();

  // @CUSTOM_FEATURE: redirect to dashboard if user has defaultWorkspace
  if (session.user.defaultWorkspace) {
    redirect(`/${session.user.defaultWorkspace}`);
  }

  return (
    <>
      <NewBackground />
      {children}
      <Toolbar show={["help"]} />
    </>
  );
}
