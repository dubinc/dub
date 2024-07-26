import { FileUpload, LoadingSpinner } from "@dub/ui";
import { truncate } from "@dub/utils";
import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import { useCsvContext } from ".";

export function SelectFile() {
  const { watch, control, fileColumns, setFileColumns } = useCsvContext();

  const file = watch("file");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setFileColumns(null);
      return;
    }

    readFirstLine(file)
      .then((firstLine) => {
        const split = firstLine.split(",");
        if (split.length <= 1) {
          setError("Failed to retrieve CSV column data.");
          setFileColumns(null);
          return;
        }
        setFileColumns(split);
      })
      .catch(() => {
        setError("Failed to read CSV file.");
        setFileColumns(null);
      });
  }, [file]);

  return (
    <div className="flex flex-col gap-3">
      <Controller
        name="file"
        control={control}
        render={({ field: { value, onChange } }) => {
          return (
            <FileUpload
              accept="csv"
              maxFileSizeMB={10}
              onChange={({ file }) => onChange(file)}
              content={
                value
                  ? truncate(value.name, 25)
                  : "Click or drag and drop a CSV file."
              }
              className="aspect-auto h-20"
              iconClassName="size-6"
            />
          );
        }}
      />
      {error ? (
        <div>{error}</div>
      ) : fileColumns ? (
        <p className="text-sm text-gray-600">
          Columns found: {fileColumns.join(", ")}
        </p>
      ) : file ? (
        <div className="flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : null}
    </div>
  );
}

const readFirstLine = async (file: File): Promise<string> => {
  const reader = file.stream().getReader();
  const decoder = new TextDecoder("utf-8");
  let { value: chunk, done: readerDone } = await reader.read();
  let firstLine = "";
  while (!readerDone) {
    firstLine += decoder.decode(chunk, { stream: true });
    const lines = firstLine.split("\n");
    if (lines.length > 1) {
      reader.cancel();
      return lines[0];
    }
    ({ value: chunk, done: readerDone } = await reader.read());
  }
  return firstLine;
};
