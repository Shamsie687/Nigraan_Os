/**
 * CivicMap — Web implementation
 *
 * Uses react-leaflet with OpenStreetMap tiles.
 * Free, no API key required.
 *
 * Leaflet CSS is loaded via a <link> tag injected at mount time.
 */

import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { colors } from '../design/tokens/colors';
import type { CivicMapProps, CivicMapMarker, CivicMapCoords } from './CivicMap.types';
import { DEFAULT_REGION } from './CivicMap.types';

// Fix Leaflet's default icon paths (broken in bundled environments)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '',
  iconUrl: '',
  shadowUrl: '',
});

/** Inject Leaflet CSS once at mount time. */
function useLeafletCss() {
  useEffect(() => {
    const id = 'leaflet-css';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);
}

/** Inner component that reacts to selectedMarkerId changes. */
function MapFocusController({
  markers,
  selectedMarkerId,
}: {
  markers: CivicMapMarker[];
  selectedMarkerId: string | null;
}) {
  const map = useMap();
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (selectedMarkerId && selectedMarkerId !== prevId.current) {
      const marker = markers.find((m) => m.id === selectedMarkerId);
      if (marker) {
        map.flyTo([marker.latitude, marker.longitude], 15, { duration: 0.5 });
      }
    }
    prevId.current = selectedMarkerId;
  }, [selectedMarkerId, markers, map]);

  return null;
}

/**
 * Inner component that handles map clicks: in location-picker mode it
 * reports the tapped coordinates; otherwise it deselects the marker.
 */
function MapClickHandler({
  onDeselect,
  onLocationPick,
}: {
  onDeselect: () => void;
  onLocationPick?: (coords: CivicMapCoords) => void;
}) {
  useMapEvents({
    click: (event) => {
      if (onLocationPick) {
        onLocationPick({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
        return;
      }
      onDeselect();
    },
  });
  return null;
}

export function CivicMap({
  markers,
  selectedMarkerId,
  onMarkerSelect,
  region,
  onLocationPick,
  pickedLocation,
}: CivicMapProps) {
  useLeafletCss();

  const center: [number, number] = region
    ? [region.latitude, region.longitude]
    : [DEFAULT_REGION.latitude, DEFAULT_REGION.longitude];

  const zoom = region
    ? Math.round(Math.log2(360 / Math.max(region.latitudeDelta, region.longitudeDelta)))
    : 12;

  const handleMarkerClick = useCallback(
    (marker: CivicMapMarker) => {
      onMarkerSelect(marker);
    },
    [onMarkerSelect],
  );

  const handleMapClick = useCallback(() => {
    onMarkerSelect(null);
  }, [onMarkerSelect]);

  return (
    <View style={styles.container}>
      <div style={{ flex: 1, width: '100%', height: '100%' }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ width: '100%', height: '100%' }}
          zoomControl
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFocusController markers={markers} selectedMarkerId={selectedMarkerId} />
          <MapClickHandler onDeselect={handleMapClick} onLocationPick={onLocationPick} />
          {markers.map((m) => {
            const isSelected = m.id === selectedMarkerId;
            return (
              <CircleMarker
                key={m.id}
                center={[m.latitude, m.longitude]}
                radius={isSelected ? 10 : 7}
                pathOptions={{
                  color: m.color,
                  fillColor: m.color,
                  fillOpacity: isSelected ? 0.9 : 0.7,
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => handleMarkerClick(m),
                }}
              >
                <Popup>
                  <strong>{m.title}</strong>
                  <br />
                  <span style={{ textTransform: 'capitalize' }}>{m.category.replace('_', ' ')}</span>
                </Popup>
              </CircleMarker>
            );
          })}
          {/* Picked location pin (location-picker mode) */}
          {pickedLocation ? (
            <CircleMarker
              center={[pickedLocation.latitude, pickedLocation.longitude]}
              radius={9}
              pathOptions={{
                color: '#FFFFFF',
                fillColor: colors.primary,
                fillOpacity: 1,
                weight: 3,
              }}
            />
          ) : null}
        </MapContainer>
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
