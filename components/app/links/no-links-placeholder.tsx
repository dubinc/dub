import BlurImage from "@/components/shared/blur-image";

export default function NoLinksPlaceholder({
  AddEditLinkButton,
}: {
  AddEditLinkButton: () => JSX.Element;
}) {
  return (
    <div className="border border-gray-200 rounded-md bg-white py-12 flex flex-col justify-center items-center">
      <h2 className="text-xl font-semibold text-gray-700 z-10">
        You don't have any links yet!
      </h2>
      <BlurImage
        src="/static/illustrations/call-waiting.svg"
        alt="No links yet"
        width={400}
        height={400}
        className="-my-8"
      />
      <div className="z-10">
        <AddEditLinkButton />
      </div>
    </div>
  );
}
