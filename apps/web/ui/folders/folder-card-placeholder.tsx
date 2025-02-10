export const FolderCardPlaceholder = () => {
  return (
    <div className="relative h-36 rounded-xl border border-neutral-200 bg-white px-5 py-4">
      <div className="flex">
        <div className="h-8 w-8 rounded-full bg-neutral-100" />
      </div>

      <div className="mt-6">
        <div className="h-3 w-32 rounded-full bg-neutral-100" />
        <div className="mt-1 flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="h-3 w-4 rounded-full bg-neutral-100" />
            <div className="h-3 w-24 rounded-full bg-neutral-100" />
          </div>
        </div>
      </div>
    </div>
  );
};
