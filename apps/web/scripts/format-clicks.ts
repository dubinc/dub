import { nanoid } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

function createLinksMapFromFile(filePath: string) {
  const fileContent = fs.readFileSync(filePath, { encoding: "utf-8" });
  const lines = fileContent.split("\n").filter((line) => line.trim());

  const linksMap = new Map();

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      // 'domain' and 'key' together form a unique identifier for each link
      const uniqueId = `${data.domain}/${
        data.key ? data.key.toLowerCase() : "_root"
      }`; // Customize this based on your data structure
      linksMap.set(uniqueId, data);
    } catch (error) {
      console.error("Error parsing line to JSON:", error);
    }
  }

  return linksMap;
}

// Function to determine the partition file name based on timestamp
function getPartitionFileName(timestamp: string) {
  const date = new Date(timestamp);
  const start = new Date("2022-09-01");
  let current = new Date(start);

  // Calculate 8-month intervals until the timestamp falls within the current interval
  while (current < date) {
    const end = new Date(current);
    end.setMonth(end.getMonth() + 8);
    if (date >= current && date < end) {
      return `clicks-${current.getFullYear()}-${current.getMonth()}.ndjson`;
    }
    current = end;
  }

  // Fallback for any date beyond the calculated intervals
  return `clicks-${date.getFullYear()}-${date.getMonth()}.ndjson`;
}

// Function to get or create a write stream for a given partition
function getWriteStreamForPartition(partitionFileName: string) {
  if (!writeStreams[partitionFileName]) {
    writeStreams[partitionFileName] = fs.createWriteStream(partitionFileName, {
      flags: "a",
    });
  }
  return writeStreams[partitionFileName];
}

const writeStreams: Record<string, fs.WriteStream> = {};

async function main() {
  const links = createLinksMapFromFile("links-metadata.ndjson");
  const csvStream = fs.createReadStream("sql.csv", "utf-8");

  Papa.parse(csvStream, {
    header: true,
    skipEmptyLines: true,
    step: ({ data }) => {
      const link = links.get(
        `${data.domain}/${data.key ? data.key.toLowerCase() : "_root"}`,
      );

      if (!link) {
        // console.log(
        //   `No link found for ${data.domain}/${data.key}. Probably deleted.`,
        // );
        return;
      }

      const { domain, key, id, projectId, url, alias, timestamp, ...rest } =
        data;

      const partitionFileName = getPartitionFileName(timestamp);
      const stream = getWriteStreamForPartition(partitionFileName);

      const clickData = {
        ...rest,
        timestamp,
        click_id: nanoid(16),
        link_id: link.link_id,
        alias_link_id: "",
        url: link.url || "",
        bot: data.bot === "1" ? 1 : 0,
      };

      // Write directly to the appropriate file
      stream.write(JSON.stringify(clickData) + "\n");
    },
    complete: () => {
      // Close all write streams once processing is complete
      Object.values(writeStreams).forEach((stream) => stream.end());
      console.log("All data processed.");
    },
    error: (error) => {
      console.error("Error processing file:", error);
    },
  });
}

main();
