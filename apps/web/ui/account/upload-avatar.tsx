"use client";

import { Button, FileUpload } from "@dub/ui";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import { useSession } from "next-auth/react";
import { FC, useEffect, useState } from "react";
import { toast } from "sonner";

interface IUploadAvatarProps {
  sessionId: string;
}

const UploadAvatar: FC<Readonly<IUploadAvatarProps>> = ({ sessionId }) => {
  const { data: session, update } = useSession();

  const [image, setImage] = useState<string | null>();

  useEffect(() => {
    setImage(session?.user?.image || null);
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
            trackClientEvents({
              event: EAnalyticEvents.ACCOUNT_UPDATED,
              params: {
                event_category: "nonAuthorized",
                page_name: "profile",
                content_group: "account",
                email: session?.user?.email,
                nameChanged: false,
                emailChanged: false,
                avatarChanged: true,
                passwordChanged: false,
              },
              sessionId,
            });
            await update();
            toast.success("Successfully updated your profile picture!");
          } else {
            const errorMessage = await res.text();
            toast.error(errorMessage || "Something went wrong");
          }
        });
      }}
      className="border-border-500 rounded-lg border bg-white"
    >
      <div className="flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Your Avatar</h2>
        <p className="text-sm text-neutral-500">
          This is your avatar image on {process.env.NEXT_PUBLIC_APP_NAME}.
        </p>
        <div className="mt-1">
          <FileUpload
            accept="images"
            className="border-border-500 h-24 w-24 rounded-full border"
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

      <div className="border-border-500 flex items-center justify-between space-x-4 rounded-b-lg border-t bg-neutral-50 p-3 sm:px-10">
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
};

export default UploadAvatar;
