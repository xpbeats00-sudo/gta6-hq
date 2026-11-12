//! HTTP routes: JSON API, map tiles, and static files.
//!
//! Static serving is limited to three folders (`ui/`, `images/`,
//! `wallpapers/`); `ServeDir` rejects `..` segments, so nothing else on disk
//! is reachable. `data/`, `cache/` and `staging/` are never served directly.

use std::{path::PathBuf, sync::Arc};

use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::Value;
use tower::ServiceBuilder;
use tower_http::{services::ServeDir, set_header::SetResponseHeaderLayer};

use crate::{content, discord, media, search, tiles, update, validate};

#[derive(Clone)]
pub struct AppState {
    pub root: Arc<PathBuf>,
    /// The wiki, loaded once and reloaded when its files change.
    pub store: Arc<content::Store>,
    /// Where page changes go for Discord Rich Presence (`None` when it is off).
    pub presence: Option<discord::Handle>,
}

impl AppState {
    pub fn new(root: PathBuf, presence: Option<discord::Handle>) -> Self {
        Self {
            store: Arc::new(content::Store::new(root.clone())),
            root: Arc::new(root),
            presence,
        }
    }
}

pub fn router(state: AppState) -> Router {
    let root = state.root.clone();
    Router::new()
        .route("/api/wiki", get(wiki))
        .route("/api/search", get(search_wiki))
        .route("/api/media", get(media_catalogue))
        .route("/api/health", get(health))
        .route("/api/manual", get(manual))
        .route("/api/presence", post(presence).get(presence_status))
        .route("/api/update", get(update_status))
        .route("/tiles/{z}/{y}/{file}", get(tile))
        .nest_service("/images", ServeDir::new(root.join("images")))
        .nest_service("/wallpapers", ServeDir::new(root.join("wallpapers")))
        // The UI is small and local: always revalidate so edits show up at once.
        .fallback_service(
            ServiceBuilder::new()
                .layer(SetResponseHeaderLayer::overriding(
                    header::CACHE_CONTROL,
                    HeaderValue::from_static("no-cache"),
                ))
                .service(ServeDir::new(root.join("ui"))),
        )
        .with_state(state)
}

/// The current wiki. Checking whether files changed touches the disk, so it
/// runs off the async threads; an unchanged wiki is not read again.
async fn snapshot(state: &AppState) -> Result<Arc<content::Snapshot>, StatusCode> {
    let store = state.store.clone();
    tokio::task::spawn_blocking(move || store.get())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// The whole encyclopedia, without drafts. Held in memory; edits to the data
/// files and newly dropped images still show up on refresh.
async fn wiki(State(state): State<AppState>) -> Response {
    match snapshot(&state).await {
        Ok(snapshot) => (
            [
                (header::CONTENT_TYPE, "application/json"),
                (header::CACHE_CONTROL, "no-cache"),
            ],
            snapshot.json.clone(),
        )
            .into_response(),
        Err(status) => status.into_response(),
    }
}

#[derive(Deserialize)]
struct SearchParams {
    #[serde(default)]
    q: String,
    section: Option<String>,
    #[serde(default)]
    rumors: bool,
    /// Match and return the text of spoiler entries.
    #[serde(default)]
    spoilers: bool,
    /// `name` for alphabetical order; anything else is best match first.
    sort: Option<String>,
    limit: Option<usize>,
    #[serde(default)]
    offset: usize,
}

/// One page of results: `{ total, offset, limit, hits }`.
async fn search_wiki(State(state): State<AppState>, Query(params): Query<SearchParams>) -> Response {
    // Queries are tiny; anything huge is not a real search.
    let text: String = params.q.chars().take(200).collect();
    let query = search::Query {
        text: &text,
        section: params.section.as_deref().filter(|s| !s.is_empty()),
        include_rumors: params.rumors,
        include_spoilers: params.spoilers,
        sort: if params.sort.as_deref() == Some("name") {
            search::Sort::Name
        } else {
            search::Sort::Relevance
        },
    };
    match snapshot(&state).await {
        Ok(snapshot) => Json(
            snapshot
                .index
                .page(&query, params.offset, params.limit.unwrap_or(search::DEFAULT_LIMIT)),
        )
        .into_response(),
        Err(status) => status.into_response(),
    }
}

async fn media_catalogue(State(state): State<AppState>) -> Json<media::Catalogue> {
    Json(media::scan(&state.root))
}

/// The data integrity report (hashes every media file, so it runs off the
/// async threads).
/// The Field Manual's content, `data/manual.json`. Read on each request so
/// edits show on refresh; it is one small file.
async fn manual(State(state): State<AppState>) -> Response {
    match validate::load_manual(&state.root) {
        Ok(Some(manual)) => Json(manual).into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn health(State(state): State<AppState>) -> Response {
    let root = state.root.clone();
    match tokio::task::spawn_blocking(move || validate::validate(&root)).await {
        Ok(report) => Json(report).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

#[derive(Deserialize)]
struct PresenceUpdate {
    #[serde(default)]
    details: String,
    #[serde(default)]
    state: String,
}

/// The interface reports which page is open; pass it on to Discord.
async fn presence(State(state): State<AppState>, Json(update): Json<PresenceUpdate>) -> StatusCode {
    if let Some(handle) = &state.presence {
        handle.update(discord::Presence::new(&update.details, &update.state));
    }
    StatusCode::NO_CONTENT
}

/// Whether Rich Presence is switched on, and whether Discord answered.
/// Whether a newer release exists. The check asks GitHub, so it runs off the async threads.
async fn update_status(State(state): State<AppState>) -> Response {
    let root = state.root.clone();
    match tokio::task::spawn_blocking(move || update::status(&root)).await {
        Ok(status) => Json(status).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn presence_status(State(state): State<AppState>) -> Json<Value> {
    Json(serde_json::json!({
        "enabled": state.presence.is_some(),
        "connected": state.presence.as_ref().is_some_and(discord::Handle::is_connected),
    }))
}

async fn tile(State(state): State<AppState>, Path((z, y, file)): Path<(u8, u32, String)>) -> Response {
    let Some(x) = file.strip_suffix(".webp").and_then(|x| x.parse::<u32>().ok()) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let root = state.root.clone();
    let fetched = tokio::task::spawn_blocking(move || tiles::get(&root, z, y, x)).await;
    match fetched {
        Ok(Ok(bytes)) => (
            [
                (header::CONTENT_TYPE, "image/webp"),
                (header::CACHE_CONTROL, "public, max-age=604800"),
            ],
            bytes,
        )
            .into_response(),
        Ok(Err(tiles::TileError::NotFound)) => StatusCode::NOT_FOUND.into_response(),
        // Offline or the provider is unhappy: tell the map so it can say so.
        _ => StatusCode::BAD_GATEWAY.into_response(),
    }
}
