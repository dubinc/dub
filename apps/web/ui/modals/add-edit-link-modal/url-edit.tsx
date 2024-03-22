import { useCallback } from "react";

interface PresetConfig {
  id: string;
  urlSchemas: RegExp[];
  allowMultiple?: boolean;
  settings: {
    [key: string]: {
      description: string;
      slug: string;
      type: "path" | "query";
    };
  };
}

const presetConfig = [
  {
    id: "youtube",
    urlSchemas: [
      new RegExp("https://www.youtube.com/watch\\?v=[^&]+"),
      new RegExp("https://youtu.be/[^/]+"),
    ],
    allowMultiple: true,
    settings: {
      autoplay: {
        description: "Autoplay",
        slug: "autoplay=1",
        type: "query",
      },
      loop: {
        description: "Loop",
        slug: "loop=1",
        type: "query",
      },
      mute: {
        description: "Mute",
        slug: "mute=1",
        type: "query",
      },
    },
  },
  {
    id: "github",
    urlSchemas: [new RegExp("https://github.com/[^/]+/[^/]+")],
    settings: {
      tabIssues: {
        description: "Tab: Issues",
        slug: "issues",
        type: "path",
      },
      tabPulls: {
        description: "Tab: Pull requests",
        slug: "pulls",
        type: "path",
      },
    },
  },
] as PresetConfig[];

export default function URLEdit({ url, setURL }) {
  const preset = presetConfig.find((preset) => {
    return preset.urlSchemas.some((schema) => schema.test(url));
  });

  if (url && preset) {
    const onCheckboxChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;

        const type = Object.values(preset.settings).find(
          (setting) => setting.slug === name,
        )?.type;

        if (type === "query") {
          if (preset.allowMultiple) {
            const newURL = checked
              ? `${url}&${name}`
              : url.replace(`&${name}`, "").replace(`?${name}`, "");
            setURL(newURL);
          } else {
            let newURL = url;
            Object.values(preset.settings).forEach((setting) => {
              if (setting.slug !== name) {
                newURL = newURL.replace(`&${setting.slug}`, "");
              }
            });

            if (checked) newURL = `${newURL}&${name}`;
            else newURL = newURL.replace(`&${name}`, "");

            setURL(newURL);
          }
        } else if (type === "path") {
          if (preset.allowMultiple) {
            const newURL = checked
              ? `${url}/${name}`
              : url.replace(`/${name}`, "");
            setURL(newURL);
          } else {
            let newURL = url;

            if (newURL.endsWith("/")) newURL = newURL.slice(0, -1);

            Object.values(preset.settings).forEach((setting) => {
              if (setting.slug !== name) {
                newURL = newURL.replace(`/${setting.slug}`, "");
              }
            });

            if (checked) newURL = `${newURL}/${name}`;
            else newURL = newURL.replace(`/${name}`, "");

            setURL(newURL);
          }
        } else return;
      },
      [url, setURL],
    );

    return (
      <div className="flex flex-wrap gap-1 py-2">
        {Object.entries(preset.settings).map(([_, { description, slug }]) => {
          return (
            <div className="group relative flex cursor-pointer items-center space-x-3 rounded-md bg-gray-50 transition-all hover:bg-gray-100">
              <input
                type="checkbox"
                name={slug}
                id={slug}
                checked={url.includes(slug)}
                onChange={onCheckboxChange}
                className="ml-3 h-4 w-4 cursor-pointer rounded-full border-gray-300 text-black focus:outline-none focus:ring-0"
              />
              <label
                htmlFor={slug}
                className="flex w-full cursor-pointer justify-between px-3 py-1.5 pl-0 text-sm font-medium text-gray-700"
              >
                {description}
              </label>
            </div>
          );
        })}
      </div>
    );
  } else return undefined;
}
