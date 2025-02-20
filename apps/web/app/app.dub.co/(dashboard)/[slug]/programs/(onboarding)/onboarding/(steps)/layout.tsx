import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {children}
    </div>
  );
}
