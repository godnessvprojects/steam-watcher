use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub id: i64,
    pub appid: u32,
    pub name: String,
    pub url: String,
    pub header_image: String,
    pub short_description: Option<String>,
    pub current_price: f64,
    pub original_price: f64,
    pub currency: String,
    pub discount_percent: i32,
    pub is_free: bool,
    pub is_on_sale: bool,
    pub created_at: String,
    pub last_checked_at: String,
    pub notifications_enabled: bool,
    pub target_price: Option<f64>,
    pub lowest_recorded_price: Option<f64>,
    pub dlc_count: i64,
    pub discount_end_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceHistory {
    pub id: i64,
    pub appid: u32,
    pub price: f64,
    pub original_price: f64,
    pub discount_percent: i32,
    pub recorded_at: String,
    pub is_on_sale: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dlc {
    pub id: i64,
    pub dlc_appid: u32,
    pub parent_appid: u32,
    pub parent_name: Option<String>,
    pub name: String,
    pub header_image: Option<String>,
    pub current_price: f64,
    pub original_price: f64,
    pub currency: String,
    pub discount_percent: i32,
    pub is_free: bool,
    pub is_on_sale: bool,
    pub steam_url: String,
    pub last_checked_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationRecord {
    pub id: i64,
    pub appid: u32,
    pub game_name: String,
    pub event_type: String,
    pub message: String,
    pub created_at: String,
    pub sent: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DealReason {
    pub id: i64,
    pub appid: u32,
    pub reason: String,
    pub source: String,
    pub confidence: String, // "confirmed", "seasonal_inference", "unidentified"
    pub identified_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub check_interval_minutes: u32,
    pub currency: String,
    pub country_code: String,
    pub language: String,
    pub theme: String, // "system", "light", "dark"
    pub notify_all_deals: bool,
    pub notify_min_discount: u32,
    pub notify_target_price: bool,
    pub notify_historical_low: bool,
    pub notify_giveaways: bool,
    pub minimize_to_tray: bool,
    pub autostart: bool,
    pub auto_update: bool,
    pub steam_id: Option<String>,
    pub auto_sync_wishlist: bool,
    pub last_check_timestamp: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            check_interval_minutes: 60,
            currency: "EUR".to_string(),
            country_code: "es".to_string(),
            language: "spanish".to_string(),
            theme: "system".to_string(),
            notify_all_deals: true,
            notify_min_discount: 0,
            notify_target_price: true,
            notify_historical_low: true,
            notify_giveaways: true,
            minimize_to_tray: true,
            autostart: false,
            auto_update: true,
            steam_id: None,
            auto_sync_wishlist: false,
            last_check_timestamp: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FreeGiveaway {
    pub id: String,
    pub title: String,
    pub worth: String,
    pub thumbnail: String,
    pub image: String,
    pub description: String,
    pub instructions: Option<String>,
    pub claim_url: String,
    pub published_date: Option<String>,
    pub giveaway_type: String,
    pub platforms: String,
    pub end_date: Option<String>,
    pub is_steam_direct: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameDetailResponse {
    pub game: Game,
    pub history: Vec<PriceHistory>,
    pub dlcs: Vec<Dlc>,
    pub deal_reason: Option<DealReason>,
    pub recent_notifications: Vec<NotificationRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckSummary {
    pub checked_count: usize,
    pub deals_found: usize,
    pub notifications_sent: usize,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportSummary {
    pub imported_games: usize,
    pub skipped_duplicates: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WishlistImportSummary {
    pub total_found: usize,
    pub imported_count: usize,
    pub already_in_library: usize,
    pub failed_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppUpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub has_update: bool,
    pub release_notes: Option<String>,
    pub download_url: Option<String>,
    pub html_url: Option<String>,
}
