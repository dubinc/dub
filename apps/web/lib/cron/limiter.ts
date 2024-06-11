import Bottleneck from "bottleneck";

export const limiter = new Bottleneck({
  maxConcurrent: 1, // maximum concurrent requests
  minTime: 100, // minimum time between requests in ms
});
