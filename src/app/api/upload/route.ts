import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Missing BLOB_READ_WRITE_TOKEN" },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Expected file field" }, { status: 400 });
  }

  const filename =
    (formData.get("filename") as string | null) ??
    `photobooth-${Date.now()}.png`;

  const blob = await put(filename, file, {
    access: "public",
    token,
    contentType: file.type || "image/png",
  });

  return NextResponse.json({ url: blob.url });
}
