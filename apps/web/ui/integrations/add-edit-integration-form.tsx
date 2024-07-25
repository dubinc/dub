"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import {
  ExistingIntegration,
  NewIntegration,
  OAuthAppProps,
} from "@/lib/types";
import { Button, InfoTooltip, Switch } from "@dub/ui";
import { nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { redirect, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { mutate } from "swr";

const defaultValues: NewIntegration = {
  name: "",
  slug: "",
  description: "",
  readme: "",
  developer: "",
  website: "",
  partialClientSecret: "",
  redirectUris: [],
  logo: "",
  pkce: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export default function AddEditIntegrationForm({
  integration,
}: {
  integration: OAuthAppProps | null;
}) {
  const router = useRouter();
  const { slug: workspaceSlug, id: workspaceId, flags } = useWorkspace();
  const [urls, setUrls] = useState<{ id: string; value: string }[]>([
    { id: nanoid(), value: "" },
  ]);

  if (!flags?.integrations) {
    redirect(`/${workspaceSlug}`);
  }

  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<NewIntegration | ExistingIntegration>(
    integration || defaultValues,
  );

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      slug: slugify(name),
    }));
  }, [data.name]);

  useEffect(() => {
    if (integration) {
      setUrls(
        integration.redirectUris.map((u) => ({ id: nanoid(), value: u })),
      );
    }
  }, [integration]);

  // Determine the endpoint
  const endpoint = useMemo(() => {
    if (integration) {
      return {
        method: "PATCH",
        url: `/api/oauth/apps/${integration.id}?workspaceId=${workspaceId}`,
        successMessage: "Integration updated!",
      };
    } else {
      return {
        method: "POST",
        url: `/api/oauth/apps?workspaceId=${workspaceId}`,
        successMessage: "Integration created!",
      };
    }
  }, [integration]);

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
        redirectUris: urls.map((u) => u.value),
      }),
    });

    setSaving(false);
    const result = await response.json();

    if (response.ok) {
      mutate(`/api/oauth/apps/${result.id}?workspaceId=${workspaceId}`, result);
      toast.success(endpoint.successMessage);

      if (endpoint.method === "POST") {
        router.push(
          `/${workspaceSlug}/integrations/manage/${result.id}?client_secret=${result.clientSecret}`,
        );
      }
    } else {
      toast.error(result.error.message);
    }
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
  } = data;

  const buttonDisabled =
    !name || !slug || !developer || !website || !redirectUris;

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="flex flex-col space-y-5 pb-20 text-left"
      >
        <div>
          <label htmlFor="name" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">
              Application name
            </h2>
            <InfoTooltip content="Application name will be displayed in the OAuth consent screen" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              required
              value={name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              autoFocus
              autoComplete="off"
              placeholder="My App"
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
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              required
              value={slug}
              onChange={(e) => setData({ ...data, slug: e.target.value })}
              autoComplete="off"
              placeholder="my-app"
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
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              placeholder="Add a description"
              value={description || ""}
              maxLength={50}
              onChange={(e) => {
                setData({ ...data, description: e.target.value });
              }}
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
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              placeholder="## My Awesome Integration"
              value={readme || ""}
              maxLength={1000}
              onChange={(e) => {
                setData({ ...data, readme: e.target.value });
              }}
            />
          </div>
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
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              required
              value={developer}
              onChange={(e) => setData({ ...data, developer: e.target.value })}
              placeholder="Acme Inc."
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
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              type="url"
              required
              value={website}
              onChange={(e) => setData({ ...data, website: e.target.value })}
              placeholder="https://acme.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="logo" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">Logo URL</h2>
            <InfoTooltip content="URL to your application's logo" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              type="url"
              value={logo || ""}
              onChange={(e) => setData({ ...data, logo: e.target.value })}
              placeholder="https://acme.com/logo.png"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="redirectUris"
              className="flex items-center space-x-2"
            >
              <h2 className="text-sm font-medium text-gray-900">
                Callback URLs
              </h2>
              <InfoTooltip content="All OAuth redirect URLs, All URLs must use HTTPS, except for localhost." />
            </label>
            <Button
              text="Add Callback URL"
              variant="secondary"
              className="h-7 w-fit px-2.5 py-1 text-xs"
              onClick={() => setUrls([...urls, { id: nanoid(), value: "" }])}
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
                            className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
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
                                className="h-[26px] border-gray-300 px-2.5 py-1 text-xs text-red-500 hover:bg-gray-50"
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
            <h2 className="text-sm font-medium text-gray-900">Allow PKCE</h2>
            <InfoTooltip content="We strongly recommend using the PKCE flow for increased security. Make sure your application supports it." />
          </label>
          <Switch
            checked={pkce}
            fn={(value: boolean) => {
              setData({ ...data, pkce: value });
            }}
          />
        </div>

        <Button
          text={integration ? "Save changes" : "Create"}
          disabled={buttonDisabled}
          loading={saving}
          type="submit"
        />
      </form>
    </>
  );
}
