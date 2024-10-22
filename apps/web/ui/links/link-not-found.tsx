import { FileX2 } from "lucide-react";

export default function LinkNotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-gray-200 bg-white py-12">
      <div className="rounded-full bg-gray-100 p-3">
        <FileX2 className="h-6 w-6 text-gray-600" />
      </div>
      <h1 className="my-3 text-xl font-semibold text-gray-700">
        Link Not Found
      </h1>
      <p className="z-10 max-w-sm text-center text-sm text-gray-600">
        Bummer! The link you are looking for does not exist. You either typed in
        the wrong URL or don't have access to this link.
      </p>
      <img
        src="https://assets.dub.co/misc/not-found.svg"
        alt="No links yet"
        width={300}
        height={300}
      />
    </div>
  );
}
