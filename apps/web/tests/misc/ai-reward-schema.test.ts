import {
  AI_REWARD_EVENTS,
  getAIRewardConditionEntityIds,
  getAIRewardGenerationSchema,
  getAIRewardSchema,
  type AIRewardEvent,
} from "@/lib/ai/ai-reward-schema";
import {
  createRewardSchema,
  REWARD_CONDITIONS,
} from "@/lib/zod/schemas/rewards";
import { describe, expect, it } from "vitest";

function sampleValueForAttribute(attribute: {
  id: string;
  type: string;
  options?: { id: string }[];
}): string | number {
  if (attribute.options?.length) {
    return attribute.options[0].id;
  }

  switch (attribute.type) {
    case "number":
    case "currency":
      return 10;
    case "date":
      return "2024-01-01";
    case "metadata":
      return "value";
    default:
      return attribute.id === "country" ? "US" : "example";
  }
}

function draftWithCondition(
  event: AIRewardEvent,
  entityId: string,
  attribute: { id: string; type: string; options?: { id: string }[] },
) {
  return {
    type: "flat" as const,
    amount: 5,
    maxDuration: event === "sale" ? 12 : 0,
    modifiers: [
      {
        operator: "AND" as const,
        conditions: [
          {
            entity: entityId,
            attribute: attribute.id,
            operator: "equals_to" as const,
            value: sampleValueForAttribute(attribute),
            ...(attribute.type === "metadata" ? { metadataField: "plan" } : {}),
          },
        ],
        type: "flat" as const,
        amount: 10,
        maxDuration: event === "sale" ? 12 : 0,
      },
    ],
  };
}

describe("getAIRewardSchema — REWARD_CONDITIONS sync", () => {
  it("accepts every entity id from REWARD_CONDITIONS (non-referral)", () => {
    const derived = new Set(getAIRewardConditionEntityIds());
    const fromConditions = new Set(
      AI_REWARD_EVENTS.flatMap((event) =>
        REWARD_CONDITIONS[event].entities.map((entity) => entity.id),
      ),
    );

    expect(derived).toEqual(fromConditions);
  });

  it("builds a schema that accepts every entity id from REWARD_CONDITIONS", () => {
    for (const event of AI_REWARD_EVENTS) {
      const schema = getAIRewardSchema(event);
      for (const entity of REWARD_CONDITIONS[event].entities) {
        const attribute = entity.attributes[0];
        const result = schema.safeParse(
          draftWithCondition(event, entity.id, attribute),
        );
        expect(result.success, `${event}/${entity.id}`).toBe(true);
      }
    }
  });
});

describe.each(AI_REWARD_EVENTS)("getAIRewardSchema(%s)", (event) => {
  const schema = getAIRewardSchema(event);
  const entities = REWARD_CONDITIONS[event].entities;

  it("accepts a valid draft for every entity/attribute pair", () => {
    for (const entity of entities) {
      for (const attribute of entity.attributes) {
        const result = schema.safeParse(
          draftWithCondition(event, entity.id, attribute),
        );
        expect(
          result.success,
          `${event}/${entity.id}.${attribute.id}: ${result.success ? "" : JSON.stringify(result.error.issues)}`,
        ).toBe(true);
      }
    }
  });

  it("rejects an unknown entity", () => {
    const result = schema.safeParse(
      draftWithCondition(event, "unknown_entity", {
        id: "country",
        type: "enum",
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an unknown attribute for a known entity", () => {
    const entity = entities[0];
    const result = schema.safeParse(
      draftWithCondition(event, entity.id, {
        id: "not_a_real_attribute",
        type: "string",
      }),
    );
    expect(result.success).toBe(false);
  });

  const metadataCases = entities.flatMap((entity) =>
    entity.attributes
      .filter((attribute) => attribute.type === "metadata")
      .map((attribute) => ({ entityId: entity.id, attribute })),
  );

  if (metadataCases.length > 0) {
    it("rejects metadata without metadataField", () => {
      for (const { entityId, attribute } of metadataCases) {
        const draft = draftWithCondition(event, entityId, attribute);
        delete (draft.modifiers[0].conditions[0] as { metadataField?: string })
          .metadataField;

        const result = schema.safeParse(draft);
        expect(result.success, `${entityId}.metadata`).toBe(false);
      }
    });
  }
});

describe("getAIRewardSchema — click/lead one-off rules", () => {
  for (const event of ["click", "lead"] as const) {
    const schema = getAIRewardSchema(event);

    it(`${event}: rejects percentage type`, () => {
      const result = schema.safeParse({
        type: "percentage",
        amount: 10,
        maxDuration: 0,
      });
      expect(result.success).toBe(false);
    });

    it(`${event}: accepts omitted maxDuration`, () => {
      const result = schema.safeParse({
        type: "flat",
        amount: 5,
      });
      expect(result.success).toBe(true);
    });

    it(`${event}: accepts maxDuration 0`, () => {
      const result = schema.safeParse({
        type: "flat",
        amount: 5,
        maxDuration: 0,
      });
      expect(result.success).toBe(true);
    });

    it(`${event}: rejects nonzero maxDuration`, () => {
      const result = schema.safeParse({
        type: "flat",
        amount: 5,
        maxDuration: 12,
      });
      expect(result.success).toBe(false);
    });
  }
});

describe("getAIRewardSchema — sale percentage", () => {
  const schema = getAIRewardSchema("sale");

  it("accepts percentage amount <= 100", () => {
    const result = schema.safeParse({
      type: "percentage",
      amount: 20,
      maxDuration: 12,
    });
    expect(result.success).toBe(true);
  });

  it("rejects percentage amount > 100", () => {
    const result = schema.safeParse({
      type: "percentage",
      amount: 150,
      maxDuration: 12,
    });
    expect(result.success).toBe(false);
  });
});

describe("createRewardSchema — one-off coerce", () => {
  const base = {
    workspaceId: "ws_test",
    groupId: "grp_test",
    amountInCents: 500,
  };

  for (const event of ["click", "lead"] as const) {
    it(`${event}: coerces percentage + nonzero duration to flat / 0`, () => {
      const result = createRewardSchema.safeParse({
        ...base,
        event,
        type: "percentage",
        amountInPercentage: 20,
        maxDuration: 12,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.type).toBe("flat");
      expect(result.data.maxDuration).toBe(0);
    });
  }

  it("sale: does not coerce type or maxDuration", () => {
    const result = createRewardSchema.safeParse({
      ...base,
      event: "sale",
      type: "percentage",
      amountInPercentage: 20,
      maxDuration: 12,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.type).toBe("percentage");
    expect(result.data.maxDuration).toBe(12);
  });
});

describe("getAIRewardGenerationSchema — unsupported refusal", () => {
  const schema = getAIRewardGenerationSchema("sale");

  it("accepts supported=true with a valid reward", () => {
    const result = schema.safeParse({
      supported: true,
      reward: {
        type: "percentage",
        amount: 20,
        maxDuration: 12,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects supported=true without a reward", () => {
    const result = schema.safeParse({
      supported: true,
      reward: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts supported=false with a reason and no reward", () => {
    const result = schema.safeParse({
      supported: false,
      reason: "Yearly vs monthly billing interval is not supported.",
      reward: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects supported=true when reward fails app validation", () => {
    const clickSchema = getAIRewardGenerationSchema("click");
    const result = clickSchema.safeParse({
      supported: true,
      reward: {
        type: "percentage",
        amount: 20,
        maxDuration: 0,
      },
    });
    expect(result.success).toBe(false);
  });
});
