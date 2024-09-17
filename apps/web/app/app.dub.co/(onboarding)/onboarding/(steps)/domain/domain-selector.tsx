"use client";

import useLinks from "@/lib/swr/use-links";
import useWorkspace from "@/lib/swr/use-workspace";
import { CheckCircleFill } from "@/ui/shared/icons";
import { Button } from "@dub/ui";
import { Globe2, LoadingSpinner } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { Crown } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { LaterButton } from "../../later-button";
import { useOnboardingProgress } from "../../use-onboarding-progress";

export function DomainSelector() {
  const { loading: isWorkspaceLoading, flags } = useWorkspace();
  const { continueTo, isLoading, isSuccessful } = useOnboardingProgress();

  const [selectedOption, setSelectedOption] = useState<"custom" | "register">(
    "custom",
  );

  return isWorkspaceLoading ? (
    <div className="mt-12 flex w-full justify-center">
      <LoadingSpinner />
    </div>
  ) : (
    <>
      <div className="animate-fade-in mx-auto grid w-full max-w-[312px] gap-4 sm:max-w-2xl sm:grid-cols-2">
        <DomainOption
          title="Connect a custom domain"
          example="acme.com"
          onClick={() => setSelectedOption("custom")}
          isSelected={selectedOption === "custom"}
        />
        <DomainOption
          title={
            <>
              Claim a free{" "}
              <span className="rounded border border-green-800/10 bg-lime-100 p-1 font-mono text-xs">
                .link
              </span>{" "}
              domain
            </>
          }
          example="acme.link"
          onClick={() => setSelectedOption("register")}
          isSelected={selectedOption === "register"}
          paidPlanRequired={true}
        />
      </div>
      <div className="mx-auto mt-8 w-full max-w-sm">
        <Button
          type="button"
          variant="primary"
          onClick={() => continueTo(`domain/${selectedOption}`)}
          loading={isLoading || isSuccessful}
          text="Continue"
        />
        <LaterButton next="invite" className="mt-4" />
      </div>
    </>
  );
}

function DomainOption({
  title,
  example,
  onClick,
  isSelected,
  paidPlanRequired,
}: {
  title: ReactNode;
  example: string;
  onClick: () => void;
  isSelected: boolean;
  paidPlanRequired?: boolean;
}) {
  const { links } = useLinks({ sort: "createdAt", pageSize: 1 });

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (links?.length) {
      try {
        const url = links[0].url;
        fetch(`/api/metatags?url=${url}`).then(async (res) => {
          if (res.ok) {
            const results = await res.json();
            setPreviewImage(results.image);
          }
        });
      } catch (_) {}
    }
  }, [links]);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-lg border border-gray-300 px-10 pb-4 pt-9 transition-all",
        isSelected && "border-transparent bg-black/[0.03] ring-2 ring-black",
      )}
      role="button"
      onClick={onClick}
      aria-selected={isSelected}
    >
      {isSelected && (
        <CheckCircleFill className="absolute left-2 top-2 size-5 text-black" />
      )}
      <div className="flex w-full flex-col gap-2 rounded-md border border-gray-300 bg-gray-100 p-2 [mask-image:linear-gradient(to_bottom,black_50%,transparent_95%)]">
        <div className="relative rounded border-gray-200 bg-white px-2 py-1.5 text-center text-sm font-medium text-gray-800">
          <Globe2 className="absolute left-2 top-1/2 size-4 -translate-y-1/2" />
          {example}
        </div>
        <div className="overflow-hidden rounded border border-gray-300">
          <div className="aspect-[1.9/1] w-full overflow-hidden bg-gray-200">
            {previewImage && (
              <img
                src={previewImage}
                alt=""
                className="size-full object-cover"
              />
            )}
          </div>
        </div>
      </div>
      <span className="text-center text-sm font-medium text-gray-800">
        {title}
      </span>
      {paidPlanRequired && (
        <span className="flex items-center justify-center gap-1 text-center text-xs font-normal text-gray-500/80">
          <Crown className="size-4" />
          Paid plan required
        </span>
      )}
    </div>
  );
}
