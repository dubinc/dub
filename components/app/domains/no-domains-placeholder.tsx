import BlurImage from "#/ui/blur-image";

export default function NoDomainsPlaceholder({
  AddEditDomainButton,
}: {
  AddEditDomainButton: () => JSX.Element;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-gray-200 bg-white py-12">
      <h2 className="z-10 text-xl font-semibold text-gray-700">
        You don't have any domains yet.
      </h2>
      <BlurImage
        src="/_static/illustrations/call-waiting.svg"
        alt="No domains yet"
        width={400}
        height={400}
        className="pointer-events-none -my-8"
      />
      <AddEditDomainButton />
    </div>
  );
}
