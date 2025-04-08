import { mutatePrefix } from "@/lib/swr/mutate";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import { useCopyToClipboard } from "@dub/ui";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { LinkFormData, useLinkBuilderContext } from "./link-builder-provider";

export function useLinkBuilderSubmit({
  onSuccess,
}: {
  onSuccess?: (data: LinkFormData) => void;
} = {}) {
  const router = useRouter();
  const { workspace, props } = useLinkBuilderContext();
  const { getValues, setError } = useFormContext<LinkFormData>();

  const [, copyToClipboard] = useCopyToClipboard();

  return useCallback(
    async (data: LinkFormData) => {
      // @ts-ignore – exclude extra attributes from `data` object before sending to API
      const { user, tags, tagId, folderId, ...rest } = data;
      const bodyData = {
        ...rest,

        // Map tags to tagIds
        tagIds: tags.map(({ id }) => id),

        // Replace "unsorted" folder ID w/ null
        folderId: folderId === "unsorted" ? null : folderId,

        // Manually reset empty strings to null
        expiredUrl: rest.expiredUrl || null,
        ios: rest.ios || null,
        android: rest.android || null,
      };

      const endpoint = props?.id
        ? {
            method: "PATCH",
            url: `/api/links/${props.id}?workspaceId=${workspace.id}`,
          }
        : {
            method: "POST",
            url: `/api/links?workspaceId=${workspace.id}`,
          };

      try {
        const res = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyData),
        });

        if (res.status === 200) {
          const data = await res.json();
          onSuccess?.(data);

          // for editing links, if domain / key is changed, push to new url
          console.log({ props, data });
          if (
            props &&
            (props.domain !== data.domain || props.key !== data.key)
          ) {
            router.push(`/${workspace.slug}/links/${data.domain}/${data.key}`);
          }

          await mutatePrefix([
            "/api/links",
            // if updating root domain link, mutate domains as well
            ...(getValues("key") === "_root" ? ["/api/domains"] : []),
          ]);
          posthog.capture(props ? "link_updated" : "link_created", data);

          // copy shortlink to clipboard when adding a new link
          if (!props) {
            try {
              await copyToClipboard(data.shortLink);
              toast.success("Copied short link to clipboard!");
            } catch (err) {
              toast.success("Successfully created link!");
            }
          } else toast.success("Successfully updated short link!");

          // Mutate workspace to update usage stats
          mutate(`/api/workspaces/${workspace?.slug}`);
        } else {
          const { error } = await res.json();

          if (error) {
            if (error.message.includes("Upgrade to")) {
              toast.custom(() => (
                <UpgradeRequiredToast
                  title={`You've discovered a ${workspace?.nextPlan?.name} feature!`}
                  message={error.message}
                />
              ));
            } else {
              toast.error(error.message);
            }
            const message = error.message.toLowerCase();

            if (message.includes("key"))
              setError("key", { message: error.message });
            else if (message.includes("url"))
              setError("url", { message: error.message });
            else setError("root", { message: "Failed to save link" });
          } else {
            setError("root", { message: "Failed to save link" });
            toast.error("Failed to save link");
          }
        }
      } catch (e) {
        setError("root", { message: "Failed to save link" });
        console.error("Failed to save link", e);
        toast.error("Failed to save link");
      }
    },
    [
      workspace.id,
      workspace.slug,
      workspace.nextPlan,
      props,
      copyToClipboard,
      getValues,
      setError,
      onSuccess,
    ],
  );
}
