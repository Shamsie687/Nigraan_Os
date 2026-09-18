import { type TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../tokens/colors';

// ── Icon Registry ────────────────────────────────────────────────

/**
 * Feather icon set — Lucide-style stroke icons.
 *
 * Each NigraanOS icon name maps to a Feather glyph. The Feather set
 * (the predecessor of Lucide) provides clean 2px stroke icons that
 * render consistently on iOS, Android, and web with no emoji glyphs.
 *
 * Keep this registry as the single mapping point — screens reference
 * IconName keys, never raw Feather names.
 */
const iconMap = {
  // Navigation
  home: 'home',
  search: 'search',
  menu: 'menu',
  back: 'arrow-left',
  forward: 'arrow-right',
  close: 'x',
  check: 'check',
  plus: 'plus',
  activity: 'activity',
  chevronDown: 'chevron-down',
  chevronRight: 'chevron-right',
  globe: 'globe',

  // Actions
  edit: 'edit-2',
  delete: 'trash-2',
  share: 'share-2',
  filter: 'filter',
  refresh: 'refresh-cw',
  send: 'send',
  camera: 'camera',
  microphone: 'mic',
  location: 'map-pin',
  attachment: 'paperclip',
  eye: 'eye',
  eyeOff: 'eye-off',
  settings: 'settings',
  logOut: 'log-out',

  // Content
  alert: 'flag',
  bell: 'bell',
  star: 'star',
  starOutline: 'star',
  heart: 'heart',
  heartOutline: 'heart',
  clock: 'clock',
  calendar: 'calendar',

  // Status
  info: 'info',
  warning: 'alert-triangle',
  error: 'alert-circle',
  success: 'check-circle',
  pending: 'clock',
  verified: 'check-circle',
  shield: 'shield',
  loader: 'loader',

  // User
  person: 'user',
  people: 'users',
  email: 'mail',
  phone: 'phone',
  lock: 'lock',

  // Civic
  report: 'clipboard',
  map: 'map',
  water: 'droplet',
  road: 'navigation',
  electricity: 'zap',
  building: 'layers',
  wind: 'wind',
  book: 'book-open',
  emergency: 'alert-octagon',
  fire: 'alert-octagon',
} as const;

export type IconName = keyof typeof iconMap;

// ── Types ────────────────────────────────────────────────────────

export interface IconProps {
  /** Icon name from the registry */
  name: IconName;
  /** Icon size in points */
  size?: number;
  /** Icon color */
  color?: string;
  /** Additional text style overrides */
  style?: TextStyle;
}

// ── Component ────────────────────────────────────────────────────

export function Icon({ name, size = 24, color = colors.text, style }: IconProps) {
  return (
    <Feather
      name={iconMap[name]}
      size={size}
      color={color}
      style={style}
    />
  );
}

export { iconMap };
