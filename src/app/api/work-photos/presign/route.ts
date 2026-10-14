import { NextResponse } from "next/server";

export const runtime = "nodejs";

function disabled() {
  return NextResponse.json(
    {
      error:
        "Gallery/file uploads are disabled for work-progress proof. Use Live Photo Capture with camera, GPS and timestamp.",
      liveCapturePath: "/admin/work-progress/live-capture",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET() {
  return disabled();
}

export async function POST() {
  return disabled();
}

export async function PUT() {
  return disabled();
}

export async function PATCH() {
  return disabled();
}
