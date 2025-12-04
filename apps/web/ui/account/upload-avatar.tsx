"use client";

import { Button, FileUpload, getUserAvatarUrl } from "@dub/ui";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function UploadAvatar() {
  const { data: session, update } = useSession();

  const [image, setImage] = useState<string | null>();

  useEffect(() => {
    setImage(session?.user ? getUserAvatarUrl(session.user) : null);
  }, [session]);

  const [uploading, setUploading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        setUploading(true);
        e.preventDefault();
        fetch("/api/user", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image }),
        }).then(async (res) => {
          setUploading(false);
          if (res.status === 200) {
            await update();
            toast.success("Successfully updated your profile picture!");
          } else {
            const { error } = await res.json();
            toast.error(error.message);
          }
        });
      }}
      className="rounded-xl border border-neutral-200 bg-white"
    >
      <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col space-y-1">
          <h2 className="text-base font-semibold">Your Avatar</h2>
          <p className="text-sm text-neutral-500">
            This is your avatar image on your {process.env.NEXT_PUBLIC_APP_NAME}{" "}
            account.
          </p>
          <p className="text-sm text-neutral-500">
            Click your avatar to upload a new image.
          </p>
        </div>
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
            targetResolution={{ width: 160, height: 160 }}
          />
        </div>
      </div>

      <div className="flex flex-col items-start justify-start gap-4 rounded-b-xl border-t border-neutral-200 bg-neutral-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:py-3">
        <p className="text-sm text-neutral-500">
          Square image recommended. Accepted file types: .png, .jpg. Max file
          size: 2MB.
        </p>
        <div className="shrink-0">
          <Button
            text="Save changes"
            loading={uploading}
            disabled={!image || session?.user?.image === image}
          />
        </div>
      </div>
    </form>
  );
}
