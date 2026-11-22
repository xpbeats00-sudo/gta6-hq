//! The reader's own collections: favourite places, named collections with notes, ticked
//! collectibles, places marked as discovered, saved routes, saved map views and recent searches.
//!
//! Unlike the small settings file (short text choices), this is one JSON document made of named
//! parts, each any JSON value, saved beside the settings file in the user's own folder so it
//! survives a restart, an update or a reinstall. The page replaces a part at a time; nothing here
//! interprets the parts. Kept local: there is no account and nothing is sent anywhere.

use std::{
    path::{Path, PathBuf},
    sync::Mutex,
};

use serde_json::{Map, Value};

/// At most this many named parts.
const MAX_PARTS: usize = 64;
/// The whole document, as saved, at most this many bytes.
pub const MAX_BYTES: usize = 4_000_000;
/// The largest request body `/api/userdata` reads: room for a whole document
/// of `MAX_BYTES` plus the JSON around it, so the file limit is the one that
/// applies (axum's default is 2 MB, which made the 4 MB limit unreachable).
pub const MAX_REQUEST_BYTES: usize = MAX_BYTES + 64 * 1024;

static WRITING: Mutex<()> = Mutex::new(());

pub enum Error {
    /// The page sent something that is not a part, or the document would grow too large.
    Invalid(String),
    /// The file could not be written.
    Unwritable(String),
}

/// Beside the settings file: `GTA6_HQ_USERDATA` names it outright.
pub fn file(root: &Path) -> PathBuf {
    if let Some(explicit) = std::env::var_os("GTA6_HQ_USERDATA").filter(|v| !v.is_empty()) {
        return PathBuf::from(explicit);
    }
    crate::settings::file(root).with_file_name("userdata.json")
}

fn valid_name(name: &str) -> bool {
    (1..=48).contains(&name.len())
        && name
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

/// What is on file. A missing file is nothing saved yet; a file that can't be read now is too
/// (callers that write use [`read`], which reports it instead). Used by the tests.
#[cfg(test)]
pub fn load(file: &Path) -> Map<String, Value> {
    read(file).map(|(parts, _)| parts).unwrap_or_default()
}

/// What is on file, and where a damaged file was moved. A file that cannot be read as saved
/// parts is never overwritten: it is renamed `userdata.damaged-<milliseconds>.json` beside
/// itself, so whatever is in it can still be recovered, and reading starts from nothing saved.
///
/// A file that exists but can't be opened right now (locked by antivirus or another program,
/// no permission) is an error, not "nothing saved": answering with nothing would let the next
/// save of a part replace everything in it.
pub fn read(file: &Path) -> std::io::Result<(Map<String, Value>, Option<PathBuf>)> {
    let bytes = match std::fs::read(file) {
        Ok(bytes) => bytes,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok((Map::new(), None)),
        Err(e) => return Err(e),
    };
    if let Ok(Value::Object(parts)) = serde_json::from_slice::<Value>(&bytes) {
        let parts = parts
            .into_iter()
            .filter(|(name, _)| valid_name(name))
            .take(MAX_PARTS)
            .collect();
        return Ok((parts, None));
    }
    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.as_millis());
    // Never over an earlier kept copy.
    let aside = (0..1000)
        .map(|n| {
            let suffix = if n == 0 { String::new() } else { format!("-{n}") };
            file.with_file_name(format!("userdata.damaged-{millis}{suffix}.json"))
        })
        .find(|candidate| !candidate.exists())
        .ok_or_else(|| std::io::Error::other("no free name for the damaged copy"))?;
    std::fs::rename(file, &aside)?;
    eprintln!("Saved data could not be read; kept it as {}", aside.display());
    Ok((Map::new(), Some(aside)))
}

