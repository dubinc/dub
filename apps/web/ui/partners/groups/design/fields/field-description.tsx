export function FieldDescription({ description }: { description?: string }) {
  return description ? (
    <p className="text-base text-neutral-500">{description}</p>
  ) : null;
}
