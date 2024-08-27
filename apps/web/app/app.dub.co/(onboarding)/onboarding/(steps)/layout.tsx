import { Wordmark } from "@dub/ui";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <>
      <div className="relative flex flex-col items-center">
        <Wordmark className="mt-6 h-8" />
        <div className="animate-slide-up-fade mt-8 flex flex-col items-center px-3 [--offset:10px] [animation-duration:1s] [animation-fill-mode:both] md:mt-24 lg:px-8">
          {children}
        </div>
      </div>
    </>
  );
}
