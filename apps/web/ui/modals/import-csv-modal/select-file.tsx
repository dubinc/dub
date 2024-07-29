import { FileUpload, LoadingSpinner } from "@dub/ui";
import { truncate } from "@dub/utils";
import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import { useCsvContext } from ".";

export function SelectFile() {
  const {
    watch,
    control,
    fileColumns,
    setFileColumns,
    firstRows,
    setFirstRows,
  } = useCsvContext();

  const file = watch("file");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setFileColumns(null);
      return;
    }

    readLines(file, 4)
      .then((lines) => {
        if (lines.length < 2) {
          setError("CSV file must have at least 2 rows.");
          setFileColumns(null);
          setFirstRows(null);
          return;
        }

        const split = lines[0].split(",");
        if (split.length <= 1) {
          setError("Failed to retrieve CSV column data.");
          setFileColumns(null);
          setFirstRows(null);
          return;
        }

        setFileColumns(split);
        setFirstRows(
          lines
            .slice(1)
            .map((line) =>
              Object.fromEntries(
                line
                  .split(",")
                  .map((value, idx) => [split[idx] ?? "unknown", value]),
              ),
            ),
        );
      })
      .catch(() => {
        setError("Failed to read CSV file.");
        setFileColumns(null);
        setFirstRows(null);
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
              maxFileSizeMB={4.5}
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
          Columns found: {listColumns(fileColumns)}
        </p>
      ) : file ? (
        <div className="flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : null}
    </div>
  );
}

const maxColumns = 4;

const listColumns = (columns: string[]) => {
  const eachTruncated = columns.map((column) => truncate(column, 16));
  const allTruncated =
    eachTruncated.length <= maxColumns
      ? eachTruncated
      : eachTruncated
          .slice(0, maxColumns)
          .concat(`and ${eachTruncated.length - maxColumns} more`);
  return allTruncated.join(", ");
};

const readLines = async (file: File, count = 4): Promise<string[]> => {
  const reader = file.stream().getReader();
  const decoder = new TextDecoder("utf-8");
  let { value: chunk, done: readerDone } = await reader.read();
  let content = "";
  let result = [];
  while (!readerDone) {
    content += decoder.decode(chunk, { stream: true });
    const lines = content.split("\n");
    if (lines.length >= count) {
      reader.cancel();
      return lines.slice(0, count);
    }
    ({ value: chunk, done: readerDone } = await reader.read());
  }
  return result;
};
