"use client";

import { permissions } from "@/lib/api/tokens/scopes";
import { Check } from "lucide-react";

interface ScopesProps {
  scopesRequested: string[];
}

export const ScopesRequested = (props: ScopesProps) => {
  const { scopesRequested } = props;

  const requestedPermissions = permissions.filter((p) =>
    scopesRequested.includes(p.scope),
  );

  requestedPermissions.forEach((permission) => {
    permission.description = permission.description.replace(
      "Write",
      "<strong className='font-medium'>Write</strong>",
    );

    permission.description = permission.description.replace(
      "Read",
      "<strong className='font-medium'>Read</strong>",
    );
  });

  return (
    <>
      <span className="text-gray-600">Grant permissions:</span>
      <ul className="text-md space-y-1">
        {requestedPermissions.map((permission) => {
          return (
            <li className="flex items-center gap-2" key={permission.scope}>
              <Check className="h-4 w-4 text-green-500" />
              <div
                dangerouslySetInnerHTML={{ __html: permission.description }}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
};
