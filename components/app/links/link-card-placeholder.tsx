export default function LinkCardPlaceholder() {
  return (
    <li className="flex items-center rounded-lg bg-white px-4 py-[1.15rem] shadow transition-all hover:shadow-md">
      <div className="mr-2 h-10 w-10 animate-pulse rounded-full bg-gray-200" />
      <div>
        <div className="mb-2.5 flex items-center space-x-2">
          <div className="h-5 w-28 animate-pulse rounded-md bg-gray-200" />
          <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
          <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
          <div className="h-5 w-20 animate-pulse rounded-md bg-gray-200" />
        </div>
        <div className="h-4 w-72 animate-pulse rounded-md bg-gray-200" />
      </div>
    </li>
  );
}
