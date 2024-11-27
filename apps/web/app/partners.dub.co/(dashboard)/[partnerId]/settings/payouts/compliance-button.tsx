import { createDotsFlowAction } from "@/lib/actions/partners/create-dots-flow";
import { dotsFlowConfigurations } from "@/lib/dots/styles";
import useDotsUser from "@/lib/swr/use-dots-user";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export const ComplianceButton = ({
  setModalState,
}: {
  setModalState: (state: { show: boolean; iframeSrc: string }) => void;
}) => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const { dotsUser } = useDotsUser();

  const { executeAsync, isExecuting } = useAction(createDotsFlowAction, {
    async onSuccess({ data }) {
      if (!data?.link) {
        toast.error("No link found – contact support");
        return;
      }
      setModalState({
        show: true,
        iframeSrc: `${data.link}?styles=${dotsFlowConfigurations}`,
      });
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  return (
    <Button
      text={dotsUser?.compliance.submitted ? "Update" : "Submit"}
      variant="secondary"
      onClick={async () =>
        await executeAsync({ partnerId, flow: "compliance" })
      }
      loading={isExecuting}
      className="h-8 w-fit px-2"
    />
  );
};
