"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import {
  ExistingIntegration,
  NewIntegration,
  OAuthAppProps,
} from "@/lib/types";
import { Button, InfoTooltip, Switch } from "@dub/ui";
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
  redirectUri: "",
  logo: "",
  pkce: false,
};

export default function AddEditIntegrationForm({
  integration,
}: {
  integration: OAuthAppProps | null;
}) {
  const router = useRouter();
  const { slug: workspaceSlug, id: workspaceId, flags } = useWorkspace();

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
      body: JSON.stringify(data),
    });

    setSaving(false);
    const result = await response.json();

    if (response.ok) {
      mutate(`/api/oauth/apps/${result.id}?workspaceId=${workspaceId}`, result);
      toast.success(endpoint.successMessage);
    } else {
      toast.error(result.error.message);
    }

    if (endpoint.method === "POST") {
      router.push(
        `/${workspaceSlug}/integrations/manage/${result.id}?client_secret=${result.clientSecret}`,
      );
    }
  };

  const {
    name,
    slug,
    description,
    readme,
    developer,
    website,
    redirectUri,
    logo,
    pkce,
  } = data;

  const buttonDisabled =
    !name || !slug || !developer || !website || !redirectUri;

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="flex flex-col space-y-4 pb-20 text-left"
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
          <label htmlFor="redirectUri" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">Callback URL</h2>
            <InfoTooltip content="URL to redirect the user after authentication. Must use HTTPS, except for localhost" />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              type="url"
              required
              value={redirectUri}
              onChange={(e) =>
                setData({ ...data, redirectUri: e.target.value })
              }
              placeholder="https://acme.com/callback"
            />
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
