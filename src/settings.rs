//! The reader's own choices: whether spoilers are shown, the Manual's theme, an update notice
//! that was dismissed.
//!
//! They are kept in one small file in the user's own settings folder, not beside the app and
//! not in the web view. The window opens on a different port each time, and a web view keeps
//! its storage per address, so anything stored there is gone at the next launch. A file in the
//! user's folder is found again after a restart, an update, a reinstall, or a portable copy
//! extracted somewhere new.

use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
    sync::Mutex,
};

use serde_json::Value;

/// Name to value. Both are short pieces of text; the page decides what they mean.
pub type Settings = BTreeMap<String, String>;

const MAX_ENTRIES: usize = 64;
const MAX_NAME: usize = 48;
const MAX_VALUE: usize = 300;

/// One change at a time: each is read, merge, write.
static WRITING: Mutex<()> = Mutex::new(());

pub enum Error {
    /// The page sent something that is not a setting.
    Invalid(String),
    /// The file could not be written.
    Unwritable(String),
}

/// Where the file lives. `GTA6_HQ_SETTINGS` names it outright.
pub fn file(root: &Path) -> PathBuf {
    let var = |name: &str| std::env::var_os(name).filter(|v| !v.is_empty()).map(PathBuf::from);
    if let Some(explicit) = var("GTA6_HQ_SETTINGS") {
        return explicit;
    }
    let folder = if cfg!(windows) {
        var("APPDATA").map(|base| base.join(crate::APP_NAME.replace(' ', "")))
    } else if cfg!(target_os = "macos") {
        var("HOME").map(|home| home.join("Library").join("Application Support").join("GTA6HQ"))
    } else {
        var("XDG_CONFIG_HOME")
            .or_else(|| var("HOME").map(|home| home.join(".config")))
            .map(|config| config.join("gta6-hq"))
    };
    folder.unwrap_or_else(|| crate::cache_dir(root)).join("settings.json")
}

fn valid_name(name: &str) -> bool {
    (1..=MAX_NAME).contains(&name.len())
        && name
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

/// What is on file. A missing or damaged file is simply no settings yet.
pub fn load(file: &Path) -> Settings {
    let Ok(text) = std::fs::read_to_string(file) else {
        return Settings::new();
    };
    let Ok(Value::Object(saved)) = serde_json::from_str::<Value>(&text) else {
        return Settings::new();
    };
    saved
        .into_iter()
        .filter_map(|(name, value)| match value {
            Value::String(value) if valid_name(&name) && value.chars().count() <= MAX_VALUE => Some((name, value)),
            _ => None,
        })
        .take(MAX_ENTRIES)
        .collect()
}

/// Add `changes` (an object of text values) to what is on file and return the result.
pub fn merge(file: &Path, changes: &Value) -> Result<Settings, Error> {
    let Value::Object(changes) = changes else {
        return Err(Error::Invalid(
            "Settings are sent as an object of names and values.".into(),
        ));
    };
    let _one_at_a_time = WRITING.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
    let mut settings = load(file);
    for (name, value) in changes {
        let Some(value) = value.as_str().filter(|v| v.chars().count() <= MAX_VALUE) else {
            return Err(Error::Invalid(format!(
                "`{name}` must be text of at most {MAX_VALUE} characters."
            )));
        };
        if !valid_name(name) {
            return Err(Error::Invalid(
                "A setting's name is lower-case letters, digits and hyphens.".into(),
            ));
        }
        settings.insert(name.clone(), value.to_owned());
    }
    if settings.len() > MAX_ENTRIES {
        return Err(Error::Invalid(format!("At most {MAX_ENTRIES} settings are kept.")));
    }
    let text = serde_json::to_string_pretty(&settings).map_err(|e| Error::Unwritable(e.to_string()))?;
    // Written beside the file and then moved into place, so a crash cannot leave half a file.
    let unwritable = |e: std::io::Error| Error::Unwritable(e.to_string());
    if let Some(folder) = file.parent() {
        std::fs::create_dir_all(folder).map_err(unwritable)?;
    }
    let draft = file.with_extension("json.tmp");
    std::fs::write(&draft, text + "\n").map_err(unwritable)?;
    std::fs::rename(&draft, file).map_err(unwritable)?;
    Ok(settings)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn scratch(name: &str) -> PathBuf {
        let folder = std::env::temp_dir().join(format!("gta6hq-settings-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&folder);
        folder.join("deeper").join("settings.json")
    }

    #[test]
    fn choices_are_kept_and_added_to() {
        let file = scratch("kept");
        assert!(load(&file).is_empty());
        assert!(merge(&file, &json!({"show-spoilers": "0", "spoiler-notice": "1"})).is_ok());
        // A later change leaves the rest alone, and a fresh read (the next launch) finds both.
        let all = merge(&file, &json!({"show-spoilers": "1"})).ok().expect("saved");
        assert_eq!(all.len(), 2);
        let again = load(&file);
        assert_eq!(again.get("show-spoilers").map(String::as_str), Some("1"));
        assert_eq!(again.get("spoiler-notice").map(String::as_str), Some("1"));
        let _ = std::fs::remove_dir_all(file.parent().and_then(Path::parent).expect("scratch folder"));
    }

    #[test]
    fn only_short_named_text_is_accepted() {
        let file = scratch("refused");
        for bad in [
            json!(["show-spoilers"]),
            json!({"show-spoilers": true}),
            json!({"Show Spoilers": "1"}),
            json!({"../elsewhere": "1"}),
            json!({"": "1"}),
            json!({"long": "x".repeat(MAX_VALUE + 1)}),
        ] {
            assert!(matches!(merge(&file, &bad), Err(Error::Invalid(_))), "{bad}");
        }
        assert!(!file.exists());
        let many: serde_json::Map<String, Value> = (0..=MAX_ENTRIES).map(|i| (format!("k{i}"), json!("v"))).collect();
        assert!(matches!(merge(&file, &Value::Object(many)), Err(Error::Invalid(_))));
    }

    #[test]
    fn a_damaged_file_reads_as_no_settings_and_can_be_replaced() {
        let file = scratch("damaged");
        std::fs::create_dir_all(file.parent().expect("folder")).expect("folder made");
        std::fs::write(&file, "{ not json").expect("written");
        assert!(load(&file).is_empty());
        std::fs::write(&file, r#"{"ok": "yes", "Bad Name": "x", "number": 3}"#).expect("written");
        assert_eq!(load(&file).len(), 1);
        assert!(merge(&file, &json!({"theme": "night"})).is_ok());
        assert_eq!(load(&file).len(), 2);
        let _ = std::fs::remove_dir_all(file.parent().and_then(Path::parent).expect("scratch folder"));
    }
}
