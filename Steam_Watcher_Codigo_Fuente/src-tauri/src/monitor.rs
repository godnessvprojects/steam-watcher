use crate::db::Database;
use crate::models::{CheckSummary, NotificationRecord, PriceHistory};
use crate::steam_service::SteamService;
use chrono::Utc;
use std::sync::Arc;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

pub struct Monitor {
    db: Database,
    steam: Arc<SteamService>,
}

impl Monitor {
    pub fn new(db: Database, steam: Arc<SteamService>) -> Self {
        Self { db, steam }
    }

    /// Checks a single game, compares against previous state, detects price events,
    /// emits Windows notifications if criteria are met, and records history.
    pub async fn check_game(
        &self,
        appid: u32,
        app_handle: Option<&AppHandle>,
    ) -> Result<bool, String> {
        let settings = self.db.get_settings().map_err(|e| e.to_string())?;
        let existing = self
            .db
            .get_game_by_appid(appid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Juego {} no encontrado en la biblioteca", appid))?;

        let (mut fresh_game, dlc_ids) = self
            .steam
            .fetch_game_details(appid, &settings.country_code, &settings.language)
            .await?;

        // Keep existing user custom preferences (target price, notifications enabled)
        fresh_game.target_price = existing.target_price;
        fresh_game.notifications_enabled = existing.notifications_enabled;
        fresh_game.created_at = existing.created_at.clone();
        fresh_game.lowest_recorded_price = existing.lowest_recorded_price;

        let is_now_on_sale = fresh_game.is_on_sale;
        let is_previously_on_sale = existing.is_on_sale;
        let price_decreased = fresh_game.current_price < existing.current_price;
        let discount_increased = fresh_game.discount_percent > existing.discount_percent;

        let lowest_before = existing.lowest_recorded_price.unwrap_or(existing.current_price);
        let is_new_historical_low = fresh_game.current_price < lowest_before && (!fresh_game.is_free || lowest_before == 0.0);

        let target_reached = if let Some(target) = fresh_game.target_price {
            fresh_game.current_price <= target && existing.current_price > target
        } else {
            false
        };

        // Record price history
        let history = PriceHistory {
            id: 0,
            appid: fresh_game.appid,
            price: fresh_game.current_price,
            original_price: fresh_game.original_price,
            discount_percent: fresh_game.discount_percent,
            recorded_at: Utc::now().to_rfc3339(),
            is_on_sale: fresh_game.is_on_sale,
        };
        let _ = self.db.record_price_history(&history);

        // Check if notification should be dispatched
        let should_notify_game = fresh_game.notifications_enabled;
        let should_notify_event = (is_now_on_sale && !is_previously_on_sale)
            || discount_increased
            || price_decreased
            || is_new_historical_low
            || target_reached;

        let meets_min_discount = fresh_game.discount_percent as u32 >= settings.notify_min_discount;

        if should_notify_game && should_notify_event && meets_min_discount {
            let savings = (fresh_game.original_price - fresh_game.current_price).max(0.0);
            let currency_symbol = if fresh_game.currency == "EUR" { "€" } else { &fresh_game.currency };

            let is_100_percent_free = fresh_game.discount_percent >= 100 || (fresh_game.original_price > 0.0 && fresh_game.current_price == 0.0);

            let (event_type, title, body) = if is_100_percent_free {
                (
                    "free_giveaway",
                    format!("¡JUEGO 100% GRATIS: {}!", fresh_game.name),
                    format!(
                        "¡{} está al 100% DE DESCUENTO (GRATIS)! Precio original: {:.2} {}. ¡Añádelo a tu cuenta antes de que expire la promoción!",
                        fresh_game.name, fresh_game.original_price, currency_symbol
                    ),
                )
            } else if target_reached {
                (
                    "target_reached",
                    format!("¡Precio objetivo alcanzado para {}!", fresh_game.name),
                    format!(
                        "Precio actual: {:.2} {}\nDescuento: -{}%\nAhorro: {:.2} {}",
                        fresh_game.current_price, currency_symbol,
                        fresh_game.discount_percent,
                        savings, currency_symbol
                    ),
                )
            } else if is_new_historical_low {
                (
                    "new_lowest",
                    format!("¡Nuevo mínimo histórico registrado para {}!", fresh_game.name),
                    format!(
                        "Precio anterior: {:.2} {}\nNuevo mínimo: {:.2} {}\nDescuento: -{}%\nAhorro: {:.2} {}",
                        existing.current_price, currency_symbol,
                        fresh_game.current_price, currency_symbol,
                        fresh_game.discount_percent,
                        savings, currency_symbol
                    ),
                )
            } else {
                (
                    "sale_start",
                    format!("¡{} está de oferta!", fresh_game.name),
                    format!(
                        "Precio anterior: {:.2} {}\nPrecio actual: {:.2} {}\nDescuento: -{}%\nAhorro: {:.2} {}",
                        fresh_game.original_price, currency_symbol,
                        fresh_game.current_price, currency_symbol,
                        fresh_game.discount_percent,
                        savings, currency_symbol
                    ),
                )
            };

            // Trigger Windows Notification if AppHandle is available
            if let Some(app) = app_handle {
                let _ = app
                    .notification()
                    .builder()
                    .title(&title)
                    .body(&body)
                    .show();
            }

            // Save to database notifications log
            let notif = NotificationRecord {
                id: 0,
                appid: fresh_game.appid,
                game_name: fresh_game.name.clone(),
                event_type: event_type.to_string(),
                message: format!("{}\n{}", title, body),
                created_at: Utc::now().to_rfc3339(),
                sent: true,
            };
            let _ = self.db.record_notification(&notif);
        }

        // Deal reason analysis if on sale
        if fresh_game.is_on_sale {
            if let Some(reason) = self.steam.analyze_deal_reason(appid, true).await {
                let _ = self.db.upsert_deal_reason(&reason);
            }
        }

        // Update game in DB
        self.db.upsert_game(&fresh_game).map_err(|e| e.to_string())?;

        // Process DLCs (batch up to first 8 to avoid rate limits)
        let dlcs_to_process = &dlc_ids[..dlc_ids.len().min(8)];
        for &dlc_id in dlcs_to_process {
            if let Ok(mut dlc) = self
                .steam
                .fetch_dlc_details(dlc_id, appid, &settings.country_code, &settings.language)
                .await
            {
                dlc.parent_name = Some(fresh_game.name.clone());
                let _ = self.db.upsert_dlc(&dlc);
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
        }

        Ok(fresh_game.is_on_sale)
    }

    /// Checks all games in the library sequentially
    pub async fn check_all_games(&self, app_handle: Option<&AppHandle>) -> Result<CheckSummary, String> {
        // Auto-sync Steam Wishlist if enabled
        if let Ok(settings) = self.db.get_settings() {
            if settings.auto_sync_wishlist {
                if let Some(ref steam_id) = settings.steam_id {
                    if !steam_id.trim().is_empty() {
                        if let Ok(wishlist_appids) = self.steam.fetch_wishlist_appids(steam_id).await {
                            let mut new_added = 0;
                            for appid in wishlist_appids {
                                if let Ok(None) = self.db.get_game_by_appid(appid) {
                                    if let Ok((game, _)) = self
                                        .steam
                                        .fetch_game_details(
                                            appid,
                                            &settings.country_code,
                                            &settings.language,
                                        )
                                        .await
                                    {
                                        if let Ok(()) = self.db.upsert_game(&game) {
                                            new_added += 1;
                                        }
                                    }
                                }
                            }
                            if new_added > 0 {
                                if let Some(app) = app_handle {
                                    let _ = app
                                        .notification()
                                        .builder()
                                        .title("Steam Watcher - Wishlist")
                                        .body(format!(
                                            "¡Se han añadido {} nuevos juegos de tu lista de deseados a tu biblioteca!",
                                            new_added
                                        ))
                                        .show();
                                }
                            }
                        }
                    }
                }
            }
        }

        let games = self.db.get_games().map_err(|e| e.to_string())?;
        let mut deals_found = 0;

        for game in &games {
            if let Ok(is_deal) = self.check_game(game.appid, app_handle).await {
                if is_deal {
                    deals_found += 1;
                }
            }
            // Gentle delay between games to respect Steam rate limits
            tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
        }

        let timestamp = Utc::now().to_rfc3339();
        let _ = self.db.update_last_check_timestamp(&timestamp);

        let notifs = self.db.get_notifications(10).unwrap_or_default();

        Ok(CheckSummary {
            checked_count: games.len(),
            deals_found,
            notifications_sent: notifs.len(),
            timestamp,
        })
    }
}
