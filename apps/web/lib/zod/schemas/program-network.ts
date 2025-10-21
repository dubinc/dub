import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";
import { ProgramSchema } from "./programs";

export const NetworkProgramSchema = ProgramSchema.pick({
  id: true,
  name: true,
  logo: true,
  domain: true,
  url: true,
  rewards: true,
  discount: true,
});

export const PROGRAM_NETWORK_MAX_PAGE_SIZE = 100;

export const getNetworkProgramsQuerySchema = z
  .object({
    //
  })
  .merge(
    getPaginationQuerySchema({
      pageSize: PROGRAM_NETWORK_MAX_PAGE_SIZE,
    }),
  );

export const getNetworkProgramsCountQuerySchema =
  getNetworkProgramsQuerySchema.omit({
    page: true,
    pageSize: true,
  });
