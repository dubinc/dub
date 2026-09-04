import { prisma } from "@/lib/prisma";
import { expect } from "@playwright/test";
import { apiError } from "../../utils";
import {
  countGroupChangeActivityLogs,
  disableWorkflow,
  expectMoveRules,
  expectPartnerInGroup,
  expectPartnerStaysInGroup,
  getEnrollment,
  getGroup,
  getGroupWorkflow,
  getPartnerGroupRewards,
  seedLinkStats,
  setGroupMoveDisabledAt,
  setMoveRules,
  trackPartnerLead,
  trackPartnerSale,
  uniqueThreshold,
} from "./helpers";
import { test } from "./move-group-fixtures";

// Serial: moveRules are validated program-wide against every other group's
// rules, so concurrent PATCHes in this file would flake on overlap checks.
// No retries: a failed case leaves groups/workflows that would flake on retry.
test.describe.configure({ mode: "serial", retries: 0 });

test.describe("Workflow execution", () => {
  // totalCommissions is intentionally not covered: it only fires from the
  // QStash create-partner-commission worker and would make this suite slow.

  test("moves partner when totalLeads condition is met", async ({
    api,
    program,
    createGroup,
    createPartner,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    const { status } = await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n, max: n + 1 },
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: source.id,
      },
    ]);
    expect(status).toEqual(200);

    const partner = await createPartner({ groupId: source.id });
    await seedLinkStats(partner.links![0].id, { leads: n - 1 });

    await trackPartnerLead(partner);

    const enrollment = await expectPartnerInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: target.id,
    });

    const targetRewards = await getPartnerGroupRewards(target.id);
    expect(enrollment.leadRewardId).toBe(targetRewards.leadRewardId);
    expect(enrollment.saleRewardId).toBe(targetRewards.saleRewardId);
    expect(enrollment.discountId).toBe(targetRewards.discountId);
  });

  // `gte` is the other operator every metric attribute accepts, and it is
  // inclusive — seeding n-1 leaves the partner exactly on the threshold.
  test("moves partner when totalLeads meets a gte threshold exactly", async ({
    api,
    program,
    createGroup,
    createPartner,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    const { status } = await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "gte",
        value: n,
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: source.id,
      },
    ]);
    expect(status).toEqual(200);

    const partner = await createPartner({ groupId: source.id });
    await seedLinkStats(partner.links![0].id, { leads: n - 1 });

    await trackPartnerLead(partner);

    await expectPartnerInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: target.id,
    });
  });

  test("does not move partner when totalLeads condition is not met", async ({
    api,
    program,
    createGroup,
    createPartner,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    const { status } = await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n, max: n + 1 },
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: source.id,
      },
    ]);
    expect(status).toEqual(200);

    const partner = await createPartner({ groupId: source.id });
    // Seed far below the window so one lead cannot satisfy it.
    await seedLinkStats(partner.links![0].id, { leads: 0 });

    await trackPartnerLead(partner);

    await expectPartnerStaysInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: source.id,
    });
  });

  test("does not move partner when workflow is disabled", async ({
    api,
    program,
    createGroup,
    createPartner,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    const { status } = await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n, max: n + 1 },
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: source.id,
      },
    ]);
    expect(status).toEqual(200);

    const workflow = await getGroupWorkflow(target.id);
    expect(workflow).not.toBeNull();
    await disableWorkflow(workflow!.id);

    const partner = await createPartner({ groupId: source.id });
    await seedLinkStats(partner.links![0].id, { leads: n - 1 });

    await trackPartnerLead(partner);

    await expectPartnerStaysInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: source.id,
    });
  });

  test("moves partner when partnerGroup matches source group", async ({
    api,
    program,
    createGroup,
    createPartner,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    const { status } = await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n, max: n + 1 },
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: source.id,
      },
    ]);
    expect(status).toEqual(200);

    const partner = await createPartner({ groupId: source.id });
    expect(partner.groupId).toBe(source.id);
    await seedLinkStats(partner.links![0].id, { leads: n - 1 });

    await trackPartnerLead(partner);

    await expectPartnerInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: target.id,
    });
  });

  test("does not move partner when partnerGroup does not match", async ({
    api,
    program,
    createGroup,
    createPartner,
  }) => {
    const allowedSource = await createGroup();
    const actualSource = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    const { status } = await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n, max: n + 1 },
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: allowedSource.id,
      },
    ]);
    expect(status).toEqual(200);

    const partner = await createPartner({ groupId: actualSource.id });
    await seedLinkStats(partner.links![0].id, { leads: n - 1 });

    await trackPartnerLead(partner);

    await expectPartnerStaysInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: actualSource.id,
    });
  });

  test("moves partner when partnerGroup is one of several source groups", async ({
    api,
    program,
    createGroup,
    createPartner,
  }) => {
    const otherSource = await createGroup();
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    const { status } = await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n, max: n + 1 },
      },
      {
        attribute: "partnerGroup",
        operator: "in",
        value: [otherSource.id, source.id],
      },
    ]);
    expect(status).toEqual(200);

    const partner = await createPartner({ groupId: source.id });
    await seedLinkStats(partner.links![0].id, { leads: n - 1 });

    await trackPartnerLead(partner);

    await expectPartnerInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: target.id,
    });
  });

  test("does not move partner when partnerGroup is excluded by notIn", async ({
    api,
    program,
    createGroup,
    createPartner,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    const { status } = await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n, max: n + 1 },
      },
      {
        attribute: "partnerGroup",
        operator: "notIn",
        value: [source.id],
      },
    ]);
    expect(status).toEqual(200);

    const partner = await createPartner({ groupId: source.id });
    await seedLinkStats(partner.links![0].id, { leads: n - 1 });

    await trackPartnerLead(partner);

    await expectPartnerStaysInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: source.id,
    });
  });

  test("skips partner with groupMoveDisabledAt set", async ({
    api,
    program,
    createGroup,
    createPartner,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    const { status } = await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n, max: n + 1 },
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: source.id,
      },
    ]);
    expect(status).toEqual(200);

    const partner = await createPartner({ groupId: source.id });
    await setGroupMoveDisabledAt(api, {
      partnerId: partner.id,
      groupId: source.id,
      groupMoveDisabledAt: new Date().toISOString(),
    });

    const before = await getEnrollment({
      partnerId: partner.id,
      programId: program.id,
    });
    expect(before.groupMoveDisabledAt).not.toBeNull();
    expect(before.groupId).toBe(source.id);

    await seedLinkStats(partner.links![0].id, { leads: n - 1 });
    await trackPartnerLead(partner);

    const after = await expectPartnerStaysInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: source.id,
    });
    expect(after.groupMoveDisabledAt).not.toBeNull();
  });

  test("does not re-move partner on repeat triggers", async ({
    api,
    program,
    createGroup,
    createPartner,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    const { status } = await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n, max: n + 100 },
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: source.id,
      },
    ]);
    expect(status).toEqual(200);

    const partner = await createPartner({ groupId: source.id });
    await seedLinkStats(partner.links![0].id, { leads: n - 1 });

    await trackPartnerLead(partner);
    await expectPartnerInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: target.id,
    });

    // Second lead: the already-in-target guard skips before the redis lock is
    // ever reached, since the first move has already committed by now.
    await trackPartnerLead(partner);
    await expectPartnerStaysInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: target.id,
    });

    // The enrollment update is idempotent, so only the activity log proves the
    // partner was moved once rather than once per trigger.
    await expect
      .poll(
        () =>
          countGroupChangeActivityLogs({
            partnerId: partner.id,
            programId: program.id,
          }),
        { timeout: 15_000 },
      )
      .toBe(1);
  });

  test("moves partner when totalSaleAmount condition is met", async ({
    api,
    program,
    createGroup,
    createPartner,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    const { status } = await setMoveRules(api, target.id, [
      {
        attribute: "totalSaleAmount",
        operator: "between",
        value: { min: n, max: n + 1 },
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: source.id,
      },
    ]);
    expect(status).toEqual(200);

    const partner = await createPartner({ groupId: source.id });
    await trackPartnerSale(partner, { amount: n });

    await expectPartnerInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: target.id,
    });
  });

  test("moves partner when totalConversions condition is met", async ({
    api,
    program,
    createGroup,
    createPartner,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    const { status } = await setMoveRules(api, target.id, [
      {
        attribute: "totalConversions",
        operator: "gte",
        value: n,
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: source.id,
      },
    ]);
    expect(status).toEqual(200);

    const partner = await createPartner({ groupId: source.id });
    await seedLinkStats(partner.links![0].id, { conversions: n - 1 });

    // conversions only increment on a customer's first sale, which is what
    // trackPartnerSale produces (fresh customer per call).
    await trackPartnerSale(partner);

    await expectPartnerInGroup({
      partnerId: partner.id,
      programId: program.id,
      expectedGroupId: target.id,
    });
  });
});

