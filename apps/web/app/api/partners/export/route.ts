import { getPartners } from "@/lib/api/partners/get-partners";
import { withWorkspace } from "@/lib/auth";
import { partnersExportQuerySchema } from "@/lib/zod/schemas/partners";
import { z } from "zod";

// TODO:
// Defin the response schema based on the columns
const columns = [
  { id: "id", label: "ID" },
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "country", label: "Country" },
  { id: "status", label: "Status" },
  { id: "createdAt", label: "Created at" },
  { id: "payoutsEnabledAt", label: "Payouts enabled" },
  { id: "bio", label: "Bio" },
  { id: "website", label: "Website" },
  { id: "youtube", label: "YouTube" },
  { id: "twitter", label: "Twitter" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
];

const columnsMap = {
  id: "ID",
  name: "Name",
  email: "Email",
  country: "Country",
  status: "Status",
  createdAt: "Created At",
  payoutsEnabledAt: "Payouts Enabled At",
  bio: "Bio",
  website: "Website",
  youtube: "YouTube",
  twitter: "Twitter",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
};

// GET /api/partners/export – export partners to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
    const { programId } = searchParams;

    const { columns, ...filters } =
      partnersExportQuerySchema.parse(searchParams);

    console.log({ filters, columns });

    const partners = await getPartners({
      ...filters,
      page: 1,
      pageSize: 5000,
      workspaceId: workspace.id,
      programId,
    });

    // Define the response schema based on the columns
    const responseSchema = z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      country: z.string(),
      status: z.string(),
      createdAt: z.string(),
      payoutsEnabledAt: z.string(),
      bio: z.string(),
      website: z.string(),
      youtube: z.string(),
      twitter: z.string(),
      linkedin: z.string(),
      instagram: z.string(),
      tiktok: z.string(),
    });

    // console.log(partners);

    const csvData = "";

    return new Response(csvData, {
      headers: {
        "Content-Type": "application/csv",
        "Content-Disposition": `attachment; filename=links_export.csv`,
      },
    });
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "enterprise",
    ],
  },
);
