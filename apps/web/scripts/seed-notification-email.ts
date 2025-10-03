import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { NotificationEmailType } from "@dub/prisma/client";
import "dotenv-flow/config";

// Configuration
const CAMPAIGN_ID = "cmp_1K6N08X99G94EQVC7884V0AAS"; // Replace with actual campaign ID
const TOTAL_EMAILS = 100;

// Email status distribution
const STATUS_DISTRIBUTION = {
  delivered: 60,    // 60% delivered
  opened: 25,       // 25% opened (also delivered)
  bounced: 10,      // 10% bounced
  pending: 5,       // 5% pending (not delivered yet)
};

async function main() {
  console.log(`Creating ${TOTAL_EMAILS} notification emails for campaign ${CAMPAIGN_ID}...`);
  
  // Verify campaign exists
  const campaign = await prisma.campaign.findUnique({
    where: { id: CAMPAIGN_ID },
    select: { id: true, name: true, programId: true }
  });

  if (!campaign) {
    console.error(`Campaign with ID ${CAMPAIGN_ID} not found. Please provide a valid campaign ID.`);
    process.exit(1);
  }

  console.log(`Found campaign: ${campaign.name} (${campaign.id})`);

  // Generate notification emails with different statuses
  const notificationEmails = generateNotificationEmails(campaign.id, campaign.programId);
  
  // Create emails in batches
  const batchSize = 20;
  let created = 0;
  
  for (let i = 0; i < notificationEmails.length; i += batchSize) {
    const batch = notificationEmails.slice(i, i + batchSize);
    
    await prisma.notificationEmail.createMany({
      data: batch,
      skipDuplicates: true,
    });
    
    created += batch.length;
    console.log(`Created ${created}/${TOTAL_EMAILS} notification emails...`);
  }

  console.log(`✅ Successfully created ${created} notification emails for campaign ${CAMPAIGN_ID}`);
  
  // Print summary
  const summary = await getEmailStatusSummary(CAMPAIGN_ID);
  console.log("\n📊 Email Status Summary:");
  Object.entries(summary).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
}

function generateNotificationEmails(campaignId: string, programId: string) {
  const emails: any[] = [];
  let emailCount = 0;

  // Generate emails based on status distribution
  Object.entries(STATUS_DISTRIBUTION).forEach(([status, count]) => {
    const statusCount = Math.floor((count / 100) * TOTAL_EMAILS);
    
    for (let i = 0; i < statusCount && emailCount < TOTAL_EMAILS; i++) {
      const email = createNotificationEmail(campaignId, programId, status as EmailStatus);
      emails.push(email);
      emailCount++;
    }
  });

  // Fill remaining slots if needed
  while (emailCount < TOTAL_EMAILS) {
    const status = getRandomStatus();
    const email = createNotificationEmail(campaignId, programId, status);
    emails.push(email);
    emailCount++;
  }

  return emails;
}

function createNotificationEmail(campaignId: string, programId: string, status: EmailStatus) {
  const now = new Date();
  const emailId = createId({ prefix: "em_" });
  
  const baseEmail = {
    id: createId({ prefix: "em_" }),
    emailId,
    type: NotificationEmailType.Campaign,
    campaignId,
    programId,
    recipientUserId: createId({ prefix: "user_" }),
    createdAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date in last 7 days
  };

  switch (status) {
    case "pending":
      return baseEmail;
    
    case "delivered":
      return {
        ...baseEmail,
        deliveredAt: new Date(baseEmail.createdAt.getTime() + Math.random() * 60 * 60 * 1000), // Delivered within 1 hour
      };
    
    case "opened":
      const deliveredAt = new Date(baseEmail.createdAt.getTime() + Math.random() * 60 * 60 * 1000);
      return {
        ...baseEmail,
        deliveredAt,
        openedAt: new Date(deliveredAt.getTime() + Math.random() * 24 * 60 * 60 * 1000), // Opened within 24 hours of delivery
      };
    
    case "bounced":
      return {
        ...baseEmail,
        bouncedAt: new Date(baseEmail.createdAt.getTime() + Math.random() * 2 * 60 * 60 * 1000), // Bounced within 2 hours
      };
    
    default:
      return baseEmail;
  }
}

async function getEmailStatusSummary(campaignId: string) {
  const emails = await prisma.notificationEmail.findMany({
    where: { campaignId },
    select: {
      deliveredAt: true,
      openedAt: true,
      bouncedAt: true,
    },
  });

  const summary = {
    pending: 0,
    delivered: 0,
    opened: 0,
    bounced: 0,
  };

  emails.forEach(email => {
    if (email.bouncedAt) {
      summary.bounced++;
    } else if (email.openedAt) {
      summary.opened++;
    } else if (email.deliveredAt) {
      summary.delivered++;
    } else {
      summary.pending++;
    }
  });

  return summary;
}

function getRandomStatus(): EmailStatus {
  const statuses: EmailStatus[] = ["pending", "delivered", "opened", "bounced"];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

type EmailStatus = "pending" | "delivered" | "opened" | "bounced";

// Run the script
main()
  .catch((error) => {
    console.error("❌ Error seeding notification emails:", error);
    process.exit(1);
  });