test.describe("Workflow lifecycle", () => {
  test("configuring moveRules creates a moveGroup workflow", async ({
    api,
    createGroup,
  }) => {
    const target = await createGroup();
    const n = uniqueThreshold();
    const moveRules = [
      {
        attribute: "totalCommissions" as const,
        operator: "between" as const,
        value: { min: n, max: n + 1 },
      },
    ];

    const { status } = await setMoveRules(api, target.id, moveRules);
    expect(status).toEqual(200);

    const workflow = await getGroupWorkflow(target.id);
    expect(workflow).not.toBeNull();
    expect(workflow!.disabledAt).toBeNull();
    expect(workflow!.actions).toEqual([
      {
        type: "moveGroup",
        data: { groupId: target.id },
      },
    ]);
    expect(workflow!.triggerConditions).toEqual(moveRules);

    const { status: getStatus, data: group } = await getGroup(api, target.id);
    expect(getStatus).toEqual(200);
    expect(group.moveRules).toEqual(moveRules);
  });

  test("changing moveRules updates the same workflow row", async ({
    api,
    createGroup,
  }) => {
    const target = await createGroup();
    const n1 = uniqueThreshold();
    const n2 = uniqueThreshold();

    await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n1, max: n1 + 1 },
      },
    ]);

    const before = await getGroupWorkflow(target.id);
    expect(before).not.toBeNull();

    const nextRules = [
      {
        attribute: "totalConversions" as const,
        operator: "between" as const,
        value: { min: n2, max: n2 + 1 },
      },
    ];
    const { status } = await setMoveRules(api, target.id, nextRules);
    expect(status).toEqual(200);

    const after = await getGroupWorkflow(target.id);
    expect(after).not.toBeNull();
    expect(after!.id).toBe(before!.id);
    expect(after!.triggerConditions).toEqual(nextRules);
  });

  test("empty moveRules deletes the workflow", async ({ api, createGroup }) => {
    const target = await createGroup();
    const n = uniqueThreshold();

    await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n, max: n + 1 },
      },
    ]);
    expect(await getGroupWorkflow(target.id)).not.toBeNull();

    const { status } = await setMoveRules(api, target.id, []);
    expect(status).toEqual(200);

    expect(await getGroupWorkflow(target.id)).toBeNull();

    const group = await prisma.partnerGroup.findUniqueOrThrow({
      where: { id: target.id },
      select: { workflowId: true },
    });
    expect(group.workflowId).toBeNull();
  });

  test("PATCH without moveRules leaves the workflow untouched", async ({
    api,
    createGroup,
  }) => {
    const target = await createGroup();
    const n = uniqueThreshold();
    const moveRules = [
      {
        attribute: "totalLeads" as const,
        operator: "between" as const,
        value: { min: n, max: n + 1 },
      },
    ];

    await setMoveRules(api, target.id, moveRules);
    const before = await getGroupWorkflow(target.id);
    expect(before).not.toBeNull();

    const { status } = await api.patch(`/api/groups/${target.id}`, {
      name: `${target.name} updated`,
    });
    expect(status).toEqual(200);

    const after = await getGroupWorkflow(target.id);
    expect(after).not.toBeNull();
    expect(after!.id).toBe(before!.id);
    expect(after!.triggerConditions).toEqual(moveRules);
  });

  test("deleting a group deletes its attached workflow", async ({
    api,
    createGroup,
  }) => {
    const target = await createGroup();
    const n = uniqueThreshold();

    await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n, max: n + 1 },
      },
    ]);

    const workflow = await getGroupWorkflow(target.id);
    expect(workflow).not.toBeNull();
    const workflowId = workflow!.id;

    const { status } = await api.delete(`/api/groups/${target.id}`);
    expect(status).toEqual(200);

    const deleted = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });
    expect(deleted).toBeNull();
  });

  test("deleting a source group drops it from another group's move rules", async ({
    api,
    createGroup,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();
    const metricRule = {
      attribute: "totalLeads" as const,
      operator: "between" as const,
      value: { min: n, max: n + 1 },
    };

    const { status } = await setMoveRules(api, target.id, [
      metricRule,
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: source.id,
      },
    ]);
    expect(status).toEqual(200);

    const { status: deleteStatus } = await api.delete(
      `/api/groups/${source.id}`,
    );
    expect(deleteStatus).toEqual(200);

    // The whole condition is dropped rather than the workflow being disabled,
    // so what was "in group A and hit the metric" now matches every partner.
    await expectMoveRules({ groupId: target.id, expected: [metricRule] });
  });

  test("deleting a source group only removes it from a partnerGroup list", async ({
    api,
    createGroup,
  }) => {
    const removed = await createGroup();
    const kept = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();
    const metricRule = {
      attribute: "totalLeads" as const,
      operator: "between" as const,
      value: { min: n, max: n + 1 },
    };

    const { status } = await setMoveRules(api, target.id, [
      metricRule,
      {
        attribute: "partnerGroup",
        operator: "in",
        value: [removed.id, kept.id],
      },
    ]);
    expect(status).toEqual(200);

    const { status: deleteStatus } = await api.delete(
      `/api/groups/${removed.id}`,
    );
    expect(deleteStatus).toEqual(200);

    await expectMoveRules({
      groupId: target.id,
      expected: [
        metricRule,
        {
          attribute: "partnerGroup",
          operator: "in",
          value: [kept.id],
        },
      ],
    });
  });

  test("multiple metric move rules are stored in order", async ({
    api,
    createGroup,
  }) => {
    const target = await createGroup();
    const n1 = uniqueThreshold();
    const n2 = uniqueThreshold();
    const moveRules = [
      {
        attribute: "totalLeads" as const,
        operator: "between" as const,
        value: { min: n1, max: n1 + 1 },
      },
      {
        attribute: "totalConversions" as const,
        operator: "between" as const,
        value: { min: n2, max: n2 + 1 },
      },
    ];

    const { status } = await setMoveRules(api, target.id, moveRules);
    expect(status).toEqual(200);

    const workflow = await getGroupWorkflow(target.id);
    expect(workflow).not.toBeNull();
    expect(workflow!.triggerConditions).toEqual(moveRules);
  });

  test("metric and partnerGroup move rules are stored together", async ({
    api,
    createGroup,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();
    const moveRules = [
      {
        attribute: "totalLeads" as const,
        operator: "between" as const,
        value: { min: n, max: n + 1 },
      },
      {
        attribute: "partnerGroup" as const,
        operator: "eq" as const,
        value: source.id,
      },
    ];

    const { status } = await setMoveRules(api, target.id, moveRules);
    expect(status).toEqual(200);

    const workflow = await getGroupWorkflow(target.id);
    expect(workflow).not.toBeNull();
    expect(workflow!.triggerConditions).toEqual(moveRules);
  });
});

