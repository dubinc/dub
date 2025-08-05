import { FC } from "react";

interface IFileErrorMessageProps {
  localFileError: string;
  fileError: string;
}

export const FileErrorMessage: FC<IFileErrorMessageProps> = ({
  localFileError,
  fileError,
}) => {
  if (!localFileError && !fileError) {
    return null;
  }

  return (
    <p className="text-xs font-medium text-red-500 md:text-sm">
      {localFileError || fileError}
    </p>
  );
};
