/**
 * CivicMap — Platform-resolved map component.
 *
 * Metro/webpack resolves the correct implementation automatically:
 * - Android/iOS → CivicMap.native.tsx (Leaflet + OSM in WebView)
 * - Web → CivicMap.web.tsx (react-leaflet + OSM tiles)
 *
 * This file uses Platform.OS with dynamic requires so only
 * the matching platform module is loaded at runtime.
 */

import { Platform } from 'react-native';

// Dynamic require: Metro resolves .native or .web extension at bundle time.
const platformModule =
  Platform.OS === 'web'
    ? require('./CivicMap.web')
    : require('./CivicMap.native');

export const CivicMap: (props: import('./CivicMap.types').CivicMapProps) => React.ReactElement =
  platformModule.CivicMap;

export type {
  CivicMapProps,
  CivicMapMarker,
  CivicMapRegion,
  CivicMapCoords,
} from './CivicMap.types';

export { DEFAULT_REGION } from './CivicMap.types';
