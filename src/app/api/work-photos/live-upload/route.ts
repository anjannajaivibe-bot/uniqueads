import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getPasswordSessionAppUser } from "@/lib/auth/password-session";

export const runtime = "nodejs";

const FIELD_ROLES = new Set([
  "super_admin",
  "operations_manager",
  "supervisor",
]);

function storageClient() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("Storage environment is not configured.");
  }

  return new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function numberValue(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function POST(request: NextRequest) {
  const user = await getPasswordSessionAppUser();

  if (!user || !FIELD_ROLES.has(user.role)) {
    return NextResponse.json(
      { error: "Field access required." },
      { status: 403 }
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  const bucket = process.env.UNIQUEADS_WORK_PHOTO_BUCKET;

  if (!databaseUrl || !bucket) {
    return NextResponse.json(
      { error: "Database or storage is not configured." },
      { status: 500 }
    );
  }

  const form = await request.formData();
  const file = form.get("photo");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Live photo is required." },
      { status: 400 }
    );
  }

  if (file.type !== "image/jpeg") {
    return NextResponse.json(
      { error: "Live photo must be JPEG." },
      { status: 400 }
    );
  }

  if (file.size <= 0 || file.size > 3 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Live photo must be under 3 MB." },
      { status: 400 }
    );
  }

  const orderId = String(form.get("order_id") || "");
  const locationId = String(form.get("order_location_id") || "");
  const photoType = String(form.get("photo_type") || "");
  const note = String(form.get("note") || "").trim() || null;
  const markCompleted = String(form.get("mark_completed") || "") === "true";

  const latitude = numberValue(form.get("latitude"));
  const longitude = numberValue(form.get("longitude"));
  const gpsAccuracyM = numberValue(form.get("gps_accuracy_m"));
  const progressPercent = numberValue(form.get("progress_percent"));
  const requestedAreaSqft = numberValue(form.get("completed_area_sqft"));
  const deviceCapturedAtRaw = String(form.get("device_captured_at") || "");

  if (!orderId || !locationId) {
    return NextResponse.json(
      { error: "Order and work location are required." },
      { status: 400 }
    );
  }

  if (!["before", "during", "completed"].includes(photoType)) {
    return NextResponse.json(
      { error: "Invalid photo stage." },
      { status: 400 }
    );
  }

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(gpsAccuracyM) ||
    gpsAccuracyM <= 0
  ) {
    return NextResponse.json(
      { error: "A valid live GPS position is required." },
      { status: 400 }
    );
  }

  if (
    !Number.isFinite(progressPercent) ||
    progressPercent < 0 ||
    progressPercent > 100
  ) {
    return NextResponse.json(
      { error: "Progress must be between 0 and 100." },
      { status: 400 }
    );
  }

  const deviceCapturedAt = new Date(deviceCapturedAtRaw);
  if (Number.isNaN(deviceCapturedAt.getTime())) {
    return NextResponse.json(
      { error: "Capture timestamp is invalid." },
      { status: 400 }
    );
  }

  const captureAgeMs = Math.abs(Date.now() - deviceCapturedAt.getTime());
  if (captureAgeMs > 10 * 60 * 1000) {
    return NextResponse.json(
      {
        error:
          "This photo is not recent enough. Please capture a new live photo.",
      },
      { status: 400 }
    );
  }

  if (markCompleted && photoType !== "completed") {
    return NextResponse.json(
      {
        error:
          "Use the Completion photo stage before marking the location completed.",
      },
      { status: 400 }
    );
  }

  const sql = neon(databaseUrl);
  const locations = await sql`
    select
      ol.id,
      ol.order_id,
      ol.location_name,
      ol.area_sqft,
      ol.completed_area_sqft,
      o.order_no,
      o.campaign_name,
      (
        o.assigned_supervisor = ${user.id}::uuid
        OR (
          ${user.worker_id || null}::uuid IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.order_worker_assignments owa
            WHERE owa.order_id = o.id
              AND owa.worker_id = ${user.worker_id || null}::uuid
              AND (owa.order_location_id = ol.id OR owa.order_location_id IS NULL)
              AND owa.released_on IS NULL
          )
        )
      ) AS supervisor_access
    from public.order_locations ol
    join public.orders o on o.id = ol.order_id
    where ol.id = ${locationId}
      and ol.order_id = ${orderId}
      and ol.status NOT IN ('completed','cancelled')
      and o.status <> 'cancelled'
    limit 1
  `;

  if (!locations[0]) {
    return NextResponse.json(
      { error: "Work location was not found." },
      { status: 404 }
    );
  }

  if (user.role === "supervisor" && !locations[0].supervisor_access) {
    return NextResponse.json(
      { error: "This work location is not assigned to you." },
      { status: 403 }
    );
  }

  const allocatedSqft = Number(locations[0].area_sqft || 0);
  const alreadyCompleted = Number(locations[0].completed_area_sqft || 0);
  if (!Number.isFinite(requestedAreaSqft) || requestedAreaSqft < 0 ||
      (allocatedSqft > 0 && requestedAreaSqft > allocatedSqft)) {
    return NextResponse.json(
      { error: "Completed area must be between 0 and allocated square feet." },
      { status: 400 }
    );
  }
  if (allocatedSqft > 0 && photoType !== "completed" && requestedAreaSqft < alreadyCompleted) {
    return NextResponse.json(
      { error: "Work completed in sq.ft cannot decrease. Check the existing progress." },
      { status: 400 }
    );
  }
  const finalArea = photoType === "completed" ? allocatedSqft : requestedAreaSqft;

  const objectKey =
    `work-photos/${orderId}/${locationId}/` +
    `${Date.now()}-${crypto.randomUUID()}.jpg`;

  const bytes = Buffer.from(await file.arrayBuffer());

  const isJpeg =
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9;

  if (!isJpeg) {
    return NextResponse.json(
      { error: "Live photo data is not a valid JPEG image." },
      { status: 400 }
    );
  }

  await storageClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: bytes,
      ContentType: "image/jpeg",
      Metadata: {
        order_id: orderId,
        order_location_id: locationId,
        captured_by: String(user.username || user.full_name || user.id),
        capture_source: "camera_live",
      },
    })
  );

  const updateStatus =
    photoType === "completed"
      ? "quality_check"
      : photoType === "before"
        ? "started"
        : "in_progress";

  const finalProgress = photoType === "completed" ? 100
    : allocatedSqft > 0 ? Math.min(100, Math.round(finalArea / allocatedSqft * 100))
    : Math.round(progressPercent);

  // Site progress, update history and photo metadata commit in one DB statement.
  const inserted = await sql`
    WITH updated_site AS (
      UPDATE public.order_locations
      SET
        status = CASE
          WHEN ${photoType} = 'completed' THEN 'quality_check'
          WHEN status IN ('pending','assigned') THEN 'in_progress'
          ELSE status
        END,
        progress_percent = GREATEST(progress_percent, ${finalProgress}),
        completed_area_sqft = GREATEST(COALESCE(completed_area_sqft,0), ${allocatedSqft > 0 ? finalArea : 0}),
        completed_date = CASE WHEN ${photoType} = 'completed' THEN NULL ELSE completed_date END,
        updated_at = now()
      WHERE id = ${locationId}::uuid
        AND order_id = ${orderId}::uuid
        AND status NOT IN ('completed','cancelled')
      RETURNING id
    ),
    new_update AS (
      INSERT INTO public.work_updates (
        order_id, order_location_id, status, progress_percent,
        completed_area_sqft, update_text, latitude, longitude, recorded_at, created_by
      )
      SELECT ${orderId}::uuid, ${locationId}::uuid, ${updateStatus}, ${finalProgress},
        ${allocatedSqft > 0 ? finalArea : null}, ${note}, ${latitude}, ${longitude},
        now(), ${user.id}::uuid
      FROM updated_site
      RETURNING id
    ),
    new_photo AS (
      INSERT INTO public.work_photos (
        order_id,order_location_id,work_update_id,photo_type,completed_area_sqft,
        file_url,caption,latitude,longitude,captured_at,uploaded_by,gps_accuracy_m,
        device_captured_at,server_received_at,captured_by_username,capture_source,is_live_capture
      )
      SELECT ${orderId}::uuid,${locationId}::uuid,nu.id,${photoType},
        ${allocatedSqft > 0 ? finalArea : null},${`s3://${bucket}/${objectKey}`},
        ${note},${latitude},${longitude},${deviceCapturedAt.toISOString()},
        ${user.id}::uuid,${gpsAccuracyM},${deviceCapturedAt.toISOString()},
        now(),${String(user.username || user.full_name || user.id)},'camera_live',true
      FROM new_update nu
      RETURNING id,created_at
    )
    SELECT * FROM new_photo
  `;

  if (!inserted.length) {
    return NextResponse.json({error:"Work location changed during upload; please refresh."},{status:409});
  }

  return NextResponse.json({
    ok: true,
    photoId: inserted[0]?.id,
    serverReceivedAt: inserted[0]?.created_at,
    reviewStatus: photoType === "completed" ? "quality_check" : "in_progress",
    completedAreaSqft: allocatedSqft > 0 ? finalArea : null,
    location: locations[0],
  });
}
