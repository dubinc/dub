import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

/**
 * Script to get users created within a date range and count their QR codes and link clicks
 * Usage: 
 * - Set START_DATE and END_DATE environment variables
 * - Or modify the dates directly in the script
 * - Run: tsx scripts/get-users-qr-count-by-date.ts
 * 
 * Output includes:
 * - User details with QR count, link count, and total clicks
 * - Top users by QR codes and by total clicks
 * - Comprehensive statistics and averages
 */

async function main() {
  // Get date range from environment variables or use defaults
  const startDateStr = process.env.START_DATE || "2025-08-30";
  const endDateStr = process.env.END_DATE || "2025-09-01";
  
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error("Invalid date format. Use YYYY-MM-DD format.");
    console.error("Example: START_DATE=2024-01-01 END_DATE=2024-12-31");
    return;
  }
  
  if (startDate > endDate) {
    console.error("Start date must be before end date");
    return;
  }
  
  console.log(`Getting users created between ${startDateStr} and ${endDateStr}`);
  console.log("----------------------------------------");
  
  // Get users within the date range with their QR count and total link clicks
  const usersWithQrCount = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          qrs: true,
          links: true,
        },
      },
      links: {
        select: {
          clicks: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  
  // Calculate totals
  const totalUsers = usersWithQrCount.length;
  const totalQrs = usersWithQrCount.reduce((sum, user) => sum + user._count.qrs, 0);
  const totalLinks = usersWithQrCount.reduce((sum, user) => sum + user._count.links, 0);
  const totalClicks = usersWithQrCount.reduce((sum, user) => 
    sum + user.links.reduce((linkSum, link) => linkSum + link.clicks, 0), 0);
  const usersWithQrs = usersWithQrCount.filter(user => user._count.qrs > 0).length;
  const usersWithLinks = usersWithQrCount.filter(user => user._count.links > 0).length;
  const usersWithClicks = usersWithQrCount.filter(user => 
    user.links.reduce((linkSum, link) => linkSum + link.clicks, 0) > 0).length;
  
  console.log(`Found ${totalUsers} users created in the specified date range`);
  console.log(`Total QR codes created by these users: ${totalQrs}`);
  // console.log(`Total links created by these users: ${totalLinks}`);
  console.log(`Total clicks on all links: ${totalClicks}`);
  console.log(`Users with at least one QR code: ${usersWithQrs}`);
  // console.log(`Users with at least one link: ${usersWithLinks}`);
  console.log(`Users with at least one click: ${usersWithClicks}`);
  console.log("");
  
  if (totalUsers === 0) {
    console.log("No users found in the specified date range.");
    return;
  }
  
  // Display detailed results
  console.log("User Details:");
  console.log("=============");
  
  const results = usersWithQrCount.map(user => {
    const totalClicksForUser = user.links.reduce((sum, link) => sum + link.clicks, 0);
    return {
      email: user.email || "No email",
      name: user.name || "No name",
      createdAt: user.createdAt.toISOString().split('T')[0], // Format as YYYY-MM-DD
      qrCount: user._count.qrs,
      // linkCount: user._count.links,
      totalClicks: totalClicksForUser,
    };
  });
  
  console.table(results);
  
  // Show users with most QR codes
  const topUsersByQrs = [...usersWithQrCount]
    .filter(user => user._count.qrs > 0)
    .sort((a, b) => b._count.qrs - a._count.qrs)
    .slice(0, 10);
  
  if (topUsersByQrs.length > 0) {
    console.log("");
    console.log("Top 10 users by QR count:");
    console.log("==========================");
    console.table(
      topUsersByQrs.map(user => {
        const totalClicksForUser = user.links.reduce((sum, link) => sum + link.clicks, 0);
        return {
          email: user.email || "No email",
          name: user.name || "No name", 
          qrCount: user._count.qrs,
          // linkCount: user._count.links,
          totalClicks: totalClicksForUser,
        };
      })
    );
  }
  
  // Show users with most clicks
  const topUsersByClicks = [...usersWithQrCount]
    .map(user => ({
      ...user,
      totalClicks: user.links.reduce((sum, link) => sum + link.clicks, 0)
    }))
    .filter(user => user.totalClicks > 0)
    .sort((a, b) => b.totalClicks - a.totalClicks)
    .slice(0, 10);
  
  if (topUsersByClicks.length > 0) {
    console.log("");
    console.log("Top 10 users by total clicks:");
    console.log("==============================");
    console.table(
      topUsersByClicks.map(user => ({
        email: user.email || "No email",
        name: user.name || "No name", 
        qrCount: user._count.qrs,
        // linkCount: user._count.links,
        totalClicks: user.totalClicks,
      }))
    );
  }
  
  // Summary statistics
  console.log("");
  console.log("Summary Statistics:");
  console.log("==================");
  console.log(`Date range: ${startDateStr} to ${endDateStr}`);
  console.log(`Total users: ${totalUsers}`);
  console.log(`Users with QRs: ${usersWithQrs} (${((usersWithQrs/totalUsers)*100).toFixed(1)}%)`);
  // console.log(`Users with links: ${usersWithLinks} (${((usersWithLinks/totalUsers)*100).toFixed(1)}%)`);
  console.log(`Users with clicks: ${usersWithClicks} (${((usersWithClicks/totalUsers)*100).toFixed(1)}%)`);
  console.log(`Total QR codes: ${totalQrs}`);
  // console.log(`Total links: ${totalLinks}`);
  console.log(`Total clicks: ${totalClicks.toLocaleString()}`);
  console.log(`Average QRs per user: ${(totalQrs/totalUsers).toFixed(2)}`);
  // console.log(`Average links per user: ${(totalLinks/totalUsers).toFixed(2)}`);
  console.log(`Average clicks per user: ${(totalClicks/totalUsers).toFixed(2)}`);
  if (usersWithQrs > 0) {
    console.log(`Average QRs per active QR user: ${(totalQrs/usersWithQrs).toFixed(2)}`);
  }
  if (usersWithLinks > 0) {
    // console.log(`Average links per active link user: ${(totalLinks/usersWithLinks).toFixed(2)}`);
    console.log(`Average clicks per link: ${(totalClicks/totalLinks).toFixed(2)}`);
  }
  if (usersWithClicks > 0) {
    console.log(`Average clicks per active user: ${(totalClicks/usersWithClicks).toFixed(2)}`);
  }
}

main()
  .catch((error) => {
    console.error("Error running script:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