/// Replace the parts named in `changes` (a part set to `null` is removed) and return the result.
pub fn merge(file: &Path, changes: &Value) -> Result<Map<String, Value>, Error> {
    let Value::Object(changes) = changes else {
        return Err(Error::Invalid("User data is sent as an object of named parts.".into()));
    };
    let _one_at_a_time = WRITING.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
    // Unreadable now, or damaged and impossible to move aside: left as it is, never replaced.
    let mut parts = match read(file) {
        Ok((parts, _)) => parts,
        Err(e) => {
            return Err(Error::Unwritable(format!(
                "The saved-data file could not be read ({e}), so nothing was changed."
            )))
        }
    };
    for (name, value) in changes {
        if !valid_name(name) {
            return Err(Error::Invalid(
                "A part's name is lower-case letters, digits and hyphens.".into(),
            ));
        }
        if value.is_null() {
            parts.remove(name);
        } else {
            parts.insert(name.clone(), value.clone());
        }
    }
    if parts.len() > MAX_PARTS {
        return Err(Error::Invalid(format!("At most {MAX_PARTS} parts are kept.")));
    }
    let text = serde_json::to_string(&parts).map_err(|e| Error::Unwritable(e.to_string()))?;
    if text.len() > MAX_BYTES {
        return Err(Error::Invalid(format!("Saved data is limited to {MAX_BYTES} bytes.")));
    }
    let unwritable = |e: std::io::Error| Error::Unwritable(e.to_string());
    if let Some(folder) = file.parent() {
        std::fs::create_dir_all(folder).map_err(unwritable)?;
    }
    // Written beside the file and then moved into place, so a crash cannot leave half a file.
    // Each process writes its own draft, so two copies of the app saving at once never share one.
    let draft = file.with_extension(format!("json.{}.tmp", std::process::id()));
    std::fs::write(&draft, text + "\n").map_err(unwritable)?;
    std::fs::rename(&draft, file).map_err(unwritable)?;
    Ok(parts)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn scratch(name: &str) -> PathBuf {
        let folder = std::env::temp_dir().join(format!("gta6hq-userdata-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&folder);
        folder.join("deeper").join("userdata.json")
    }

    #[test]
    fn parts_are_kept_replaced_and_removed() {
        let file = scratch("kept");
        assert!(load(&file).is_empty());
        assert!(merge(
            &file,
            &json!({"favourites": ["locations/key-lento"], "ticks": {"a": true}})
        )
        .is_ok());
        let all = merge(
            &file,
            &json!({"favourites": ["locations/key-lento", "businesses/fleeca"]}),
        )
        .ok()
        .expect("saved");
        assert_eq!(all.len(), 2);
        let again = load(&file);
        assert_eq!(again["favourites"], json!(["locations/key-lento", "businesses/fleeca"]));
        assert_eq!(again["ticks"], json!({"a": true}));
        assert!(merge(&file, &json!({"ticks": null})).is_ok());
        assert!(!load(&file).contains_key("ticks"));
        let _ = std::fs::remove_dir_all(file.parent().and_then(Path::parent).expect("scratch folder"));
    }

    #[test]
    fn a_damaged_file_is_kept_aside_not_overwritten() {
        let file = scratch("kept-aside");
        std::fs::create_dir_all(file.parent().expect("folder")).expect("folder made");
        std::fs::write(&file, "{\"favourites\": [\"a\"").expect("written");
        let (parts, aside) = read(&file).expect("read");
        assert!(parts.is_empty());
        let aside = aside.expect("moved aside");
        assert_eq!(
            std::fs::read_to_string(&aside).expect("kept"),
            "{\"favourites\": [\"a\""
        );
        assert!(merge(&file, &json!({"favourites": ["b"]})).is_ok());
        assert_eq!(load(&file)["favourites"], json!(["b"]));
        assert!(aside.exists());
        let _ = std::fs::remove_dir_all(file.parent().and_then(Path::parent).expect("scratch folder"));
    }

    #[test]
    fn a_file_that_cannot_be_read_now_is_an_error_and_is_never_replaced() {
        // A folder where the file should be stands in for a file locked by another program.
        let file = scratch("unreadable");
        std::fs::create_dir_all(&file).expect("folder made");
        assert!(read(&file).is_err());
        assert!(matches!(
            merge(&file, &json!({"favourites": ["x"]})),
            Err(Error::Unwritable(_))
        ));
        assert!(file.is_dir(), "left as it was");
        let _ = std::fs::remove_dir_all(file.parent().and_then(Path::parent).expect("scratch folder"));
    }

    #[test]
    fn bad_names_and_oversized_data_are_refused() {
        let file = scratch("refused");
        for bad in [
            json!(["favourites"]),
            json!({"Bad Name": 1}),
            json!({"../x": 1}),
            json!({"": 1}),
        ] {
            assert!(matches!(merge(&file, &bad), Err(Error::Invalid(_))), "{bad}");
        }
        assert!(matches!(
            merge(&file, &json!({"big": "x".repeat(MAX_BYTES)})),
            Err(Error::Invalid(_))
        ));
        let many: Map<String, Value> = (0..=MAX_PARTS).map(|i| (format!("p{i}"), json!(1))).collect();
        assert!(matches!(merge(&file, &Value::Object(many)), Err(Error::Invalid(_))));
        assert!(!file.exists());
    }

    #[test]
    fn a_damaged_file_reads_as_nothing_saved() {
        let file = scratch("damaged");
        std::fs::create_dir_all(file.parent().expect("folder")).expect("folder made");
        std::fs::write(&file, "{ not json").expect("written");
        assert!(load(&file).is_empty());
        assert!(merge(&file, &json!({"routes": []})).is_ok());
        assert_eq!(load(&file).len(), 1);
        let _ = std::fs::remove_dir_all(file.parent().and_then(Path::parent).expect("scratch folder"));
    }
}
