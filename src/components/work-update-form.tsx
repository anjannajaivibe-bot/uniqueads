"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { addWorkUpdate } from "@/app/admin/work-progress/actions";

function SaveUpdateButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="button button-primary" aria-live="polite">
    {pending ? "Saving your update..." : "Save Update"}
  </button>;
}

export function WorkUpdateForm({
  locationId,
  currentProgress,
  clientApproved,
}: {
  locationId: string;
  currentProgress: number;
  clientApproved: boolean;
}) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [gpsMessage, setGpsMessage] = useState("");

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsMessage("GPS is not available on this device.");
      return;
    }

    setGpsMessage("Getting location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setGpsMessage(
          `Location captured · accuracy about ${Math.round(position.coords.accuracy)} m`
        );
      },
      (error) => {
        setGpsMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied."
            : "Could not capture the current location."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  }

  return (
    <form action={addWorkUpdate}>
      <input type="hidden" name="location_id" value={locationId} />
      <input type="hidden" name="latitude" value={latitude} />
      <input type="hidden" name="longitude" value={longitude} />

      <div className="form-grid">
        <label>
          <span>1. What is happening?</span>
          <select name="status" defaultValue="in_progress" required>
            <option value="started">Work Started</option>
            <option value="in_progress">Work Going On</option>
            <option value="paused">Work Paused</option>
            <option value="quality_check">Ready for Checking</option>
            <option value="issue">Problem at Site</option>
          </select>
        </label>

        <label>
          <span>2. How much work is done? (%)</span>
          <input
            name="progress_percent"
            type="number"
            min="0"
            max="100"
            step="1"
            defaultValue={currentProgress}
          />
        </label>

        <label>
          <span>Client Approved</span>
          <select
            name="client_approved"
            defaultValue={clientApproved ? "true" : "false"}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>

        <div className="gps-capture-box">
          <span>GPS Proof</span>
          <button type="button" className="button button-secondary" onClick={captureGps}>
            Capture Current Location
          </button>
          <small>{gpsMessage || "Optional for progress updates. Completion proof must use Live Photo Capture."}</small>
        </div>

        <label className="full">
          <span>3. Notes (optional)</span>
          <textarea
            name="update_text"
            rows={4}
            placeholder="Write a short note, if needed"
          />
        </label>
      </div>

      <div className="form-actions">
        <a href="/admin/work-progress/live-capture" className="button button-secondary">
          Complete with Live Photo
        </a>
        <SaveUpdateButton />
      </div>
    </form>
  );
}
