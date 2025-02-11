export default function WebhookPlaceholder() {
  return (
    <div className="relative grid gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-4">
      <div className="flex items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-lg bg-neutral-100" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-20 rounded-full bg-neutral-100"></div>
          <div className="h-3 w-28 rounded-full bg-neutral-100"></div>
        </div>
      </div>
    </div>
  );
}
