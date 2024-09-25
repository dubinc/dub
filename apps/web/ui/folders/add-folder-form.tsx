import { FOLDER_WORKSPACE_ACCESS } from "@/lib/link-folder/constants";
import { FolderAccessLevel } from "@/lib/link-folder/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { BlurImage, Button, useMediaQuery } from "@dub/ui";
import { DICEBEAR_AVATAR_URL } from "@dub/utils";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

interface AddFolderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AddFolderForm = ({ onSuccess, onCancel }: AddFolderFormProps) => {
  const workspace = useWorkspace();
  const [step, setStep] = useState(1);
  const { isMobile } = useMediaQuery();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState<string | undefined>(undefined);
  const [accessLevel, setAccessLevel] = useState<FolderAccessLevel>("view");

  // Create new folder
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);

    const response = await fetch(`/api/folders?workspaceId=${workspace.id}`, {
      method: "POST",
      body: JSON.stringify({
        name,
        ...(accessLevel && { accessLevel }),
      }),
    });

    if (!response.ok) {
      const { error } = await response.json();
      toast.error(error.message);
      setIsCreating(false);
      return;
    }

    await mutate(`/api/folders?workspaceId=${workspace.id}`);
    await mutate(`/api/folders/permissions?workspaceId=${workspace.id}`);
    toast.success("Folder created successfully!");
    onSuccess();
  };

  return (
    <>
      <div className="space-y-2 border-b border-gray-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">
          {step === 1 ? "Create new folder" : `${name} access`}
        </h3>

        {step === 2 && (
          <p className="text-sm text-gray-500">
            Set the default folder access for the workspace. Individual user
            permissions can be set in the folder settings.
          </p>
        )}
      </div>

      <div className="bg-gray-50">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-y-6 px-4 text-left sm:px-6">
            {step === 1 ? (
              <div className="mt-6">
                <label className="text-sm font-normal text-gray-500">
                  Name
                </label>
                <div className="mt-2 flex rounded-md border border-gray-300 bg-white">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    className="block w-full rounded-md border-0 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm"
                    aria-invalid="true"
                    placeholder="Acme Links"
                    autoFocus={!isMobile}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setStep(2);
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <label className="text-sm font-normal text-gray-500">
                  Workspace access
                </label>
                <div className="mt-2 flex h-10 items-center justify-between rounded-md border border-gray-300 bg-white">
                  <div className="flex items-center gap-2 pl-2">
                    <BlurImage
                      src={workspace.logo || `${DICEBEAR_AVATAR_URL}${name}`}
                      alt={workspace.name || "Workspace logo"}
                      className="size-5 shrink-0 overflow-hidden rounded-full"
                      width={20}
                      height={20}
                    />
                    <span className="text-sm font-normal text-gray-500">
                      {workspace.name}
                    </span>
                  </div>
                  <select
                    className="rounded-md rounded-l-none border-0 border-l border-gray-300 bg-white py-2 pl-2 pr-8 text-xs text-gray-500 focus:border-gray-300 focus:outline-none focus:ring-0"
                    value={accessLevel}
                    onChange={(e) =>
                      setAccessLevel(
                        e.target.value as FolderAccessLevel,
                      )
                    }
                  >
                    {Object.keys(FOLDER_WORKSPACE_ACCESS).map((access) => (
                      <option value={access} key={access}>
                        {FOLDER_WORKSPACE_ACCESS[access]}
                      </option>
                    ))}
                    <option value="" key="no-access">
                      No access
                    </option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-gray-200 px-4 py-4 sm:px-6">
            <StepProgressBar step={step} />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                text={step === 1 ? "Cancel" : "Back"}
                className="h-9 w-fit"
                onClick={step === 1 ? onCancel : () => setStep(1)}
                disabled={step === 2 && isCreating}
              />
              <Button
                type={step === 1 ? "button" : "submit"}
                text={step === 1 ? "Next" : "Create folder"}
                disabled={step === 1 && !name}
                loading={step === 2 && isCreating}
                className="h-9 w-fit"
                onClick={(e) => {
                  e.preventDefault();

                  if (step === 1) {
                    setStep(2);
                  } else {
                    onSubmit(e as unknown as FormEvent<HTMLFormElement>);
                  }
                }}
              />
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

const StepProgressBar = ({ step }: { step: number }) => {
  const getStepClass = (active: boolean) =>
    active ? "w-4 h-2 bg-gray-400" : "w-1.5 h-1.5 bg-gray-300";

  return (
    <div className="flex items-center gap-1.5">
      <div className={`rounded-full ${getStepClass(step === 1)}`} />
      <div className={`rounded-full ${getStepClass(step === 2)}`} />
    </div>
  );
};
