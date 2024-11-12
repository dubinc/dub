import { programLanderFilesBlockSchema } from "@/lib/zod/schemas/programs";
import { ArrowUpRight, Download } from "@dub/ui/src/icons";
import { z } from "zod";
import { BlockTitle } from "./BlockTitle";

export function FilesBlock({
  block,
  logo,
}: {
  block: z.infer<typeof programLanderFilesBlockSchema>;
  logo: string | null;
}) {
  return (
    <div>
      <BlockTitle title={block.data.title} />
      <div className="mt-5 grid grid-cols-1 gap-3">
        {block.data.items.map((file, idx) => (
          <a
            key={idx}
            className="group flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-3 transition-colors duration-75 hover:bg-neutral-50 active:bg-neutral-100"
            href={file.url}
            download
          >
            <div className="flex min-w-0 items-center gap-4">
              <div className="rounded-full border border-gray-200">
                <div className="rounded-full border border-white bg-gradient-to-t from-gray-100 p-1 md:p-2">
                  {logo ? (
                    <img src={logo} alt="" className="size-4" />
                  ) : (
                    <Download className="size-4" />
                  )}
                </div>
              </div>
              <div className="flex flex-col overflow-hidden text-sm text-neutral-700">
                <span className="truncate font-semibold">{file.name}</span>
                <span className="truncate">{file.description}</span>
              </div>
            </div>
            <div className="pr-3">
              <ArrowUpRight className="size-4 text-neutral-700 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
