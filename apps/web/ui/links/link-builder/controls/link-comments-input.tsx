import { InfoTooltip, SimpleTooltipContent, useEnterSubmit } from "@dub/ui";
import { memo } from "react";
import { Controller } from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";

export const LinkCommentsInput = memo(() => {
  const { handleKeyDown } = useEnterSubmit();

  return (
    <div>
      <div className="flex items-center gap-2">
        <label
          htmlFor="comments"
          className="block text-sm font-medium text-neutral-700"
        >
          Comments
        </label>
        <InfoTooltip
          content={
            <SimpleTooltipContent
              title="Use comments to add context to your short links – for you and your team."
              cta="Learn more."
              href="https://dub.co/help/article/link-comments"
            />
          }
        />
      </div>
      <Controller
        name="comments"
        render={({ field }) => (
          <TextareaAutosize
            id="comments"
            name="comments"
            minRows={3}
            className="mt-2 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            placeholder="Add comments"
            value={field.value ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}
      />
    </div>
  );
});

LinkCommentsInput.displayName = "LinkCommentsInput";