test.describe("Move rule validation", () => {
  test("rejects partnerGroup as the only condition", async ({
    api,
    createGroup,
  }) => {
    const source = await createGroup();
    const target = await createGroup();

    expect(
      await setMoveRules(api, target.id, [
        {
          attribute: "partnerGroup",
          operator: "eq",
          value: source.id,
        },
      ]),
    ).toEqual(
      apiError({
        code: "bad_request",
        message:
          "Partner group can only be used as an additional condition alongside a metric rule.",
      }),
    );
  });

  test("rejects partnerGroup pointing at the current group", async ({
    api,
    createGroup,
  }) => {
    const target = await createGroup();
    const n = uniqueThreshold();

    expect(
      await setMoveRules(api, target.id, [
        {
          attribute: "totalLeads",
          operator: "between",
          value: { min: n, max: n + 1 },
        },
        {
          attribute: "partnerGroup",
          operator: "eq",
          value: target.id,
        },
      ]),
    ).toEqual(
      apiError({
        code: "bad_request",
        message:
          "Condition 2: Cannot select the current group as a source group.",
      }),
    );
  });

  test("rejects partnerGroup with an unknown group id", async ({
    api,
    createGroup,
  }) => {
    const target = await createGroup();
    const n = uniqueThreshold();
    const missingGroupId = "grp_does_not_exist";

    expect(
      await setMoveRules(api, target.id, [
        {
          attribute: "totalLeads",
          operator: "between",
          value: { min: n, max: n + 1 },
        },
        {
          attribute: "partnerGroup",
          operator: "eq",
          value: missingGroupId,
        },
      ]),
    ).toEqual(
      apiError({
        code: "bad_request",
        message: `Condition 2: Invalid group IDs detected: ${missingGroupId}`,
      }),
    );
  });

  test("rejects a partnerGroup list containing the current group", async ({
    api,
    createGroup,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();

    expect(
      await setMoveRules(api, target.id, [
        {
          attribute: "totalLeads",
          operator: "between",
          value: { min: n, max: n + 1 },
        },
        {
          attribute: "partnerGroup",
          operator: "in",
          value: [source.id, target.id],
        },
      ]),
    ).toEqual(
      apiError({
        code: "bad_request",
        message:
          "Condition 2: Cannot select the current group as a source group.",
      }),
    );
  });

  test("rejects a partnerGroup list with an unknown group id", async ({
    api,
    createGroup,
  }) => {
    const source = await createGroup();
    const target = await createGroup();
    const n = uniqueThreshold();
    const missingGroupId = "grp_does_not_exist";

    expect(
      await setMoveRules(api, target.id, [
        {
          attribute: "totalLeads",
          operator: "between",
          value: { min: n, max: n + 1 },
        },
        {
          attribute: "partnerGroup",
          operator: "in",
          value: [source.id, missingGroupId],
        },
      ]),
    ).toEqual(
      apiError({
        code: "bad_request",
        message: `Condition 2: Invalid group IDs detected: ${missingGroupId}`,
      }),
    );
  });

  test("rejects operator not allowed for the attribute", async ({
    api,
    createGroup,
  }) => {
    const target = await createGroup();

    expect(
      await setMoveRules(api, target.id, [
        {
          attribute: "totalLeads",
          operator: "lte",
          value: 1,
        },
      ]),
    ).toEqual(
      apiError({
        code: "bad_request",
        message:
          'Operator "is less than or equal to" is not valid for the activity "totalLeads".',
      }),
    );
  });

  test("rejects attribute not available for moveGroup", async ({
    api,
    createGroup,
  }) => {
    const target = await createGroup();

    expect(
      await setMoveRules(api, target.id, [
        {
          attribute: "partnerEnrolledDays",
          operator: "gte",
          value: 1,
        },
      ]),
    ).toEqual(
      apiError({
        code: "bad_request",
        message: "Condition 1: Invalid activity.",
      }),
    );
  });

  test("rejects between with max less than or equal to min", async ({
    api,
    createGroup,
  }) => {
    const target = await createGroup();
    const n = uniqueThreshold();

    const result = await setMoveRules(api, target.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: n, max: n },
      },
    ]);

    expect(result.status).toEqual(422);
    expect(result.data).toEqual({
      error: {
        code: "unprocessable_entity",
        message: expect.stringContaining(
          "Maximum value must be greater than minimum value.",
        ),
        doc_url:
          "https://dub.co/docs/api-reference/errors#unprocessable-entity",
      },
    });
  });

  test("rejects overlapping move rules across groups", async ({
    api,
    createGroup,
  }) => {
    const first = await createGroup();
    const second = await createGroup();
    const n = uniqueThreshold();
    const overlapping = [
      {
        attribute: "totalLeads" as const,
        operator: "between" as const,
        value: { min: n, max: n + 1 },
      },
    ];

    const created = await setMoveRules(api, first.id, overlapping);
    expect(created.status).toEqual(200);

    expect(await setMoveRules(api, second.id, overlapping)).toEqual(
      apiError({
        code: "bad_request",
        message: `This rule is already in use by the ${first.name} group. Select a different activity or amount.`,
      }),
    );

    const disjointN = uniqueThreshold();
    const disjoint = await setMoveRules(api, second.id, [
      {
        attribute: "totalLeads",
        operator: "between",
        value: { min: disjointN, max: disjointN + 1 },
      },
    ]);
    expect(disjoint.status).toEqual(200);
  });
});
