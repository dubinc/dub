import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { ReactNode } from "react";
import { ProgramHeader } from "./header";

export default function ProgramLayout({ children }: { children: ReactNode }) {
  return (
    <PageContent>
      <div className="relative min-h-[calc(100vh-16px)]">
        <MaxWidthWrapper>
          <ProgramHeader />
          {children}
        </MaxWidthWrapper>
      </div>
    </PageContent>
  );
}
