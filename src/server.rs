//! HTTP routes: JSON API, map tiles, and static files.
//!
//! Static serving is limited to three folders (`ui/`, `images/`,
//! `wallpapers/`); `ServeDir` rejects `..` segments, so nothing else on disk
//! is reachable. `data/`, `cache/` and `staging/` are never served directly.

use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
    time::SystemTime,
};

use axum::{
    extract::{DefaultBodyLimit, Path, Query, Request, State},
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

use crate::{backup, content, discord, media, search, settings, tiles, update, userdata, validate};

#[derive(Clone)]
pub struct AppState {
    pub root: Arc<PathBuf>,
    /// The wiki, loaded once and reloaded when its files change.
    pub store: Arc<content::Store>,
    /// Where page changes go for Discord Rich Presence (`None` when it is off).
    pub presence: Option<discord::Handle>,
    /// The Field Manual as served, kept until `data/manual.json` changes.
    manual: Arc<ManualCache>,
    /// The port this server listens on. A page that says where it came from
    /// must come from this port too, not from another local server.
    port: u16,
}

impl AppState {
    pub fn new(root: PathBuf, port: u16, presence: Option<discord::Handle>) -> Self {
        Self {
            store: Arc::new(content::Store::new(root.clone())),
            root: Arc::new(root),
            presence,
            manual: Arc::new(ManualCache::default()),
            port,
        }
    }
}

/// A JSON body ready to send, and its `ETag`.
struct Served {
    json: String,
    etag: String,
}

/// `data/manual.json`, encoded once and re-read only when its size or
/// modification time changes, so edits still show on refresh.
/// A file's size and modification time: when either changes, it is read again.
type Stamp = (u64, Option<SystemTime>);

#[derive(Default)]
struct ManualCache {
    cached: Mutex<Option<(Stamp, Arc<Served>)>>,
}

impl ManualCache {
    fn get(&self, root: &std::path::Path) -> Result<Option<Arc<Served>>, String> {
        let file = root.join("data").join("manual.json");
        // Stamp first: a file saved while it is being read makes the next call reload.
        let stamp = match std::fs::metadata(&file) {
            Ok(meta) => (meta.len(), meta.modified().ok()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => (u64::MAX, None),
            Err(e) => return Err(e.to_string()),
        };
        let mut cached = self.cached.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        if let Some((seen, served)) = cached.as_ref() {
            if *seen == stamp {
                return Ok(Some(served.clone()));
            }
        }
        let Some(manual) = validate::load_manual(root)? else {
            *cached = None;
            return Ok(None);
        };
        let json = serde_json::to_string(&manual).map_err(|e| e.to_string())?;
        let served = Arc::new(Served {
            etag: content::etag_of(json.as_bytes()),
            json,
        });
        *cached = Some((stamp, served.clone()));
        Ok(Some(served))
    }
}

/// Answer with `json`, or with `304 Not Modified` when the page already holds
/// exactly this body (its `If-None-Match` names this `etag`).
fn json_with_etag(request: &HeaderMap, json: &str, etag: &str) -> Response {
    let unchanged = request
        .get(header::IF_NONE_MATCH)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|tags| {
            tags.split(',')
                .map(str::trim)
                .any(|tag| tag == "*" || tag.strip_prefix("W/").unwrap_or(tag) == etag)
        });
    let mut response = if unchanged {
        StatusCode::NOT_MODIFIED.into_response()
    } else {
        ([(header::CONTENT_TYPE, "application/json")], json.to_owned()).into_response()
    };
    let headers = response.headers_mut();
    // Always revalidate, so edits to the data files show on refresh.
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    if let Ok(value) = HeaderValue::from_str(etag) {
        headers.insert(header::ETAG, value);
    }
    response
}

pub fn router(state: AppState) -> Router {
    let root = state.root.clone();
    Router::new()
        .route("/api/wiki", get(wiki))
        .route("/api/search", get(search_wiki))
        .route("/api/media", get(media_catalogue))
        .route("/api/health", get(health))
        .route("/api/storage", get(storage))
        .route("/api/manual", get(manual))
        .route("/api/presence", post(presence).get(presence_status))
        .route("/api/settings", get(settings_read).post(settings_write))
        // Saved data may reach `userdata::MAX_BYTES` in one request; axum's own limit is 2 MB.
        .route(
            "/api/userdata",
            get(userdata_read)
                .post(userdata_write)
                .layer(DefaultBodyLimit::max(userdata::MAX_REQUEST_BYTES)),
        )
        // A backup of the saved data and settings, written to the reader's Downloads folder.
        .route(
            "/api/backup",
            post(backup_write).layer(DefaultBodyLimit::max(backup::MAX_REQUEST_BYTES)),
        )
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
        .layer(middleware::from_fn_with_state(state.clone(), local_only))
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

/// The port in `host:port` (or `[::1]:port`), if one is given.
fn port_of(host: &str) -> Option<u16> {
    let after = match host.strip_prefix('[') {
        Some(rest) => rest.split_once(']')?.1,
        None => host,
    };
    after.rsplit_once(':')?.1.parse().ok()
}

/// Requests are served only when addressed to the loopback address, and, when
/// a browser says where the request came from, only when that is this app too:
/// a loopback page on this server's own `port`. A page served by another local
/// program (another port) may not change saved data or settings, or start an update.
fn request_is_local(headers: &HeaderMap, port: u16) -> bool {
    let text = |name| headers.get(name).and_then(|v: &HeaderValue| v.to_str().ok());
    let host_ok = text(header::HOST).is_some_and(is_loopback_host);
    let origin_ok = text(header::ORIGIN).is_none_or(|origin| {
        origin
            .strip_prefix("http://")
            // Browsers leave out the default port, so an Origin with none means port 80.
            .is_some_and(|from| is_loopback_host(from) && port_of(from).unwrap_or(80) == port)
    });
    host_ok && origin_ok
}

/// What a page served by the app may load: only the app's own files. Scripts
/// must be files in `ui/` (nothing inline, nothing from elsewhere), so text
/// that somehow reached a page unescaped still could not run as code. Inline
/// styles are allowed because the interface sets them.
const CONTENT_SECURITY_POLICY: &str = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';      img-src 'self' data: blob:; media-src 'self'; connect-src 'self'; font-src 'self' data:;      object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

async fn local_only(State(state): State<AppState>, request: Request, next: Next) -> Response {
    if !request_is_local(request.headers(), state.port) {
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
async fn wiki(State(state): State<AppState>, headers: HeaderMap) -> Response {
    match snapshot(&state).await {
        Ok(snapshot) => json_with_etag(&headers, &snapshot.json, &snapshot.etag),
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

/// The Field Manual's content, `data/manual.json`. Encoded once and kept
/// until the file changes, so edits still show on refresh.
async fn manual(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let (root, cache) = (state.root.clone(), state.manual.clone());
    match tokio::task::spawn_blocking(move || cache.get(&root)).await {
        Ok(Ok(Some(served))) => json_with_etag(&headers, &served.json, &served.etag),
        Ok(Ok(None)) => StatusCode::NOT_FOUND.into_response(),
        _ => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// The data integrity report (hashes every media file, so it runs off the
/// async threads).
async fn health(State(state): State<AppState>) -> Response {
    let root = state.root.clone();
    match tokio::task::spawn_blocking(move || validate::validate(&root)).await {
        Ok(report) => Json(report).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// Whether this copy of the app keeps settings and saved data in files named by
/// `GTA6_HQ_SETTINGS` and `GTA6_HQ_USERDATA` (a test run) rather than the reader's own. The
/// page tests check it before they reset anything, so they can never wipe real data.
async fn storage() -> Response {
    let named = |var: &str| std::env::var_os(var).is_some_and(|v| !v.is_empty());
    let throwaway = named("GTA6_HQ_SETTINGS") && named("GTA6_HQ_USERDATA");
    (
        [(header::CACHE_CONTROL, "no-store")],
        Json(serde_json::json!({ "throwaway": throwaway })),
    )
        .into_response()
}

/// The reader's saved choices, as `{ name: value }`.
async fn settings_read(State(state): State<AppState>) -> Response {
    let root = state.root.clone();
    match tokio::task::spawn_blocking(move || settings::load(&settings::file(&root))).await {
        Ok(saved) => ([(header::CACHE_CONTROL, "no-store")], Json(saved)).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// Save one or more choices; the rest stay as they were. Answers with all of them.
async fn settings_write(State(state): State<AppState>, Json(changes): Json<Value>) -> Response {
    let root = state.root.clone();
    match tokio::task::spawn_blocking(move || settings::merge(&settings::file(&root), &changes)).await {
        Ok(Ok(saved)) => Json(saved).into_response(),
        Ok(Err(settings::Error::Invalid(reason))) => (StatusCode::BAD_REQUEST, reason).into_response(),
        Ok(Err(settings::Error::Unwritable(reason))) => (StatusCode::INTERNAL_SERVER_ERROR, reason).into_response(),
        _ => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// The reader's saved collections (favourites, ticks, routes...), as `{ part: value }`.
async fn userdata_read(State(state): State<AppState>) -> Response {
    let root = state.root.clone();
    match tokio::task::spawn_blocking(move || userdata::read(&userdata::file(&root))).await {
        // The file is there but can't be read now: say so, so the page saves nothing over it.
        Ok(Err(e)) => (
            StatusCode::SERVICE_UNAVAILABLE,
            [(header::CACHE_CONTROL, "no-store")],
            format!("The saved-data file could not be read: {e}"),
        )
            .into_response(),
        Ok(Ok((saved, aside))) => {
            let mut response = ([(header::CACHE_CONTROL, "no-store")], Json(Value::Object(saved))).into_response();
            // The page tells the reader their saved data was damaged and where the old copy is.
            if let Some(name) = aside.and_then(|a| a.file_name().map(|n| n.to_string_lossy().into_owned())) {
                if let Ok(value) = header::HeaderValue::from_str(&name) {
                    response.headers_mut().insert("x-userdata-set-aside", value);
                }
            }
            response
        }
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// Replace one or more named parts (`null` removes one); the rest stay as they were.
async fn userdata_write(State(state): State<AppState>, Json(changes): Json<Value>) -> Response {
    let root = state.root.clone();
    match tokio::task::spawn_blocking(move || userdata::merge(&userdata::file(&root), &changes)).await {
        Ok(Ok(_)) => StatusCode::NO_CONTENT.into_response(),
        Ok(Err(userdata::Error::Invalid(reason))) => (StatusCode::BAD_REQUEST, reason).into_response(),
        Ok(Err(userdata::Error::Unwritable(reason))) => (StatusCode::INTERNAL_SERVER_ERROR, reason).into_response(),
        _ => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// Write the backup the page built and answer with where it went: `{ "path": "…" }`.
async fn backup_write(State(state): State<AppState>, Json(body): Json<Value>) -> Response {
    let root = state.root.clone();
    match tokio::task::spawn_blocking(move || backup::write(&backup::folder(&root), &body)).await {
        Ok(Ok(path)) => Json(serde_json::json!({ "path": path.display().to_string() })).into_response(),
        Ok(Err(reason)) => (StatusCode::BAD_REQUEST, reason).into_response(),
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
        let local = |h: HeaderMap| request_is_local(&h, 51234);
        assert!(local(headers(&[(header::HOST, "127.0.0.1:51234")])));
        assert!(local(headers(&[(header::HOST, "localhost:51234")])));
        assert!(local(headers(&[(header::HOST, "[::1]:51234")])));
        assert!(!local(headers(&[(header::HOST, "evil.example:51234")])));
        assert!(!local(headers(&[(header::HOST, "127.0.0.1.evil.example")])));
        assert!(!local(headers(&[])));
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
        let from = |origin| {
            request_is_local(
                &headers(&[(header::HOST, "127.0.0.1:51234"), (header::ORIGIN, origin)]),
                51234,
            )
        };
        assert!(from("http://127.0.0.1:51234"));
        assert!(from("http://localhost:51234"));
        assert!(from("http://[::1]:51234"));
        assert!(!from("https://evil.example"));
        assert!(!from("null"));
        // Another program's page on this computer: loopback, but not this app.
        assert!(!from("http://localhost:9999"));
        assert!(!from("http://127.0.0.1:9999"));
        assert!(!from("http://127.0.0.1"));
        assert!(!from("http://[::1]:9999"));
    }

    #[test]
    fn ports_are_read_from_host_and_port() {
        assert_eq!(port_of("127.0.0.1:4545"), Some(4545));
        assert_eq!(port_of("[::1]:4545"), Some(4545));
        assert_eq!(port_of("localhost"), None);
        assert_eq!(port_of("[::1]"), None);
        assert_eq!(port_of("localhost:x"), None);
    }
}

/// The routes as the page calls them, through the whole router (local-only
/// check included). The settings and saved-data files are pointed at a
/// temporary folder with `GTA6_HQ_SETTINGS` and `GTA6_HQ_USERDATA`, so the
/// reader's real files are never read or written.
#[cfg(test)]
// Each test runs on its own runtime; the lock only keeps the tests from sharing the two variables.
#[allow(clippy::await_holding_lock)]
mod route_tests {
    use super::*;
    use axum::body::{to_bytes, Body};
    use tower::ServiceExt;

    /// The two variables are process-wide: one test at a time sets them.
    static FILES: std::sync::Mutex<()> = std::sync::Mutex::new(());

    struct Files {
        folder: PathBuf,
        settings: PathBuf,
        userdata: PathBuf,
    }

    impl Files {
        fn new(name: &str) -> Self {
            let folder = std::env::temp_dir().join(format!("gta6hq-routes-{name}-{}", std::process::id()));
            let _ = std::fs::remove_dir_all(&folder);
            std::fs::create_dir_all(&folder).unwrap();
            let files = Self {
                settings: folder.join("settings.json"),
                userdata: folder.join("userdata.json"),
                folder,
            };
            std::env::set_var("GTA6_HQ_SETTINGS", &files.settings);
            std::env::set_var("GTA6_HQ_USERDATA", &files.userdata);
            // The handlers ask for these paths; make sure they are the temporary ones.
            let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
            assert_eq!(settings::file(root), files.settings);
            assert_eq!(userdata::file(root), files.userdata);
            files
        }
    }

    impl Drop for Files {
        fn drop(&mut self) {
            std::env::remove_var("GTA6_HQ_SETTINGS");
            std::env::remove_var("GTA6_HQ_USERDATA");
            let _ = std::fs::remove_dir_all(&self.folder);
        }
    }

    fn app() -> Router {
        router(AppState::new(PathBuf::from(env!("CARGO_MANIFEST_DIR")), 4545, None))
    }

    fn get_from(uri: &str) -> Request {
        Request::builder()
            .uri(uri)
            .header(header::HOST, "127.0.0.1:4545")
            .body(Body::empty())
            .unwrap()
    }

    fn post_to(uri: &str, body: &str) -> Request {
        Request::builder()
            .method("POST")
            .uri(uri)
            .header(header::HOST, "127.0.0.1:4545")
            .header(header::ORIGIN, "http://127.0.0.1:4545")
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(body.to_string()))
            .unwrap()
    }

    async fn send(request: Request) -> (StatusCode, HeaderMap, String) {
        send_to(app(), request).await
    }

    async fn send_to(app: Router, request: Request) -> (StatusCode, HeaderMap, String) {
        let response = app.oneshot(request).await.unwrap();
        let status = response.status();
        let headers = response.headers().clone();
        let body = to_bytes(response.into_body(), 64 << 20).await.unwrap();
        (status, headers, String::from_utf8(body.to_vec()).unwrap())
    }

    fn json(text: &str) -> Value {
        serde_json::from_str(text).unwrap()
    }

    #[tokio::test]
    async fn settings_are_saved_merged_and_read_back() {
        let _one = FILES.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let files = Files::new("settings");

        let (status, headers, body) = send(get_from("/api/settings")).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(headers.get(header::CACHE_CONTROL).unwrap(), "no-store");
        assert_eq!(json(&body), serde_json::json!({}));

        let (status, _, body) = send(post_to(
            "/api/settings",
            r#"{"show-spoilers":"0","spoiler-notice":"1"}"#,
        ))
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(
            json(&body),
            serde_json::json!({"show-spoilers": "0", "spoiler-notice": "1"})
        );

        // A second write changes one value and keeps the other.
        let (status, _, body) = send(post_to("/api/settings", r#"{"show-spoilers":"1"}"#)).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(
            json(&body),
            serde_json::json!({"show-spoilers": "1", "spoiler-notice": "1"})
        );

        let (status, _, body) = send(get_from("/api/settings")).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(
            json(&body),
            serde_json::json!({"show-spoilers": "1", "spoiler-notice": "1"})
        );
        let on_disk = json(&std::fs::read_to_string(&files.settings).unwrap());
        assert_eq!(
            on_disk,
            serde_json::json!({"show-spoilers": "1", "spoiler-notice": "1"})
        );
    }

    #[tokio::test]
    async fn bad_settings_are_refused_and_change_nothing() {
        let _one = FILES.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let files = Files::new("bad-settings");

        // Not text, a bad name, not an object: each is a 400 and nothing is written.
        for body in [r#"{"show-spoilers":1}"#, r#"{"Bad Name":"x"}"#, r#"["show-spoilers"]"#] {
            let (status, _, _) = send(post_to("/api/settings", body)).await;
            assert_eq!(status, StatusCode::BAD_REQUEST, "{body}");
        }
        assert!(!files.settings.exists());

        // Not JSON at all: refused before the handler runs.
        let (status, _, _) = send(post_to("/api/settings", "{ not json")).await;
        assert!(status.is_client_error());

        // A page on another site may not write the reader's settings.
        let mut from_elsewhere = post_to("/api/settings", r#"{"show-spoilers":"1"}"#);
        from_elsewhere
            .headers_mut()
            .insert(header::ORIGIN, HeaderValue::from_static("https://evil.example"));
        let (status, _, _) = send(from_elsewhere).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
        assert!(!files.settings.exists());
    }

    #[tokio::test]
    async fn userdata_parts_are_replaced_removed_and_read_back() {
        let _one = FILES.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let files = Files::new("userdata");

        let (status, headers, body) = send(get_from("/api/userdata")).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(headers.get(header::CACHE_CONTROL).unwrap(), "no-store");
        assert!(headers.get("x-userdata-set-aside").is_none());
        assert_eq!(json(&body), serde_json::json!({}));

        let (status, _, body) = send(post_to(
            "/api/userdata",
            r#"{"favourites":["characters/jason-duval"],"routes":[{"name":"a"}]}"#,
        ))
        .await;
        assert_eq!(status, StatusCode::NO_CONTENT);
        assert!(body.is_empty());

        // `null` removes a part; a named part is replaced whole.
        let (status, _, _) = send(post_to("/api/userdata", r#"{"routes":null,"ticks":{"x":true}}"#)).await;
        assert_eq!(status, StatusCode::NO_CONTENT);

        let (status, _, body) = send(get_from("/api/userdata")).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(
            json(&body),
            serde_json::json!({"favourites": ["characters/jason-duval"], "ticks": {"x": true}})
        );
        assert!(files.userdata.exists());

        for bad in [r#"{"Bad Name":1}"#, r#"[1,2]"#] {
            let (status, _, _) = send(post_to("/api/userdata", bad)).await;
            assert_eq!(status, StatusCode::BAD_REQUEST, "{bad}");
        }
        let (_, _, body) = send(get_from("/api/userdata")).await;
        assert_eq!(
            json(&body),
            serde_json::json!({"favourites": ["characters/jason-duval"], "ticks": {"x": true}})
        );
    }

    #[tokio::test]
    async fn damaged_userdata_is_set_aside_and_named_in_a_header() {
        let _one = FILES.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let files = Files::new("damaged");
        std::fs::write(&files.userdata, "{ this is not json").unwrap();

        let (status, headers, body) = send(get_from("/api/userdata")).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(json(&body), serde_json::json!({}));
        let aside = headers
            .get("x-userdata-set-aside")
            .and_then(|v| v.to_str().ok())
            .expect("the page is told where the damaged copy went")
            .to_string();
        assert!(
            aside.starts_with("userdata.damaged-") && aside.ends_with(".json"),
            "{aside}"
        );
        // The old contents are kept beside the file, not overwritten.
        assert_eq!(
            std::fs::read_to_string(files.folder.join(&aside)).unwrap(),
            "{ this is not json"
        );
        assert!(!files.userdata.exists());

        // Saving afterwards starts a fresh file.
        let (status, _, _) = send(post_to("/api/userdata", r#"{"favourites":[]}"#)).await;
        assert_eq!(status, StatusCode::NO_CONTENT);
        let (_, headers, body) = send(get_from("/api/userdata")).await;
        assert!(headers.get("x-userdata-set-aside").is_none());
        assert_eq!(json(&body), serde_json::json!({"favourites": []}));
    }

    #[tokio::test]
    async fn requests_not_addressed_to_loopback_are_refused() {
        let _one = FILES.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let _files = Files::new("host");
        for uri in ["/api/settings", "/api/userdata"] {
            let mut request = get_from(uri);
            request
                .headers_mut()
                .insert(header::HOST, HeaderValue::from_static("evil.example:4545"));
            let (status, _, _) = send(request).await;
            assert_eq!(status, StatusCode::FORBIDDEN, "{uri}");
        }
    }

    #[tokio::test]
    async fn a_page_on_another_local_port_may_not_write() {
        let _one = FILES.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let files = Files::new("foreign-port");
        for uri in ["/api/settings", "/api/userdata"] {
            let mut request = post_to(uri, r#"{"show-spoilers":"1"}"#);
            request
                .headers_mut()
                .insert(header::ORIGIN, HeaderValue::from_static("http://localhost:9999"));
            let (status, _, _) = send(request).await;
            assert_eq!(status, StatusCode::FORBIDDEN, "{uri}");
        }
        for uri in ["/api/update/download", "/api/update/install"] {
            let mut request = post_to(uri, "{}");
            request
                .headers_mut()
                .insert(header::ORIGIN, HeaderValue::from_static("http://127.0.0.1:9999"));
            let (status, _, _) = send(request).await;
            assert_eq!(status, StatusCode::FORBIDDEN, "{uri}");
        }
        assert!(!files.settings.exists());
        assert!(!files.userdata.exists());

        // The app's own page, by either loopback name, still may.
        let mut request = post_to("/api/settings", r#"{"show-spoilers":"1"}"#);
        request
            .headers_mut()
            .insert(header::ORIGIN, HeaderValue::from_static("http://localhost:4545"));
        let (status, _, _) = send(request).await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn saved_data_up_to_the_file_limit_fits_in_one_request() {
        let _one = FILES.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let files = Files::new("big-userdata");

        // 3 MB in one part: over axum's 2 MB default, under the 4 MB file limit.
        let part = "x".repeat(3_000_000);
        let (status, _, body) = send(post_to("/api/userdata", &format!(r#"{{"big":"{part}"}}"#))).await;
        assert_eq!(status, StatusCode::NO_CONTENT, "{body}");
        assert!(std::fs::metadata(&files.userdata).unwrap().len() > 3_000_000);

        // Just over the file limit: the handler refuses it with its own message.
        let part = "x".repeat(userdata::MAX_BYTES);
        let (status, _, body) = send(post_to("/api/userdata", &format!(r#"{{"big":"{part}"}}"#))).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert!(body.contains("limited to"), "{body}");

        // Far past it: refused before it is read.
        let part = "x".repeat(userdata::MAX_REQUEST_BYTES + 1);
        let (status, _, _) = send(post_to("/api/userdata", &format!(r#"{{"big":"{part}"}}"#))).await;
        assert_eq!(status, StatusCode::PAYLOAD_TOO_LARGE);

        // The saved 3 MB part is untouched by the refused writes.
        let (_, _, body) = send(get_from("/api/userdata")).await;
        assert_eq!(json(&body)["big"].as_str().map(str::len), Some(3_000_000));
    }

    #[tokio::test]
    async fn wiki_and_manual_carry_an_etag_and_answer_304_when_unchanged() {
        let app = app();
        for uri in ["/api/wiki", "/api/manual"] {
            let (status, headers, body) = send_to(app.clone(), get_from(uri)).await;
            assert_eq!(status, StatusCode::OK, "{uri}");
            assert!(!body.is_empty());
            assert_eq!(headers.get(header::CACHE_CONTROL).unwrap(), "no-cache");
            let etag = headers
                .get(header::ETAG)
                .expect("an ETag")
                .to_str()
                .unwrap()
                .to_string();
            assert!(
                etag.starts_with('"') && etag.ends_with('"') && etag.len() == 34,
                "{etag}"
            );
            assert_eq!(etag, content::etag_of(body.as_bytes()), "{uri}");

            // Asked again with that tag: nothing to send.
            let mut again = get_from(uri);
            again
                .headers_mut()
                .insert(header::IF_NONE_MATCH, HeaderValue::from_str(&etag).unwrap());
            let (status, headers, body) = send_to(app.clone(), again).await;
            assert_eq!(status, StatusCode::NOT_MODIFIED, "{uri}");
            assert!(body.is_empty());
            assert_eq!(headers.get(header::ETAG).unwrap().to_str().unwrap(), etag);

            // A different tag gets the whole body.
            let mut stale = get_from(uri);
            stale
                .headers_mut()
                .insert(header::IF_NONE_MATCH, HeaderValue::from_static("\"0\""));
            let (status, _, body) = send_to(app.clone(), stale).await;
            assert_eq!(status, StatusCode::OK, "{uri}");
            assert!(!body.is_empty());
        }
    }

    #[test]
    fn an_origin_without_a_port_is_port_80() {
        let mut headers = HeaderMap::new();
        headers.insert(header::HOST, HeaderValue::from_static("127.0.0.1"));
        headers.insert(header::ORIGIN, HeaderValue::from_static("http://127.0.0.1"));
        assert!(request_is_local(&headers, 80));
        assert!(!request_is_local(&headers, 4655));
        headers.insert(header::ORIGIN, HeaderValue::from_static("http://localhost:4655"));
        assert!(request_is_local(&headers, 4655));
        assert!(!request_is_local(&headers, 80));
    }

    #[test]
    fn the_manual_is_encoded_once_and_reloaded_when_the_file_changes() {
        let root = content::tests::TempRoot::new("manual-cache");
        let cache = ManualCache::default();
        assert!(cache.get(&root.0).unwrap().is_none());
        root.write("data/manual.json", r#"{"pages":[]}"#);
        let first = cache.get(&root.0).unwrap().unwrap();
        assert_eq!(first.json, r#"{"pages":[]}"#);
        // Unchanged: the same encoded copy.
        assert!(Arc::ptr_eq(&first, &cache.get(&root.0).unwrap().unwrap()));
        // A different size is a different file.
        root.write("data/manual.json", r#"{"pages":[1,2]}"#);
        let second = cache.get(&root.0).unwrap().unwrap();
        assert_eq!(second.json, r#"{"pages":[1,2]}"#);
        assert_ne!(first.etag, second.etag);
    }
}
