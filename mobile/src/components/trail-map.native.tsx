import { useEffect, useRef } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import { View } from "react-native";
import { kathmandu, type MapProps } from "./map-types";
export function TrailMap({
  hazards = [],
  location,
  route = [],
  selected,
  onSelect,
  height = 300,
}: MapProps) {
  const ref = useRef<MapView>(null),
    center = location || selected || kathmandu;
  const lat = center.lat,
    lng = center.lng;
  useEffect(() => {
    ref.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      600,
    );
  }, [lat, lng]);
  return (
    <View style={{ height, borderRadius: 16, overflow: "hidden" }}>
      <MapView
        ref={ref}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={(e) =>
          onSelect?.({
            lat: e.nativeEvent.coordinate.latitude,
            lng: e.nativeEvent.coordinate.longitude,
          })
        }
      >
        {hazards.map((h) => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.location.lat, longitude: h.location.lng }}
            title={h.category + " · " + h.severity}
            description={h.description}
            pinColor={h.severity === "high" ? "#B33432" : "#93620C"}
          />
        ))}
        {location && (
          <Marker
            coordinate={{ latitude: location.lat, longitude: location.lng }}
            title="Last known location"
            pinColor="#256B4D"
          />
        )}
        {selected && (
          <Marker
            coordinate={{ latitude: selected.lat, longitude: selected.lng }}
            title="Report location"
          />
        )}
        {route.length > 1 && (
          <Polyline
            coordinates={route.map((p) => ({
              latitude: p.lat,
              longitude: p.lng,
            }))}
            strokeColor="#256B4D"
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  );
}
