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

const PIN_WIDTH = 28;
const PIN_HEIGHT = 42;
const LOGO_SIZE = 18;
const DEFAULT_PRIMARY = "#374151";
const DEFAULT_SECONDARY = "#6b7280";

/** Teardrop pin SVG path (ball on top, point at bottom); viewBox 0 0 28 42, tip at (14,42). */
const PIN_PATH = "M14 0 C22 0 28 6 28 14 C28 22 14 42 14 42 C14 42 0 22 0 14 C0 6 6 0 14 0 Z";

/** Create a Leaflet divIcon: teardrop pin (primary + secondary) with school logo in the ball. */
function createSchoolIcon(school) {
  const primary = school?.primaryColor || DEFAULT_PRIMARY;
  const secondary = school?.secondaryColor || DEFAULT_SECONDARY;
  const logoUrl = school?.logo || null;
  const name = school?.schoolName || school?.schoolCode || "";
  const initial = name ? name.trim().charAt(0).toUpperCase() : "?";
  const stroke = secondary || "rgba(255,255,255,0.8)";

  const escapedLogo = logoUrl ? logoUrl.replace(/"/g, "&quot;") : "";
  const logoOrInitial = logoUrl
    ? `<img src="${escapedLogo}" alt="" style="width:${LOGO_SIZE}px;height:${LOGO_SIZE}px;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><span style="display:none;color:white;font-weight:700;font-size:11px;">${initial}</span>`
    : `<span style="color:white;font-weight:700;font-size:11px;">${initial}</span>`;

  const html = `
    <div class="school-pin-outer" style="position:relative;width:${PIN_WIDTH}px;height:${PIN_HEIGHT}px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 28 42" style="display:block;">
        <path d="${PIN_PATH}" fill="${primary}" stroke="${stroke}" stroke-width="1.5"/>
      </svg>
      <div style="position:absolute;top:3px;left:50%;transform:translateX(-50%);width:${LOGO_SIZE}px;height:${LOGO_SIZE}px;border-radius:50%;background:${primary};border:1px solid ${stroke};display:flex;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box;">
        ${logoOrInitial}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "school-pin-wrapper",
    iconSize: [PIN_WIDTH, PIN_HEIGHT],
    iconAnchor: [PIN_WIDTH / 2, PIN_HEIGHT],
  });
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

function MapContent({ records, schoolByCode }) {
  const validRecords = useMemo(
    () => (records || []).filter((r) => r.latitude != null && r.longitude != null),
    [records]
  );
  const iconCache = useMemo(() => new Map(), []);
  const getIcon = (schoolCode) => {
    const code = schoolCode != null ? String(schoolCode).trim() : "";
    if (!code) return defaultIcon;
    const school = schoolByCode[code];
    // Only cache when we have school data; otherwise we'd cache the default icon and never show logo/colors after schools load
    if (school && !iconCache.has(code)) {
      iconCache.set(code, createSchoolIcon(school));
    }
    return school && iconCache.has(code) ? iconCache.get(code) : createSchoolIcon(school);
  };

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds records={records} />
      {validRecords.map((r) => {
        const code = r.School_Code != null ? String(r.School_Code).trim() : "";
        const school = code ? schoolByCode[code] : null;
        const schoolName = school?.schoolName || (code ? r.School_Code : "");
        const icon = getIcon(r.School_Code);
        const primaryColor = school?.primaryColor || DEFAULT_PRIMARY;
        const logoUrl = school?.logo || null;

        return (
          <Marker key={r.id ?? r.Number} position={[r.latitude, r.longitude]} icon={icon}>
            {schoolName && (
              <Tooltip direction="top" permanent={false}>
                {schoolName}
              </Tooltip>
            )}
            <Popup>
              <div className="min-w-[200px] text-sm">
                {schoolName && (
                  <div
                    className="rounded-t-lg -mt-2 -mx-3 mb-2 pl-3 pr-10 py-2 flex items-center gap-2"
                    style={{ background: primaryColor, color: "white", marginBottom: 8 }}
                  >
                    {logoUrl && (
                      <img src={logoUrl} alt="" className="w-8 h-8 object-contain rounded flex-shrink-0" />
                    )}
                    <span className="font-semibold truncate">{schoolName}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  {r.Description != null && r.Description !== "" && (
                    <p><strong>{r.Description}</strong></p>
                  )}
                  <p><span className="text-neutral-500">Occurred:</span> {formatPopupDate(r.Occurred_From_Date_Time)}</p>
                  <p><span className="text-neutral-500">Reported:</span> {formatPopupDate(r.Reported_Date_Time)}</p>
                  {r.Location != null && r.Location !== "" && <p><span className="text-neutral-500">Location:</span> {r.Location}</p>}
                  {r.Disposition != null && r.Disposition !== "" && <p><span className="text-neutral-500">Disposition:</span> {r.Disposition}</p>}
                  {r.Narrative != null && r.Narrative !== "" && (
                    <p className="text-xs text-neutral-500 line-clamp-3"><span className="text-neutral-500">Narrative:</span> {r.Narrative}</p>
                  )}
                </div>
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
  const [schoolByCode, setSchoolByCode] = useState({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchSchools()
      .then((schools) => {
        const map = {};
        (schools || []).forEach((s) => {
          if (s.schoolCode) {
            const code = String(s.schoolCode).trim();
            const entry = {
              schoolName: s.schoolName || s.schoolCode,
              schoolCode: s.schoolCode,
              primaryColor: s.primaryColor || null,
              secondaryColor: s.secondaryColor || null,
              logo: s.logo || null,
            };
            map[code] = entry;
            // Also key by 6-digit zero-padded form so "1775" and "001775" both resolve (e.g. IPEDS codes)
            if (/^\d+$/.test(code)) {
              map[code.padStart(6, "0")] = entry;
            }
          }
        });
        setSchoolByCode(map);
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
            <MapContent records={records} schoolByCode={schoolByCode} />
          </MapContainer>
        </div>
      ) : (
        <div className="w-full h-full bg-neutral-200 animate-pulse" />
      )}
      <MapOverlay summaryData={summaryData} />
    </div>
  );
}
