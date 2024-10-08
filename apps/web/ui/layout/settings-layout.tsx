import { MaxWidthWrapper } from "@dub/ui";
import { PropsWithChildren } from "react";
import { PageContent } from "./page-content";

export default function SettingsLayout({ children }: PropsWithChildren) {
  return (
    <PageContent title="">
      <div className="relative min-h-[calc(100vh-16px)]">
        <MaxWidthWrapper className="pb-10 pt-3">
          <div className="grid gap-5">{children}</div>
        </MaxWidthWrapper>
      </div>
    </PageContent>
  );
}
