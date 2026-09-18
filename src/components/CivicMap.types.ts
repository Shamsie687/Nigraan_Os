/**
 * CivicMap — Shared types for the platform-specific map components.
 *
 * Native (Android/iOS): Leaflet + OpenStreetMap inside react-native-webview.
 * Web: uses react-leaflet with OpenStreetMap tiles.
 */

import type { IconName } from '../design';

/** A single marker to display on the civic map. */
export interface CivicMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  category: string;
  /** Category color for the marker pin */
  color: string;
  /** Icon name (currently unused by native pins; reserved for future custom markers) */
  iconName: IconName;
}

/** Map region (center + zoom deltas). */
export interface CivicMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** Simple latitude/longitude pair reported by map taps. */
export interface CivicMapCoords {
  latitude: number;
  longitude: number;
}

/** Props shared by both native and web map implementations. */
export interface CivicMapProps {
  markers: CivicMapMarker[];
  selectedMarkerId: string | null;
  onMarkerSelect: (marker: CivicMapMarker | null) => void;
  region?: CivicMapRegion;
  /**
   * Location-picker mode: when provided, tapping the map reports the
   * tapped coordinates so the caller can update its own location state.
   * When omitted, taps simply deselect the current marker.
   */
  onLocationPick?: (coords: CivicMapCoords) => void;
  /** Coordinates of the currently picked location, drawn as a distinct pin. */
  pickedLocation?: CivicMapCoords | null;
}

/** Default region: Karachi, Pakistan */
export const DEFAULT_REGION: CivicMapRegion = {
  latitude: 24.8607,
  longitude: 67.0011,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};
