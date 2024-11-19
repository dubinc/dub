import { requestPartnerInviteSchema } from "@/lib/dots/schemas";
import z from "@/lib/zod";
import { Button } from "@dub/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";

type RequestPartnerInvite = z.infer<typeof requestPartnerInviteSchema>;

export const RequestPartnerInviteForm = () => {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RequestPartnerInvite>({
    resolver: zodResolver(requestPartnerInviteSchema),
  });

  const onSubmit = async (data: RequestPartnerInvite) => {
    const response = await fetch("/api/referrals/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const { error } = await response.json();
      toast.error(error.message);
      return;
    }

    mutate("/api/referrals/invite");
    toast.success(
      "Invite request sent successfully! Check your email for the invite link.",
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-4 rounded-lg border border-neutral-300 p-5"
    >
      <div className="flex gap-2">
        <input
          {...register("email")}
          className="flex-grow rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
          autoFocus
          required
          placeholder="Enter your email"
        />

        <Button
          type="submit"
          text="Request invite"
          className="h-10 w-fit"
          loading={isSubmitting}
        />
      </div>
    </form>
  );
};
