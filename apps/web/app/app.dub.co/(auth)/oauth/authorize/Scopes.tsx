"use client";

import { Check } from "lucide-react";

interface ScopesProps {
  scopes: string | null // space separated scopes
}

export const Scopes = (props: ScopesProps) => {
  const { scopes } = props;
  console.log(scopes);

  return (
    <>
      <span className="text-gray-600">Grant permissions:</span>
      <ul className="text-md space-y-2">
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className="font-bold">Read</span> access to workspace data
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className="font-bold">Read</span> access to workspace data
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className="font-bold">Read</span> access to workspace data
        </li>
      </ul>
    </>
  );
};
