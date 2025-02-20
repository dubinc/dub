"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { ExistingOAuthApp, NewOAuthApp, OAuthAppProps } from "@/lib/types";
import {
  Button,
  FileUpload,
  InfoTooltip,
  LoadingSpinner,
  Switch,
} from "@dub/ui";
import { cn, nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { Reorder } from "framer-motion";
import { Paperclip, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { mutate } from "swr";

const defaultValues: NewOAuthApp = {
  name: "",
  slug: "",
  description: "",
  readme: "",
  developer: "",
  website: "",
  installUrl: null,
  redirectUris: [],
  screenshots: [],
  logo: null,
  pkce: true,
};

export default function AddOAuthAppForm({
  oAuthApp,
}: {
  oAuthApp: OAuthAppProps | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { slug: workspaceSlug, id: workspaceId, role } = useWorkspace();
  const [urls, setUrls] = useState<{ id: string; value: string }[]>([
    { id: nanoid(), value: "" },
  ]);
  const [screenshots, setScreenshots] = useState<
    {
      file?: File;
      key?: string;
      uploading: boolean;
    }[]
  >([]);

  const [data, setData] = useState<NewOAuthApp | ExistingOAuthApp>(
    oAuthApp || defaultValues,
  );

  const { error: permissionsError } = clientAccessCheck({
    action: "oauth_apps.write",
    role,
  });

  useEffect(() => {
    if (oAuthApp) {
      return;
    }

    setData((prev) => ({
      ...prev,
      slug: slugify(prev.name),
    }));
  }, [data.name, oAuthApp]);

  useEffect(() => {
    if (oAuthApp) {
      setUrls(oAuthApp.redirectUris.map((u) => ({ id: nanoid(), value: u })));

      setScreenshots(
        (oAuthApp.screenshots || []).map((s) => ({
          uploading: false,
          key: s,
        })),
      );
    }
  }, [oAuthApp]);

  // Determine the endpoint
  const endpoint = useMemo(() => {
    if (oAuthApp) {
      return {
        method: "PATCH",
        url: `/api/oauth/apps/${oAuthApp.id}?workspaceId=${workspaceId}`,
        successMessage: "Application updated!",
      };
    } else {
      return {
        method: "POST",
        url: `/api/oauth/apps?workspaceId=${workspaceId}`,
        successMessage: "Application created!",
      };
    }
  }, [oAuthApp]);

  // Save the form data
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        screenshots: screenshots.map((s) => s.key),
        redirectUris: urls.map((u) => u.value),
      }),
    });

    setSaving(false);
    const result = await response.json();

    if (response.ok) {
      mutate(`/api/oauth/apps/${result.id}?workspaceId=${workspaceId}`, result);
      toast.success(endpoint.successMessage);

      if (endpoint.method === "POST") {
        const url = `/${workspaceSlug}/settings/oauth-apps/${result.id}${
          result.clientSecret ? `?client_secret=${result.clientSecret}` : ""
        }`;

        router.push(url);
      }
    } else {
      toast.error(result.error.message);
    }
  };

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

  const {
    name,
    slug,
    description,
    readme,
    developer,
    website,
    redirectUris,
    logo,
    pkce,
    installUrl,
  } = data;

  const buttonDisabled =
    !name || !slug || !developer || !website || !redirectUris;
  const uploading = screenshots.some((s) => s.uploading);
  const canManageApp = !permissionsError;

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="flex flex-col space-y-5 pb-20 text-left"
      >
        <div>
          <FileUpload
            accept="images"
            className="h-24 w-24 rounded-full border border-neutral-300"
            iconClassName="w-5 h-5"
            variant="plain"
            readFile
            imageSrc={
              logo ||
              `https://api.dicebear.com/7.x/shapes/svg?seed=${oAuthApp?.clientId}`
            }
            onChange={({ src }) => setData({ ...data, logo: src })}
            content={null}
            maxFileSizeMB={2}
            disabled={!canManageApp}
          />
        </div>

        <div>
          <label htmlFor="name" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">
              Application name
            </h2>
            <InfoTooltip content="Application name will be displayed in the OAuth consent screen" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-50": !canManageApp,
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
            <h2 className="text-sm font-medium text-neutral-900">
              Application slug
            </h2>
            <InfoTooltip content="Unique slug for this application on Dub" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-50": !canManageApp,
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
            <h2 className="text-sm font-medium text-neutral-900">
              Description
            </h2>
            <InfoTooltip content="Description of your application" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <TextareaAutosize
              name="description"
              minRows={2}
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-50": !canManageApp,
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
            <h2 className="text-sm font-medium text-neutral-900">Overview</h2>
            <InfoTooltip content="Provide some details about your integration. This will be displayed on the integration page. Markdown is supported." />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <TextareaAutosize
              name="readme"
              minRows={10}
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-50": !canManageApp,
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
            <h2 className="text-sm font-medium text-neutral-900">
              Screenshots
            </h2>
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
                className="group flex w-full items-center justify-between rounded-md border border-neutral-200 bg-white transition-shadow hover:cursor-grab active:cursor-grabbing active:shadow-lg"
              >
                <div className="flex flex-1 items-center space-x-2 p-2">
                  {screenshot.uploading ? (
                    <LoadingSpinner className="h-4 w-4" />
                  ) : (
                    <Paperclip className="h-4 w-4 text-neutral-500" />
                  )}
                  <p className="text-center text-sm text-neutral-500">
                    {screenshot.file?.name || screenshot.key}
                  </p>
                </div>
                <button
                  disabled={!canManageApp}
                  className="h-full rounded-r-md border-l border-neutral-200 p-2"
                  onClick={() => {
                    setScreenshots((prev) =>
                      prev.filter((s) => s.key !== screenshot.key),
                    );
                  }}
                >
                  <Trash2 className="h-4 w-4 text-neutral-500" />
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <FileUpload
            accept="images"
            className="mt-2 aspect-[5/1] w-full rounded-md border border-dashed border-neutral-300"
            iconClassName="w-5 h-5"
            variant="plain"
            onChange={async ({ file }) => await handleUpload(file)}
            content="Drag and drop or click to upload screenshots"
            disabled={!canManageApp || screenshots.length >= 4}
          />
        </div>

        <div>
          <label htmlFor="developer" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">
              Developer name
            </h2>
            <InfoTooltip content="The person or company developing this application" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-50": !canManageApp,
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
            <h2 className="text-sm font-medium text-neutral-900">
              Website URL
            </h2>
            <InfoTooltip content="URL to the developer's website or documentation" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-50": !canManageApp,
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

        <div>
          <label htmlFor="installUrl" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">
              Install URL
            </h2>
            <InfoTooltip content="An optional URL for installing the application" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-50": !canManageApp,
                },
              )}
              type="url"
              value={installUrl || ""}
              onChange={(e) =>
                setData({
                  ...data,
                  installUrl: e.target.value ? e.target.value : null,
                })
              }
              placeholder="https://acme.com/install"
              disabled={!canManageApp}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="redirectUris"
              className="flex items-center space-x-2"
            >
              <h2 className="text-sm font-medium text-neutral-900">
                Callback URLs
              </h2>
              <InfoTooltip content="All OAuth redirect URLs, All URLs must use HTTPS, except for localhost." />
            </label>
            <Button
              text="Add Callback URL"
              variant="secondary"
              className="h-7 w-fit px-2.5 py-1 text-xs"
              onClick={() => setUrls([...urls, { id: nanoid(), value: "" }])}
              disabled={!canManageApp}
            />
          </div>

          <div className="relative mt-2">
            <div className="flex flex-col space-y-2">
              {urls.map((url) => (
                <div className="flex flex-col space-y-2" key={url.id}>
                  <div className="grid gap-2 text-sm md:grid md:grid-cols-12">
                    <div className="col-span-12">
                      <div>
                        <div className="relative">
                          <input
                            type="url"
                            placeholder="https://acme.com/oauth/callback"
                            value={url.value}
                            onChange={(e) => {
                              setUrls(
                                urls.map((u) =>
                                  u.id === url.id
                                    ? { ...u, value: e.target.value }
                                    : u,
                                ),
                              );
                            }}
                            className={cn(
                              "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                              {
                                "cursor-not-allowed bg-neutral-50":
                                  !canManageApp,
                              },
                            )}
                            disabled={!canManageApp}
                          />

                          {urls.length > 1 && (
                            <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pl-3 pr-1">
                              <Button
                                type="button"
                                variant="outline"
                                text="Remove"
                                onClick={() => {
                                  const newUrls = urls.filter(
                                    (u) => u.id !== url.id,
                                  );

                                  if (newUrls.length === 0) {
                                    newUrls.push({ id: nanoid(), value: "" });
                                  }

                                  setUrls(newUrls);
                                }}
                                className="h-[26px] border-neutral-300 px-2.5 py-1 text-xs text-red-500 hover:bg-neutral-50"
                                disabled={!canManageApp}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pb-4 pt-2">
          <label htmlFor="pkce" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">Allow PKCE</h2>
            <InfoTooltip content="We strongly recommend using the PKCE flow for increased security. Make sure your application supports it." />
          </label>
          <Switch
            checked={pkce}
            fn={(value: boolean) => {
              setData({ ...data, pkce: value });
            }}
            disabled={!canManageApp}
          />
        </div>

        <Button
          text={oAuthApp ? "Save changes" : "Create"}
          disabled={buttonDisabled || uploading}
          loading={saving}
          type="submit"
          {...(permissionsError && {
            disabledTooltip: permissionsError,
          })}
        />
      </form>
    </>
  );
}
