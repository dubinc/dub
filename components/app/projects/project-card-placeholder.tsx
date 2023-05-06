export default function ProjectCardPlaceholder() {
  return (
    <div className="flex flex-col space-y-[46px] rounded-lg border border-gray-100 bg-white p-6 shadow transition-all hover:shadow-md">
      <div className="flex items-center space-x-3">
        <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
        <div className="flex flex-col space-y-2.5">
          <div className="h-5 w-36 animate-pulse rounded-md bg-gray-200" />
          <div className="flex items-center space-x-2">
            <div className="h-5 w-20 animate-pulse rounded-md bg-gray-200" />
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between space-x-4">
        <div className="h-4 w-24 animate-pulse rounded-md bg-gray-200" />
        <div className="h-4 w-24 animate-pulse rounded-md bg-gray-200" />
        <div className="h-4 w-24 animate-pulse rounded-md bg-gray-200" />
      </div>
    </div>
  );
}
