export function BlockTitle({ title }: { title?: string }) {
  return title ? (
    <h2 className="text-2xl font-semibold text-neutral-800" dir="auto">
      {title}
    </h2>
  ) : null;
}
