import { isBlacklistedEmail } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import Stripe from "stripe";

export const CANCELLATION_FEEDBACK_EMAIL_TYPE = "cancellationFeedbackEmail";

const cancellationReasonMap = {
  customer_service: "you had a bad experience with our customer service",
  low_quality: "the product didn't meet your expectations",
  missing_features: "you were expecting more features",
  switched_service: "you switched to a different service",
  too_complex: "the product was too complex",
  too_expensive: "the product was too expensive",
  unused: "you didn't use the product",
};

export async function sendCancellationFeedback({
  workspace,
  owners,
  reason,
}: {
  workspace: {
    id: string;
  };
  owners: {
    name: string | null;
    email: string | null;
  }[];
  reason?: Stripe.Subscription.CancellationDetails.Feedback | null;
}) {
  const alreadySent = await prisma.sentEmail.findFirst({
    where: {
      projectId: workspace.id,
      type: CANCELLATION_FEEDBACK_EMAIL_TYPE,
    },
  });

  if (alreadySent) {
    console.log(
      `Cancellation feedback email already sent for workspace ${workspace.id}, skipping...`,
    );
    return;
  }

  const isBlacklistedCancellation = await isBlacklistedEmail(
    owners.filter(({ email }) => email).map(({ email }) => email!),
  );

  if (isBlacklistedCancellation) {
    console.log("Blacklisted cancellation, skipping feedback email...");
    return;
  }

  await prisma.sentEmail.create({
    data: {
      projectId: workspace.id,
      type: CANCELLATION_FEEDBACK_EMAIL_TYPE,
    },
  });

  const reasonText = reason ? cancellationReasonMap[reason] : "";

  return await Promise.all(
    owners.map(
      (owner) =>
        owner.email &&
        sendEmail({
          to: owner.email,
          from: "Steven Tey <steven@dub.co>",
          replyTo: "steven.tey@dub.co",
          subject: "Feedback for Dub.co?",
          text: `Hey ${owner.name ? owner.name.split(" ")[0] : "there"}!\n\nSaw you canceled your Dub subscription${reasonText ? ` and mentioned that ${reasonText}` : ""} – do you mind sharing if there's anything we could've done better on our side?\n\nWe're always looking to improve our product offering so any feedback would be greatly appreciated!\n\nThank you so much in advance!\n\nBest,\nSteven Tey\nFounder, Dub.co`,
          headers: {
            "Idempotency-Key": `cancellation-feedback-${owner.email}`,
          },
        }),
    ),
  );
}
