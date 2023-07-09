import { experimental_useFormStatus as useFormStatus } from "react-dom";
import Button from "#/ui/button";
import { toast } from "sonner";
import { submitFeedback } from "./action";

export default function Feedback() {
  return (
    <div className="relative z-0 h-[420px] overflow-scroll border border-gray-200 bg-white px-7 py-5 scrollbar-hide sm:rounded-lg sm:border-gray-100 sm:shadow-lg">
      <div className="mb-5 flex">
        <h1 className="text-xl font-semibold">Feedback</h1>
      </div>
      <form
        action={(data) =>
          submitFeedback(data).then(() => {
            toast.success("Feedback submitted – thank you!");
          })
        }
        className="grid gap-5"
      >
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-medium text-gray-500"
          >
            EMAIL
          </label>
          <input
            name="email"
            type="email"
            placeholder="panic@thedis.co"
            autoComplete="email"
            className="block w-full rounded-md border-gray-300 pr-10 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="feedback"
            className="mb-2 block text-xs font-medium text-gray-500"
          >
            FEEDBACK
          </label>
          <textarea
            name="feedback"
            id="feedback"
            required={true}
            rows={6}
            className="block w-full rounded-md border-gray-300 pr-10 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            placeholder="What other data would you like to see?"
            aria-invalid="true"
          />
        </div>
        <FormButton />
      </form>
    </div>
  );
}

const FormButton = () => {
  const { pending } = useFormStatus();
  return <Button text="Submit feedback" loading={pending} />;
};
