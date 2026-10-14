import { getDubAdminRole } from "@/lib/auth";
import { requireServerSessionRedirect } from "@/lib/better-auth/get-session";
import { constructMetadata } from "@dub/utils";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import { AdminNav } from "./layout-nav-client";

export const metadata = constructMetadata({
  title: "Dub Admin",
  noIndex: true,
});

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireServerSessionRedirect("/login");
  const role = await getDubAdminRole(user.id);

  if (!role) {
    notFound();
  }

  return (
    <>
      <div className="min-h-screen w-full bg-neutral-50">
        <AdminNav />
        {children}
      </div>
    </>
  );
}
