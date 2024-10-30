import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { ReactNode } from "react";
import { ProgramHeader } from "./header";

export default function ProgramLayout({ children }: { children: ReactNode }) {
  return (
    <PageContent>
      <div className="relative min-h-[calc(100vh-16px)]">
        <MaxWidthWrapper className="grid gap-5 pb-10 pt-3">
          <div className="grid gap-4">
            <ProgramHeader />
            {children}
          </div>
        </MaxWidthWrapper>
      </div>
    </PageContent>
  );
}
