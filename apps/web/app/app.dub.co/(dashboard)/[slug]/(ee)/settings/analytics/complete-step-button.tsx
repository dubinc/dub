import { Button } from "@dub/ui";

export const CompleteStepButton = ({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading?: boolean;
}) => {
  return (
    <Button text="Mark step as complete" loading={loading} onClick={onClick} />
  );
};
