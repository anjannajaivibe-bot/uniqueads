import { ImageResponse } from "next/og";

export const runtime = "nodejs";

// Resize the existing approved Unique Ads logo for installable-app icons.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: requestedSize } = await params;
  const size = Number(requestedSize);

  if (size !== 192 && size !== 512) {
    return new Response("Not found", { status: 404 });
  }

  const logoResponse = await fetch(new URL("/unique-ads-logo.png", request.url));
  if (!logoResponse.ok) {
    return new Response("App icon unavailable", { status: 503 });
  }
  const logoData = Buffer.from(await logoResponse.arrayBuffer()).toString("base64");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#ffffff",
          padding: size * 0.075,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <img
          src={"data:image/png;base64," + logoData}
          alt=""
          width={size * 0.85}
          height={size * 0.85}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=86400" },
    }
  );
}
