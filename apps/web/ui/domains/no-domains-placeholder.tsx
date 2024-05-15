export default function NoDomainsPlaceholder({
  AddDomainButton,
}: {
  AddDomainButton: () => JSX.Element;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-gray-200 bg-white py-12">
      <h2 className="z-10 text-xl font-semibold text-gray-700">
        You don't have any active custom domains yet.
      </h2>
      <img
        src="/_static/illustrations/cat-shot.svg"
        alt="No domains yet"
        width={400}
        height={400}
        className="pointer-events-none -my-8"
      />
      <AddDomainButton />
    </div>
  );
}
