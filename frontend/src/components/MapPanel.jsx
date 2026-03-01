import { useMemo, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MapOverlay from "./MapOverlay.jsx";
import { fetchSchools } from "../api/client.js";

function FitBounds({ records }) {
  const map = useMap();
  const points = useMemo(() => {
    if (!records || records.length === 0) return [];
    return records
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => [r.latitude, r.longitude]);
  }, [records]);

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      const bounds = L.latLngBounds(points);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
      }
    }
  }, [map, points]);

  return null;
}

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function formatPopupDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function MapContent({ records, codeToName }) {
  const validRecords = useMemo(
    () => (records || []).filter((r) => r.latitude != null && r.longitude != null),
    [records]
  );
  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds records={records} />
      {validRecords.map((r) => {
        const schoolName = (r.School_Code != null && r.School_Code !== "")
          ? (codeToName[String(r.School_Code).trim()] || r.School_Code)
          : "";
        return (
          <Marker key={r.id ?? r.Number} position={[r.latitude, r.longitude]} icon={defaultIcon}>
            {schoolName && (
              <Tooltip direction="top" permanent={false}>
                {schoolName}
              </Tooltip>
            )}
            <Popup>
              <div className="text-sm space-y-1.5 min-w-[180px]">
                {r.Description != null && r.Description !== "" && (
                  <p><strong>{r.Description}</strong></p>
                )}
                <p><span className="text-neutral-500">Occurred Time:</span> {formatPopupDate(r.Occurred_From_Date_Time)}</p>
                <p><span className="text-neutral-500">Reported Time:</span> {formatPopupDate(r.Reported_Date_Time)}</p>
                {r.Location != null && r.Location !== "" && <p><span className="text-neutral-500">Location:</span> {r.Location}</p>}
                {r.Disposition != null && r.Disposition !== "" && <p><span className="text-neutral-500">Disposition:</span> {r.Disposition}</p>}
                {schoolName && <p><span className="text-neutral-500">School:</span> {schoolName}</p>}
                {r.Narrative != null && r.Narrative !== "" && (
                  <p className="text-xs text-neutral-500 line-clamp-3"><span className="text-neutral-500">Narrative:</span> {r.Narrative}</p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

let mapInstanceKey = 0;

export default function MapPanel({ records, summaryData }) {
  const [mounted, setMounted] = useState(false);
  const [containerKey] = useState(() => ++mapInstanceKey);
  const [codeToName, setCodeToName] = useState({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchSchools()
      .then((schools) => {
        const map = {};
        (schools || []).forEach((s) => {
          if (s.schoolCode) map[String(s.schoolCode).trim()] = s.schoolName || s.schoolCode;
        });
        setCodeToName(map);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 relative min-h-0 min-w-0">
      {mounted ? (
        <div key={containerKey} className="w-full h-full">
          <MapContainer
            center={[39.5, -98.5]}
            zoom={4}
            className="w-full h-full"
            style={{ minHeight: "100%" }}
          >
            <MapContent records={records} codeToName={codeToName} />
          </MapContainer>
        </div>
      ) : (
        <div className="w-full h-full bg-neutral-200 animate-pulse" />
      )}
      <MapOverlay summaryData={summaryData} />
    </div>
  );
}
