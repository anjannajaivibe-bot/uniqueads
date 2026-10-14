"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UploadState = "idle" | "uploading" | "success" | "error";

function fallbackContentType(name: string) {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  return "image/jpeg";
}

export function WorkPhotoUploader({
  orderId,
  locationId,
}: {
  orderId: string;
  locationId: string;
}) {
  const router = useRouter();
  const [photoType, setPhotoType] = useState("during");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsMessage, setGpsMessage] = useState("");
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsMessage("GPS is not available.");
      return;
    }

    setGpsMessage("Getting location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGpsMessage(
          `GPS captured · accuracy about ${Math.round(position.coords.accuracy)} m`
        );
      },
      (error) => {
        setGpsMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied."
            : "Could not capture GPS."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  }

  async function uploadPhotos() {
    if (files.length === 0) {
      setState("error");
      setMessage("Choose at least one photo.");
      return;
    }

    setState("uploading");
    setMessage(`Uploading 0 of ${files.length}...`);

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];

        if (file.size > 12 * 1024 * 1024) {
          throw new Error(`${file.name} is larger than 12 MB.`);
        }

        const presignResponse = await fetch("/api/work-photos/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            locationId,
            photoType,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type || fallbackContentType(file.name),
          }),
        });

        const presign = await presignResponse.json();
        if (!presignResponse.ok) {
          throw new Error(presign.error || "Could not prepare photo upload.");
        }

        const putResponse = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": presign.contentType,
          },
          body: file,
        });

        if (!putResponse.ok) {
          throw new Error(`Upload failed for ${file.name}.`);
        }

        const completeResponse = await fetch("/api/work-photos/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            locationId,
            photoType,
            objectKey: presign.objectKey,
            caption,
            latitude,
            longitude,
            capturedAt: new Date(
              file.lastModified || Date.now()
            ).toISOString(),
          }),
        });

        const complete = await completeResponse.json();
        if (!completeResponse.ok) {
          throw new Error(complete.error || "Could not save uploaded photo.");
        }

        setMessage(`Uploading ${index + 1} of ${files.length}...`);
      }

      setState("success");
      setMessage(`${files.length} photo${files.length === 1 ? "" : "s"} uploaded.`);
      setFiles([]);
      setCaption("");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Photo upload failed.");
    }
  }

  return (
    <div className="work-photo-uploader">
      <div className="form-grid">
        <label>
          <span>Photo Type *</span>
          <select value={photoType} onChange={(e) => setPhotoType(e.target.value)}>
            <option value="before">Before Work</option>
            <option value="during">During Work</option>
            <option value="completed">Completed Work</option>
            <option value="quality_issue">Quality Issue</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="full photo-file-field">
          <span>Site Photos *</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          <small>JPG, PNG, WebP, HEIC or HEIF. Maximum 12 MB per photo.</small>
        </label>

        <label className="full">
          <span>Caption</span>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Example: Wall priming completed, south-facing wall"
          />
        </label>

        <div className="gps-capture-box full">
          <span>Photo GPS</span>
          <button type="button" className="button button-secondary" onClick={captureGps}>
            Capture Current Location
          </button>
          <small>{gpsMessage || "Optional. Capture while physically at the site."}</small>
        </div>
      </div>

      <div className="photo-upload-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={uploadPhotos}
          disabled={state === "uploading"}
        >
          {state === "uploading" ? "Uploading..." : "Upload Photo Proof"}
        </button>
        {message ? (
          <span
            className={
              state === "error"
                ? "upload-message upload-error"
                : state === "success"
                  ? "upload-message upload-success"
                  : "upload-message"
            }
          >
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
