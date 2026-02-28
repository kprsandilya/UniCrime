import { useMemo, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MapOverlay from "./MapOverlay.jsx";

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

function MapContent({ records }) {
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
      {validRecords.map((r) => (
        <Marker key={r.Number} position={[r.latitude, r.longitude]} icon={defaultIcon}>
          <Popup>
            <div className="text-sm">
              <p><strong>{r.Number}</strong></p>
              <p>{r.Location}</p>
              <p>{r.Description} – {r.Disposition}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

let mapInstanceKey = 0;

export default function MapPanel({ records, summaryData }) {
  const [mounted, setMounted] = useState(false);
  const [containerKey] = useState(() => ++mapInstanceKey);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex-1 relative min-h-0 min-w-0">
      {mounted ? (
        <div key={containerKey} className="w-full h-full">
          <MapContainer
            center={[40.4406, -79.9959]}
            zoom={14}
            className="w-full h-full"
            style={{ minHeight: "100%" }}
          >
            <MapContent records={records} />
          </MapContainer>
        </div>
      ) : (
        <div className="w-full h-full bg-neutral-200 animate-pulse" />
      )}
      <MapOverlay summaryData={summaryData} />
    </div>
  );
}
