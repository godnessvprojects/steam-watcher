pub mod commands;
pub mod db;
pub mod models;
pub mod monitor;
pub mod steam_service;

use commands::AppState;
use db::Database;
use monitor::Monitor;
use steam_service::SteamService;
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Determine application data directory for SQLite persistence with fallback
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));
            let _ = std::fs::create_dir_all(&app_data_dir);
            
            let db_path = if app_data_dir.exists() {
                app_data_dir.join("steam_watcher.db")
            } else {
                std::path::PathBuf::from("steam_watcher.db")
            };

            let db = Database::new(&db_path).unwrap_or_else(|_| {
                Database::new("steam_watcher.db").expect("Error al inicializar base de datos SQLite")
            });
            let steam = Arc::new(SteamService::new());
            let monitor = Arc::new(Monitor::new(db.clone(), steam.clone()));

            app.manage(AppState {
                db: db.clone(),
                steam: steam.clone(),
                monitor: monitor.clone(),
            });

            // Handle notification clicks: restore window, unminimize, focus, and refresh data
            let app_handle_notif = app.handle().clone();
            let _ = app.notification().on_action(move |_action| {
                if let Some(window) = app_handle_notif.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                    let _ = window.emit("refresh-data", ());
                }
            });

            // Build Tray Icon with Menu for background running
            let quit_item = MenuItem::with_id(app, "quit", "Salir de Steam Watcher", true, None::<&str>)?;
            let open_item = MenuItem::with_id(app, "open", "Abrir Steam Watcher", true, None::<&str>)?;
            let check_item = MenuItem::with_id(app, "check", "Comprobar ofertas ahora", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&open_item, &check_item, &quit_item])?;

            let monitor_tray = monitor.clone();
            let app_handle_tray = app.handle().clone();

            if let Some(icon) = app.default_window_icon() {
                let _tray = TrayIconBuilder::new()
                    .icon(icon.clone())
                    .tooltip("Steam Watcher - Monitor de ofertas")
                    .menu(&tray_menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(move |app, event| match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "open" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                                let _ = window.emit("refresh-data", ());
                            }
                        }
                        "check" => {
                            let mon = monitor_tray.clone();
                            let h = app_handle_tray.clone();
                            tauri::async_runtime::spawn(async move {
                                let _ = mon.check_all_games(Some(&h)).await;
                                if let Some(w) = h.get_webview_window("main") {
                                    let _ = w.emit("refresh-data", ());
                                }
                            });
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                                let _ = window.emit("refresh-data", ());
                            }
                        }
                    })
                    .build(app)?;
            }

            // Check if launched with --minimized or --autostart flag
            let is_minimized = std::env::args().any(|arg| arg == "--minimized" || arg == "--autostart");
            if is_minimized {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            // Start background monitoring scheduler via Tauri's managed async runtime
            let app_handle = app.handle().clone();
            let monitor_bg = monitor.clone();
            let db_bg = db.clone();

            tauri::async_runtime::spawn(async move {
                // Initial check after 30 seconds of app start
                tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;

                loop {
                    let interval_minutes = match db_bg.get_settings() {
                        Ok(s) => s.check_interval_minutes.max(15),
                        Err(_) => 60,
                    };

                    let _ = monitor_bg.check_all_games(Some(&app_handle)).await;

                    tokio::time::sleep(tokio::time::Duration::from_secs((interval_minutes as u64) * 60)).await;
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Instead of terminating process, minimize / hide to system tray
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_games,
            commands::get_game_details,
            commands::add_game,
            commands::refresh_game,
            commands::check_all_games,
            commands::delete_game,
            commands::toggle_game_notifications,
            commands::set_price_target,
            commands::get_price_history,
            commands::get_dlcs,
            commands::get_dlc_deals,
            commands::get_notifications,
            commands::get_settings,
            commands::save_settings,
            commands::send_test_notification,
            commands::set_autostart,
            commands::export_library,
            commands::import_library,
            commands::import_wishlist,
            commands::sync_wishlist,
            commands::get_free_giveaways,
            commands::check_app_update
        ])
        .run(tauri::generate_context!())
        .expect("Error al iniciar Steam Watcher");
}
