//! HTTP routes: JSON API, map tiles, and static files.
//!
//! Static serving is limited to three folders (`ui/`, `images/`,
//! `wallpapers/`); `ServeDir` rejects `..` segments, so nothing else on disk
//! is reachable. `data/`, `cache/` and `staging/` are never served directly.

use std::{path::PathBuf, sync::Arc};

use axum::{
    extract::{Path, Query, Request, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    middleware::{self, Next},
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
        .route("/api/update/download", post(update_download))
        .route("/api/update/progress", get(update_progress))
        .route("/api/update/install", post(update_install))
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
        .layer(middleware::from_fn(local_only))
        .with_state(state)
}

/// Is this `host[:port]` the loopback address? A browser sends the name it
/// was given, so a page on another site that points its own domain at
/// 127.0.0.1 (DNS rebinding) arrives with that domain here and is refused.
fn is_loopback_host(host: &str) -> bool {
    let name = match host.strip_prefix('[') {
        Some(rest) => rest.split(']').next().unwrap_or_default(),
        None => host.rsplit_once(':').map_or(host, |(name, _)| name),
    };
    matches!(name.to_ascii_lowercase().as_str(), "127.0.0.1" | "localhost" | "::1")
}

/// Requests are served only when addressed to the loopback address, and, when
/// a browser says where the request came from, only when that is this app too.
fn request_is_local(headers: &HeaderMap) -> bool {
    let text = |name| headers.get(name).and_then(|v: &HeaderValue| v.to_str().ok());
    let host_ok = text(header::HOST).is_some_and(is_loopback_host);
    let origin_ok =
        text(header::ORIGIN).is_none_or(|origin| origin.strip_prefix("http://").is_some_and(is_loopback_host));
    host_ok && origin_ok
}

/// What a page served by the app may load: only the app's own files. Scripts
/// must be files in `ui/` (nothing inline, nothing from elsewhere), so text
/// that somehow reached a page unescaped still could not run as code. Inline
/// styles are allowed because the interface sets them.
const CONTENT_SECURITY_POLICY: &str = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';      img-src 'self' data: blob:; media-src 'self'; connect-src 'self'; font-src 'self' data:;      object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

async fn local_only(request: Request, next: Next) -> Response {
    if !request_is_local(request.headers()) {
        return StatusCode::FORBIDDEN.into_response();
    }
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static(CONTENT_SECURITY_POLICY),
    );
    // Files are used as the type they are served as, never guessed from their contents.
    headers.insert(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
    // Links that open in the browser do not carry the app's address with them.
    headers.insert(header::REFERRER_POLICY, HeaderValue::from_static("no-referrer"));
    response
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

async fn media_catalogue(State(state): State<AppState>) -> Response {
    let root = state.root.clone();
    match tokio::task::spawn_blocking(move || media::catalogue_json(&root)).await {
        Ok(json) => ([(header::CONTENT_TYPE, "application/json")], json).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// The data integrity report (hashes every media file, so it runs off the
/// async threads).
/// The Field Manual's content, `data/manual.json`. Read on each request so
/// edits show on refresh; it is one small file.
async fn manual(State(state): State<AppState>) -> Response {
    let root = state.root.clone();
    match tokio::task::spawn_blocking(move || validate::load_manual(&root)).await {
        Ok(Ok(Some(manual))) => Json(manual).into_response(),
        Ok(Ok(None)) => StatusCode::NOT_FOUND.into_response(),
        _ => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
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
    let checked = tokio::task::spawn_blocking(move || {
        let mut status = update::status(&root);
        // Only a copy that Setup installed can update itself; a portable copy gets the link.
        status["can_install"] =
            Value::Bool(update::installed(&root) && status["setup"].is_string() && status["sums"].is_string());
        status
    });
    match checked.await {
        Ok(status) => Json(status).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// Start downloading the newest release's setup program. The address comes from GitHub's
/// own answer, never from the request.
async fn update_download(State(state): State<AppState>) -> Response {
    let root = state.root.clone();
    match tokio::task::spawn_blocking(move || update::start_download(&root)).await {
        Ok(progress) => Json(progress).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn update_progress() -> Json<Value> {
    Json(update::progress())
}

/// Run the downloaded, checked setup program and close the app so it can be replaced.
async fn update_install() -> Response {
    match update::install() {
        Ok(()) => {
            // Give this answer time to reach the page before the app goes.
            std::thread::spawn(|| {
                std::thread::sleep(std::time::Duration::from_millis(600));
                std::process::exit(0);
            });
            Json(serde_json::json!({"started": true})).into_response()
        }
        Err(reason) => (
            StatusCode::CONFLICT,
            Json(serde_json::json!({"started": false, "error": reason})),
        )
            .into_response(),
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

#[cfg(test)]
mod local_only_tests {
    use super::*;

    fn headers(pairs: &[(header::HeaderName, &str)]) -> HeaderMap {
        pairs
            .iter()
            .map(|(k, v)| (k.clone(), HeaderValue::from_str(v).unwrap()))
            .collect()
    }

    #[test]
    fn only_requests_addressed_to_loopback_are_served() {
        assert!(request_is_local(&headers(&[(header::HOST, "127.0.0.1:51234")])));
        assert!(request_is_local(&headers(&[(header::HOST, "localhost:51234")])));
        assert!(request_is_local(&headers(&[(header::HOST, "[::1]:51234")])));
        assert!(!request_is_local(&headers(&[(header::HOST, "evil.example:51234")])));
        assert!(!request_is_local(&headers(&[(header::HOST, "127.0.0.1.evil.example")])));
        assert!(!request_is_local(&headers(&[])));
    }

    #[test]
    fn the_policy_allows_only_the_apps_own_scripts() {
        assert!(CONTENT_SECURITY_POLICY.contains("script-src 'self';"));
        assert!(CONTENT_SECURITY_POLICY.contains("object-src 'none'"));
        assert!(CONTENT_SECURITY_POLICY.contains("frame-ancestors 'none'"));
        assert!(!CONTENT_SECURITY_POLICY.contains("unsafe-eval"));
        // The only inline allowance is for styles.
        assert_eq!(CONTENT_SECURITY_POLICY.matches("'unsafe-inline'").count(), 1);
        assert!(HeaderValue::from_str(CONTENT_SECURITY_POLICY).is_ok());
    }

    #[test]
    fn a_request_from_another_site_is_refused() {
        let from = |origin| headers(&[(header::HOST, "127.0.0.1:51234"), (header::ORIGIN, origin)]);
        assert!(request_is_local(&from("http://127.0.0.1:51234")));
        assert!(request_is_local(&from("http://localhost:51234")));
        assert!(!request_is_local(&from("https://evil.example")));
        assert!(!request_is_local(&from("null")));
    }
}
