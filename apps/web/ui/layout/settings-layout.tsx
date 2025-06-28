import { MaxWidthWrapper } from "@dub/ui";
import { PropsWithChildren } from "react";
import { PageContentOld } from "./page-content";

export default function SettingsLayout({ children }: PropsWithChildren) {
  return (
    <PageContentOld>
      <div className="relative min-h-[calc(100vh-16px)]">
        <MaxWidthWrapper className="grid grid-cols-1 gap-5 pb-10 pt-3">
          {children}
        </MaxWidthWrapper>
      </div>
    </PageContentOld>
  );
}
