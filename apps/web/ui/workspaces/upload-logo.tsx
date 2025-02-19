"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button, FileUpload } from "@dub/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

export default function UploadLogo() {
  const { id, logo, isOwner } = useWorkspace();

  const [image, setImage] = useState<string | null>();

  useEffect(() => {
    setImage(logo || null);
  }, [logo]);

  const [uploading, setUploading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        setUploading(true);
        e.preventDefault();
        fetch(`/api/workspaces/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ logo: image }),
        }).then(async (res) => {
          if (res.status === 200) {
            await Promise.all([
              mutate("/api/workspaces"),
              mutate(`/api/workspaces/${id}`),
            ]);
            toast.success("Successfully uploaded workspace logo!");
          } else {
            const { error } = await res.json();
            toast.error(error.message);
          }
          setUploading(false);
        });
      }}
      className="rounded-lg border border-neutral-200 bg-white"
    >
      <div className="flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Workspace Logo</h2>
        <p className="text-sm text-neutral-500">
          This is your workspace's logo on {process.env.NEXT_PUBLIC_APP_NAME}.
        </p>
        <div className="mt-1">
          <FileUpload
            accept="images"
            className="h-24 w-24 rounded-full border border-neutral-300"
            iconClassName="w-5 h-5"
            variant="plain"
            imageSrc={image}
            readFile
            onChange={({ src }) => setImage(src)}
            content={null}
            maxFileSizeMB={2}
            targetResolution={{ width: 240, height: 240 }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between space-x-4 rounded-b-lg border-t border-neutral-200 bg-neutral-50 p-3 sm:px-10">
        <p className="text-sm text-neutral-500">
          Square image recommended. Accepted file types: .png, .jpg. Max file
          size: 2MB.
        </p>
        <div className="shrink-0">
          <Button
            text="Save changes"
            loading={uploading}
            disabled={!isOwner || !image || logo === image}
            {...(!isOwner && {
              disabledTooltip:
                "Only workspace owners can change the workspace logo.",
            })}
          />
        </div>
      </div>
    </form>
  );
}
