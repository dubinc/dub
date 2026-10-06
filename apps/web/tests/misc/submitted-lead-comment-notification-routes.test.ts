import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as notifyPartner } from "../../app/(ee)/api/cron/submitted-leads/comments/notify-partner/route";
import { POST as notifyProgram } from "../../app/(ee)/api/cron/submitted-leads/comments/notify-program/route";

const mocks = vi.hoisted(() => ({
  findLead: vi.fn(),
  updateComments: vi.fn(),
  sendEmail: vi.fn(),
  verifySignature: vi.fn(),
  template: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    submittedLead: { findUniqueOrThrow: mocks.findLead },
    submittedLeadComment: { updateMany: mocks.updateComments },
  },
}));
vi.mock("@/lib/cron", () => ({ qstash: {} }));
vi.mock("@/lib/cron/verify-qstash", () => ({
  verifyQstashSignature: mocks.verifySignature,
}));
vi.mock("@/lib/api/errors", () => ({
  handleAndReturnErrorResponse: () => new Response("Failed", { status: 500 }),
}));
vi.mock("@/ui/submitted-leads/submitted-lead-utils", () => ({
  getCompanyLogoUrl: () => null,
}));
vi.mock("@dub/email", () => ({ sendBatchEmail: mocks.sendEmail }));
vi.mock(
  "@dub/email/templates/new-submitted-lead-comments-from-program",
  () => ({
    default: mocks.template,
  }),
);
vi.mock(
  "@dub/email/templates/new-submitted-lead-comments-from-partner",
  () => ({
    default: mocks.template,
  }),
);
vi.mock("@dub/utils", () => ({
  log: vi.fn(),
  APP_DOMAIN_WITH_NGROK: "https://app.dub.co",
}));
vi.mock("../../app/(ee)/api/cron/utils", () => ({
  logAndRespond: (message: string) => new Response(message),
}));

const atMinute = (minute: number) => new Date(Date.UTC(2026, 9, 2, 12, minute));
const comment = (id: string, minute: number) => ({
  id,
  text: id,
  createdAt: atMinute(minute),
  user: { name: "Author", image: null },
});

function lead(comments = [comment("A", 0)]) {
  return {
    id: "lead_1",
    name: "Lead",
    email: "lead@example.com",
    partnerId: "pn_1",
    comments,
    partner: {
      id: "pn_1",
      name: "Partner",
      image: null,
      users: [{ user: { email: "partner@example.com" } }],
    },
    program: {
      name: "Program",
      slug: "program",
      logo: null,
      supportEmail: null,
      workspace: {
        slug: "workspace",
        users: [{ user: { email: "workspace@example.com", isMachine: false } }],
      },
    },
  };
}

function request(lastCommentId = "A", minute = 0) {
  return new Request("https://app.dub.co/api/cron/comments", {
    method: "POST",
    body: JSON.stringify({
      leadId: "lead_1",
      lastCommentId,
      lastCommentCreatedAt: atMinute(minute).toISOString(),
    }),
  });
}

describe.each([
  { recipient: "partner", post: notifyPartner, email: "partner@example.com" },
  { recipient: "program", post: notifyProgram, email: "workspace@example.com" },
])(
  "submitted lead notifications to $recipient",
  ({ recipient, post, email }) => {
    beforeEach(() => {
      vi.resetAllMocks();
      mocks.findLead.mockResolvedValue(lead());
      mocks.sendEmail.mockResolvedValue({ error: null });
      mocks.updateComments.mockResolvedValue({ count: 1 });
    });

    it("sends older unsent comments after the newest comment is deleted", async () => {
      const response = await post(request("deleted_B", 2));

      expect(response.status).toBe(200);
      expect(mocks.sendEmail).toHaveBeenCalledWith(
        [expect.objectContaining({ to: email })],
        { idempotencyKey: `submitted-lead-comments-${recipient}/deleted_B` },
      );
      expect(mocks.updateComments).toHaveBeenCalledWith({
        where: { id: { in: ["A"] }, notifiedAt: null },
        data: { notifiedAt: expect.any(Date) },
      });
      expect(mocks.sendEmail.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.updateComments.mock.invocationCallOrder[0],
      );
    });

    it("leaves comments unsent when the email provider returns an error", async () => {
      mocks.sendEmail.mockResolvedValue({ error: { message: "Unavailable" } });

      expect((await post(request())).status).toBe(500);
      expect(mocks.updateComments).not.toHaveBeenCalled();
    });

    it("leaves comments unsent when the email request throws", async () => {
      mocks.sendEmail.mockRejectedValue(new Error("Connection lost"));

      expect((await post(request())).status).toBe(500);
      expect(mocks.updateComments).not.toHaveBeenCalled();
    });

    it("waits for the newer comment's job without marking comments as sent", async () => {
      mocks.findLead.mockResolvedValue(
        lead([comment("B", 2), comment("A", 0)]),
      );

      expect((await post(request())).status).toBe(200);
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect(mocks.updateComments).not.toHaveBeenCalled();
    });

    it("does not send again when no unsent comments remain", async () => {
      mocks.findLead.mockResolvedValue(lead([]));

      expect((await post(request())).status).toBe(200);
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect(mocks.updateComments).not.toHaveBeenCalled();
    });

    it("sends the full batch in time order, including more than 50 comments", async () => {
      const comments = Array.from({ length: 51 }, (_, i) =>
        comment(`comment_${i}`, i),
      );
      mocks.findLead.mockResolvedValue(lead([...comments].reverse()));

      expect((await post(request("comment_50", 50))).status).toBe(200);
      expect(mocks.template).toHaveBeenCalledWith(
        expect.objectContaining({
          comments: comments.map(({ text, createdAt, user }) => ({
            text,
            createdAt,
            user,
          })),
        }),
      );
      expect(mocks.updateComments).toHaveBeenCalledWith({
        where: { id: { in: comments.map(({ id }) => id) }, notifiedAt: null },
        data: { notifiedAt: expect.any(Date) },
      });
      const query = mocks.findLead.mock.calls[0][0];
      expect(query.include.comments).not.toHaveProperty("take");
      expect(query.include.comments.where).toEqual({
        partnerId: recipient === "partner" ? null : { not: null },
        ...(recipient === "partner" && { partnerVisible: true }),
        notifiedAt: null,
        createdAt: { gt: expect.any(Date) },
      });
    });

    it("rejects an invalid signature before reading or sending comments", async () => {
      mocks.verifySignature.mockRejectedValue(new Error("Invalid signature"));

      expect((await post(request())).status).toBe(500);
      expect(mocks.findLead).not.toHaveBeenCalled();
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect(mocks.updateComments).not.toHaveBeenCalled();
    });
  },
);
