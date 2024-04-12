import { Button } from "@dub/ui";
import { ChevronLeft, Upload } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";

export function ContactForm({
  setScreen,
}: {
  setScreen: Dispatch<SetStateAction<"main" | "contact">>;
}) {
  const [message, setMessage] = useState("");

  return (
    <div className="w-full px-6 py-5">
      <button
        type="button"
        className="-ml-2 flex items-center space-x-1 rounded-md px-2 py-1"
        onClick={() => setScreen("main")}
      >
        <ChevronLeft className="h-4 w-4" />
        <h3 className="font-semibold">Contact support</h3>
      </button>
      <label className="mt-5 block w-full">
        <span className="block text-sm font-medium text-gray-700">
          Your message
        </span>
        <TextareaAutosize
          name="message"
          required
          placeholder="E.g. My custom domain is not working."
          value={message}
          autoComplete="off"
          onChange={(e) => setMessage(e.target.value)}
          minRows={12}
          className={`${
            false
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
          } mt-1 block w-full resize-none rounded-md focus:outline-none sm:text-sm`}
        />
      </label>
      {/* TODO */}
      <div className="mt-3 flex h-[4rem] cursor-pointer items-center justify-center space-x-1 rounded-md border border-dashed border-gray-400 py-1">
        <p className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
          Upload attachment
        </p>
        <Upload className="h-3 w-3" />
      </div>
      <Button className="mt-3 h-9" disabled={!message} text="Send message" />
    </div>
  );
}
