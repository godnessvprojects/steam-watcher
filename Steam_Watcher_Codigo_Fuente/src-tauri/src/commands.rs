use crate::db::Database;
use crate::models::{
    AppUpdateInfo, CheckSummary, Dlc, FreeGiveaway, Game, GameDetailResponse, ImportSummary,
    NotificationRecord, PriceHistory, Settings, WishlistImportSummary,
};
use crate::monitor::Monitor;
use crate::steam_service::SteamService;
use chrono::Utc;
use std::sync::Arc;
use tauri::{AppHandle, State};

pub struct AppState {
    pub db: Database,
    pub steam: Arc<SteamService>,
    pub monitor: Arc<Monitor>,
}

#[tauri::command]
pub async fn get_games(state: State<'_, AppState>) -> Result<Vec<Game>, String> {
    state.db.get_games().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_game_details(
    appid: u32,
    state: State<'_, AppState>,
) -> Result<GameDetailResponse, String> {
    let game = state
        .db
        .get_game_by_appid(appid)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Videojuego con AppID {} no encontrado", appid))?;

    let history = state
        .db
        .get_price_history(appid)
        .map_err(|e| e.to_string())?;

    let dlcs = state
        .db
        .get_dlcs_for_game(appid)
        .map_err(|e| e.to_string())?;

    let deal_reason = state
        .db
        .get_deal_reason(appid)
        .map_err(|e| e.to_string())?;

    let recent_notifications = state
        .db
        .get_notifications(10)
        .unwrap_or_default()
        .into_iter()
        .filter(|n| n.appid == appid)
        .collect();

    Ok(GameDetailResponse {
        game,
        history,
        dlcs,
        deal_reason,
        recent_notifications,
    })
}

#[tauri::command]
pub async fn add_game(
    input: String,
    state: State<'_, AppState>,
) -> Result<Game, String> {
    let appid = SteamService::parse_appid(&input)?;

    // Duplicate check
    if let Ok(Some(existing)) = state.db.get_game_by_appid(appid) {
        return Err(format!(
            "El videojuego \"{}\" (AppID: {}) ya está en tu lista de seguimiento.",
            existing.name, appid
        ));
    }

    let settings = state.db.get_settings().map_err(|e| e.to_string())?;
    let (game, dlc_ids) = state
        .steam
        .fetch_game_details(appid, &settings.country_code, &settings.language)
        .await?;

    state.db.upsert_game(&game).map_err(|e| e.to_string())?;

    // Record initial price history
    let history = PriceHistory {
        id: 0,
        appid: game.appid,
        price: game.current_price,
        original_price: game.original_price,
        discount_percent: game.discount_percent,
        recorded_at: Utc::now().to_rfc3339(),
        is_on_sale: game.is_on_sale,
    };
    let _ = state.db.record_price_history(&history);

    // If game is on sale, check deal reason
    if game.is_on_sale {
        if let Some(reason) = state.steam.analyze_deal_reason(appid, true).await {
            let _ = state.db.upsert_deal_reason(&reason);
        }
    }

    // Fetch initial DLCs asynchronously
    let steam_clone = state.steam.clone();
    let db_clone = state.db.clone();
    let country = settings.country_code.clone();
    let lang = settings.language.clone();
    let game_name = game.name.clone();

    tauri::async_runtime::spawn(async move {
        let dlcs_to_fetch = &dlc_ids[..dlc_ids.len().min(8)];
        for &dlc_id in dlcs_to_fetch {
            if let Ok(mut dlc) = steam_clone.fetch_dlc_details(dlc_id, appid, &country, &lang).await {
                dlc.parent_name = Some(game_name.clone());
                let _ = db_clone.upsert_dlc(&dlc);
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }
    });

    let saved = state
        .db
        .get_game_by_appid(appid)
        .map_err(|e| e.to_string())?
        .unwrap_or(game);

    Ok(saved)
}

#[tauri::command]
pub async fn refresh_game(
    appid: u32,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<Game, String> {
    state.monitor.check_game(appid, Some(&app_handle)).await?;
    state
        .db
        .get_game_by_appid(appid)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Error al obtener juego actualizado".to_string())
}

#[tauri::command]
pub async fn check_all_games(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<CheckSummary, String> {
    state.monitor.check_all_games(Some(&app_handle)).await
}

#[tauri::command]
pub async fn delete_game(appid: u32, state: State<'_, AppState>) -> Result<bool, String> {
    state.db.delete_game(appid).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_game_notifications(
    appid: u32,
    enabled: bool,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    state
        .db
        .set_notifications_enabled(appid, enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_price_target(
    appid: u32,
    target_price: Option<f64>,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    state
        .db
        .set_target_price(appid, target_price)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_price_history(
    appid: u32,
    state: State<'_, AppState>,
) -> Result<Vec<PriceHistory>, String> {
    state.db.get_price_history(appid).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_dlcs(parent_appid: u32, state: State<'_, AppState>) -> Result<Vec<Dlc>, String> {
    state
        .db
        .get_dlcs_for_game(parent_appid)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_dlc_deals(state: State<'_, AppState>) -> Result<Vec<Dlc>, String> {
    state.db.get_all_dlc_deals().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_notifications(
    limit: Option<u32>,
    state: State<'_, AppState>,
) -> Result<Vec<NotificationRecord>, String> {
    let lim = limit.unwrap_or(50);
    state.db.get_notifications(lim).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    state.db.get_settings().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_settings(
    settings: Settings,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    state.db.save_settings(&settings).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn set_autostart(enabled: bool) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let path = r"Software\Microsoft\Windows\CurrentVersion\Run";
        if let Ok((key, _)) = hkcu.create_subkey(path) {
            if enabled {
                if let Ok(current_exe) = std::env::current_exe() {
                    let val = format!("\"{}\" --minimized", current_exe.display());
                    let _ = key.set_value("Steam Watcher", &val);
                }
            } else {
                let _ = key.delete_value("Steam Watcher");
            }
        }
    }
    Ok(enabled)
}

#[tauri::command]
pub async fn send_test_notification(app_handle: AppHandle) -> Result<bool, String> {
    use tauri_plugin_notification::NotificationExt;
    app_handle
        .notification()
        .builder()
        .title("Steam Watcher")
        .body("¡Las notificaciones de Windows están funcionando correctamente!")
        .show()
        .map_err(|e| format!("Error mostrando notificación: {}", e))?;
    Ok(true)
}

#[tauri::command]
pub async fn export_library(state: State<'_, AppState>) -> Result<String, String> {
    let games = state.db.get_games().map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&games)
        .map_err(|e| format!("Error serializando biblioteca: {}", e))?;
    Ok(json)
}

#[tauri::command]
pub async fn import_library(
    json_data: String,
    state: State<'_, AppState>,
) -> Result<ImportSummary, String> {
    let imported_games: Vec<Game> = serde_json::from_str(&json_data)
        .map_err(|e| format!("Formato de archivo inválido: {}", e))?;

    let mut imported = 0;
    let mut skipped = 0;

    for game in imported_games {
        if let Ok(Some(_)) = state.db.get_game_by_appid(game.appid) {
            skipped += 1;
        } else {
            if let Ok(()) = state.db.upsert_game(&game) {
                imported += 1;
            }
        }
    }

    Ok(ImportSummary {
        imported_games: imported,
        skipped_duplicates: skipped,
    })
}

#[tauri::command]
pub async fn import_wishlist(
    steam_id_or_url: String,
    state: State<'_, AppState>,
) -> Result<WishlistImportSummary, String> {
    let settings = state.db.get_settings().map_err(|e| e.to_string())?;
    let appids = state.steam.fetch_wishlist_appids(&steam_id_or_url).await?;

    let total_found = appids.len();
    let mut imported_count = 0;
    let mut already_in_library = 0;
    let mut failed_count = 0;

    for appid in appids {
        // If already in DB, skip
        if let Ok(Some(_)) = state.db.get_game_by_appid(appid) {
            already_in_library += 1;
            continue;
        }

        // Fetch details from Steam
        match state
            .steam
            .fetch_game_details(appid, &settings.country_code, &settings.language)
            .await
        {
            Ok((game, dlc_ids)) => {
                if let Ok(()) = state.db.upsert_game(&game) {
                    imported_count += 1;

                    // Initial price history entry
                    let history = PriceHistory {
                        id: 0,
                        appid,
                        price: game.current_price,
                        original_price: game.original_price,
                        discount_percent: game.discount_percent,
                        recorded_at: Utc::now().to_rfc3339(),
                        is_on_sale: game.is_on_sale,
                    };
                    let _ = state.db.record_price_history(&history);

                    // Fetch top 3 DLCs if any
                    let dlc_batch = &dlc_ids[..dlc_ids.len().min(3)];
                    for &dlc_id in dlc_batch {
                        if let Ok(dlc) = state
                            .steam
                            .fetch_dlc_details(
                                dlc_id,
                                appid,
                                &settings.country_code,
                                &settings.language,
                            )
                            .await
                        {
                            let _ = state.db.upsert_dlc(&dlc);
                        }
                    }
                } else {
                    failed_count += 1;
                }
            }
            Err(_) => {
                failed_count += 1;
            }
        }
    }

    Ok(WishlistImportSummary {
        total_found,
        imported_count,
        already_in_library,
        failed_count,
    })
}

#[tauri::command]
pub async fn sync_wishlist(state: State<'_, AppState>) -> Result<WishlistImportSummary, String> {
    let settings = state.db.get_settings().map_err(|e| e.to_string())?;
    let steam_id = settings
        .steam_id
        .ok_or_else(|| "No has configurado tu Steam ID o perfil en los ajustes.".to_string())?;

    if steam_id.trim().is_empty() {
        return Err("Por favor ingresa tu Steam ID o URL de perfil en Ajustes.".to_string());
    }

    import_wishlist(steam_id, state).await
}

#[tauri::command]
pub async fn get_free_giveaways(state: State<'_, AppState>) -> Result<Vec<FreeGiveaway>, String> {
    state.steam.fetch_free_giveaways().await
}

#[tauri::command]
pub async fn check_app_update(state: State<'_, AppState>) -> Result<AppUpdateInfo, String> {
    state.steam.check_app_update().await
}
