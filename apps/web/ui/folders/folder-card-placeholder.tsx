export const FolderCardPlaceholder = () => {
  return (
    <div className="relative h-36 rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex">
        <div className="h-8 w-8 rounded-full bg-gray-100" />
      </div>

      <div className="mt-6">
        <div className="h-5 w-32 rounded-full bg-gray-100" />
        <div className="mt-1 flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-gray-100" />
            <div className="h-4 w-20 rounded-full bg-gray-100" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-gray-100" />
            <div className="h-4 w-24 rounded-full bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
};
