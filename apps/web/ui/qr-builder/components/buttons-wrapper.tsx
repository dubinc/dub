import { Button } from "@dub/ui";
import { useRouter } from "next/navigation";
import { FC } from "react";

interface IButtonsWrapperProps {
  qrType: string | null;
  handleNext: () => void;
  disabled?: boolean;
}

export const ButtonsWrapper: FC<IButtonsWrapperProps> = ({
  qrType,
  handleNext,
  disabled,
}) => {
  const router = useRouter();

  return (
    <div className="flex w-full justify-between gap-4">
      <Button
        variant="secondary"
        className="hover:primary-300 bg-primary-200 text-neutral h-11 w-full rounded-md border-none font-semibold hover:ring-0"
        onClick={() => router.back()}
        text="Back"
      />
      {qrType !== null && (
        <Button
          variant="primary"
          className="hover:bg-secondary/90 bg-secondary h-11 w-full rounded-md border-none font-semibold text-white hover:ring-0"
          onClick={handleNext}
          disabled={disabled}
          text="Next"
        />
      )}
    </div>
  );
};
