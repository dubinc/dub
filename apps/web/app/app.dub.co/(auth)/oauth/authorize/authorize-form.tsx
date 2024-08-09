"use client";

import useWorkspaces from "@/lib/swr/use-workspaces";
import z from "@/lib/zod";
import { authorizeRequestSchema } from "@/lib/zod/schemas/oauth";
import { Button, InputSelect, InputSelectItemProps } from "@dub/ui";
import { DICEBEAR_AVATAR_URL } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface AuthorizeFormProps extends z.infer<typeof authorizeRequestSchema> {
  //
}

export const AuthorizeForm = ({
  client_id,
  redirect_uri,
  response_type,
  state,
  scope,
  code_challenge,
  code_challenge_method,
}: AuthorizeFormProps) => {
  const { data: session } = useSession();
  const { workspaces } = useWorkspaces();
  const [submitting, setSubmitting] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<InputSelectItemProps | null>(null);

  const selectOptions = useMemo(() => {
    return workspaces
      ? workspaces.map((workspace) => ({
          id: workspace.slug,
          value: workspace.name,
          image: workspace.logo || `${DICEBEAR_AVATAR_URL}${workspace.name}`,
        }))
      : [];
  }, [workspaces]);

  useEffect(() => {
    setSelectedWorkspace(
      selectOptions.find(
        (option) => option.id === session?.user?.["defaultWorkspace"],
      ) || null,
    );
  }, [selectOptions, session]);

  // Decline the request
  const onDecline = () => {
    const searchParams = new URLSearchParams({
      error: "access_denied",
      ...(state && { state }),
    });

    window.location.href = `${redirect_uri}?${searchParams.toString()}`;
  };

  // Approve the
  const onAuthorize = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedWorkspace) {
      toast.error("Please select a workspace to continue");
      return;
    }

    setSubmitting(true);

    const workspaceId = workspaces?.find(
      (workspace) => workspace.slug === selectedWorkspace.id,
    )?.id;

    const response = await fetch(
      `/api/oauth/authorize?workspaceId=${workspaceId}`,
      {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      setSubmitting(false);
      toast.error(data.error.message);
      return;
    }

    window.location.href = data.callbackUrl;
  };

  return (
    <form onSubmit={onAuthorize}>
      <input type="hidden" name="client_id" value={client_id} />
      <input type="hidden" name="redirect_uri" value={redirect_uri} />
      <input type="hidden" name="response_type" value={response_type} />
      <input type="hidden" name="scope" value={scope.join(",")} />
      {state && <input type="hidden" name="state" value={state} />}
      {code_challenge && (
        <input type="hidden" name="code_challenge" value={code_challenge} />
      )}
      {code_challenge_method && (
        <input
          type="hidden"
          name="code_challenge_method"
          value={code_challenge_method}
        />
      )}
      <p className="text-sm text-gray-500">
        Select a workspace to grant API access to
      </p>
      <div className="max-w-md py-2">
        <InputSelect
          items={selectOptions}
          selectedItem={selectedWorkspace}
          setSelectedItem={setSelectedWorkspace}
          adjustForMobile
          disabled={submitting}
        />
      </div>
      <div className="mt-4 flex justify-between gap-4">
        <Button
          text="Decline"
          type="button"
          onClick={onDecline}
          variant="secondary"
          disabled={submitting}
        />
        <Button
          text="Authorize"
          type="submit"
          loading={submitting}
          disabled={!selectedWorkspace}
          disabledTooltip={
            !selectedWorkspace ? "Please select a workspace to continue" : ""
          }
        />
      </div>
    </form>
  );
};
