//! Update check: asks GitHub whether a newer release of the app exists.
//!
//! One request to `api.github.com` for the repository named in
//! `data/update.json`, at most once every half hour while the app is open, so a
//! release published while the app is running is offered without a restart.
//! Turn it off with `"enabled": false` in `data/update.json`.
//!
//! Nothing is downloaded or installed by itself. When the reader presses
//! "Update now" in an installed copy, the release's setup program is
//! downloaded from that repository's release page on github.com, checked
//! against the release's `SHA256SUMS.txt`, and then run; the app closes so it
//! can be replaced. A portable copy is only offered the link to the release.

use std::{
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
    time::{Duration, Instant},
};

use sha2::{Digest, Sha256};

use serde::Deserialize;
use serde_json::{json, Value};

const CURRENT: &str = env!("CARGO_PKG_VERSION");
const RECHECK: Duration = Duration::from_secs(30 * 60);
/// How long a failed check (offline, timed out) stands before GitHub is asked again.
const RETRY_FAILED: Duration = Duration::from_secs(5 * 60);
const MAX_BYTES: u64 = 1024 * 1024;
const MAX_NOTES: usize = 600;
/// The setup program is about 56 MB; anything far larger is not ours.
const MAX_SETUP_BYTES: u64 = 400 * 1024 * 1024;
const MAX_SUMS_BYTES: u64 = 64 * 1024;

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
    static FAILURES: OnceLock<Mutex<Option<(Instant, String, Value)>>> = OnceLock::new();
    let failures = FAILURES.get_or_init(|| Mutex::new(None));
    if let Ok(guard) = failures.lock() {
        if let Some((at, repository, value)) = guard.as_ref() {
            if at.elapsed() < RETRY_FAILED && *repository == config.repository {
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
    // A failed check is remembered only briefly (see RETRY_FAILED), so being offline does not mean
    // waiting out the timeout every time the window comes back into view.
    if value.get("error").is_none() {
        if let Ok(mut guard) = cache.lock() {
            *guard = Some((Instant::now(), config.repository.clone(), value.clone()));
        }
    } else if let Ok(mut guard) = failures.lock() {
        *guard = Some((Instant::now(), config.repository.clone(), value.clone()));
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
        "setup": asset("-setup.exe"),
        "sums": asset("sha256sums.txt"),
        "notes": notes.trim(),
        "published": release.get("published_at").and_then(Value::as_str),
    })
}

// ---------- installing an update ----------

/// Is this copy one that Setup installed? Setup leaves its uninstaller beside the app.
/// A portable copy has none, and is never updated in place.
pub fn installed(root: &Path) -> bool {
    root.join("unins000.exe").is_file()
}

/// Where a download stands. `state` is one of idle, downloading, checking, ready, failed.
#[derive(Debug, Clone, Default)]
struct Job {
    state: &'static str,
    version: String,
    received: u64,
    total: u64,
    error: Option<String>,
    setup: Option<PathBuf>,
}

fn job() -> &'static Mutex<Job> {
    static JOB: OnceLock<Mutex<Job>> = OnceLock::new();
    JOB.get_or_init(|| {
        Mutex::new(Job {
            state: "idle",
            ..Job::default()
        })
    })
}

fn set(change: impl FnOnce(&mut Job)) {
    if let Ok(mut guard) = job().lock() {
        change(&mut guard);
    }
}

/// The download's progress, for the update screen.
pub fn progress() -> Value {
    let now = job().lock().map(|guard| guard.clone()).unwrap_or_default();
    json!({"state": now.state, "version": now.version, "received": now.received, "total": now.total, "error": now.error})
}

/// A release file's address is accepted only on github.com, under this repository's releases.
fn release_file<'a>(url: Option<&'a str>, repository: &str) -> Option<&'a str> {
    let url = url?;
    let name = url.strip_prefix(&format!("https://github.com/{repository}/releases/download/"))?;
    let file = name.rsplit('/').next()?;
    let plain = !file.is_empty()
        && file
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'));
    (plain && !name.contains("..")).then_some(url)
}

