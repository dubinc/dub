"use client";

import {
  Logo,
  Label,
  RadioGroup,
  RadioGroupItem,
  PopupContext,
  Twitter,
  LinkedIn,
  ProductHunt,
  Google,
  Github,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Globe, X } from "lucide-react";
import { useContext, useState } from "react";

const options = [
  {
    value: "twitter",
    label: "Twitter/X",
    icon: Twitter,
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    icon: LinkedIn,
  },
  {
    value: "product-hunt",
    label: "Product Hunt",
    icon: ProductHunt,
  },
  {
    value: "google",
    label: "Google",
    icon: Google,
  },
  {
    value: "github",
    label: "GitHub",
    icon: Github,
  },
  {
    value: "other",
    label: "Other",
    icon: Globe,
  },
];

export default function UserSurveyPopupContent() {
  const { hidePopup } = useContext(PopupContext);
  const [source, setSource] = useState<string | undefined>(undefined);

  return (
    <div className="fixed bottom-4 z-40 mx-2 rounded-lg border border-gray-200 bg-white p-4 shadow-md sm:left-4 sm:mx-auto sm:max-w-sm">
      <button
        className="absolute right-2.5 top-2.5 rounded-full p-1 transition-colors hover:bg-gray-100 active:scale-90"
        onClick={hidePopup}
      >
        <X className="h-4 w-4 text-gray-500" />
      </button>
      <div className="flex flex-col space-y-4">
        <Logo className="h-8 w-8" />
        <p className="text-sm font-medium text-gray-800">
          Where did you hear about Dub?
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();

            setTimeout(() => {
              hidePopup();
            }, 5000);
          }}
        >
          <RadioGroup
            name="source"
            required
            value={source}
            onValueChange={(value) => {
              setSource(value);
            }}
            className="grid grid-cols-2 gap-4"
          >
            {options.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "group flex flex-col rounded-md border border-gray-200 bg-white transition-all hover:border-gray-500 hover:ring-4 hover:ring-gray-200 active:scale-[0.98]",
                  {
                    "border-gray-500 ring-4 ring-gray-200":
                      source === option.value,
                  },
                )}
              >
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="hidden"
                />
                <Label
                  htmlFor={option.value}
                  className="flex cursor-pointer items-center space-x-4 px-4 py-2"
                >
                  <option.icon
                    className={cn(
                      "h-5 w-5 grayscale transition-all group-hover:grayscale-0",
                      {
                        "h-4 w-4": option.value === "twitter",
                        "text-gray-600": option.value === "other",
                      },
                    )}
                  />
                  <p className="text-gray-600">{option.label}</p>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </form>
      </div>
    </div>
  );
}
