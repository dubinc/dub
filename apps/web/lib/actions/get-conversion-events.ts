"use server";

import {
  ClickEvent,
  LeadEvent,
  SaleEvent,
} from "dub/dist/commonjs/models/components";
import { EventType } from "../analytics/types";

export type ConversionEvent = ClickEvent | LeadEvent | SaleEvent;

export const getConversionEvents = async ({
  linkId,
  event,
  page,
}: {
  linkId: string;
  event: EventType;
  page: number;
}) => {
  // return (await dub.events.list({
  //   linkId,
  //   event,
  //   interval: "all",
  //   page,
  // })) as ConversionEvent[];
  return (await fetch(
    `https://api.dub.co/events?linkId=${linkId}&event=${event}&interval=all&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.DUB_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  ).then((res) => res.json())) as ConversionEvent[];
};
