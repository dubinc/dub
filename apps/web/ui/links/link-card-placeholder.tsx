export default function LinkCardPlaceholder() {
  return (
    <li className="flex items-center rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <div className="mr-2 h-10 w-10 animate-pulse rounded-full bg-gray-200" />
      <div>
        <div className="mb-3 flex items-center space-x-2">
          <div className="h-5 w-28 animate-pulse rounded-md bg-gray-200" />
          <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
          <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
          <div className="h-5 w-20 animate-pulse rounded-md bg-gray-200" />
        </div>
        <div className="h-4 w-full animate-pulse rounded-md bg-gray-200" />
      </div>
    </li>
  );
}
