"use client";

import { handleAuthorize } from "@/lib/oauth";
import z from "@/lib/zod";
import { authorizeSchema } from "@/lib/zod/schemas/oauth";
import { Button } from "@dub/ui";
import { OAuthClient, Project } from "@prisma/client";

type AuthorizeFormProps = {
  workspaces: Pick<Project, "id" | "name" | "logo">[];
  oAuthClient: Pick<OAuthClient, "name">;
} & z.infer<typeof authorizeSchema>;

export const AuthorizeForm = (props: AuthorizeFormProps) => {
  const {
    workspaces,
    oAuthClient,
    client_id,
    redirect_uri,
    response_type,
    state,
  } = props;

  return (
    <form action={handleAuthorize}>
      <input type="hidden" name="client_id" value={client_id} />
      <input type="hidden" name="redirect_uri" value={redirect_uri} />
      <input type="hidden" name="response_type" value={response_type} />
      <input type="hidden" name="state" value={state} />
      <select name="workspaceId">
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            <div>
              <img
                src={workspace.logo!}
                className="h-8 w-8 rounded-full"
                alt=""
              />
              {workspace.name}
            </div>
          </option>
        ))}
      </select>
      <Button
        text={`Authorize ${oAuthClient.name}`}
        type="submit"
        // loading={clickedGithub}
        // icon={<Github className="h-4 w-4" />}
      />
    </form>
  );
};
