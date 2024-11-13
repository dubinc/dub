import { invitePartnerAction } from "@/lib/actions/invite-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface InvitePartnerSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

interface InvitePartnerFormData {
  name: string;
  email: string;
  linkId: string;
}

function InvitePartnerSheetContent({ setIsOpen }: InvitePartnerSheetProps) {
  const { id: workspaceId } = useWorkspace();
  const { programId } = useParams<{ programId: string }>();
  const { register, handleSubmit } = useForm<InvitePartnerFormData>();

  const { executeAsync, isExecuting } = useAction(invitePartnerAction, {
    onSuccess: async () => {
      toast.success("Successfully invited partner!");
      setIsOpen(false);
    },
    onError({ error }) {
      toast.error(error.serverError?.serverError);
    },
  });

  const onSubmit = async (data: InvitePartnerFormData) => {
    await executeAsync({
      workspaceId: workspaceId!,
      programId,
      name: data.name,
      email: data.email,
      linkId: data.linkId,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Invite partner
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
        <div className="p-6">
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="flex items-center space-x-2">
                <h2 className="text-sm font-medium text-gray-900">Name</h2>
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  {...register("name")}
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  placeholder="David"
                  required
                  autoFocus
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="flex items-center space-x-2">
                <h2 className="text-sm font-medium text-gray-900">Email</h2>
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  {...register("email")}
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  placeholder="test@test.com"
                  required
                  type="email"
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label htmlFor="linkId" className="flex items-center space-x-2">
                <h2 className="text-sm font-medium text-gray-900">Link</h2>
              </label>
              <div className="relative mt-2 rounded-md shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex grow flex-col justify-end">
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Close"
            className="w-fit"
            disabled={isExecuting}
          />
          <Button
            type="submit"
            variant="primary"
            text="Send invite"
            className="w-fit"
            loading={isExecuting}
          />
        </div>
      </div>
    </form>
  );
}

export function InvitePartnerSheet({
  isOpen,
  ...rest
}: InvitePartnerSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <InvitePartnerSheetContent {...rest} />
    </Sheet>
  );
}

export function useInvitePartnerSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    invitePartnerSheet: (
      <InvitePartnerSheet setIsOpen={setIsOpen} isOpen={isOpen} />
    ),
    setIsOpen,
  };
}
