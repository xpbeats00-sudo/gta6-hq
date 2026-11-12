//! Update check: asks GitHub whether a newer release of the app exists.
//!
//! One request to `api.github.com` for the repository named in
//! `data/update.json`, at most once every six hours while the app is open.
//! Nothing is downloaded or installed: the interface only offers a link to the
//! release page, which opens in the default browser. Turn it off with
//! `"enabled": false` in `data/update.json`.

use std::{
    path::Path,
    sync::{Mutex, OnceLock},
    time::{Duration, Instant},
};

use serde::Deserialize;
use serde_json::{json, Value};

const CURRENT: &str = env!("CARGO_PKG_VERSION");
const RECHECK: Duration = Duration::from_secs(6 * 60 * 60);
const MAX_BYTES: u64 = 1024 * 1024;
const MAX_NOTES: usize = 600;

#[derive(Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct Config {
    pub enabled: bool,
    /// `owner/name` of the GitHub repository whose releases are checked.
    pub repository: String,
}

impl Config {
    pub fn load(root: &Path) -> Self {
        std::fs::read_to_string(root.join("data").join("update.json"))
            .ok()
            .and_then(|text| serde_json::from_str(text.trim_start_matches('\u{feff}')).ok())
            .unwrap_or_default()
    }

    /// Enabled, and the repository is exactly `owner/name` in GitHub's own
    /// character set, so it can be placed in a URL as it stands.
    fn usable(&self) -> bool {
        let part = |s: &str| {
            !s.is_empty()
                && s.len() <= 100
                && s.chars()
                    .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
                && s != "."
                && s != ".."
        };
        self.enabled && matches!(self.repository.split_once('/'), Some((owner, name)) if part(owner) && part(name))
    }
}

/// What the interface is told. Blocking: call it off the async threads.
pub fn status(root: &Path) -> Value {
    let config = Config::load(root);
    if !config.usable() {
        return json!({"enabled": false, "current": CURRENT, "available": false});
    }
    static CACHE: OnceLock<Mutex<Option<(Instant, String, Value)>>> = OnceLock::new();
    let cache = CACHE.get_or_init(|| Mutex::new(None));
    if let Ok(guard) = cache.lock() {
        if let Some((at, repository, value)) = guard.as_ref() {
            if at.elapsed() < RECHECK && *repository == config.repository {
                return value.clone();
            }
        }
    }
    let value = match fetch(&config.repository) {
        Ok(Some(release)) => describe(&release, CURRENT),
        // A repository with no release yet is not an error.
        Ok(None) => json!({"enabled": true, "current": CURRENT, "available": false, "latest": null}),
        Err(error) => json!({"enabled": true, "current": CURRENT, "available": false, "error": error}),
    };
    // A failed check is not remembered, so the next page load tries again.
    if value.get("error").is_none() {
        if let Ok(mut guard) = cache.lock() {
            *guard = Some((Instant::now(), config.repository.clone(), value.clone()));
        }
    }
    value
}

fn fetch(repository: &str) -> Result<Option<Value>, &'static str> {
    static AGENT: OnceLock<ureq::Agent> = OnceLock::new();
    let agent = AGENT.get_or_init(|| {
        ureq::Agent::config_builder()
            .timeout_global(Some(Duration::from_secs(10)))
            .user_agent("gta6-hq-desktop")
            .build()
            .into()
    });
    let url = format!("https://api.github.com/repos/{repository}/releases/latest");
    let mut response = match agent.get(&url).header("Accept", "application/vnd.github+json").call() {
        Ok(response) => response,
        Err(ureq::Error::StatusCode(404)) => return Ok(None),
        Err(_) => return Err("GitHub could not be reached"),
    };
    let bytes = response
        .body_mut()
        .with_config()
        .limit(MAX_BYTES)
        .read_to_vec()
        .map_err(|_| "GitHub's answer could not be read")?;
    serde_json::from_slice(&bytes)
        .map(Some)
        .map_err(|_| "GitHub's answer was not understood")
}

/// Only links back to GitHub are passed on to the interface.
fn github_link(value: Option<&Value>) -> Option<&str> {
    value
        .and_then(Value::as_str)
        .filter(|url| url.starts_with("https://github.com/"))
}

