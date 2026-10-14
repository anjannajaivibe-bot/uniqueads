"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type WorkLocation = {
  id: string;
  order_id: string;
  order_no: string;
  campaign_name: string;
  location_name: string;
  city: string | null;
  district: string | null;
  state: string | null;
  progress_percent: number;
  status: string;
};

type PositionData = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export function LiveCaptureClient({
  locations,
  username,
}: {
  locations: WorkLocation[];
  username: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [selectedLocationId, setSelectedLocationId] = useState(
    locations[0]?.id || ""
  );
  const [photoType, setPhotoType] = useState("during");
  const [progress, setProgress] = useState(
    locations[0]?.progress_percent || 0
  );
  const [note, setNote] = useState("");
  const [position, setPosition] = useState<PositionData | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [markCompleted, setMarkCompleted] = useState(false);

  const selectedLocation = useMemo(
    () => locations.find((item) => item.id === selectedLocationId),
    [locations, selectedLocationId]
  );

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function requestLocation() {
    setStatus("Getting live GPS location...");

    const nextPosition = await new Promise<PositionData>(
      (resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation is not supported on this device."));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (result) =>
            resolve({
              latitude: result.coords.latitude,
              longitude: result.coords.longitude,
              accuracy: result.coords.accuracy,
            }),
          (error) => reject(new Error(error.message)),
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
          }
        );
      }
    );

    setPosition(nextPosition);
    return nextPosition;
  }

  async function startCamera() {
    setStatus("");
    setCapturedBlob(null);
    setCapturedAt(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Live camera is not supported in this browser.");
      return;
    }

    try {
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        }),
        requestLocation(),
      ]);

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
      setStatus("Camera and live GPS are ready.");
    } catch (error) {
      setCameraReady(false);
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to start camera or GPS."
      );
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;

    if (!video || !cameraReady || !position || !selectedLocation) {
      setStatus("Camera, GPS and work location are required.");
      return;
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    if (!sourceWidth || !sourceHeight) {
      setStatus("Camera is not ready yet.");
      return;
    }

    const maxWidth = 1600;
    const scale = Math.min(1, maxWidth / sourceWidth);
    const width = Math.round(sourceWidth * scale);
    const height = Math.round(sourceHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setStatus("Unable to prepare the photo.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const captured = new Date();
    const lines = [
      "Unique Ads - LIVE WORK PHOTO",
      `${selectedLocation.order_no} | ${selectedLocation.location_name}`,
      `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)} | ±${Math.round(position.accuracy)} m`,
      `${captured.toLocaleString("en-IN")} | By: ${username}`,
    ];

    const fontSize = Math.max(18, Math.round(width * 0.017));
    const lineHeight = Math.round(fontSize * 1.35);
    const padding = Math.round(fontSize * 0.8);
    const boxHeight = lineHeight * lines.length + padding * 2;

    context.fillStyle = "rgba(0,0,0,.68)";
    context.fillRect(0, height - boxHeight, width, boxHeight);
    context.font = `700 ${fontSize}px Arial, sans-serif`;
    context.fillStyle = "white";
    context.textBaseline = "top";

    lines.forEach((line, index) => {
      context.fillText(
        line,
        padding,
        height - boxHeight + padding + index * lineHeight
      );
    });

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.78)
    );

    if (!blob) {
      setStatus("Unable to capture the photo.");
      return;
    }

    if (blob.size > 3 * 1024 * 1024) {
      setStatus("Captured photo is too large. Please capture again.");
      return;
    }

    const iso = captured.toISOString();
    const url = URL.createObjectURL(blob);

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setCapturedBlob(blob);
    setCapturedAt(iso);
    setPreviewUrl(url);
    setStatus("Live photo captured with GPS and timestamp.");

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  async function submitPhoto() {
    if (
      !capturedBlob ||
      !capturedAt ||
      !position ||
      !selectedLocation
    ) {
      setStatus("Capture a fresh live photo before submitting.");
      return;
    }

    if (photoType === "completed" && progress !== 100) {
      setProgress(100);
    }

    setBusy(true);
    setStatus("Uploading live photo...");

    try {
      const form = new FormData();
      form.append("photo", capturedBlob, "live-work-photo.jpg");
      form.append("order_id", selectedLocation.order_id);
      form.append("order_location_id", selectedLocation.id);
      form.append("photo_type", photoType);
      form.append("latitude", String(position.latitude));
      form.append("longitude", String(position.longitude));
      form.append("gps_accuracy_m", String(position.accuracy));
      form.append("device_captured_at", capturedAt);
      form.append(
        "progress_percent",
        String(photoType === "completed" ? 100 : progress)
      );
      form.append("note", note);
      form.append(
        "mark_completed",
        String(photoType === "completed" && markCompleted)
      );

      const response = await fetch("/api/work-photos/live-upload", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed.");
      }

      setStatus(
        photoType === "completed" && markCompleted
          ? "Live completion photo saved and location marked completed."
          : "Live work-progress photo saved successfully."
      );

      setCapturedBlob(null);
      setCapturedAt(null);
      setNote("");

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to upload photo."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!locations.length) {
    return (
      <div
        style={{
          padding: 20,
          background: "white",
          border: "1px solid #e1e6ee",
          borderRadius: 12,
        }}
      >
        No active work locations are available.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          background: "white",
          border: "1px solid #e1e6ee",
          borderRadius: 14,
          padding: 18,
          display: "grid",
          gap: 14,
        }}
      >
        <label>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            Work Location
          </div>
          <select
            value={selectedLocationId}
            onChange={(event) => {
              const nextId = event.target.value;
              setSelectedLocationId(nextId);
              const next = locations.find((item) => item.id === nextId);
              setProgress(next?.progress_percent || 0);
              setCapturedBlob(null);
              setCapturedAt(null);
              setPosition(null);
            }}
            style={{ width: "100%", minHeight: 42 }}
          >
            {locations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.order_no} - {item.location_name}
              </option>
            ))}
          </select>
        </label>

        {selectedLocation ? (
          <div
            style={{
              padding: 12,
              background: "#f7f9fc",
              borderRadius: 10,
            }}
          >
            <strong>{selectedLocation.campaign_name}</strong>
            <div>
              {[
                selectedLocation.location_name,
                selectedLocation.city,
                selectedLocation.district,
                selectedLocation.state,
              ]
                .filter(Boolean)
                .join(", ")}
            </div>
            <div>
              Current progress: {selectedLocation.progress_percent}% |
              Status: {selectedLocation.status}
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
            gap: 12,
          }}
        >
          <label>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              Photo Stage
            </div>
            <select
              value={photoType}
              onChange={(event) => {
                const value = event.target.value;
                setPhotoType(value);
                if (value === "completed") setProgress(100);
                if (value !== "completed") setMarkCompleted(false);
              }}
              style={{ width: "100%", minHeight: 42 }}
            >
              <option value="before">Before Work</option>
              <option value="during">During Work</option>
              <option value="completed">Completion</option>
            </select>
          </label>

          <label>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              Progress %
            </div>
            <input
              type="number"
              min={0}
              max={100}
              value={photoType === "completed" ? 100 : progress}
              disabled={photoType === "completed"}
              onChange={(event) =>
                setProgress(Number(event.target.value))
              }
              style={{ width: "100%", minHeight: 38 }}
            />
          </label>
        </div>

        <label>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            Work Note
          </div>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="What work was completed at this stage?"
            style={{ width: "100%" }}
          />
        </label>

        {photoType === "completed" ? (
          <label style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={markCompleted}
              onChange={(event) =>
                setMarkCompleted(event.target.checked)
              }
            />
            Mark this work location completed after the live photo is saved
          </label>
        ) : null}
      </section>

      <section
        style={{
          background: "#071c3b",
          color: "white",
          borderRadius: 14,
          padding: 18,
          display: "grid",
          gap: 14,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Live Camera + GPS</h2>
          <p style={{ margin: "5px 0 0", opacity: 0.78 }}>
            Gallery upload is not used. The photo is captured directly
            from the live camera feed.
          </p>
        </div>

        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: "100%",
            maxHeight: 520,
            objectFit: "contain",
            background: "#000",
            borderRadius: 12,
          }}
        />

        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Captured live work proof"
            style={{
              width: "100%",
              maxHeight: 520,
              objectFit: "contain",
              background: "#000",
              borderRadius: 12,
            }}
          />
        ) : null}

        {position ? (
          <div
            style={{
              padding: 11,
              background: "rgba(255,255,255,.08)",
              borderRadius: 10,
              fontSize: 13,
            }}
          >
            GPS: {position.latitude.toFixed(6)},{" "}
            {position.longitude.toFixed(6)} | Accuracy ±
            {Math.round(position.accuracy)} m
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button
            type="button"
            onClick={startCamera}
            disabled={busy}
            style={{
              padding: "11px 16px",
              borderRadius: 9,
              border: "1px solid rgba(255,255,255,.25)",
              background: "white",
              color: "#071c3b",
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            Start Live Camera
          </button>

          <button
            type="button"
            onClick={capturePhoto}
            disabled={!cameraReady || !position || busy}
            style={{
              padding: "11px 16px",
              borderRadius: 9,
              border: 0,
              background: "#f47b20",
              color: "white",
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            Capture Live Photo
          </button>

          <button
            type="button"
            onClick={submitPhoto}
            disabled={!capturedBlob || busy}
            style={{
              padding: "11px 16px",
              borderRadius: 9,
              border: 0,
              background: capturedBlob ? "#16a34a" : "#667085",
              color: "white",
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            {busy ? "Saving..." : "Save Work Progress"}
          </button>
        </div>

        {status ? (
          <div
            style={{
              padding: 11,
              borderRadius: 9,
              background: "rgba(255,255,255,.08)",
            }}
          >
            {status}
          </div>
        ) : null}
      </section>
    </div>
  );
}
