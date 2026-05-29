import { getProgramEnrollmentOrThrow } from "../api/programs/get-program-enrollment-or-throw";
import { triggerQStashWorkflow } from "../cron/qstash-workflow";
import { CreatePartnerCommissionProps } from "../types";
import { constructWebhookPartner } from "./constuct-webhook-partner";

export const queuePartnerCommissionCreation = async (
  params: CreatePartnerCommissionProps,
) => {
  const { partnerId, programId, customerId } = params;

  const result = await getProgramEnrollmentOrThrow({
    partnerId,
    programId,
    include: {
      links: true,
      partner: true,
    },
  });

  const { partner, links, ...programEnrollment } = result;

  await triggerQStashWorkflow({
    workflowType: "create-partner-commission",
    workflowLabel: customerId ?? partnerId,
    body: params,
  });

  return {
    partner,
    links,
    programEnrollment,
    webhookPartner: constructWebhookPartner(result),
  };

  // let earnings = 0;
  // let reward: RewardProps | null = null;
  // let status: CommissionStatus = "pending";

  // let firstCommission: Pick<
  //   Commission,
  //   "rewardId" | "status" | "createdAt"
  // > | null = null;
  // if (event === "custom") {
  //   earnings = amount;
  //   amount = 0;
  // } else {
  //   if (["lead", "sale"].includes(event) && customerId) {
  //     firstCommission = await prisma.commission.findFirst({
  //       where: {
  //         partnerId,
  //         customerId,
  //         type: event,
  //       },
  //       orderBy: {
  //         createdAt: "asc",
  //       },
  //       select: {
  //         rewardId: true,
  //         status: true,
  //         createdAt: true,
  //       },
  //     });
  //     const subscriptionStartDate =
  //       event === "sale" ? firstCommission?.createdAt ?? new Date() : undefined;
  //     const subscriptionDurationMonths = subscriptionStartDate
  //       ? differenceInMonths(
  //           createdAt ?? new Date(), // account for custom commission creation date
  //           subscriptionStartDate,
  //         )
  //       : 0;
  //     context = {
  //       ...context,
  //       customer: {
  //         ...context?.customer,
  //         subscriptionStartDate,
  //         subscriptionDurationMonths,
  //       },
  //       ...(event === "sale" && {
  //         sale: {
  //           ...context?.sale,
  //           type: firstCommission ? "recurring" : "new",
  //         },
  //       }),
  //     };
  //   }
  //   reward = determinePartnerReward({
  //     event,
  //     programEnrollment,
  //     context,
  //   });
  //   // if there is no reward, skip commission creation
  //   if (!reward) {
  //     const outputLog = `Partner ${partnerId} has no reward for ${event} event, skipping commission creation...`;
  //     console.log(outputLog);
  //     return {
  //       commission: null,
  //       outputLog,
  //       programEnrollment,
  //       webhookPartner: constructWebhookPartner(programEnrollment),
  //     };
  //   }
  //   // for click events, it's super simple – just multiply the reward amount by the quantity
  //   if (event === "click") {
  //     earnings = getRewardAmount(reward) * quantity;
  //     // for lead and sale events, we need to check if this partner-customer combination was recorded already (for deduplication)
  //     // for sale rewards specifically, we also need to check:
  //     // 1. if the partner has reached the max duration for the reward (if applicable)
  //     // 2. if the previous commission were marked as fraud or canceled
  //   } else {
  //     if (firstCommission) {
  //       // if first commission is fraud or canceled, skip commission creation
  //       if (["fraud", "canceled"].includes(firstCommission.status)) {
  //         const outputLog = `Partner ${partnerId} has a first commission that is ${firstCommission.status}, skipping commission creation...`;
  //         console.log(outputLog);
  //         return {
  //           commission: null,
  //           outputLog,
  //           programEnrollment,
  //           webhookPartner: constructWebhookPartner(programEnrollment),
  //         };
  //       }
  //       // for lead events, we need to check if the partner has already been issued a lead reward for this customer
  //       if (event === "lead") {
  //         const outputLog = `Partner ${partnerId} has already been issued a lead reward for this customer ${customerId}, skipping commission creation...`;
  //         console.log(outputLog);
  //         return {
  //           commission: null,
  //           outputLog,
  //           programEnrollment,
  //           webhookPartner: constructWebhookPartner(programEnrollment),
  //         };
  //         // for sale rewards, we need to check if partner's reward was updated and different from the first commission's reward
  //         // we need to make sure it wasn't changed from one-time to recurring so we don't create a new commission
  //       } else {
  //         if (
  //           firstCommission.rewardId &&
  //           firstCommission.rewardId !== reward.id
  //         ) {
  //           const originalReward = await prisma.reward.findUnique({
  //             where: {
  //               id: firstCommission.rewardId,
  //             },
  //             select: {
  //               id: true,
  //               maxDuration: true,
  //             },
  //           });
  //           if (
  //             typeof originalReward?.maxDuration === "number" &&
  //             originalReward.maxDuration === 0
  //           ) {
  //             const outputLog = `Partner ${partnerId} is only eligible for first-sale commissions based on the original reward ${originalReward.id}, skipping commission creation...`;
  //             console.log(outputLog);
  //             return {
  //               commission: null,
  //               outputLog,
  //               programEnrollment,
  //               webhookPartner: constructWebhookPartner(programEnrollment),
  //             };
  //           }
  //         }
  //         // for sale rewards with a max duration, we need to check if the first commission is within the max duration
  //         // if it's beyond the max duration, we should not create a new commission
  //         if (typeof reward?.maxDuration === "number") {
  //           // One-time sale reward (maxDuration === 0)
  //           if (reward.maxDuration === 0) {
  //             const outputLog = `Partner ${partnerId} is only eligible for first-sale commissions, skipping commission creation...`;
  //             console.log(outputLog);
  //             return {
  //               commission: null,
  //               outputLog,
  //               programEnrollment,
  //               webhookPartner: constructWebhookPartner(programEnrollment),
  //             };
  //           }
  //           // Recurring sale reward (maxDuration > 0)
  //           else {
  //             const subscriptionDurationMonths = differenceInMonths(
  //               createdAt ?? new Date(), // account for custom commission creation date
  //               firstCommission.createdAt,
  //             );
  //             if (subscriptionDurationMonths >= reward.maxDuration) {
  //               const outputLog = `Partner ${partnerId} has reached max duration for ${event} event (subscription duration: ${subscriptionDurationMonths} months, max duration: ${reward.maxDuration} months), skipping commission creation...`;
  //               console.log(outputLog);
  //               return {
  //                 commission: null,
  //                 outputLog,
  //                 programEnrollment,
  //                 webhookPartner: constructWebhookPartner(programEnrollment),
  //               };
  //             }
  //           }
  //         }
  //       }
  //     }
  //     // for lead events, we just multiply the reward amount by the quantity
  //     if (event === "lead") {
  //       earnings = getRewardAmount(reward) * quantity;
  //       // for sale events, we need to calculate the earnings based on the sale amount
  //     } else {
  //       earnings = calculateSaleEarnings({
  //         reward,
  //         sale: { quantity, amount },
  //       });
  //     }
  //   }
  // }
  // // skip commission creation if the earnings is zero
  // if (earnings === 0) {
  //   console.log(
  //     `Partner ${partnerId} has zero earnings for ${event} event, skipping commission creation...`,
  //   );
  //   return {
  //     commission: null,
  //     programEnrollment,
  //     webhookPartner: constructWebhookPartner(programEnrollment),
  //   };
  // }
  // try {
  //   const commission = await prisma.commission.create({
  //     data: {
  //       id: createId({ prefix: "cm_" }),
  //       programId,
  //       partnerId,
  //       rewardId: reward?.id,
  //       customerId,
  //       linkId,
  //       eventId: eventId || null, // empty string should convert to null
  //       invoiceId: invoiceId || null, // empty string should convert to null
  //       userId: user?.id,
  //       quantity,
  //       amount,
  //       type: event,
  //       currency,
  //       earnings,
  //       status,
  //       description,
  //       createdAt,
  //     },
  //     include: {
  //       customer: true,
  //       link: {
  //         select: {
  //           id: true,
  //           shortLink: true,
  //           domain: true,
  //           key: true,
  //         },
  //       },
  //     },
  //   });
  //   const outputLog = `Created a ${event} commission ${commission.id} (${currencyFormatter(commission.earnings, { currency: commission.currency })}) for ${partnerId}`;
  //   console.log(outputLog);
  //   console.log(prettyPrint(commission));
  //   const webhookPartner = constructWebhookPartner(programEnrollment, {
  //     // check links metrics
  //     totalCommissions:
  //       toCentsNumber(programEnrollment.totalCommissions) + commission.earnings,
  //   });
  //   waitUntil(
  //     (async () => {
  //       const program = await prisma.program.findUniqueOrThrow({
  //         where: {
  //           id: programId,
  //         },
  //         select: {
  //           id: true,
  //           name: true,
  //           slug: true,
  //           logo: true,
  //           supportEmail: true,
  //           workspace: {
  //             select: {
  //               id: true,
  //               slug: true,
  //               name: true,
  //               webhookEnabled: true,
  //             },
  //           },
  //           // if no partner group is found, need to fetch default group to fallback to
  //           ...(!programEnrollment.partnerGroup && {
  //             groups: {
  //               select: {
  //                 holdingPeriodDays: true,
  //               },
  //               where: {
  //                 slug: DEFAULT_PARTNER_GROUP.slug,
  //               },
  //             },
  //           }),
  //         },
  //       });
  //       const { workspace } = program;
  //       const isClawback = commission.earnings < 0;
  //       const shouldTriggerWorkflow = !isClawback && !skipWorkflow;
  //       await Promise.allSettled([
  //         sendWorkspaceWebhook({
  //           workspace,
  //           trigger: "commission.created",
  //           data: CommissionWebhookSchema.parse({
  //             ...commission,
  //             partner: webhookPartner,
  //           }),
  //         }),
  //         sendPartnerPostback({
  //           partnerId,
  //           event: "commission.created",
  //           data: {
  //             ...commission,
  //             customer: commission.customer,
  //           },
  //         }),
  //         syncTotalCommissions({
  //           partnerId,
  //           programId,
  //         }),
  //         !isClawback &&
  //           notifyPartnerCommission({
  //             program,
  //             // fallback to default group if no partner group is found
  //             group: programEnrollment.partnerGroup ?? program.groups[0],
  //             workspace,
  //             commission,
  //             isFirstCommission: firstCommission === null,
  //           }),
  //         // We only capture audit logs for manual commissions
  //         user &&
  //           recordAuditLog({
  //             workspaceId: workspace.id,
  //             programId,
  //             action: isClawback ? "clawback.created" : "commission.created",
  //             description: isClawback
  //               ? `Clawback created for ${partnerId}`
  //               : `Commission created for ${partnerId}`,
  //             actor: user,
  //             targets: [
  //               {
  //                 type: isClawback ? "clawback" : "commission",
  //                 id: commission.id,
  //                 metadata: commission,
  //               },
  //             ],
  //           }),
  //         shouldTriggerWorkflow &&
  //           executeWorkflows({
  //             trigger: "partnerMetricsUpdated",
  //             reason: "commission",
  //             identity: {
  //               workspaceId: workspace.id,
  //               programId,
  //               partnerId,
  //             },
  //             metrics: {
  //               current: {
  //                 commissions: commission.earnings,
  //               },
  //             },
  //           }),
  //       ]);
  //     })(),
  //   );
  //   return {
  //     commission,
  //     outputLog,
  //     programEnrollment,
  //     webhookPartner,
  //   };
  // } catch (error) {
  //   const outputLog = `Error creating commission - ${error.message}`;
  //   console.error(outputLog);
  //   // only log to Slack if the error is not a unique constraint violation
  //   if (error.code !== "P2002") {
  //     await log({
  //       message: outputLog,
  //       type: "errors",
  //       mention: true,
  //     });
  //   }
  //   return {
  //     commission: null,
  //     outputLog,
  //     programEnrollment,
  //     webhookPartner: constructWebhookPartner(programEnrollment),
  //   };
  // }
};
