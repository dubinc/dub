import { ZodOpenApiPathsObject } from "zod-openapi";

import { getClickAnalytics } from "./clicks";
import { getTimeseriesAnalytics } from "./timeseries";

export const analyticsPaths: ZodOpenApiPathsObject = {
  "/analytics/clicks": {
    get: getClickAnalytics,
  },
  "/analytics/timeseries": {
    get: getTimeseriesAnalytics,
  },
};
