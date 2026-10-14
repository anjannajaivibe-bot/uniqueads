"use client";

import { useState } from "react";
import { addWorkUpdate } from "@/app/admin/work-progress/actions";

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
          <span>Work Status *</span>
          <select name="status" defaultValue="in_progress" required>
            <option value="started">Started</option>
            <option value="in_progress">In Progress</option>
            <option value="paused">Paused</option>
            <option value="quality_check">Quality Check</option>
            <option value="issue">Issue / Blocked</option>
          </select>
        </label>

        <label>
          <span>Progress %</span>
          <input
            name="progress_percent"
            type="number"
            min="0"
            max="99"
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
          <small>{gpsMessage || "Optional for interim updates. Completion proof must use Live Capture."}</small>
        </div>

        <label className="full">
          <span>Progress Update / Site Notes</span>
          <textarea
            name="update_text"
            rows={4}
            placeholder="Work completed today, material issues, customer feedback, next action..."
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="button button-primary">
          Save Interim Update
        </button>
      </div>
    </form>
  );
}