/// The SHA-256 a checksum list gives for `file`, as lower-case hex.
fn listed_sum(sums: &str, file: &str) -> Option<String> {
    sums.lines().find_map(|line| {
        let (sum, name) = line.split_once(char::is_whitespace)?;
        let name = name.trim().trim_start_matches('*');
        (name == file && sum.len() == 64 && sum.chars().all(|c| c.is_ascii_hexdigit()))
            .then(|| sum.to_ascii_lowercase())
    })
}

fn downloader() -> &'static ureq::Agent {
    static AGENT: OnceLock<ureq::Agent> = OnceLock::new();
    AGENT.get_or_init(|| {
        ureq::Agent::config_builder()
            .timeout_global(Some(Duration::from_secs(30 * 60)))
            .user_agent("gta6-hq-desktop")
            .build()
            .into()
    })
}

/// Begin downloading the newest release's setup program. Returns at once; follow it with
/// [`progress`]. Does nothing if a download is already running or finished.
pub fn start_download(root: &Path) -> Value {
    let status = status(root);
    let config = Config::load(root);
    let text = |key: &str| status.get(key).and_then(Value::as_str);
    let refuse = |reason: &str| json!({"state": "failed", "error": reason});
    if !installed(root) {
        return refuse("This is a portable copy. Download the new version from the release page.");
    }
    if status.get("available").and_then(Value::as_bool) != Some(true) {
        return refuse("There is no newer version to install.");
    }
    let (Some(setup), Some(sums), Some(version)) = (
        release_file(text("setup"), &config.repository),
        release_file(text("sums"), &config.repository),
        text("latest"),
    ) else {
        return refuse("This release has no setup program to download.");
    };
    {
        let Ok(mut guard) = job().lock() else {
            return refuse("The updater is busy.");
        };
        if matches!(guard.state, "downloading" | "checking" | "ready") {
            drop(guard);
            return progress();
        }
        *guard = Job {
            state: "downloading",
            version: version.to_string(),
            ..Job::default()
        };
    }
    let (setup, sums) = (setup.to_string(), sums.to_string());
    std::thread::spawn(move || match download(&setup, &sums) {
        Ok(file) => set(|job| {
            job.state = "ready";
            job.setup = Some(file);
        }),
        Err(reason) => set(|job| {
            job.state = "failed";
            job.error = Some(reason);
        }),
    });
    progress()
}

