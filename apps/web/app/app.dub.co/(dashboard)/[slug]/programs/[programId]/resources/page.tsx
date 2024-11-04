import { PageContent } from "@/ui/layout/page-content";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, MaxWidthWrapper } from "@dub/ui";

export default function ProgramResources() {
  return (
    <PageContent title="Resources">
      <MaxWidthWrapper>
        <div className="flex flex-col gap-10">
          <div className="flex w-full items-start justify-start gap-10 rounded-lg border border-neutral-200 bg-white px-6 py-8">
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:gap-10">
              <h3 className="basis-1/2 text-[15px] font-medium leading-none text-neutral-900">
                Brand logos
              </h3>

              <div className="basis-1/2">
                <div className="space-y-4">
                  <div className="flex h-16 items-center justify-start gap-4 rounded-lg border border-neutral-200 px-3 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center gap-2.5 rounded border border-neutral-200">
                      {/* <img className="flex" src="https://via.placeholder.com/38x52" /> */}
                    </div>
                    <div className="flex flex-1 flex-col items-start justify-center gap-1">
                      <div className="text-sm font-medium leading-none text-neutral-800">
                        filename.png
                      </div>
                      <div className="text-xs font-normal text-neutral-500">
                        2 MB
                      </div>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        className="h-8 px-1.5"
                        icon={<ThreeDots className="h-5 w-5 shrink-0" />}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full items-start justify-start gap-10 rounded-lg border border-neutral-200 bg-white px-6 py-8">
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:gap-10">
              <div className="flex basis-1/2 flex-col gap-1">
                <h3 className="text-[15px] font-medium leading-none text-neutral-900">
                  Brand colors
                </h3>
                <p className="text-sm font-normal leading-5 text-neutral-600">
                  Give affiliates official colors
                </p>
              </div>

              <div className="basis-1/2"></div>
            </div>
          </div>

          <div className="flex w-full items-start justify-start gap-10 rounded-lg border border-neutral-200 bg-white px-6 py-8">
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:gap-10">
              <div className="flex basis-1/2 flex-col gap-1">
                <h3 className="text-[15px] font-medium leading-none text-neutral-900">
                  Files
                </h3>
                <p className="text-sm font-normal leading-5 text-neutral-600">
                  PDF documents or any other supporting content
                </p>
              </div>

              <div className="basis-1/2"></div>
            </div>
          </div>
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
