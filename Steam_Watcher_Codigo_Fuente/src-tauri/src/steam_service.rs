use crate::models::{AppUpdateInfo, DealReason, Dlc, FreeGiveaway, Game};
use chrono::Utc;
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

pub struct SteamService {
    client: Client,
}

impl SteamService {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(12))
            .user_agent("SteamWatcher/1.0 (Windows NT 10.0; Win64; x64)")
            .build()
            .unwrap_or_else(|_| Client::new());
        Self { client }
    }

    /// Extracts Steam AppID from URL or raw number
    pub fn parse_appid(input: &str) -> Result<u32, String> {
        let trimmed = input.trim();
        // If raw number
        if let Ok(id) = trimmed.parse::<u32>() {
            return Ok(id);
        }

        // Check if URL contains /app/<id>
        if let Some(pos) = trimmed.find("/app/") {
            let after = &trimmed[pos + 5..];
            let end_pos = after.find('/').or_else(|| after.find('?')).unwrap_or(after.len());
            let id_str = &after[..end_pos];
            if let Ok(id) = id_str.parse::<u32>() {
                return Ok(id);
            }
        }

        Err("No se pudo extraer un AppID válido. Por favor ingresa una URL válida de Steam Store (ej. https://store.steampowered.com/app/1867240/WARDOGS/) o el número de AppID directamente.".to_string())
    }

    /// Fetches official Steam Store details for a game
    pub async fn fetch_game_details(
        &self,
        appid: u32,
        country_code: &str,
        language: &str,
    ) -> Result<(Game, Vec<u32>), String> {
        let url = format!(
            "https://store.steampowered.com/api/appdetails?appids={}&cc={}&l={}",
            appid, country_code, language
        );

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Error al conectar con Steam Store: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Steam Store devolvió un código de respuesta no exitoso: {}",
                response.status()
            ));
        }

        let json: Value = response
            .json()
            .await
            .map_err(|e| format!("Error al decodificar respuesta JSON de Steam: {}", e))?;

        let app_obj = &json[appid.to_string()];
        let success = app_obj["success"].as_bool().unwrap_or(false);
        if !success {
            return Err(format!(
                "Steam Store indicó que el videojuego con AppID {} no está disponible o requiere verificación de edad.",
                appid
            ));
        }

        let data = &app_obj["data"];
        let name = data["name"].as_str().unwrap_or("Desconocido").to_string();
        let header_image = data["header_image"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let short_description = data["short_description"]
            .as_str()
            .map(|s| s.to_string());
        let is_free = data["is_free"].as_bool().unwrap_or(false);

        let mut current_price = 0.0;
        let mut original_price = 0.0;
        let mut currency = "EUR".to_string();
        let mut discount_percent = 0;
        let mut is_on_sale = false;

        if is_free {
            current_price = 0.0;
            original_price = 0.0;
            discount_percent = 0;
            is_on_sale = false;
        } else if let Some(price_overview) = data.get("price_overview") {
            let initial_cents = price_overview["initial"].as_f64().unwrap_or(0.0);
            let final_cents = price_overview["final"].as_f64().unwrap_or(0.0);
            discount_percent = price_overview["discount_percent"].as_i64().unwrap_or(0) as i32;
            currency = price_overview["currency"]
                .as_str()
                .unwrap_or("EUR")
                .to_string();

            current_price = final_cents / 100.0;
            original_price = initial_cents / 100.0;
            is_on_sale = discount_percent > 0;
        }

        let dlc_ids: Vec<u32> = data["dlc"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_u64().map(|id| id as u32))
                    .collect()
            })
            .unwrap_or_default();

        let now = Utc::now().to_rfc3339();
        let steam_url = format!("https://store.steampowered.com/app/{}/", appid);

        let game = Game {
            id: 0,
            appid,
            name,
            url: steam_url,
            header_image,
            short_description,
            current_price,
            original_price,
            currency,
            discount_percent,
            is_free,
            is_on_sale,
            created_at: now.clone(),
            last_checked_at: now,
            notifications_enabled: true,
            target_price: None,
            lowest_recorded_price: Some(current_price),
            dlc_count: dlc_ids.len() as i64,
            discount_end_date: None,
        };

        Ok((game, dlc_ids))
    }

    /// Fetches details for a single DLC
    pub async fn fetch_dlc_details(
        &self,
        dlc_appid: u32,
        parent_appid: u32,
        country_code: &str,
        language: &str,
    ) -> Result<Dlc, String> {
        let url = format!(
            "https://store.steampowered.com/api/appdetails?appids={}&cc={}&l={}",
            dlc_appid, country_code, language
        );

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Error al obtener DLC {}: {}", dlc_appid, e))?;

        let json: Value = response
            .json()
            .await
            .map_err(|e| format!("Error decodificando DLC {}: {}", dlc_appid, e))?;

        let app_obj = &json[dlc_appid.to_string()];
        if !app_obj["success"].as_bool().unwrap_or(false) {
            return Err("DLC no disponible".to_string());
        }

        let data = &app_obj["data"];
        let name = data["name"].as_str().unwrap_or("DLC").to_string();
        let header_image = data["header_image"].as_str().map(|s| s.to_string());
        let is_free = data["is_free"].as_bool().unwrap_or(false);

        let mut current_price = 0.0;
        let mut original_price = 0.0;
        let mut currency = "EUR".to_string();
        let mut discount_percent = 0;
        let mut is_on_sale = false;

        if is_free {
            current_price = 0.0;
            original_price = 0.0;
            discount_percent = 0;
            is_on_sale = false;
        } else if let Some(price_overview) = data.get("price_overview") {
            let initial_cents = price_overview["initial"].as_f64().unwrap_or(0.0);
            let final_cents = price_overview["final"].as_f64().unwrap_or(0.0);
            discount_percent = price_overview["discount_percent"].as_i64().unwrap_or(0) as i32;
            currency = price_overview["currency"]
                .as_str()
                .unwrap_or("EUR")
                .to_string();

            current_price = final_cents / 100.0;
            original_price = initial_cents / 100.0;
            is_on_sale = discount_percent > 0;
        }

        let now = Utc::now().to_rfc3339();
        let steam_url = format!("https://store.steampowered.com/app/{}/", dlc_appid);

        Ok(Dlc {
            id: 0,
            dlc_appid,
            parent_appid,
            parent_name: None,
            name,
            header_image,
            current_price,
            original_price,
            currency,
            discount_percent,
            is_free,
            is_on_sale,
            steam_url,
            last_checked_at: now,
        })
    }

    /// Analyzes verifiable reasons for discounts without inventing data
    pub async fn analyze_deal_reason(
        &self,
        appid: u32,
        is_on_sale: bool,
    ) -> Option<DealReason> {
        if !is_on_sale {
            return None;
        }

        let news_url = format!(
            "https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid={}&count=5&maxlength=400&format=json",
            appid
        );

        let now = Utc::now().to_rfc3339();

        if let Ok(resp) = self.client.get(&news_url).send().await {
            if let Ok(json) = resp.json::<Value>().await {
                if let Some(items) = json["appnews"]["newsitems"].as_array() {
                    for item in items {
                        let title = item["title"].as_str().unwrap_or("");
                        let contents = item["contents"].as_str().unwrap_or("");
                        let feed = item["feedlabel"].as_str().unwrap_or("");
                        let url = item["url"].as_str().unwrap_or("Steam News");

                        let full_text = format!("{} {}", title, contents).to_lowercase();

                        // Verifiable sale patterns in developer/Steam announcements
                        let patterns = [
                            ("autumn sale", "Steam Autumn Sale (Rebajas de Otoño)", "confirmed"),
                            ("winter sale", "Steam Winter Sale (Rebajas de Invierno)", "confirmed"),
                            ("summer sale", "Steam Summer Sale (Rebajas de Verano)", "confirmed"),
                            ("spring sale", "Steam Spring Sale (Rebajas de Primavera)", "confirmed"),
                            ("weekend deal", "Steam Weekend Deal (Oferta de Fin de Semana)", "confirmed"),
                            ("daily deal", "Steam Daily Deal (Oferta del Día)", "confirmed"),
                            ("midweek madness", "Midweek Madness (Locura de Mitad de Semana)", "confirmed"),
                            ("anniversary", "Aniversario del videojuego o editor", "confirmed"),
                            ("publisher sale", "Promoción o festival del editor", "confirmed"),
                            ("major update", "Promoción por lanzamiento de actualización mayor", "confirmed"),
                            ("launch discount", "Descuento de lanzamiento", "confirmed"),
                        ];

                        for (keyword, desc, conf) in patterns {
                            if full_text.contains(keyword) {
                                return Some(DealReason {
                                    id: 0,
                                    appid,
                                    reason: format!("{}: \"{}\"", desc, title),
                                    source: format!("{} ({})", feed, url),
                                    confidence: conf.to_string(),
                                    identified_at: now,
                                });
                            }
                        }
                    }
                }
            }
        }

        // Calendar-based inference strictly marked as inference if within seasonal windows
        let current_month = chrono::Utc::now().format("%m").to_string().parse::<u32>().unwrap_or(0);
        if current_month == 11 {
            return Some(DealReason {
                id: 0,
                appid,
                reason: "Posible coincidencia con período otoñal de Steam (Rebajas de Noviembre)".to_string(),
                source: "Inferencia basada en el calendario oficial de eventos de Steam".to_string(),
                confidence: "seasonal_inference".to_string(),
                identified_at: now,
            });
        } else if current_month == 12 || current_month == 1 {
            return Some(DealReason {
                id: 0,
                appid,
                reason: "Posible coincidencia con el período invernal de Steam (Rebajas de Fin de Año)".to_string(),
                source: "Inferencia basada en el calendario oficial de eventos de Steam".to_string(),
                confidence: "seasonal_inference".to_string(),
                identified_at: now,
            });
        } else if current_month == 6 || current_month == 7 {
            return Some(DealReason {
                id: 0,
                appid,
                reason: "Posible coincidencia con el período estival de Steam (Rebajas de Verano)".to_string(),
                source: "Inferencia basada en el calendario oficial de eventos de Steam".to_string(),
                confidence: "seasonal_inference".to_string(),
                identified_at: now,
            });
        }

        // Truthful honest fallback when no specific event is identified
        Some(DealReason {
            id: 0,
            appid,
            reason: "Motivo de la oferta no identificado (descuento temporal del desarrollador o editor)".to_string(),
            source: "Steam Store API".to_string(),
            confidence: "unidentified".to_string(),
            identified_at: now,
        })
    }

    /// Extracts SteamID64 or vanity username from user input
    pub fn parse_steam_id_or_vanity(input: &str) -> (Option<u64>, Option<String>) {
        let trimmed = input.trim();

        // Check for /profiles/<id>
        if let Some(pos) = trimmed.find("/profiles/") {
            let after = &trimmed[pos + 10..];
            let end_pos = after.find('/').or_else(|| after.find('?')).unwrap_or(after.len());
            let id_str = &after[..end_pos];
            if let Ok(id) = id_str.parse::<u64>() {
                return (Some(id), None);
            }
        }

        // Check for /id/<vanity> or /wishlist/id/<vanity>
        if let Some(pos) = trimmed.find("/id/") {
            let after = &trimmed[pos + 4..];
            let end_pos = after.find('/').or_else(|| after.find('?')).unwrap_or(after.len());
            let vanity = after[..end_pos].trim().to_string();
            if !vanity.is_empty() {
                return (None, Some(vanity));
            }
        }

        // If raw number (64-bit SteamID)
        if let Ok(id) = trimmed.parse::<u64>() {
            return (Some(id), None);
        }

        // Otherwise assume vanity slug
        let clean = trimmed.trim_matches('/').to_string();
        (None, Some(clean))
    }

    /// Resolves custom vanity URL name to 64-bit SteamID using public profile XML
    pub async fn resolve_vanity_to_steamid64(&self, vanity: &str) -> Result<u64, String> {
        let url = format!("https://steamcommunity.com/id/{}/?xml=1", vanity);
        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Error conectando con el perfil de Steam: {}", e))?;

        let text = resp
            .text()
            .await
            .map_err(|e| format!("Error leyendo perfil XML: {}", e))?;

        if let Some(start) = text.find("<steamID64>") {
            let rest = &text[start + 11..];
            if let Some(end) = rest.find("</steamID64>") {
                let id_str = rest[..end].trim();
                if let Ok(id) = id_str.parse::<u64>() {
                    return Ok(id);
                }
            }
        }

        Err(format!(
            "No se pudo resolver el perfil de Steam '{}'. Verifica que el nombre sea correcto.",
            vanity
        ))
    }

    /// Fetches all AppIDs from a public Steam Wishlist using multiple fallback strategies
    pub async fn fetch_wishlist_appids(&self, input: &str) -> Result<Vec<u32>, String> {
        let (mut steamid64_opt, vanity_opt) = Self::parse_steam_id_or_vanity(input);

        // If we only have vanity, try to resolve to steamid64
        if steamid64_opt.is_none() {
            if let Some(ref vanity) = vanity_opt {
                if let Ok(resolved) = self.resolve_vanity_to_steamid64(vanity).await {
                    steamid64_opt = Some(resolved);
                }
            }
        }

        let mut appids: Vec<u32> = Vec::new();

        // Strategy 1: IWishlistService public Web API if steamid64 is known
        if let Some(steamid) = steamid64_opt {
            let api_url = format!(
                "https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid={}",
                steamid
            );
            if let Ok(resp) = self.client.get(&api_url).send().await {
                if let Ok(json) = resp.json::<Value>().await {
                    if let Some(items) = json["response"]["items"].as_array() {
                        for item in items {
                            if let Some(id) = item["appid"].as_u64() {
                                appids.push(id as u32);
                            }
                        }
                    }
                }
            }
        }

        // Strategy 2: Storefront wishlistdata endpoint
        if appids.is_empty() {
            let target = if let Some(steamid) = steamid64_opt {
                format!("profiles/{}", steamid)
            } else if let Some(ref vanity) = vanity_opt {
                format!("id/{}", vanity)
            } else {
                return Err("No se pudo identificar un usuario de Steam válido.".to_string());
            };

            // Page 0 of wishlistdata
            let store_url = format!("https://store.steampowered.com/wishlist/{}/wishlistdata/?p=0", target);
            if let Ok(resp) = self.client.get(&store_url).send().await {
                if let Ok(json) = resp.json::<Value>().await {
                    if let Some(map) = json.as_object() {
                        for key in map.keys() {
                            if let Ok(id) = key.parse::<u32>() {
                                appids.push(id);
                            }
                        }
                    }
                }
            }
        }

        // Strategy 3: Wishlist HTML embedded g_rgWishlistData
        if appids.is_empty() {
            let target = if let Some(steamid) = steamid64_opt {
                format!("profiles/{}", steamid)
            } else if let Some(ref vanity) = vanity_opt {
                format!("id/{}", vanity)
            } else {
                return Err("No se pudo identificar un usuario de Steam válido.".to_string());
            };

            let html_url = format!("https://store.steampowered.com/wishlist/{}/", target);
            if let Ok(resp) = self.client.get(&html_url).send().await {
                if let Ok(html) = resp.text().await {
                    if let Some(pos) = html.find("g_rgWishlistData = [") {
                        let after = &html[pos + 19..];
                        if let Some(end) = after.find("];") {
                            let json_str = format!("[{}]", &after[..end]);
                            if let Ok(items) = serde_json::from_str::<Vec<Value>>(&json_str) {
                                for item in items {
                                    if let Some(id) = item["appid"].as_u64() {
                                        appids.push(id as u32);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Deduplicate
        appids.sort_unstable();
        appids.dedup();

        if appids.is_empty() {
            return Err("No se encontraron videojuegos en la lista de deseados o el perfil está configurado como Privado. Por favor, asegúrate de que en Privacidad de Steam tanto tu perfil como los 'Detalles de los juegos' estén en 'Público'.".to_string());
        }

        Ok(appids)
    }

    /// Fetches live free game giveaways, 100% off deals, and Steam promos
    pub async fn fetch_free_giveaways(&self) -> Result<Vec<FreeGiveaway>, String> {
        let mut giveaways: Vec<FreeGiveaway> = Vec::new();

        // 1. Fetch live Steam giveaways from GamerPower API
        let gp_url = "https://www.gamerpower.com/api/giveaways?platform=steam";
        if let Ok(resp) = self.client.get(gp_url).send().await {
            if let Ok(items) = resp.json::<Vec<Value>>().await {
                for it in items {
                    let id = it["id"].as_i64().map(|n| n.to_string()).unwrap_or_default();
                    let title = it["title"].as_str().unwrap_or("").to_string();
                    if title.is_empty() {
                        continue;
                    }
                    let worth = it["worth"].as_str().unwrap_or("N/A").to_string();
                    let thumbnail = it["thumbnail"].as_str().unwrap_or("").to_string();
                    let image = it["image"].as_str().unwrap_or(&thumbnail).to_string();
                    let description = it["description"].as_str().unwrap_or("").to_string();
                    let instructions = it["instructions"].as_str().map(|s| s.to_string());
                    let claim_url = it["open_giveaway_url"]
                        .as_str()
                        .or_else(|| it["open_giveaway"].as_str())
                        .or_else(|| it["gamerpower_url"].as_str())
                        .unwrap_or("")
                        .to_string();
                    let published_date = it["published_date"].as_str().map(|s| s.to_string());
                    let raw_type = it["type"].as_str().unwrap_or("Other");
                    let giveaway_type = match raw_type {
                        "Game" => "Juego completo".to_string(),
                        "DLC" => "DLC / Expansión".to_string(),
                        "Early Access" => "Acceso anticipado / Beta".to_string(),
                        _ => "Promoción especial".to_string(),
                    };
                    let platforms = it["platforms"].as_str().unwrap_or("Steam").to_string();
                    let end_date = it["end_date"].as_str().and_then(|s| {
                        if s == "N/A" || s.trim().is_empty() {
                            None
                        } else {
                            Some(s.to_string())
                        }
                    });
                    let is_steam_direct = claim_url.contains("store.steampowered.com") || title.to_lowercase().contains("steam");

                    giveaways.push(FreeGiveaway {
                        id,
                        title,
                        worth,
                        thumbnail,
                        image,
                        description,
                        instructions,
                        claim_url,
                        published_date,
                        giveaway_type,
                        platforms,
                        end_date,
                        is_steam_direct,
                    });
                }
            }
        }

        // 2. Query direct Steam 100% discount specials
        let steam_search_url = "https://store.steampowered.com/search/results/?query=&maxprice=free&specials=1&ndl=1&infinite=1";
        if let Ok(resp) = self.client.get(steam_search_url).send().await {
            if let Ok(json) = resp.json::<Value>().await {
                if let Some(html) = json["results_html"].as_str() {
                    let mut start = 0;
                    while let Some(pos) = html[start..].find("data-ds-appid=\"") {
                        let idx = start + pos + 15;
                        if let Some(end_idx) = html[idx..].find('"') {
                            let appid_str = &html[idx..idx + end_idx];
                            if let Ok(appid) = appid_str.parse::<u32>() {
                                let row_sub = &html[idx..idx + end_idx + 800.min(html.len() - (idx + end_idx))];
                                let title = if let Some(t_pos) = row_sub.find("class=\"title\">") {
                                    let t_after = &row_sub[t_pos + 14..];
                                    if let Some(t_end) = t_after.find('<') {
                                        t_after[..t_end].trim().to_string()
                                    } else {
                                        format!("Steam Juego (AppID: {})", appid)
                                    }
                                } else {
                                    format!("Steam Juego (AppID: {})", appid)
                                };

                                let direct_id = format!("steam-{}", appid);
                                if !giveaways.iter().any(|g| g.id == direct_id || g.claim_url.contains(&format!("/app/{}", appid))) {
                                    giveaways.insert(0, FreeGiveaway {
                                        id: direct_id,
                                        title,
                                        worth: "Gratis en Steam".to_string(),
                                        thumbnail: format!("https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{}/header.jpg", appid),
                                        image: format!("https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{}/header.jpg", appid),
                                        description: "¡Promoción directa en Steam con 100% de descuento (Free to keep)! Reclámalo antes de que termine.".to_string(),
                                        instructions: Some("Haz clic en Reclamar para abrir la página del juego en Steam y añadirlo permanentemente a tu cuenta de Steam sin coste.".to_string()),
                                        claim_url: format!("https://store.steampowered.com/app/{}/", appid),
                                        published_date: None,
                                        giveaway_type: "Juego completo (Steam Store)".to_string(),
                                        platforms: "Steam (Directo)".to_string(),
                                        end_date: None,
                                        is_steam_direct: true,
                                    });
                                }
                            }
                            start = idx + end_idx;
                        } else {
                            break;
                        }
                    }
                }
            }
        }

        Ok(giveaways)
    }

    /// Checks for latest application releases from GitHub
    pub async fn check_app_update(&self) -> Result<AppUpdateInfo, String> {
        let current_version = "1.0.0".to_string();
        let url = "https://api.github.com/repos/godnessvprojects/steam-watcher/releases/latest";

        let resp = match self.client.get(url).send().await {
            Ok(r) => r,
            Err(_) => {
                return Ok(AppUpdateInfo {
                    current_version,
                    latest_version: "1.0.0".to_string(),
                    has_update: false,
                    release_notes: None,
                    download_url: None,
                    html_url: None,
                });
            }
        };

        if !resp.status().is_success() {
            return Ok(AppUpdateInfo {
                current_version,
                latest_version: "1.0.0".to_string(),
                has_update: false,
                release_notes: None,
                download_url: None,
                html_url: None,
            });
        }

        if let Ok(json) = resp.json::<Value>().await {
            let tag = json["tag_name"].as_str().unwrap_or("1.0.0");
            let latest_clean = tag.trim_start_matches('v').trim();
            let release_notes = json["body"].as_str().map(|s| s.to_string());
            let html_url = json["html_url"].as_str().map(|s| s.to_string());

            let mut download_url = None;
            if let Some(assets) = json["assets"].as_array() {
                for a in assets {
                    let name = a["name"].as_str().unwrap_or("");
                    if name.ends_with(".exe") {
                        download_url = a["browser_download_url"].as_str().map(|s| s.to_string());
                        if name.contains("setup") || name.contains("Instalador") {
                            break;
                        }
                    }
                }
            }
            if download_url.is_none() {
                download_url = html_url.clone();
            }

            let has_update = is_newer_version(&current_version, latest_clean);

            return Ok(AppUpdateInfo {
                current_version,
                latest_version: latest_clean.to_string(),
                has_update,
                release_notes,
                download_url,
                html_url,
            });
        }

        Ok(AppUpdateInfo {
            current_version,
            latest_version: "1.0.0".to_string(),
            has_update: false,
            release_notes: None,
            download_url: None,
            html_url: None,
        })
    }
}

fn is_newer_version(current: &str, latest: &str) -> bool {
    let parse = |v: &str| -> Vec<u32> {
        v.split('.')
            .filter_map(|s| s.parse::<u32>().ok())
            .collect()
    };
    let c = parse(current);
    let l = parse(latest);
    for i in 0..c.len().max(l.len()) {
        let c_num = c.get(i).copied().unwrap_or(0);
        let l_num = l.get(i).copied().unwrap_or(0);
        if l_num > c_num {
            return true;
        } else if l_num < c_num {
            return false;
        }
    }
    false
}