/// Download the setup program into the temp folder and check it against the release's checksums.
fn download(setup_url: &str, sums_url: &str) -> Result<PathBuf, String> {
    let name = setup_url.rsplit('/').next().unwrap_or("GTA6HQ-Setup.exe");
    let folder = std::env::temp_dir().join("gta6hq-update");
    std::fs::create_dir_all(&folder).map_err(|e| format!("Could not create a temporary folder: {e}"))?;
    let file = folder.join(name);

    let mut response = downloader()
        .get(setup_url)
        .call()
        .map_err(|_| "The download could not be started. Check your connection and try again.".to_string())?;
    let total = response
        .headers()
        .get("content-length")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(0);
    set(|job| job.total = total);
    let mut reader = response.body_mut().with_config().limit(MAX_SETUP_BYTES).reader();
    let mut out = std::fs::File::create(&file).map_err(|e| format!("Could not save the download: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 256 * 1024];
    let mut received = 0u64;
    loop {
        let count = reader
            .read(&mut buffer)
            .map_err(|_| "The download was interrupted. Try again.".to_string())?;
        if count == 0 {
            break;
        }
        out.write_all(&buffer[..count])
            .map_err(|e| format!("Could not save the download: {e}"))?;
        hasher.update(&buffer[..count]);
        received += count as u64;
        set(|job| job.received = received);
    }
    drop(out);
    if total != 0 && received != total {
        return Err("The download was cut short. Try again.".into());
    }

    set(|job| job.state = "checking");
    let mut response = downloader()
        .get(sums_url)
        .call()
        .map_err(|_| "The checksums for this release could not be downloaded.".to_string())?;
    let sums = response
        .body_mut()
        .with_config()
        .limit(MAX_SUMS_BYTES)
        .read_to_string()
        .map_err(|_| "The checksums for this release could not be read.".to_string())?;
    let expected = listed_sum(&sums, name).ok_or("The checksums for this release do not list the setup program.")?;
    let actual: String = hasher.finalize().iter().map(|byte| format!("{byte:02x}")).collect();
    if actual != expected {
        let _ = std::fs::remove_file(&file);
        return Err(
            "The download does not match the checksum published with the release, so it was not installed.".into(),
        );
    }
    Ok(file)
}

/// Start the downloaded setup program in its update mode. The caller then closes the app,
/// so its files can be replaced; Setup reopens the app when it has finished.
pub fn install() -> Result<(), String> {
    let setup = job()
        .lock()
        .ok()
        .and_then(|guard| (guard.state == "ready").then(|| guard.setup.clone()).flatten())
        .ok_or("The update has not finished downloading.")?;
    std::process::Command::new(&setup)
        .arg("--update")
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Setup could not be started: {e}"))
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
    fn release_files_are_accepted_only_from_this_repository_on_github() {
        let ok = "https://github.com/someone/gta6-hq/releases/download/v0.3.0/GTA6HQ-0.3.0-Setup.exe";
        assert_eq!(release_file(Some(ok), "someone/gta6-hq"), Some(ok));
        for bad in [
            "https://github.com/other/gta6-hq/releases/download/v0.3.0/GTA6HQ-0.3.0-Setup.exe",
            "https://github.com.evil.example/someone/gta6-hq/releases/download/v0.3.0/Setup.exe",
            "http://github.com/someone/gta6-hq/releases/download/v0.3.0/Setup.exe",
            "https://github.com/someone/gta6-hq/releases/download/v0.3.0/../../../x/Setup.exe",
            "https://github.com/someone/gta6-hq/releases/download/v0.3.0/Setup.exe?x=1",
            "https://github.com/someone/gta6-hq/releases/download/v0.3.0/",
        ] {
            assert_eq!(release_file(Some(bad), "someone/gta6-hq"), None, "{bad}");
        }
        assert_eq!(release_file(None, "someone/gta6-hq"), None);
    }

    #[test]
    fn checksums_are_read_by_file_name() {
        let sum = "a".repeat(64);
        let list = format!("{}  other.zip\n{sum}  GTA6HQ-0.3.0-Setup.exe\n", "b".repeat(64));
        assert_eq!(listed_sum(&list, "GTA6HQ-0.3.0-Setup.exe"), Some(sum.clone()));
        assert_eq!(listed_sum(&list, "missing.exe"), None);
        assert_eq!(
            listed_sum("short  GTA6HQ-0.3.0-Setup.exe", "GTA6HQ-0.3.0-Setup.exe"),
            None
        );
        assert_eq!(
            listed_sum(&format!("{}  *file.exe", sum.to_uppercase()), "file.exe"),
            Some(sum)
        );
    }

    /// Downloads a real release (about 56 MB) and checks it, so it is not run by default:
    /// `cargo test --release -- --ignored real_release`
    #[test]
    #[ignore = "downloads about 56 MB from GitHub"]
    fn a_real_release_downloads_and_passes_its_checksum() {
        let base = "https://github.com/xpbeats00-sudo/gta6-hq/releases/download/v0.2.6";
        let file = download(
            &format!("{base}/GTA6HQ-0.2.6-Setup.exe"),
            &format!("{base}/SHA256SUMS.txt"),
        )
        .unwrap();
        assert!(std::fs::metadata(&file).unwrap().len() > 40 * 1024 * 1024);
        // The zip is not the file its name claims, so the same check must refuse it.
        let wrong = download(&format!("{base}/SHA256SUMS.txt"), &format!("{base}/SHA256SUMS.txt"));
        assert!(wrong.is_err());
        let _ = std::fs::remove_file(file);
    }

    #[test]
    fn installing_needs_a_finished_download() {
        assert!(install().is_err());
    }

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
