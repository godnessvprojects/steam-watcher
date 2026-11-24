use crate::models::{DealReason, Dlc, Game, NotificationRecord, PriceHistory, Settings};
use rusqlite::{params, Connection, Result};
use std::path::Path;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Database {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_tables()?;
        Ok(db)
    }

    #[allow(dead_code)]
    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Database {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appid INTEGER UNIQUE NOT NULL,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                header_image TEXT NOT NULL,
                short_description TEXT,
                current_price REAL NOT NULL,
                original_price REAL NOT NULL,
                currency TEXT NOT NULL,
                discount_percent INTEGER NOT NULL,
                is_free INTEGER NOT NULL DEFAULT 0,
                is_on_sale INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                last_checked_at TEXT NOT NULL,
                notifications_enabled INTEGER NOT NULL DEFAULT 1,
                target_price REAL,
                lowest_recorded_price REAL,
                discount_end_date TEXT
            );

            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appid INTEGER NOT NULL,
                price REAL NOT NULL,
                original_price REAL NOT NULL,
                discount_percent INTEGER NOT NULL,
                recorded_at TEXT NOT NULL,
                is_on_sale INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS dlcs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dlc_appid INTEGER UNIQUE NOT NULL,
                parent_appid INTEGER NOT NULL,
                name TEXT NOT NULL,
                header_image TEXT,
                current_price REAL NOT NULL,
                original_price REAL NOT NULL,
                currency TEXT NOT NULL,
                discount_percent INTEGER NOT NULL,
                is_free INTEGER NOT NULL DEFAULT 0,
                is_on_sale INTEGER NOT NULL DEFAULT 0,
                steam_url TEXT NOT NULL,
                last_checked_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appid INTEGER NOT NULL,
                game_name TEXT NOT NULL,
                event_type TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                sent INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS deal_reasons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appid INTEGER UNIQUE NOT NULL,
                reason TEXT NOT NULL,
                source TEXT NOT NULL,
                confidence TEXT NOT NULL,
                identified_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                check_interval_minutes INTEGER NOT NULL DEFAULT 60,
                currency TEXT NOT NULL DEFAULT 'EUR',
                country_code TEXT NOT NULL DEFAULT 'es',
                language TEXT NOT NULL DEFAULT 'spanish',
                theme TEXT NOT NULL DEFAULT 'system',
                notify_all_deals INTEGER NOT NULL DEFAULT 1,
                notify_min_discount INTEGER NOT NULL DEFAULT 0,
                notify_target_price INTEGER NOT NULL DEFAULT 1,
                notify_historical_low INTEGER NOT NULL DEFAULT 1,
                notify_giveaways INTEGER NOT NULL DEFAULT 1,
                minimize_to_tray INTEGER NOT NULL DEFAULT 1,
                autostart INTEGER NOT NULL DEFAULT 0,
                auto_update INTEGER NOT NULL DEFAULT 1,
                steam_id TEXT,
                auto_sync_wishlist INTEGER NOT NULL DEFAULT 0,
                last_check_timestamp TEXT
            );

            INSERT OR IGNORE INTO settings (
                id, check_interval_minutes, currency, country_code, language, theme,
                notify_all_deals, notify_min_discount, notify_target_price,
                notify_historical_low, notify_giveaways, minimize_to_tray, autostart, auto_update,
                steam_id, auto_sync_wishlist
            ) VALUES (1, 60, 'EUR', 'es', 'spanish', 'system', 1, 0, 1, 1, 1, 1, 0, 1, NULL, 0);

            CREATE INDEX IF NOT EXISTS idx_price_history_appid ON price_history(appid);
            CREATE INDEX IF NOT EXISTS idx_dlcs_parent_appid ON dlcs(parent_appid);
            CREATE INDEX IF NOT EXISTS idx_notifications_appid ON notifications(appid);
            "
        )?;

        // Ensure auto_update, notify_giveaways and steam wishlist columns exist for existing databases
        let _ = conn.execute("ALTER TABLE settings ADD COLUMN auto_update INTEGER NOT NULL DEFAULT 1", []);
        let _ = conn.execute("ALTER TABLE settings ADD COLUMN notify_giveaways INTEGER NOT NULL DEFAULT 1", []);
        let _ = conn.execute("ALTER TABLE settings ADD COLUMN steam_id TEXT", []);
        let _ = conn.execute("ALTER TABLE settings ADD COLUMN auto_sync_wishlist INTEGER NOT NULL DEFAULT 0", []);
        Ok(())
    }

    pub fn upsert_game(&self, game: &Game) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Check current lowest recorded price
        let current_lowest: Option<f64> = conn
            .query_row(
                "SELECT lowest_recorded_price FROM games WHERE appid = ?1",
                params![game.appid],
                |row| row.get(0),
            )
            .ok()
            .flatten();

        let new_lowest = match current_lowest {
            Some(lowest) => {
                if game.current_price < lowest && (!game.is_free || lowest == 0.0) {
                    Some(game.current_price)
                } else {
                    Some(lowest)
                }
            }
            None => Some(game.current_price),
        };

        conn.execute(
            "
            INSERT INTO games (
                appid, name, url, header_image, short_description,
                current_price, original_price, currency, discount_percent,
                is_free, is_on_sale, created_at, last_checked_at,
                notifications_enabled, target_price, lowest_recorded_price,
                discount_end_date
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
            ON CONFLICT(appid) DO UPDATE SET
                name = excluded.name,
                url = excluded.url,
                header_image = excluded.header_image,
                short_description = COALESCE(excluded.short_description, games.short_description),
                current_price = excluded.current_price,
                original_price = excluded.original_price,
                currency = excluded.currency,
                discount_percent = excluded.discount_percent,
                is_free = excluded.is_free,
                is_on_sale = excluded.is_on_sale,
                last_checked_at = excluded.last_checked_at,
                lowest_recorded_price = excluded.lowest_recorded_price,
                discount_end_date = excluded.discount_end_date
            ",
            params![
                game.appid,
                game.name,
                game.url,
                game.header_image,
                game.short_description,
                game.current_price,
                game.original_price,
                game.currency,
                game.discount_percent,
                if game.is_free { 1 } else { 0 },
                if game.is_on_sale { 1 } else { 0 },
                game.created_at,
                game.last_checked_at,
                if game.notifications_enabled { 1 } else { 0 },
                game.target_price,
                new_lowest,
                game.discount_end_date,
            ],
        )?;

        Ok(())
    }

    pub fn get_games(&self) -> Result<Vec<Game>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "
            SELECT g.id, g.appid, g.name, g.url, g.header_image, g.short_description,
                   g.current_price, g.original_price, g.currency, g.discount_percent,
                   g.is_free, g.is_on_sale, g.created_at, g.last_checked_at,
                   g.notifications_enabled, g.target_price, g.lowest_recorded_price,
                   g.discount_end_date,
                   (SELECT COUNT(*) FROM dlcs WHERE parent_appid = g.appid) as dlc_count
            FROM games g
            ORDER BY g.is_on_sale DESC, g.discount_percent DESC, g.name ASC
            ",
        )?;

        let games = stmt
            .query_map([], |row| {
                Ok(Game {
                    id: row.get(0)?,
                    appid: row.get(1)?,
                    name: row.get(2)?,
                    url: row.get(3)?,
                    header_image: row.get(4)?,
                    short_description: row.get(5)?,
                    current_price: row.get(6)?,
                    original_price: row.get(7)?,
                    currency: row.get(8)?,
                    discount_percent: row.get(9)?,
                    is_free: row.get::<_, i64>(10)? == 1,
                    is_on_sale: row.get::<_, i64>(11)? == 1,
                    created_at: row.get(12)?,
                    last_checked_at: row.get(13)?,
                    notifications_enabled: row.get::<_, i64>(14)? == 1,
                    target_price: row.get(15)?,
                    lowest_recorded_price: row.get(16)?,
                    discount_end_date: row.get(17)?,
                    dlc_count: row.get(18)?,
                })
            })?
            .filter_map(Result::ok)
            .collect();

        Ok(games)
    }

    pub fn get_game_by_appid(&self, appid: u32) -> Result<Option<Game>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "
            SELECT g.id, g.appid, g.name, g.url, g.header_image, g.short_description,
                   g.current_price, g.original_price, g.currency, g.discount_percent,
                   g.is_free, g.is_on_sale, g.created_at, g.last_checked_at,
                   g.notifications_enabled, g.target_price, g.lowest_recorded_price,
                   g.discount_end_date,
                   (SELECT COUNT(*) FROM dlcs WHERE parent_appid = g.appid) as dlc_count
            FROM games g
            WHERE g.appid = ?1
            ",
        )?;

        let mut rows = stmt.query(params![appid])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Game {
                id: row.get(0)?,
                appid: row.get(1)?,
                name: row.get(2)?,
                url: row.get(3)?,
                header_image: row.get(4)?,
                short_description: row.get(5)?,
                current_price: row.get(6)?,
                original_price: row.get(7)?,
                currency: row.get(8)?,
                discount_percent: row.get(9)?,
                is_free: row.get::<_, i64>(10)? == 1,
                is_on_sale: row.get::<_, i64>(11)? == 1,
                created_at: row.get(12)?,
                last_checked_at: row.get(13)?,
                notifications_enabled: row.get::<_, i64>(14)? == 1,
                target_price: row.get(15)?,
                lowest_recorded_price: row.get(16)?,
                discount_end_date: row.get(17)?,
                dlc_count: row.get(18)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn delete_game(&self, appid: u32) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM price_history WHERE appid = ?1", params![appid])?;
        conn.execute("DELETE FROM dlcs WHERE parent_appid = ?1", params![appid])?;
        conn.execute("DELETE FROM deal_reasons WHERE appid = ?1", params![appid])?;
        conn.execute("DELETE FROM notifications WHERE appid = ?1", params![appid])?;
        let affected = conn.execute("DELETE FROM games WHERE appid = ?1", params![appid])?;
        Ok(affected > 0)
    }

    pub fn set_notifications_enabled(&self, appid: u32, enabled: bool) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "UPDATE games SET notifications_enabled = ?1 WHERE appid = ?2",
            params![if enabled { 1 } else { 0 }, appid],
        )?;
        Ok(affected > 0)
    }

    pub fn set_target_price(&self, appid: u32, target_price: Option<f64>) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "UPDATE games SET target_price = ?1 WHERE appid = ?2",
            params![target_price, appid],
        )?;
        Ok(affected > 0)
    }

    pub fn record_price_history(&self, history: &PriceHistory) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        // Prevent recording duplicates if the price and discount have not changed in the last record
        let last_record: Option<(f64, i32)> = conn
            .query_row(
                "SELECT price, discount_percent FROM price_history WHERE appid = ?1 ORDER BY id DESC LIMIT 1",
                params![history.appid],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .ok();

        if let Some((last_price, last_discount)) = last_record {
            if (last_price - history.price).abs() < 0.001 && last_discount == history.discount_percent {
                return Ok(());
            }
        }

        conn.execute(
            "
            INSERT INTO price_history (appid, price, original_price, discount_percent, recorded_at, is_on_sale)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ",
            params![
                history.appid,
                history.price,
                history.original_price,
                history.discount_percent,
                history.recorded_at,
                if history.is_on_sale { 1 } else { 0 },
            ],
        )?;
        Ok(())
    }

    pub fn get_price_history(&self, appid: u32) -> Result<Vec<PriceHistory>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "
            SELECT id, appid, price, original_price, discount_percent, recorded_at, is_on_sale
            FROM price_history
            WHERE appid = ?1
            ORDER BY recorded_at ASC
            ",
        )?;

        let history = stmt
            .query_map(params![appid], |row| {
                Ok(PriceHistory {
                    id: row.get(0)?,
                    appid: row.get(1)?,
                    price: row.get(2)?,
                    original_price: row.get(3)?,
                    discount_percent: row.get(4)?,
                    recorded_at: row.get(5)?,
                    is_on_sale: row.get::<_, i64>(6)? == 1,
                })
            })?
            .filter_map(Result::ok)
            .collect();

        Ok(history)
    }

    pub fn upsert_dlc(&self, dlc: &Dlc) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "
            INSERT INTO dlcs (
                dlc_appid, parent_appid, name, header_image, current_price,
                original_price, currency, discount_percent, is_free, is_on_sale,
                steam_url, last_checked_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
            ON CONFLICT(dlc_appid) DO UPDATE SET
                name = excluded.name,
                header_image = COALESCE(excluded.header_image, dlcs.header_image),
                current_price = excluded.current_price,
                original_price = excluded.original_price,
                currency = excluded.currency,
                discount_percent = excluded.discount_percent,
                is_free = excluded.is_free,
                is_on_sale = excluded.is_on_sale,
                steam_url = excluded.steam_url,
                last_checked_at = excluded.last_checked_at
            ",
            params![
                dlc.dlc_appid,
                dlc.parent_appid,
                dlc.name,
                dlc.header_image,
                dlc.current_price,
                dlc.original_price,
                dlc.currency,
                dlc.discount_percent,
                if dlc.is_free { 1 } else { 0 },
                if dlc.is_on_sale { 1 } else { 0 },
                dlc.steam_url,
                dlc.last_checked_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_dlcs_for_game(&self, parent_appid: u32) -> Result<Vec<Dlc>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "
            SELECT d.id, d.dlc_appid, d.parent_appid, g.name as parent_name, d.name,
                   d.header_image, d.current_price, d.original_price, d.currency,
                   d.discount_percent, d.is_free, d.is_on_sale, d.steam_url, d.last_checked_at
            FROM dlcs d
            LEFT JOIN games g ON g.appid = d.parent_appid
            WHERE d.parent_appid = ?1
            ORDER BY d.is_on_sale DESC, d.discount_percent DESC, d.name ASC
            ",
        )?;

        let dlcs = stmt
            .query_map(params![parent_appid], |row| {
                Ok(Dlc {
                    id: row.get(0)?,
                    dlc_appid: row.get(1)?,
                    parent_appid: row.get(2)?,
                    parent_name: row.get(3)?,
                    name: row.get(4)?,
                    header_image: row.get(5)?,
                    current_price: row.get(6)?,
                    original_price: row.get(7)?,
                    currency: row.get(8)?,
                    discount_percent: row.get(9)?,
                    is_free: row.get::<_, i64>(10)? == 1,
                    is_on_sale: row.get::<_, i64>(11)? == 1,
                    steam_url: row.get(12)?,
                    last_checked_at: row.get(13)?,
                })
            })?
            .filter_map(Result::ok)
            .collect();

        Ok(dlcs)
    }

    pub fn get_all_dlc_deals(&self) -> Result<Vec<Dlc>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "
            SELECT d.id, d.dlc_appid, d.parent_appid, g.name as parent_name, d.name,
                   d.header_image, d.current_price, d.original_price, d.currency,
                   d.discount_percent, d.is_free, d.is_on_sale, d.steam_url, d.last_checked_at
            FROM dlcs d
            LEFT JOIN games g ON g.appid = d.parent_appid
            WHERE d.is_on_sale = 1 AND d.discount_percent > 0
            ORDER BY d.discount_percent DESC, (d.original_price - d.current_price) DESC
            ",
        )?;

        let dlcs = stmt
            .query_map([], |row| {
                Ok(Dlc {
                    id: row.get(0)?,
                    dlc_appid: row.get(1)?,
                    parent_appid: row.get(2)?,
                    parent_name: row.get(3)?,
                    name: row.get(4)?,
                    header_image: row.get(5)?,
                    current_price: row.get(6)?,
                    original_price: row.get(7)?,
                    currency: row.get(8)?,
                    discount_percent: row.get(9)?,
                    is_free: row.get::<_, i64>(10)? == 1,
                    is_on_sale: row.get::<_, i64>(11)? == 1,
                    steam_url: row.get(12)?,
                    last_checked_at: row.get(13)?,
                })
            })?
            .filter_map(Result::ok)
            .collect();

        Ok(dlcs)
    }

    pub fn record_notification(&self, notif: &NotificationRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "
            INSERT INTO notifications (appid, game_name, event_type, message, created_at, sent)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ",
            params![
                notif.appid,
                notif.game_name,
                notif.event_type,
                notif.message,
                notif.created_at,
                if notif.sent { 1 } else { 0 },
            ],
        )?;
        Ok(())
    }

    pub fn get_notifications(&self, limit: u32) -> Result<Vec<NotificationRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "
            SELECT id, appid, game_name, event_type, message, created_at, sent
            FROM notifications
            ORDER BY id DESC
            LIMIT ?1
            ",
        )?;

        let notifs = stmt
            .query_map(params![limit], |row| {
                Ok(NotificationRecord {
                    id: row.get(0)?,
                    appid: row.get(1)?,
                    game_name: row.get(2)?,
                    event_type: row.get(3)?,
                    message: row.get(4)?,
                    created_at: row.get(5)?,
                    sent: row.get::<_, i64>(6)? == 1,
                })
            })?
            .filter_map(Result::ok)
            .collect();

        Ok(notifs)
    }

    pub fn upsert_deal_reason(&self, deal: &DealReason) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "
            INSERT INTO deal_reasons (appid, reason, source, confidence, identified_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(appid) DO UPDATE SET
                reason = excluded.reason,
                source = excluded.source,
                confidence = excluded.confidence,
                identified_at = excluded.identified_at
            ",
            params![
                deal.appid,
                deal.reason,
                deal.source,
                deal.confidence,
                deal.identified_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_deal_reason(&self, appid: u32) -> Result<Option<DealReason>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "
            SELECT id, appid, reason, source, confidence, identified_at
            FROM deal_reasons
            WHERE appid = ?1
            ",
        )?;

        let mut rows = stmt.query(params![appid])?;
        if let Some(row) = rows.next()? {
            Ok(Some(DealReason {
                id: row.get(0)?,
                appid: row.get(1)?,
                reason: row.get(2)?,
                source: row.get(3)?,
                confidence: row.get(4)?,
                identified_at: row.get(5)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_settings(&self) -> Result<Settings> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "
            SELECT check_interval_minutes, currency, country_code, language, theme,
                   notify_all_deals, notify_min_discount, notify_target_price,
                   notify_historical_low, notify_giveaways, minimize_to_tray, autostart, auto_update,
                   steam_id, auto_sync_wishlist, last_check_timestamp
            FROM settings
            WHERE id = 1
            ",
        )?;

        let mut rows = stmt.query([])?;
        if let Some(row) = rows.next()? {
            Ok(Settings {
                check_interval_minutes: row.get(0)?,
                currency: row.get(1)?,
                country_code: row.get(2)?,
                language: row.get(3)?,
                theme: row.get(4)?,
                notify_all_deals: row.get::<_, i64>(5)? == 1,
                notify_min_discount: row.get(6)?,
                notify_target_price: row.get::<_, i64>(7)? == 1,
                notify_historical_low: row.get::<_, i64>(8)? == 1,
                notify_giveaways: row.get::<_, i64>(9)? == 1,
                minimize_to_tray: row.get::<_, i64>(10)? == 1,
                autostart: row.get::<_, i64>(11)? == 1,
                auto_update: row.get::<_, i64>(12)? == 1,
                steam_id: row.get(13)?,
                auto_sync_wishlist: row.get::<_, i64>(14)? == 1,
                last_check_timestamp: row.get(15)?,
            })
        } else {
            Ok(Settings::default())
        }
    }

    pub fn save_settings(&self, settings: &Settings) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "
            UPDATE settings SET
                check_interval_minutes = ?1,
                currency = ?2,
                country_code = ?3,
                language = ?4,
                theme = ?5,
                notify_all_deals = ?6,
                notify_min_discount = ?7,
                notify_target_price = ?8,
                notify_historical_low = ?9,
                notify_giveaways = ?10,
                minimize_to_tray = ?11,
                autostart = ?12,
                auto_update = ?13,
                steam_id = ?14,
                auto_sync_wishlist = ?15,
                last_check_timestamp = ?16
            WHERE id = 1
            ",
            params![
                settings.check_interval_minutes,
                settings.currency,
                settings.country_code,
                settings.language,
                settings.theme,
                if settings.notify_all_deals { 1 } else { 0 },
                settings.notify_min_discount,
                if settings.notify_target_price { 1 } else { 0 },
                if settings.notify_historical_low { 1 } else { 0 },
                if settings.notify_giveaways { 1 } else { 0 },
                if settings.minimize_to_tray { 1 } else { 0 },
                if settings.autostart { 1 } else { 0 },
                if settings.auto_update { 1 } else { 0 },
                settings.steam_id,
                if settings.auto_sync_wishlist { 1 } else { 0 },
                settings.last_check_timestamp,
            ],
        )?;
        Ok(())
    }

    pub fn update_last_check_timestamp(&self, timestamp: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE settings SET last_check_timestamp = ?1 WHERE id = 1",
            params![timestamp],
        )?;
        Ok(())
    }
}
