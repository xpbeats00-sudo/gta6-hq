//! Backups of the reader's saved progress: one JSON file the page builds (saved data plus
//! settings) and the app writes to the reader's Downloads folder, so it can be kept, copied to
//! another computer and read back with Restore on the Settings page.
//!
//! The page does the restoring itself (it reads the file the reader picks and replaces the saved
//! parts through `/api/userdata`); this side only writes files, under a fixed name pattern, in
//! one folder. Nothing is sent anywhere.

use std::path::{Path, PathBuf};

use serde_json::Value;

/// A backup holds the whole saved-data document plus the settings, so it may be a little
/// larger than the saved data alone.
pub const MAX_BYTES: usize = crate::userdata::MAX_BYTES + 256 * 1024;
/// The largest request body `/api/backup` reads.
pub const MAX_REQUEST_BYTES: usize = MAX_BYTES + 64 * 1024;

/// Where backups go: `GTA6_HQ_BACKUPS` if set, else the Downloads folder in the reader's home
/// folder, else the folder that holds the saved data.
pub fn folder(root: &Path) -> PathBuf {
    if let Some(explicit) = std::env::var_os("GTA6_HQ_BACKUPS").filter(|v| !v.is_empty()) {
        return PathBuf::from(explicit);
    }
    let home = std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).filter(|v| !v.is_empty());
    if let Some(downloads) = home.map(|h| PathBuf::from(h).join("Downloads")).filter(|d| d.is_dir()) {
        return downloads;
    }
    let data = crate::userdata::file(root);
    data.parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."))
}

/// The stamp the page sends ("2026-11-22-1530"), kept to digits and dashes.
fn stamp(backup: &Value) -> String {
    let given: String = backup
        .get("stamp")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '-')
        .take(20)
        .collect();
    let given = given.trim_matches('-').to_string();
    if given.is_empty() {
        let secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or_default();
        secs.to_string()
    } else {
        given
    }
}

/// Write one backup and answer with its path. It must be a GTA 6 HQ backup (an object with
/// `"app": "GTA 6 HQ"`, `"kind": "backup"` and a `userdata` object); an existing file is never
/// replaced: a second backup in the same minute gets "-2", "-3" and so on.
pub fn write(folder: &Path, backup: &Value) -> Result<PathBuf, String> {
    let ok = backup.get("app").and_then(Value::as_str) == Some("GTA 6 HQ")
        && backup.get("kind").and_then(Value::as_str) == Some("backup")
        && backup.get("userdata").is_some_and(Value::is_object);
    if !ok {
        return Err("That is not a GTA 6 HQ backup.".into());
    }
    let text = serde_json::to_string_pretty(backup).map_err(|e| e.to_string())?;
    if text.len() > MAX_BYTES {
        return Err(format!("A backup is limited to {MAX_BYTES} bytes."));
    }
    std::fs::create_dir_all(folder).map_err(|e| format!("The folder {} could not be made: {e}", folder.display()))?;
    let base = format!("GTA6-HQ-backup-{}", stamp(backup));
    for n in 1..1000 {
        let name = if n == 1 {
            format!("{base}.json")
        } else {
            format!("{base}-{n}.json")
        };
        let path = folder.join(name);
        match std::fs::OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(mut file) => {
                use std::io::Write;
                file.write_all(text.as_bytes())
                    .and_then(|()| file.write_all(b"\n"))
                    .map_err(|e| format!("The backup could not be written: {e}"))?;
                return Ok(path);
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(format!("The backup could not be written to {}: {e}", folder.display())),
        }
    }
    Err("Too many backups with the same name in that folder.".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn temp(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("gta6-hq-backup-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn writes_a_backup_and_never_overwrites_one() {
        let dir = temp("write");
        let backup = json!({"app": "GTA 6 HQ", "kind": "backup", "stamp": "2026-11-22-1530", "userdata": {"favourites": ["e:x"]}});
        let first = write(&dir, &backup).unwrap();
        let second = write(&dir, &backup).unwrap();
        assert_eq!(first.file_name().unwrap(), "GTA6-HQ-backup-2026-11-22-1530.json");
        assert_eq!(second.file_name().unwrap(), "GTA6-HQ-backup-2026-11-22-1530-2.json");
        let read: Value = serde_json::from_str(&std::fs::read_to_string(&first).unwrap()).unwrap();
        assert_eq!(read["userdata"]["favourites"][0], "e:x");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn refuses_anything_else_and_cleans_the_stamp() {
        let dir = temp("refuse");
        assert!(write(&dir, &json!({"kind": "backup", "userdata": {}})).is_err());
        assert!(write(&dir, &json!({"app": "GTA 6 HQ", "kind": "backup", "userdata": []})).is_err());
        let odd = json!({"app": "GTA 6 HQ", "kind": "backup", "stamp": "../../evil 12", "userdata": {}});
        let path = write(&dir, &odd).unwrap();
        assert_eq!(path.parent().unwrap(), dir.as_path());
        assert_eq!(path.file_name().unwrap(), "GTA6-HQ-backup-12.json");
        let _ = std::fs::remove_dir_all(&dir);
    }
}
