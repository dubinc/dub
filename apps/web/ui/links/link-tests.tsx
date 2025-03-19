import { LinkTestsSchema } from "@/lib/zod/schemas/links";
import { motion } from "framer-motion";
import { memo, useMemo } from "react";
import { useLinkCardContext } from "./link-card";
import { ResponseLink } from "./links-container";

export const LinkTests = memo(({ link }: { link: ResponseLink }) => {
  const { showTests } = useLinkCardContext();

  const tests = useMemo(() => {
    if (
      !link.tests ||
      !link.testsCompleteAt ||
      !(new Date() < new Date(link.testsCompleteAt))
    )
      return null;

    try {
      return LinkTestsSchema.parse(link.tests);
    } catch (e) {
      console.error(`Failed to parse link tests for link ${link.id}`, e);
    }
    return null;
  }, [link.tests, link.testsCompleteAt, link.id]);

  if (!tests || !tests.length) return null;

  return (
    <motion.div
      initial={false}
      animate={{ height: showTests ? "auto" : 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <ul className="flex flex-col gap-2.5 border-t border-neutral-200 bg-neutral-100 p-3">
        {tests.map((test, idx) => (
          <li
            key={idx}
            className="flex items-center justify-between rounded-md border border-neutral-300 bg-white p-2.5"
          >
            <div className="flex min-w-0 items-center gap-4">
              {/* Test number */}
              <div className="size-7 shrink-0 select-none rounded-full border border-neutral-200/50 p-px">
                <div className="flex size-full items-center justify-center rounded-full bg-gradient-to-t from-neutral-950/5 text-sm font-medium text-neutral-800">
                  {idx + 1}
                </div>
              </div>

              {/* Test name */}
              <span className="truncate text-sm font-medium text-neutral-800">
                {test.url}
              </span>
            </div>

            <div className="flex items-center gap-5">
              {/* Test percentage */}
              <div className="h-7 shrink-0 select-none rounded-[6px] border border-neutral-200/50 p-px">
                <div className="flex size-full items-center justify-center rounded-[5px] bg-gradient-to-t from-neutral-950/5 px-1.5 text-xs font-semibold tabular-nums text-neutral-800">
                  {Math.round(test.percentage)}%
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
});
