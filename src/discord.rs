//! Discord Rich Presence: shows "GTA 6 HQ" and the page being read in the
//! owner's Discord status.
//!
//! Settings live in `data/discord.json`. Everything here is best effort: if
//! Discord is not running, or the file is missing or switched off, the app
//! carries on exactly as before. The connection is a local pipe to the
//! Discord client on this computer; nothing is sent over the network by us.

use std::{
    path::Path,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc::{self, RecvTimeoutError, Sender},
        Arc,
    },
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use serde::Deserialize;

/// Discord rejects activity text shorter than 2 or longer than 128 characters.
const MAX_TEXT: usize = 128;
const RETRY: Duration = Duration::from_secs(15);

#[derive(Deserialize, Debug, Clone)]
#[serde(default)]
pub struct Config {
    pub enabled: bool,
    /// The Application ID from the Discord Developer Portal.
    pub application_id: String,
    /// Key of an image uploaded under Rich Presence > Art Assets (optional).
    pub large_image: String,
    pub large_text: String,
    /// Show which page is open. Off shows only that the app is running.
    pub show_page: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            enabled: false,
            application_id: String::new(),
            large_image: String::new(),
            large_text: "GTA 6 HQ".to_string(),
            show_page: true,
        }
    }
}

impl Config {
    pub fn load(root: &Path) -> Self {
        std::fs::read_to_string(root.join("data").join("discord.json"))
            .ok()
            .and_then(|text| serde_json::from_str(text.trim_start_matches('\u{feff}')).ok())
            .unwrap_or_default()
    }

    fn usable(&self) -> bool {
        self.enabled && !self.application_id.is_empty() && self.application_id.chars().all(|c| c.is_ascii_digit())
    }
}

/// What the status should say right now.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Presence {
    /// First line, e.g. "Reading: Vice City".
    pub details: String,
    /// Second line, e.g. "Locations".
    pub state: String,
}

impl Presence {
    pub fn new(details: &str, state: &str) -> Self {
        Self {
            details: clean(details),
            state: clean(state),
        }
    }
}

/// Turn control characters into spaces, trim, and keep within Discord's length limit.
fn clean(text: &str) -> String {
    let spaced: String = text.chars().map(|c| if c.is_control() { ' ' } else { c }).collect();
    spaced
        .trim()
        .chars()
        .take(MAX_TEXT)
        .collect::<String>()
        .trim_end()
        .to_string()
}

/// The running presence worker: where to send page changes, and whether the
/// last attempt to reach Discord worked.
#[derive(Clone)]
pub struct Handle {
    sender: Sender<Presence>,
    connected: Arc<AtomicBool>,
}

impl Handle {
    pub fn update(&self, presence: Presence) {
        let _ = self.sender.send(presence);
    }

    pub fn is_connected(&self) -> bool {
        self.connected.load(Ordering::Relaxed)
    }
}

/// Start the background worker. Returns `None` when presence is switched off
/// or not configured.
pub fn start(root: &Path) -> Option<Handle> {
    let config = Config::load(root);
    if !config.usable() {
        return None;
    }
    let (sender, receiver) = mpsc::channel::<Presence>();
    let shared = Arc::new(AtomicBool::new(false));
    let status = shared.clone();
    let started = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_secs() as i64);

    thread::spawn(move || {
        let mut client = DiscordIpcClient::new(&config.application_id);
        let mut connected = false;
        let mut current = Presence::new("Browsing the encyclopedia", "");
        let mut dirty = true;

        loop {
            if !connected {
                connected = client.connect().is_ok();
                dirty = connected;
            }
            if connected && dirty {
                // A failed send means Discord went away: reconnect next time round.
                connected = client.set_activity(build(&config, &current, started)).is_ok();
                dirty = !connected;
            }
            status.store(connected, Ordering::Relaxed);
            // Wait for the next page change; while Discord is unreachable, wake up to retry.
            let wait = if connected { Duration::from_secs(3600) } else { RETRY };
            match receiver.recv_timeout(wait) {
                Ok(next) => {
                    if next != current {
                        current = next;
                        dirty = true;
                    }
                }
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => {
                    let _ = client.close();
                    return;
                }
            }
        }
    });
    Some(Handle {
        sender,
        connected: shared,
    })
}

fn build<'a>(config: &'a Config, presence: &'a Presence, started: i64) -> activity::Activity<'a> {
    let mut activity = activity::Activity::new().timestamps(activity::Timestamps::new().start(started));
    if config.show_page {
        if presence.details.len() >= 2 {
            activity = activity.details(presence.details.as_str());
        }
        if presence.state.len() >= 2 {
            activity = activity.state(presence.state.as_str());
        }
    } else {
        activity = activity.details("Browsing the encyclopedia");
    }
    if !config.large_image.is_empty() {
        let mut assets = activity::Assets::new().large_image(config.large_image.as_str());
        if config.large_text.len() >= 2 {
            assets = assets.large_text(config.large_text.as_str());
        }
        activity = activity.assets(assets);
    }
    activity
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn presence_text_is_trimmed_and_capped() {
        let long = "x".repeat(500);
        let presence = Presence::new(&format!("  Reading:\tVice\nCity  {long}"), "  Locations ");
        assert!(presence.details.starts_with("Reading: Vice City"));
        assert_eq!(presence.details.chars().count(), MAX_TEXT);
        assert_eq!(presence.state, "Locations");
    }

    #[test]
    fn presence_stays_off_unless_enabled_with_a_numeric_id() {
        let on = Config {
            enabled: true,
            application_id: "1570320617528360961".into(),
            ..Config::default()
        };
        assert!(on.usable());
        assert!(!Config::default().usable());
        assert!(!Config {
            enabled: false,
            ..on.clone()
        }
        .usable());
        assert!(!Config {
            application_id: "not-an-id".into(),
            ..on.clone()
        }
        .usable());
        assert!(!Config {
            application_id: String::new(),
            ..on
        }
        .usable());
    }

    #[test]
    fn missing_settings_file_means_off() {
        assert!(!Config::load(Path::new("does-not-exist")).usable());
    }
}
