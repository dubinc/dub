import { LEAD_TRIGGER_EVENT_OPTIONS } from "@/lib/integrations/hubspot/constants";
import { getHubSpotEventAction } from "@/lib/integrations/hubspot/get-hubspot-event-action";
import { hubSpotSettingsSchema } from "@/lib/integrations/hubspot/schema";
import { describe, expect, it } from "vitest";
import * as z from "zod/v4";

type Settings = z.infer<typeof hubSpotSettingsSchema>;
type Event = Parameters<typeof getHubSpotEventAction>[0]["event"];

const CONTACT = "0-1";
const DEAL = "0-3";

const settings = (overrides: Partial<Settings> = {}) =>
  hubSpotSettingsSchema.parse(overrides);

const contactCreated: Event = {
  objectTypeId: CONTACT,
  subscriptionType: "object.creation",
};

const contactPropertyChanged = (
  propertyName?: string,
  propertyValue?: string,
): Event => ({
  objectTypeId: CONTACT,
  subscriptionType: "object.propertyChange",
  propertyName,
  propertyValue,
});

const dealCreated: Event = {
  objectTypeId: DEAL,
  subscriptionType: "object.creation",
};

const dealPropertyChanged = (
  propertyName?: string,
  propertyValue?: string,
): Event => ({
  objectTypeId: DEAL,
  subscriptionType: "object.propertyChange",
  propertyName,
  propertyValue,
});

const dealStageChanged = (stage?: string) =>
  dealPropertyChanged("dealstage", stage);

