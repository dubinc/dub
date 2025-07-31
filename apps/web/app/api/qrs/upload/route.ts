// import { getIP } from "@/lib/api/utils";
// import { storage } from "@/lib/storage";
// import { ratelimit } from "@/lib/upstash";
// import { NextResponse } from "next/server";
//
// export async function POST(req: Request) {
//   try {
//     const { success } = await ratelimit(10, "1 m").limit(`upload:${getIP()}`);
//     if (!success) {
//       return new NextResponse("Too many requests", { status: 429 });
//     }
//
//     const formData = await req.formData();
//     const file = formData.get("file") as File;
//
//     if (!file) {
//       return new NextResponse("No file provided", { status: 400 });
//     }
//
//     const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
//     if (file.size > MAX_FILE_SIZE) {
//       return new NextResponse("File too large. Maximum size is 50MB", {
//         status: 400,
//       });
//     }
//
//     if (!file.type) {
//       return new NextResponse("Invalid file type", { status: 400 });
//     }
//
//     const fileId = crypto.randomUUID();
//
//     const fileData = await file.arrayBuffer();
//     if (!fileData || fileData.byteLength === 0) {
//       return new NextResponse("Empty file", { status: 400 });
//     }
//
//     const blob = new Blob([fileData], { type: file.type });
//
//     console.log("Uploading file:", {
//       fileId,
//       contentType: file.type,
//       size: file.size,
//       blobType: blob.type,
//       blobSize: blob.size,
//     });
//
//     const uploadResult = await storage.upload(`qrs-content/${fileId}`, blob, {
//       contentType: file.type,
//     });
//
//     console.log("Upload result:", uploadResult);
//
//     return NextResponse.json({ fileId });
//   } catch (error) {
//     console.error("Error uploading file:", error);
//     return new NextResponse(
//       error instanceof Error ? error.message : "Internal Server Error",
//       { status: 500 },
//     );
//   }
// }
