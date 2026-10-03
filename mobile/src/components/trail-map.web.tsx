import { useEffect, useState } from "react";
import type * as ReactLeaflet from "react-leaflet";
import { kathmandu, type MapProps } from "./map-types";
type Library = typeof ReactLeaflet;
export function TrailMap(props: MapProps) {
  const [library, setLibrary] = useState<Library | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    import("react-leaflet")
      .then((value) => {
        if (alive) setLibrary(value);
      })
      .catch(() => setError("Map could not load. Refresh to retry."));
    return () => {
      alive = false;
    };
  }, []);
  if (!library)
    return (
      <div
        style={{
          height: props.height || 300,
          display: "grid",
          placeItems: "center",
          background: "#E8F0E5",
          borderRadius: 16,
        }}
      >
        {error || "Loading map…"}
      </div>
    );
  return <BrowserMap {...props} library={library} />;
}
function BrowserMap({
  library: L,
  hazards = [],
  location,
  route = [],
  selected,
  onSelect,
  height = 300,
}: MapProps & { library: Library }) {
  const center = location || selected || kathmandu;
  return (
    <div className="trail-map" style={{ height }}>
      <L.MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <L.TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapEvents
          library={L}
          location={location || selected}
          onSelect={onSelect}
        />
        {hazards.map((h) => (
          <L.CircleMarker
            key={h.id}
            center={[h.location.lat, h.location.lng]}
            radius={9}
            pathOptions={{
              color: h.severity === "high" ? "#B33432" : "#93620C",
              fillOpacity: 0.8,
            }}
          >
            <L.Popup>
              <strong>
                {h.category} · {h.severity}
              </strong>
              <p>{h.description}</p>
            </L.Popup>
          </L.CircleMarker>
        ))}
        {location && (
          <L.CircleMarker
            center={[location.lat, location.lng]}
            radius={10}
            pathOptions={{ color: "#256B4D", fillOpacity: 0.9 }}
          >
            <L.Popup>Last known location</L.Popup>
          </L.CircleMarker>
        )}
        {selected && (
          <L.CircleMarker
            center={[selected.lat, selected.lng]}
            radius={9}
            pathOptions={{ color: "#3157A2", fillOpacity: 0.7 }}
          />
        )}
        {route.length > 1 && (
          <L.Polyline
            positions={route.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: "#256B4D", weight: 4 }}
          />
        )}
      </L.MapContainer>
    </div>
  );
}
function MapEvents({
  library: L,
  location,
  onSelect,
}: Pick<MapProps, "location" | "onSelect"> & { library: Library }) {
  const map = L.useMapEvents({
    click: (e) => onSelect?.({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  const lat = location?.lat,
    lng = location?.lng;
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) map.panTo([lat, lng]);
  }, [map, lat, lng]);
  return null;
}
