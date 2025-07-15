import { TrackClient } from "customerio-node";

export const CustomerIOClient = new TrackClient(
  process.env.CUSTOMER_IO_SITE_ID!,
  process.env.CUSTOMER_IO_TRACK_API_KEY!,
);