describe("getHubSpotEventAction", () => {
  describe("default settings", () => {
    it("defaults to the dealCreated trigger and the closedwon stage", () => {
      const defaults = settings();

      expect(defaults.leadTriggerEvent).toBe("dealCreated");
      expect(defaults.closedWonDealStageId).toBe("closedwon");

      expect(
        getHubSpotEventAction({ event: dealCreated, settings: defaults }),
      ).toBe("trackLead");
      expect(
        getHubSpotEventAction({
          event: dealStageChanged("closedwon"),
          settings: defaults,
        }),
      ).toBe("trackSale");
    });
  });

  describe("contact events", () => {
    it.each(LEAD_TRIGGER_EVENT_OPTIONS)(
      "tracks the deferred lead for a new contact when the trigger is %s",
      (leadTriggerEvent) => {
        expect(
          getHubSpotEventAction({
            event: contactCreated,
            settings: settings({ leadTriggerEvent }),
          }),
        ).toBe("trackLead");
      },
    );

    it.each([
      ["lifecyclestage", "customer"],
      ["lifecyclestage", undefined],
      ["phone", "123"],
      [undefined, undefined],
    ])(
      "tracks the lead for any contact property change (%s = %s) when the trigger is lifecycleStageReached",
      (propertyName, propertyValue) => {
        expect(
          getHubSpotEventAction({
            event: contactPropertyChanged(propertyName, propertyValue),
            settings: settings({
              leadTriggerEvent: "lifecycleStageReached",
              leadLifecycleStageId: "customer",
            }),
          }),
        ).toBe("trackLead");
      },
    );

    it.each(["dealCreated", "dealStageReached"] as const)(
      "skips contact property changes when the trigger is %s",
      (leadTriggerEvent) => {
        expect(
          getHubSpotEventAction({
            event: contactPropertyChanged("lifecyclestage", "customer"),
            settings: settings({ leadTriggerEvent }),
          }),
        ).toBe("skip");
      },
    );

    it("never tracks a sale for a contact, even when the value matches the closed won stage", () => {
      expect(
        getHubSpotEventAction({
          event: contactPropertyChanged("dealstage", "closedwon"),
          settings: settings({ leadTriggerEvent: "dealCreated" }),
        }),
      ).toBe("skip");
    });
  });

  describe("deal created", () => {
    it("tracks the lead when the trigger is dealCreated", () => {
      expect(
        getHubSpotEventAction({
          event: dealCreated,
          settings: settings({ leadTriggerEvent: "dealCreated" }),
        }),
      ).toBe("trackLead");
    });

    it.each(["lifecycleStageReached", "dealStageReached"] as const)(
      "skips when the trigger is %s",
      (leadTriggerEvent) => {
        expect(
          getHubSpotEventAction({
            event: dealCreated,
            settings: settings({
              leadTriggerEvent,
              leadDealStageId: "appointmentscheduled",
            }),
          }),
        ).toBe("skip");
      },
    );
  });

  describe("deal property changed", () => {
    it.each([
      ["amount", "closedwon"],
      ["dealname", "appointmentscheduled"],
      [undefined, "closedwon"],
    ])(
      "skips when the changed property is %s, even if the value matches a configured stage",
      (propertyName, propertyValue) => {
        expect(
          getHubSpotEventAction({
            event: dealPropertyChanged(propertyName, propertyValue),
            settings: settings({
              leadTriggerEvent: "dealStageReached",
              leadDealStageId: "appointmentscheduled",
            }),
          }),
        ).toBe("skip");
      },
    );

    describe("closed won sale", () => {
      it.each(LEAD_TRIGGER_EVENT_OPTIONS)(
        "tracks the sale when the deal moves to the closed won stage and the trigger is %s",
        (leadTriggerEvent) => {
          expect(
            getHubSpotEventAction({
              event: dealStageChanged("closedwon"),
              settings: settings({
                leadTriggerEvent,
                leadDealStageId:
                  leadTriggerEvent === "dealStageReached"
                    ? "appointmentscheduled"
                    : undefined,
              }),
            }),
          ).toBe("trackSale");
        },
      );

      it("matches the closed won stage case-insensitively", () => {
        expect(
          getHubSpotEventAction({
            event: dealStageChanged("ClosedWon"),
            settings: settings({ closedWonDealStageId: "CLOSEDWON" }),
          }),
        ).toBe("trackSale");
      });

      it("matches the closed won stage when the saved id has surrounding whitespace", () => {
        const parsed = settings({ closedWonDealStageId: "  closedwon  " });

        expect(parsed.closedWonDealStageId).toBe("closedwon");
        expect(
          getHubSpotEventAction({
            event: dealStageChanged("closedwon"),
            settings: parsed,
          }),
        ).toBe("trackSale");
      });

      it("uses a custom closed won stage ID instead of the default", () => {
        const custom = settings({ closedWonDealStageId: "12345" });

        expect(
          getHubSpotEventAction({
            event: dealStageChanged("12345"),
            settings: custom,
          }),
        ).toBe("trackSale");
        expect(
          getHubSpotEventAction({
            event: dealStageChanged("closedwon"),
            settings: custom,
          }),
        ).toBe("skip");
      });

      it.each(["closedwon", "", undefined])(
        "skips when closedWonDealStageId is null and the new stage is %s",
        (stage) => {
          expect(
            getHubSpotEventAction({
              event: dealStageChanged(stage),
              settings: settings({ closedWonDealStageId: null }),
            }),
          ).toBe("skip");
        },
      );

      it.each(["", undefined])(
        "skips an empty stage change when closedWonDealStageId is an empty string (stage = %s)",
        (stage) => {
          expect(
            getHubSpotEventAction({
              event: dealStageChanged(stage),
              settings: settings({ closedWonDealStageId: "" }),
            }),
          ).toBe("skip");
        },
      );

      it("skips when the new stage is neither the lead stage nor the closed won stage", () => {
        expect(
          getHubSpotEventAction({
            event: dealStageChanged("contractsent"),
            settings: settings(),
          }),
        ).toBe("skip");
      });
    });

    describe("dealStageReached lead", () => {
      const dealStageSettings = settings({
        leadTriggerEvent: "dealStageReached",
        leadDealStageId: "appointmentscheduled",
      });

      it("tracks the lead when the deal moves to the lead deal stage", () => {
        expect(
          getHubSpotEventAction({
            event: dealStageChanged("appointmentscheduled"),
            settings: dealStageSettings,
          }),
        ).toBe("trackLead");
      });

      it("matches the lead deal stage case-insensitively", () => {
        expect(
          getHubSpotEventAction({
            event: dealStageChanged("AppointmentScheduled"),
            settings: settings({
              leadTriggerEvent: "dealStageReached",
              leadDealStageId: "APPOINTMENTSCHEDULED",
            }),
          }),
        ).toBe("trackLead");
      });

      it("matches the lead deal stage when the saved id has surrounding whitespace", () => {
        const parsed = settings({
          leadTriggerEvent: "dealStageReached",
          leadDealStageId: "  appointmentscheduled  ",
        });

        expect(parsed.leadDealStageId).toBe("appointmentscheduled");
        expect(
          getHubSpotEventAction({
            event: dealStageChanged("appointmentscheduled"),
            settings: parsed,
          }),
        ).toBe("trackLead");
      });

      it("does not treat a whitespace-only lead deal stage id as configured", () => {
        const parsed = settings({
          leadTriggerEvent: "dealStageReached",
          leadDealStageId: "   ",
        });

        expect(parsed.leadDealStageId).toBe("");
        expect(
          getHubSpotEventAction({
            event: dealStageChanged("appointmentscheduled"),
            settings: parsed,
          }),
        ).toBe("skip");
      });

      it("skips when the deal moves to a different stage", () => {
        expect(
          getHubSpotEventAction({
            event: dealStageChanged("qualifiedtobuy"),
            settings: dealStageSettings,
          }),
        ).toBe("skip");
      });

      it("skips when the stage change has no value", () => {
        expect(
          getHubSpotEventAction({
            event: dealStageChanged(undefined),
            settings: dealStageSettings,
          }),
        ).toBe("skip");
      });

      it.each(["dealCreated", "lifecycleStageReached"] as const)(
        "ignores a stored leadDealStageId when the trigger is %s",
        (leadTriggerEvent) => {
          expect(
            getHubSpotEventAction({
              event: dealStageChanged("appointmentscheduled"),
              settings: settings({
                leadTriggerEvent,
                leadDealStageId: "appointmentscheduled",
              }),
            }),
          ).toBe("skip");
        },
      );

      it.each([null, undefined, ""])(
        "never tracks a lead when leadDealStageId is %s",
        (leadDealStageId) => {
          const noLeadStage = settings({
            leadTriggerEvent: "dealStageReached",
            leadDealStageId,
          });

          expect(
            getHubSpotEventAction({
              event: dealStageChanged(""),
              settings: noLeadStage,
            }),
          ).toBe("skip");
          expect(
            getHubSpotEventAction({
              event: dealStageChanged(undefined),
              settings: noLeadStage,
            }),
          ).toBe("skip");
          expect(
            getHubSpotEventAction({
              event: dealStageChanged("closedwon"),
              settings: noLeadStage,
            }),
          ).toBe("trackSale");
        },
      );

      it("prefers the lead over the sale when both stages are the same", () => {
        expect(
          getHubSpotEventAction({
            event: dealStageChanged("closedwon"),
            settings: settings({
              leadTriggerEvent: "dealStageReached",
              leadDealStageId: "closedwon",
              closedWonDealStageId: "closedwon",
            }),
          }),
        ).toBe("trackLead");
      });
    });
  });

  describe("unknown object type", () => {
    it.each(["object.creation", "object.propertyChange"] as const)(
      "skips %s events for an unsupported object type",
      (subscriptionType) => {
        expect(
          getHubSpotEventAction({
            event: {
              objectTypeId: "0-2" as Event["objectTypeId"],
              subscriptionType,
              propertyName: "dealstage",
              propertyValue: "closedwon",
            },
            settings: settings(),
          }),
        ).toBe("skip");
      },
    );
  });
});
