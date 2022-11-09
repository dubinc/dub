export default function ProjectCardPlaceholder() {
  return (
    <div className="flex justify-between rounded-lg bg-white p-6 shadow transition-all hover:shadow-md">
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
      <div className="flex items-center space-x-2">
        <div className="h-5 w-10 animate-pulse rounded-md bg-gray-200" />
      </div>
    </div>
  );
}
