import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  let processedCount = 0;
  let batchNumber = 0;
  let cursor: string | undefined = undefined;

  while (true) {
    const messages = await prisma.message.findMany({
      where: {
        type: "campaign",
      },
      select: {
        id: true,
        text: true,
      },
      take: 10,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
      orderBy: {
        id: "asc",
      },
    });

    if (messages.length === 0) {
      break;
    }

    await prisma.$transaction(
      messages.map((message) =>
        prisma.message.update({
          where: {
            id: message.id,
          },
          data: {
            text: convertToMarkdown(message.text),
          },
        }),
      ),
    );

    batchNumber++;
    processedCount += messages.length;
    cursor = messages[messages.length - 1].id;

    console.log(
      `Processed batch ${batchNumber}: ${messages.length} messages updated (total: ${processedCount})`,
    );
  }

  console.log(
    `Migration completed. Total messages processed: ${processedCount}`,
  );
}

function convertToMarkdown(text: string): string {
  let lines = text.split("\n");

  const convertedLines = lines.map((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      return "";
    }

    if (/^[✦•\-]\s/.test(trimmedLine)) {
      return "- " + trimmedLine.substring(2);
    }

    if (/^\d+\.\s/.test(trimmedLine)) {
      return trimmedLine;
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return trimmedLine.replace(urlRegex, (url) => `[${url}](${url})`);
  });

  return convertedLines.join("\n");
}

main();
