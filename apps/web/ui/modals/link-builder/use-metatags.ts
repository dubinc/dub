import { getUrlWithoutUTMParams, truncate } from "@dub/utils";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useDebounce } from "use-debounce";
import { LinkFormData } from ".";

export function useMetatags({
  initial,
  enabled,
}: {
  initial: boolean;
  enabled: boolean;
}) {
  const { watch, setValue } = useFormContext<LinkFormData>();
  const [url, password, proxy, title, description, image] = watch([
    "url",
    "password",
    "proxy",
    "title",
    "description",
    "image",
  ]);
  const [debouncedUrl] = useDebounce(getUrlWithoutUTMParams(url), 500);

  const [generatingMetatags, setGeneratingMetatags] = useState(initial);

  useEffect(() => {
    // no need to generate metatags if proxy is enabled, or if any of the metatags are set
    if (proxy) {
      setGeneratingMetatags(false);
      return;
    }

    // if there's a password, no need to generate metatags
    if (password) {
      setGeneratingMetatags(false);
      setValue("title", "Password Required");
      setValue(
        "description",
        "This link is password protected. Please enter the password to view it.",
      );
      setValue("image", "https://assets.dub.co/misc/password-protected.png");
      return;
    }

    // Only generate metatags if enabled (modal is open and url is not empty)
    if (enabled) {
      try {
        // if url is valid, continue to generate metatags, else throw error and return null
        new URL(debouncedUrl);
        setGeneratingMetatags(true);
        fetch(`/api/metatags?url=${debouncedUrl}`).then(async (res) => {
          if (res.status === 200) {
            const results = await res.json();
            const truncatedTitle = truncate(results.title, 120);
            const truncatedDescription = truncate(results.description, 240);
            if (title !== truncatedTitle) {
              setValue("title", truncatedTitle);
            }
            if (description !== truncatedDescription)
              setValue("description", truncatedDescription);
            if (image !== results.image) setValue("image", results.image);
          }
          // set timeout to prevent flickering
          setTimeout(() => setGeneratingMetatags(false), 200);
        });
      } catch (_) {}
    } else {
      setGeneratingMetatags(false);
    }
  }, [debouncedUrl, password, enabled]);

  return { generatingMetatags };
}
