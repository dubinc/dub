// import * as z from "zod/v4";

// const rewardProcessPayloadSchema = z.object({
//   rewardId: z.string(),
//   groupId: z.string(),
//   occurredAt: z.string(),
//   rewardSnapshot: z.object({
//     description: z.string(),
//   }),
// });

// export const inputSchema = z.discriminatedUnion("event", [
//   z.object({
//     event: z.literal("reward-created"),
//     payload: rewardProcessPayloadSchema,
//   }),

//   z.object({
//     event: z.literal("reward-updated"),
//     payload: rewardProcessPayloadSchema,
//   }),

//   z.object({
//     event: z.literal("reward-deleted"),
//     payload: rewardProcessPayloadSchema,
//   }),
// ]);

// export type RewardProcessInput = z.input<typeof inputSchema>;
