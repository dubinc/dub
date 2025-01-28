"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useEffect, useState } from "react";

export const AllowedHostnames = () => {
  const { id, allowedHostnames } = useWorkspace();
  const [hostname, setHostname] = useState<string>("");

  useEffect(() => {
    if (allowedHostnames) {
      setHostname(allowedHostnames.join("\n"));
    }
  }, [allowedHostnames]);

  const handleSave = async () => {
    try {
      const allowedHostnames = hostname.split("\n").filter(Boolean);

      const response = await fetch(`/api/workspaces/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          allowedHostnames,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update hostname");
      }

      // Handle successful update, e.g., show a success message
    } catch (error) {
      console.error("Error updating hostname:", error);
      // Handle error, e.g., show an error message
    }
  };

  console.log(hostname);

  return (
    <div>
      <textarea
        value={hostname}
        onChange={(e) => setHostname(e.target.value)}
        placeholder="Enter allowed hostname"
        className="w-full rounded border p-2"
        rows={5}
        autoFocus
      />
      <button
        onClick={handleSave}
        className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Save
      </button>
    </div>
  );
};
