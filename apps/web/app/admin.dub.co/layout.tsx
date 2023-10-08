import { ReactNode } from "react";
import { Background } from "ui";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen justify-center">
      <Background />
      {children}
    </div>
  );
}
