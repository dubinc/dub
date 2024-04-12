import { ExternalLink, MessageSquareText } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

export function MainScreen({
  setScreen,
}: {
  setScreen: Dispatch<SetStateAction<"main" | "contact">>;
}) {
  return (
    <div className="w-full">
      <div className="px-6 py-5">
        <h3 className="font-semibold">Need help?</h3>
        <p className="mt-2 text-sm text-gray-600">
          Check out our help center or get in touch for more assistance.
        </p>
        <div className="mt-3 flex h-[200px] flex-col space-y-1"></div>
      </div>
      <div className="flex justify-between border-t border-gray-200 px-5 py-4">
        <button
          onClick={() => setScreen("contact")}
          className="flex items-center space-x-2 hover:underline"
        >
          <MessageSquareText className="h-4 w-4" />
          <p className="text-sm">Contact us</p>
        </button>
        <a
          href="https://dub.co/help"
          target="_blank"
          className="flex items-center space-x-2 hover:underline"
        >
          <p className="text-sm">Help center</p>
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
