import useWorkspace from "@/lib/swr/use-workspace";
import { Button, useMediaQuery } from "@dub/ui";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

interface CreateFolderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateFolderForm = ({
  onSuccess,
  onCancel,
}: CreateFolderFormProps) => {
  const workspace = useWorkspace();
  const { isMobile } = useMediaQuery();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState<string | undefined>(undefined);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);

    const response = await fetch(`/api/folders?workspaceId=${workspace.id}`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const { error } = await response.json();
      toast.error(error.message);
      setIsCreating(false);
      return;
    }

    toast.success("Folder created successfully!");
    mutate(`/api/folders?workspaceId=${workspace.id}`);
    onSuccess();
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col gap-y-6 px-4 text-left sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <p className="block text-sm font-medium text-gray-800">Name</p>
          </div>

          <div className="mt-2">
            <div className="-m-1 rounded-[0.625rem] p-1">
              <div className="flex rounded-md border border-gray-300 bg-white">
                <input
                  name="domain"
                  id="domain"
                  type="text"
                  required
                  autoComplete="off"
                  className="block w-full rounded-md border-0 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm"
                  aria-invalid="true"
                  placeholder="Marketing"
                  autoFocus={!isMobile}
                  onChange={(e) => {
                    setName(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-2 border-t border-gray-200 px-4 py-4 sm:px-6">
        <Button
          type="button"
          variant="secondary"
          text="Cancel"
          className="h-9 w-fit"
          onClick={onCancel}
        />
        <Button
          type="submit"
          text="Next"
          disabled={!name}
          loading={isCreating}
          className="h-9 w-fit"
        />
      </div>
    </form>
  );
};
