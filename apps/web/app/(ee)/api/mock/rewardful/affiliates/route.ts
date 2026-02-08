import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const affiliates = [
    {
      id: "d0ed8392-8880-4f39-8715-60230f9eceab",
      created_at: "2023-05-09T16:18:59.920Z",
      updated_at: "2023-05-09T16:25:42.614Z",
      first_name: "Adam",
      last_name: "Jones",
      email: "adam.jones@example.com",
      state: "active",
      visitors: 100,
      leads: 42,
      conversions: 18,
      links: [
        {
          id: "eb844960-6c42-4a3b-8009-f588a42d8506",
          url: "http://www.example.com/?via=adam",
          token: "ref1",
          visitors: 100,
          leads: 42,
          conversions: 18,
        },
      ],
    },
    {
      id: "f7c91234-5678-4a3b-9012-34567890abcd",
      created_at: "2023-06-15T10:30:00.000Z",
      updated_at: "2023-06-15T10:35:00.000Z",
      first_name: "Sarah",
      last_name: "Smith",
      email: "sarah.smith@example.com",
      state: "active",
      visitors: 250,
      leads: 85,
      conversions: 30,
      links: [
        {
          id: "cd123456-7890-4def-b123-456789abcdef",
          url: "http://www.example.com/?via=sarah",
          token: "ref2",
          visitors: 250,
          leads: 85,
          conversions: 30,
        },
      ],
    },
    {
      id: "a1b2c3d4-5678-4e5f-6g7h-8i9j0k1l2m3n",
      created_at: "2023-07-20T14:45:00.000Z",
      updated_at: "2023-07-20T14:50:00.000Z",
      first_name: "Michael",
      last_name: "Brown",
      email: "michael.brown@example.com",
      state: "active",
      visitors: 150,
      leads: 35,
      conversions: 12,
      links: [
        {
          id: "ef123456-7890-4abc-def1-23456789abcd",
          url: "http://www.example.com/?via=michael",
          token: "ref3",
          visitors: 150,
          leads: 35,
          conversions: 12,
        },
      ],
    },
    {
      id: "b2c3d4e5-6f7g-8h9i-j0k1-l2m3n4o5p6q7",
      created_at: "2023-08-05T09:15:00.000Z",
      updated_at: "2023-08-05T09:20:00.000Z",
      first_name: "Emily",
      last_name: "Davis",
      email: "emily.davis@example.com",
      state: "active",
      visitors: 300,
      leads: 120,
      conversions: 45,
      links: [
        {
          id: "gh123456-7890-4ijk-lmno-pqrstuvwxyz1",
          url: "http://www.example.com/?via=emily",
          token: "ref4",
          visitors: 300,
          leads: 120,
          conversions: 45,
        },
      ],
    },
    {
      id: "c3d4e5f6-7g8h-9i0j-k1l2-m3n4o5p6q7r8",
      created_at: "2023-09-10T11:20:00.000Z",
      updated_at: "2023-09-10T11:25:00.000Z",
      first_name: "David",
      last_name: "Wilson",
      email: "david.wilson@example.com",
      state: "active",
      visitors: 180,
      leads: 60,
      conversions: 25,
      links: [
        {
          id: "ij123456-7890-4klm-nopq-rstuvwxyz123",
          url: "http://www.example.com/?via=david",
          token: "ref5",
          visitors: 180,
          leads: 60,
          conversions: 25,
        },
      ],
    },
    {
      id: "d4e5f6g7-8h9i-0j1k-l2m3-n4o5p6q7r8s9",
      created_at: "2023-10-15T13:40:00.000Z",
      updated_at: "2023-10-15T13:45:00.000Z",
      first_name: "Lisa",
      last_name: "Taylor",
      email: "lisa.taylor@example.com",
      state: "active",
      visitors: 220,
      leads: 75,
      conversions: 28,
      links: [
        {
          id: "kl123456-7890-4mno-pqrs-tuvwxyz12345",
          url: "http://www.example.com/?via=lisa",
          token: "ref6",
          visitors: 220,
          leads: 75,
          conversions: 28,
        },
      ],
    },
    {
      id: "e5f6g7h8-9i0j-1k2l-m3n4-o5p6q7r8s9t0",
      created_at: "2023-11-20T15:55:00.000Z",
      updated_at: "2023-11-20T16:00:00.000Z",
      first_name: "James",
      last_name: "Anderson",
      email: "james.anderson@example.com",
      state: "active",
      visitors: 90,
      leads: 20,
      conversions: 8,
      links: [
        {
          id: "mn123456-7890-4opq-rstu-vwxyz123456",
          url: "http://www.example.com/?via=james",
          token: "ref7",
          visitors: 90,
          leads: 20,
          conversions: 8,
        },
      ],
    },
    {
      id: "f6g7h8i9-0j1k-2l3m-n4o5-p6q7r8s9t0u1",
      created_at: "2023-12-25T08:10:00.000Z",
      updated_at: "2023-12-25T08:15:00.000Z",
      first_name: "Emma",
      last_name: "Martinez",
      email: "emma.martinez@example.com",
      state: "active",
      visitors: 280,
      leads: 95,
      conversions: 40,
      links: [
        {
          id: "op123456-7890-4qrs-tuv-wxyz1234567",
          url: "http://www.example.com/?via=emma",
          token: "ref8",
          visitors: 280,
          leads: 95,
          conversions: 40,
        },
      ],
    },
    {
      id: "g7h8i9j0-1k2l-3m4n-o5p6-q7r8s9t0u1v2",
      created_at: "2024-01-05T12:30:00.000Z",
      updated_at: "2024-01-05T12:35:00.000Z",
      first_name: "Robert",
      last_name: "Garcia",
      email: "robert.garcia@example.com",
      state: "active",
      visitors: 160,
      leads: 55,
      conversions: 22,
      links: [
        {
          id: "qr123456-7890-4stu-vwxy-z123456789",
          url: "http://www.example.com/?via=robert",
          token: "ref9",
          visitors: 160,
          leads: 55,
          conversions: 22,
        },
      ],
    },
    {
      id: "h8i9j0k1-2l3m-4n5o-p6q7-r8s9t0u1v2w3",
      created_at: "2024-02-10T16:50:00.000Z",
      updated_at: "2024-02-10T16:55:00.000Z",
      first_name: "Olivia",
      last_name: "Lee",
      email: "olivia.lee@example.com",
      state: "active",
      visitors: 200,
      leads: 70,
      conversions: 32,
      links: [
        {
          id: "st123456-7890-4uvw-xyz1-234567890ab",
          url: "http://www.example.com/?via=olivia",
          token: "ref10",
          visitors: 200,
          leads: 70,
          conversions: 32,
        },
      ],
    },
  ];

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedAffiliates = affiliates.slice(startIndex, endIndex);

  return NextResponse.json({
    data: paginatedAffiliates,
  });
}
