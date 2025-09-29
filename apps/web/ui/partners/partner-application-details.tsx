import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramApplicationFormDataWithValues } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { ProgramApplication } from "@prisma/client";
import Linkify from "linkify-react";
import useSWRImmutable from "swr/immutable";

export function PartnerApplicationDetails({
  applicationId,
}: {
  applicationId: string;
}) {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const { data: application, isLoading } = useSWRImmutable<ProgramApplication>(
    program &&
      workspaceId &&
      `/api/programs/${program.id}/applications/${applicationId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  let content;

  if (isLoading || !application) {
    return <PartnerApplicationDetailsSkeleton />;
  }

  const formData =
    application?.formData as ProgramApplicationFormDataWithValues;

  const fields: { title: string; value: string }[] = (formData?.fields ?? [])
    .map((field) => {
      switch (field.type) {
        case "short-text":
          return {
            title: field.label,
            value: field.value,
          };
        case "long-text":
          return {
            title: field.label,
            value: field.value,
          };
        case "select":
          return {
            title: field.label,
            value: field.value,
          };
        case "multiple-choice":
          let value;

          if (field.data.multiple) {
            value = Array.isArray(field.value)
              ? field.value.join(", ")
              : field.value;
          } else {
            value = field.value;
          }

          return {
            title: field.label,
            value,
          };
        case "website-and-socials":
          return null;
      }
    })
    .filter((v) => !!v);

  content = (
    <>
      {fields.map((field) => (
        <div key={field.title}>
          <h4 className="text-content-emphasis font-semibold">{field.title}</h4>
          <div className="mt-2">
            {field.value || field.value === "" ? (
              <Linkify
                as="p"
                options={{
                  target: "_blank",
                  rel: "noopener noreferrer nofollow",
                  className:
                    "underline underline-offset-4 text-sm max-w-prose text-neutral-400 hover:text-neutral-700",
                }}
              >
                {field.value || (
                  <span className="text-content-muted italic">
                    No response provided
                  </span>
                )}
              </Linkify>
            ) : (
              <div className="h-4 w-28 min-w-0 animate-pulse rounded-md bg-neutral-200" />
            )}
          </div>
        </div>
      ))}
    </>
  );

  return <div className="grid grid-cols-1 gap-5 text-xs">{content}</div>;
}

function PartnerApplicationDetailsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 text-xs">
      {[...Array(3)].map((_, idx) => (
        <div key={idx}>
          <h4 className="text-content-emphasis font-semibold" />
          <div className="h-5 w-32 animate-pulse rounded-md bg-neutral-200" />

          <div className="mt-2">
            <div className="h-4 w-28 min-w-0 animate-pulse rounded-md bg-neutral-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