fn describe(release: &Value, current: &str) -> Value {
    let tag = release.get("tag_name").and_then(Value::as_str).unwrap_or_default();
    let latest = tag.trim_start_matches(['v', 'V']);
    let assets = release
        .get("assets")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default();
    let asset = |ending: &str| {
        assets.iter().find_map(|a| {
            let name = a.get("name").and_then(Value::as_str)?.to_ascii_lowercase();
            name.ends_with(ending)
                .then(|| github_link(a.get("browser_download_url")))
                .flatten()
        })
    };
    let notes: String = release
        .get("body")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .chars()
        .filter(|c| !c.is_control() || *c == '\n')
        .take(MAX_NOTES)
        .collect();
    json!({
        "enabled": true,
        "current": current,
        "latest": latest,
        "available": newer(latest, current),
        "name": release.get("name").and_then(Value::as_str).unwrap_or(tag),
        "url": github_link(release.get("html_url")),
        "download": asset(".exe").or_else(|| asset(".msi")).or_else(|| asset(".zip")),
        "notes": notes.trim(),
        "published": release.get("published_at").and_then(Value::as_str),
    })
}

/// The numbers of a version such as `1.4.0` or `v2.0.1-beta`; `None` if it has none.
fn numbers(version: &str) -> Option<Vec<u64>> {
    let core = version.trim().trim_start_matches(['v', 'V']);
    let core = core.split(['-', '+']).next().unwrap_or_default();
    let parts: Option<Vec<u64>> = core.split('.').map(|p| p.parse().ok()).collect();
    parts.filter(|p| !p.is_empty())
}

/// Is `latest` a later version than `current`? Anything unreadable counts as "no".
fn newer(latest: &str, current: &str) -> bool {
    let (Some(mut a), Some(mut b)) = (numbers(latest), numbers(current)) else {
        return false;
    };
    let len = a.len().max(b.len());
    a.resize(len, 0);
    b.resize(len, 0);
    a > b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn versions_compare_by_number_not_by_text() {
        assert!(newer("0.2.0", "0.1.0"));
        assert!(newer("v0.10.0", "0.9.9"));
        assert!(newer("1.0", "0.9.9"));
        assert!(!newer("0.1.0", "0.1.0"));
        assert!(!newer("0.1", "0.1.0"));
        assert!(!newer("0.0.9", "0.1.0"));
        assert!(!newer("nightly", "0.1.0"));
        assert!(!newer("", "0.1.0"));
    }

    #[test]
    fn only_a_plain_owner_and_name_is_usable() {
        let config = |enabled, repository: &str| Config {
            enabled,
            repository: repository.to_string(),
        };
        assert!(config(true, "someone/gta6-hq").usable());
        assert!(!config(false, "someone/gta6-hq").usable());
        assert!(!config(true, "").usable());
        assert!(!config(true, "no-slash").usable());
        assert!(!config(true, "a/b/c").usable());
        assert!(!config(true, "a/../b").usable());
        assert!(!config(true, "a/b?x=1").usable());
        assert!(!config(true, "https://evil.example/a").usable());
    }

    #[test]
    fn a_release_is_described_with_github_links_only() {
        let release = json!({
            "tag_name": "v0.2.0",
            "name": "GTA 6 HQ 0.2.0",
            "html_url": "https://github.com/someone/gta6-hq/releases/tag/v0.2.0",
            "body": "Fixes.\u{7}\nMore.",
            "assets": [
                {"name": "notes.txt", "browser_download_url": "https://github.com/someone/gta6-hq/releases/download/v0.2.0/notes.txt"},
                {"name": "Evil.exe", "browser_download_url": "https://evil.example/Evil.exe"},
                {"name": "GTA6HQ-Setup.EXE", "browser_download_url": "https://github.com/someone/gta6-hq/releases/download/v0.2.0/GTA6HQ-Setup.exe"}
            ]
        });
        let status = describe(&release, "0.1.0");
        assert_eq!(status["available"], true);
        assert_eq!(status["latest"], "0.2.0");
        assert_eq!(
            status["download"],
            "https://github.com/someone/gta6-hq/releases/download/v0.2.0/GTA6HQ-Setup.exe"
        );
        assert_eq!(status["notes"], "Fixes.\nMore.");

        let same = describe(&release, "0.2.0");
        assert_eq!(same["available"], false);

        let elsewhere = describe(
            &json!({"tag_name": "v9.0.0", "html_url": "https://evil.example/x"}),
            "0.1.0",
        );
        assert_eq!(elsewhere["url"], Value::Null);
        assert_eq!(elsewhere["download"], Value::Null);
    }

    #[test]
    fn no_config_file_means_the_check_is_off() {
        let dir = std::env::temp_dir().join(format!("gta6hq-update-{}", std::process::id()));
        std::fs::create_dir_all(dir.join("data")).unwrap();
        let status = status(&dir);
        assert_eq!(status["enabled"], false);
        assert_eq!(status["available"], false);
        std::fs::remove_dir_all(&dir).ok();
    }
}
