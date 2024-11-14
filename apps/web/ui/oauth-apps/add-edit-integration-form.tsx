"use client";

import { addEditIntegration } from "@/lib/actions/add-edit-integration";
import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { NewOrExistingIntegration } from "@/lib/types";
import { Button, FileUpload, InfoTooltip, LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { Reorder } from "framer-motion";
import { Paperclip, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

export default function AddEditIntegrationForm({
  integration,
}: {
  integration: NewOrExistingIntegration;
}) {
  const { id: workspaceId, role } = useWorkspace();
  const [screenshots, setScreenshots] = useState<
    {
      file?: File;
      key?: string;
      uploading: boolean;
    }[]
  >(
    (integration.screenshots || []).map((s) => ({
      uploading: false,
      key: s,
    })),
  );

  const [data, setData] = useState<NewOrExistingIntegration>(integration);

  const { error: permissionsError } = clientAccessCheck({
    action: "oauth_apps.write",
    role,
  });

  useEffect(() => {
    if (!integration.slug) {
      setData((prev) => ({
        ...prev,
        slug: slugify(name),
      }));
    }
  }, [integration.slug]);

  // Handle screenshots upload
  const handleUpload = async (file: File) => {
    setScreenshots((prev) => [...prev, { file, uploading: true }]);

    const response = await fetch(
      `/api/oauth/apps/upload-url?workspaceId=${workspaceId}`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      toast.error("Failed to get signed URL for screenshot upload.");
      return;
    }

    const { signedUrl, key } = await response.json();

    const uploadResponse = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
        "Content-Length": file.size.toString(),
      },
    });

    if (!uploadResponse.ok) {
      const result = await uploadResponse.json();
      toast.error(result.error.message || "Failed to upload screenshot.");
      return;
    }

    toast.success(`${file.name} uploaded!`);
    setScreenshots((prev) =>
      prev.map((screenshot) =>
        screenshot.file === file
          ? { ...screenshot, uploading: false, key }
          : screenshot,
      ),
    );
  };

  const { name, slug, description, readme, developer, website, logo } = data;

  const buttonDisabled = !name || !slug || !developer || !website;
  const uploading = screenshots.some((s) => s.uploading);
  const canManageApp = !permissionsError;

  const { executeAsync, isExecuting } = useAction(addEditIntegration, {
    onSuccess: () => {
      toast.success(`Integration ${integration.id ? "updated" : "created"}`);
    },
    onError: ({ error }) => {
      toast.error(
        error.validationErrors?.[0]?.message || "Failed to update integration",
      );
    },
  });

  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await executeAsync({
            ...data,
            screenshots: screenshots
              .map((s) => s.key)
              .filter(Boolean) as string[],
            workspaceId: workspaceId!.replace("ws_", ""),
          });
        }}
        className="flex flex-col space-y-5 pb-20 text-left"
      >
        <div>
          <FileUpload
            accept="images"
            className="h-24 w-24 rounded-full border border-gray-300"
            iconClassName="w-5 h-5"
            variant="plain"
            readFile
            imageSrc={
              logo ||
              `https://api.dicebear.com/7.x/shapes/svg?seed=${integration.slug}`
            }
            onChange={({ src }) => setData({ ...data, logo: src })}
            content={null}
            maxFileSizeMB={2}
            disabled={!canManageApp}
          />
        </div>

        <div>
          <label htmlFor="name" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">
              Application name
            </h2>
            <InfoTooltip content="Application name will be displayed in the OAuth consent screen" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-gray-50": !canManageApp,
                },
              )}
              required
              value={name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              autoFocus
              autoComplete="off"
              placeholder="My App"
              disabled={!canManageApp}
            />
          </div>
        </div>

        <div>
          <label htmlFor="slug" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">
              Application slug
            </h2>
            <InfoTooltip content="Unique slug for this application on Dub" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-gray-50": !canManageApp,
                },
              )}
              required
              value={slug}
              onChange={(e) => setData({ ...data, slug: e.target.value })}
              autoComplete="off"
              placeholder="my-app"
              disabled={!canManageApp}
            />
          </div>
        </div>

        <div>
          <label htmlFor="slug" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">Description</h2>
            <InfoTooltip content="Description of your application" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <TextareaAutosize
              name="description"
              minRows={2}
              className={cn(
                "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-gray-50": !canManageApp,
                },
              )}
              placeholder="Add a description"
              value={description || ""}
              maxLength={120}
              onChange={(e) => {
                setData({ ...data, description: e.target.value });
              }}
              disabled={!canManageApp}
            />
          </div>
        </div>

        <div>
          <label htmlFor="slug" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">Overview</h2>
            <InfoTooltip content="Provide some details about your integration. This will be displayed on the integration page. Markdown is supported." />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <TextareaAutosize
              name="readme"
              minRows={10}
              className={cn(
                "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-gray-50": !canManageApp,
                },
              )}
              placeholder="## My Awesome Integration"
              value={readme || ""}
              maxLength={1000}
              onChange={(e) => {
                setData({ ...data, readme: e.target.value });
              }}
              disabled={!canManageApp}
            />
          </div>
        </div>

        <div>
          <label htmlFor="slug" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">Screenshots</h2>
            <InfoTooltip content="You can upload up to 4 screenshots that will be displayed on the integration page." />
          </label>
          <Reorder.Group
            axis="y"
            values={screenshots}
            onReorder={setScreenshots}
            className="mt-2 grid w-full gap-2"
          >
            {screenshots.map((screenshot) => (
              <Reorder.Item
                key={screenshot.key}
                value={screenshot}
                className="group flex w-full items-center justify-between rounded-md border border-gray-200 bg-white transition-shadow hover:cursor-grab active:cursor-grabbing active:shadow-lg"
              >
                <div className="flex flex-1 items-center space-x-2 p-2">
                  {screenshot.uploading ? (
                    <LoadingSpinner className="h-4 w-4" />
                  ) : (
                    <Paperclip className="h-4 w-4 text-gray-500" />
                  )}
                  <p className="text-center text-sm text-gray-500">
                    {screenshot.file?.name || screenshot.key}
                  </p>
                </div>
                <button
                  disabled={!canManageApp}
                  className="h-full rounded-r-md border-l border-gray-200 p-2"
                  onClick={() => {
                    setScreenshots((prev) =>
                      prev.filter((s) => s.key !== screenshot.key),
                    );
                  }}
                >
                  <Trash2 className="h-4 w-4 text-gray-500" />
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <FileUpload
            accept="images"
            className="mt-2 aspect-[5/1] w-full rounded-md border border-dashed border-gray-300"
            iconClassName="w-5 h-5"
            variant="plain"
            onChange={async ({ file }) => await handleUpload(file)}
            content="Drag and drop or click to upload screenshots"
            disabled={!canManageApp || screenshots.length >= 4}
          />
        </div>

        <div>
          <label htmlFor="developer" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">
              Developer name
            </h2>
            <InfoTooltip content="The person or company developing this application" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-gray-50": !canManageApp,
                },
              )}
              required
              value={developer}
              onChange={(e) => setData({ ...data, developer: e.target.value })}
              placeholder="Acme Inc."
              disabled={!canManageApp}
            />
          </div>
        </div>

        <div>
          <label htmlFor="website" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">Website URL</h2>
            <InfoTooltip content="URL to the developer's website or documentation" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-gray-50": !canManageApp,
                },
              )}
              type="url"
              required
              value={website}
              onChange={(e) => setData({ ...data, website: e.target.value })}
              placeholder="https://acme.com"
              disabled={!canManageApp}
            />
          </div>
        </div>

        <Button
          text={integration.id ? "Save changes" : "Create"}
          disabled={buttonDisabled || uploading || isExecuting}
          loading={isExecuting}
          type="submit"
          {...(permissionsError && {
            disabledTooltip: permissionsError,
          })}
        />
      </form>
    </>
  );
}
