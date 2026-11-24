export interface Game {
  id: number;
  appid: number;
  name: string;
  url: string;
  header_image: string;
  short_description: string | null;
  current_price: number;
  original_price: number;
  currency: string;
  discount_percent: number;
  is_free: boolean;
  is_on_sale: boolean;
  created_at: string;
  last_checked_at: string;
  notifications_enabled: boolean;
  target_price: number | null;
  lowest_recorded_price: number | null;
  dlc_count: number;
  discount_end_date: string | null;
}

export interface PriceHistoryItem {
  id: number;
  appid: number;
  price: number;
  original_price: number;
  discount_percent: number;
  recorded_at: string;
  is_on_sale: boolean;
}

export interface DlcItem {
  id: number;
  dlc_appid: number;
  parent_appid: number;
  parent_name: string | null;
  name: string;
  header_image: string | null;
  current_price: number;
  original_price: number;
  currency: string;
  discount_percent: number;
  is_free: boolean;
  is_on_sale: boolean;
  steam_url: string;
  last_checked_at: string;
}

export interface NotificationItem {
  id: number;
  appid: number;
  game_name: string;
  event_type: string;
  message: string;
  created_at: string;
  sent: boolean;
}

export interface DealReason {
  id: number;
  appid: number;
  reason: string;
  source: string;
  confidence: 'confirmed' | 'seasonal_inference' | 'unidentified';
  identified_at: string;
}

export interface Settings {
  check_interval_minutes: number;
  currency: string;
  country_code: string;
  language: string;
  theme: 'system' | 'light' | 'dark';
  notify_all_deals: boolean;
  notify_min_discount: number;
  notify_target_price: boolean;
  notify_historical_low: boolean;
  notify_giveaways: boolean;
  minimize_to_tray: boolean;
  autostart: boolean;
  auto_update: boolean;
  steam_id: string | null;
  auto_sync_wishlist: boolean;
  last_check_timestamp: string | null;
}

export interface GameDetailResponse {
  game: Game;
  history: PriceHistoryItem[];
  dlcs: DlcItem[];
  deal_reason: DealReason | null;
  recent_notifications: NotificationItem[];
}

export interface CheckSummary {
  checked_count: number;
  deals_found: number;
  notifications_sent: number;
  timestamp: string;
}

export interface ImportSummary {
  imported_games: number;
  skipped_duplicates: number;
}

export interface WishlistImportSummary {
  total_found: number;
  imported_count: number;
  already_in_library: number;
  failed_count: number;
}

export interface FreeGiveaway {
  id: string;
  title: string;
  worth: string;
  thumbnail: string;
  image: string;
  description: string;
  instructions?: string | null;
  claim_url: string;
  published_date?: string | null;
  giveaway_type: string;
  platforms: string;
  end_date?: string | null;
  is_steam_direct: boolean;
}

export interface AppUpdateInfo {
  current_version: string;
  latest_version: string;
  has_update: boolean;
  release_notes?: string | null;
  download_url?: string | null;
  html_url?: string | null;
}
