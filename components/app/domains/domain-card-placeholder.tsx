export default function DomainCardPlaceholder() {
  return (
    <div className="flex flex-col space-y-3 rounded-lg border border-gray-200 bg-white px-5 py-8 sm:px-10">
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:space-x-4">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-28 animate-pulse rounded-md bg-gray-200" />
          <div className="h-6 w-32 animate-pulse rounded-full bg-gray-200" />
        </div>
        <div className="flex space-x-3">
          <div className="h-9 w-24 animate-pulse rounded-md bg-gray-200" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>
      <div className="flex h-10 flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-5 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 animate-pulse rounded-full bg-gray-200" />
          <div className="h-5 w-36 animate-pulse rounded-md bg-gray-200" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 animate-pulse rounded-full bg-gray-200" />
          <div className="h-5 w-36 animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
