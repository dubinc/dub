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

    /**
     * Only generate metatags if:
     * - modal is open
     * - custom OG proxy is not enabled
     * - url is not empty
     **/
    if (enabled) {
      if (!proxy) {
        setValue("title", null);
        setValue("description", null);
        setValue("image", null);
      }
      try {
        // if url is valid, continue to generate metatags, else return null
        new URL(debouncedUrl);
        setGeneratingMetatags(true);
        fetch(`/api/metatags?url=${debouncedUrl}`).then(async (res) => {
          if (res.status === 200) {
            const results = await res.json();
            if (!title) setValue("title", truncate(results.title, 120));
            if (!description)
              setValue("description", truncate(results.description, 240));
            if (!image) setValue("image", results.image);
          }
          // set timeout to prevent flickering
          setTimeout(() => setGeneratingMetatags(false), 200);
        });
      } catch (_) {}
    } else {
      setGeneratingMetatags(false);
    }
  }, [debouncedUrl, password, proxy, enabled]);

  return { generatingMetatags };
}
