import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

/*
  Script to sort framer_remaining_events_final_final.csv
  by creation date and split by year
  (script 2 of 3 for Framer backfill)
*/

type PayloadItem = {
  via: string;
  externalId: string;
  eventName: string;
  creationDate: Date;
};

const framerRemainingEvents: PayloadItem[] = [];

async function main() {
  Papa.parse(
    fs.createReadStream("framer_remaining_events_final_final.csv", "utf-8"),
    {
      header: true,
      skipEmptyLines: true,
      step: (result: {
        data: {
          via: string;
          externalId: string;
          eventName: string;
          creationDate: string;
        };
      }) => {
        framerRemainingEvents.push({
          ...result.data,
          creationDate: new Date(result.data.creationDate),
        });
      },
      complete: async () => {
        const sortedEvents = framerRemainingEvents.sort(
          (a, b) => a.creationDate.getTime() - b.creationDate.getTime(),
        );
        // split by year (2025, 2024, 2023, 2022, etc.)
        const eventsByYears = sortedEvents.reduce(
          (acc, event) => {
            const year = event.creationDate.getFullYear();
            if (!acc[year]) {
              acc[year] = [];
            }
            acc[year].push(event);
            return acc;
          },
          {} as Record<number, PayloadItem[]>,
        );

        // write to files
        Object.entries(eventsByYears).forEach(([year, events]) => {
          fs.writeFileSync(
            `framer_remaining_events_final_final_${year}.csv`,
            Papa.unparse(events),
          );
        });
      },
    },
  );
}

main();
