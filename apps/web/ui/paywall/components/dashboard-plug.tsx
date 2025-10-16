export const DashboardPlug = () => {
  return (
    <div className="md:pt-1.5">
      <div className="relative min-h-full overflow-hidden bg-neutral-100 pt-px md:rounded-tl-2xl md:border md:border-b-0 md:border-r-0 md:border-neutral-200/20 md:bg-white">
        <div className="mt-3 bg-neutral-100 md:mt-6 md:bg-white md:py-3">
          <div className="mx-auto w-full max-w-screen-xl px-3 md:px-8">
            <h1 className="text-xl font-semibold leading-7 text-neutral-900 md:text-2xl">
              My QR Codes
            </h1>
          </div>

          <div className="pt-4 max-md:mt-3 max-md:rounded-t-[16px]">
            <div className="mx-auto w-full max-w-screen-xl px-3 md:px-8">
              <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-nowrap">
                <div className="flex w-full grow justify-between gap-2 md:w-auto">
                  <div className="flex h-[40px] w-[160px] grow items-center justify-center rounded-md border border-neutral-200/20 px-3 md:grow-0">
                    <div className="h-[10px] w-full rounded-md bg-neutral-200/60" />
                  </div>

                  <div className="flex gap-x-2 max-md:w-full">
                    <div className="flex w-full items-center justify-center rounded-md border border-neutral-200/20 px-3 md:w-56 lg:w-64">
                      <div className="h-[10px] w-full rounded-md bg-neutral-200/60" />
                    </div>
                    <div className="border-secondary bg-secondary group flex h-10 w-full items-center justify-center rounded-md px-3">
                      <div className="h-[10px] w-full rounded-md bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-3 w-full max-w-screen-xl px-3 md:px-8">
            <div className="group/card border-border-500 w-full rounded-xl border bg-white">
              <div className="flex items-center gap-5 p-4 sm:gap-8">
                {/* QR Code placeholder */}
                <div className="flex flex-col gap-2">
                  <div className="flex h-[100px] w-[100px] items-center justify-center rounded-lg bg-neutral-200/60">
                    <div className="h-16 w-16 rounded-md bg-neutral-300/80"></div>
                  </div>
                  <div className="h-5 w-16 rounded-md bg-neutral-200/60 lg:hidden"></div>
                </div>

                {/* Content section */}
                <div className="flex h-full w-full min-w-0 flex-col gap-1.5 lg:flex-row lg:justify-start lg:gap-8 xl:gap-12">
                  {/* Type badge (mobile) */}
                  <div className="flex lg:hidden">
                    <div className="h-6 w-20 rounded-full bg-neutral-200/60"></div>
                  </div>

                  {/* QR Name section */}
                  <div className="flex min-w-0 flex-col justify-center gap-1 whitespace-nowrap lg:w-[120px] lg:shrink-0">
                    <div className="hidden h-4 w-16 rounded-md bg-neutral-200/60 lg:block"></div>
                    <div className="h-5 w-32 rounded-md bg-neutral-200/60 sm:w-28"></div>
                  </div>

                  {/* URL section */}
                  <div className="flex min-w-0 flex-col justify-center gap-1 lg:w-[200px] lg:shrink-0">
                    <div className="hidden h-4 w-12 rounded-md bg-neutral-200/60 lg:block"></div>
                    <div className="h-4 w-28 rounded-md bg-neutral-200/60"></div>
                  </div>

                  {/* Stats section */}
                  <div className="flex min-w-0 flex-col justify-center gap-1 lg:w-[100px] lg:shrink-0">
                    <div className="hidden h-4 w-10 rounded-md bg-neutral-200/60 lg:block"></div>
                    <div className="h-4 w-16 rounded-md bg-neutral-200/60"></div>
                  </div>
                </div>

                {/* Right side controls */}
                <div className="flex h-full flex-col items-start justify-start gap-6 lg:flex-row lg:items-center lg:justify-end">
                  <div className="hidden gap-3 lg:flex lg:gap-6">
                    <div className="h-6 w-20 rounded-full bg-neutral-200/60"></div>
                    <div className="h-6 w-16 rounded-md bg-neutral-200/60"></div>
                  </div>
                  <div className="h-6 w-10 rounded-md bg-neutral-200/60"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
