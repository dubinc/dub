import { MaxWidthWrapper } from "@dub/ui";

export default function IntegrationPageLoading() {
  return (
    <MaxWidthWrapper className="grid max-w-screen-lg gap-8">
      <div className="h-4 w-28 rounded-full bg-gray-100" />
      <div className="flex justify-between gap-2">
        <div className="flex items-center gap-x-3">
          <div className="h-12 w-12 rounded-md bg-gray-100" />
          <div>
            <div className="h-6 w-40 rounded-full bg-gray-100" />
            <div className="mt-1 h-4 w-60 rounded-full bg-gray-100" />
          </div>
        </div>
      </div>

      <div className="h-24 w-full rounded-lg bg-gray-100" />

      <div className="w-full rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center gap-x-2 border-b border-gray-200 px-6 py-4">
          <div className="h-4 w-4 rounded-full bg-gray-100" />
          <div className="h-5 w-20 rounded-full bg-gray-100" />
        </div>
        <div className="p-6">
          <div className="h-64 w-full rounded-md bg-gray-100" />
        </div>
      </div>
    </MaxWidthWrapper>
  );
}
