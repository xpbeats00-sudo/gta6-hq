//! Encyclopedia content: `data/wiki.json`, optionally extended by one file
//! per section in `data/wiki/`, with entry images resolved from disk.
//!
//! Schema v2 adds optional per-entry `confidence`, `sources`, `related`,
//! `aliases` and `verified`, a top-level `sources` registry and a
//! `categories` list. v1 files (no such fields) still load.
//!
//! Split layout: `data/wiki/<key>.json` (or `<key>.<anything>.json`) adds to
//! the top-level `<key>` of `data/wiki.json`. A list is appended (entries of
//! a section, or extra `categories`); `sources.json` is an object whose ids
//! are added to the registry. The merged result has the same shape as a
//! single file.
//!
//! [`Store`] keeps the loaded wiki in memory and reloads it only when a data
//! file or an entry-image folder changes.

use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::SystemTime,
};

use serde_json::Value;

use crate::search;

/// Sections that always exist, whether or not `categories` lists them.
pub const FIXED_SECTIONS: [&str; 3] = ["news", "editions", "faq"];
pub const IMAGE_EXTENSIONS: [&str; 5] = ["jpg", "jpeg", "png", "webp", "gif"];
pub const CONFIDENCE_LEVELS: [&str; 5] = ["official", "corroborated", "community", "rumor", "unknown"];
/// Value types a category may declare for its fact fields.
pub const FIELD_TYPES: [&str; 5] = ["text", "number", "boolean", "list", "entry"];
pub const STATUSES: [&str; 2] = ["draft", "published"];

const BUNDLED: &str = include_str!("../data/wiki.json");

/// Everything on disk merged into one wiki, drafts included, entry images
/// attached. A broken file never crashes the app: a broken `data/wiki.json`
/// is replaced by the copy compiled into the executable, a broken split file
/// is skipped, and `_loadError` says what happened.
pub fn load_full(root: &Path) -> Value {
    let mut errors = Vec::new();
    let mut wiki = match read_json(&root.join("data").join("wiki.json"), "data/wiki.json") {
        Ok(wiki) if wiki.is_object() => wiki,
        Ok(_) => {
            errors.push("data/wiki.json is not a JSON object. Showing the built-in copy instead.".to_string());
            bundled()
        }
        Err(error) => {
            errors.push(format!("{error}. Showing the built-in copy instead."));
            bundled()
        }
    };
    for path in split_files(root) {
        let label = format!("data/wiki/{}", file_name(&path));
        let merged = read_json(&path, &label).and_then(|part| {
            let key = split_key(&path).ok_or_else(|| format!("{label} has no usable name"))?;
            merge_part(&mut wiki, &key, part).map_err(|e| format!("{label}: {e}"))
        });
        if let Err(error) = merged {
            errors.push(format!("{error}. That file is not shown."));
        }
    }
    if !errors.is_empty() {
        wiki["_loadError"] = Value::String(errors.join(" "));
    }
    attach_images(&mut wiki, root);
    wiki
}

/// What the app shows: the full wiki without draft entries.
pub fn load(root: &Path) -> Value {
    published(load_full(root))
}

/// Remove draft entries (they are validated, but never shown or searched).
pub fn published(mut wiki: Value) -> Value {
    for section in sections(&wiki) {
        if let Some(entries) = wiki.get_mut(&section).and_then(Value::as_array_mut) {
            entries.retain(|entry| !is_draft(entry));
        }
    }
    wiki
}

pub fn is_draft(entry: &Value) -> bool {
    entry.get("status").and_then(Value::as_str) == Some("draft")
}

pub fn is_spoiler(entry: &Value) -> bool {
    entry.get("spoiler").and_then(Value::as_bool).unwrap_or(false)
}

pub fn bundled() -> Value {
    serde_json::from_str(BUNDLED).expect("bundled wiki.json is valid")
}

/// Read a JSON file. Notepad and PowerShell like to add a byte-order mark;
/// JSON parsers do not.
pub fn read_json(path: &Path, label: &str) -> Result<Value, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{label} could not be read: {e}"))?;
    serde_json::from_str(text.trim_start_matches('\u{feff}')).map_err(|e| format!("{label} is not valid JSON: {e}"))
}

/// The `.json` files in `data/wiki/`, in name order.
pub fn split_files(root: &Path) -> Vec<PathBuf> {
    let mut files: Vec<PathBuf> = std::fs::read_dir(root.join("data").join("wiki"))
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.is_file() && path.extension().is_some_and(|ext| ext.eq_ignore_ascii_case("json")))
        .collect();
    files.sort();
    files
}

/// `vehicles.json` and `vehicles.boats.json` both belong to `vehicles`.
pub fn split_key(path: &Path) -> Option<String> {
    let name = path.file_name()?.to_str()?;
    let key = name.split('.').next()?;
    (!key.is_empty() && !key.starts_with('_')).then(|| key.to_string())
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default()
}

/// Add the contents of one split file to top-level `key`.
pub fn merge_part(wiki: &mut Value, key: &str, part: Value) -> Result<(), String> {
    let Some(top) = wiki.as_object_mut() else {
        return Err("the wiki is not a JSON object".into());
    };
    match part {
        Value::Array(items) => match top.entry(key).or_insert_with(|| Value::Array(Vec::new())) {
            Value::Array(existing) => {
                existing.extend(items);
                Ok(())
            }
            _ => Err(format!("`{key}` is not a list in data/wiki.json")),
        },
        Value::Object(ids) if key == "sources" => {
            match top.entry(key).or_insert_with(|| Value::Object(serde_json::Map::new())) {
                Value::Object(existing) => {
                    let clashes: Vec<&str> = ids
                        .keys()
                        .filter(|id| existing.contains_key(*id))
                        .map(String::as_str)
                        .collect();
                    if !clashes.is_empty() {
                        return Err(format!("source id already defined: {}", clashes.join(", ")));
                    }
                    existing.extend(ids);
                    Ok(())
                }
                _ => Err("`sources` is not an object in data/wiki.json".into()),
            }
        }
        Value::Object(_) => Err("only sources.json may hold an object; section files hold a list of entries".into()),
        _ => Err("expected a list of entries".into()),
    }
}

/// Keys of every section holding wiki entries: the declared categories
/// (v1 files: the three original ones) plus news, editions and FAQ.
pub fn sections(wiki: &Value) -> Vec<String> {
    let mut keys: Vec<String> = match wiki.get("categories").and_then(Value::as_array) {
        Some(categories) => categories
            .iter()
            .filter_map(|c| c.get("key").and_then(Value::as_str))
            .map(str::to_string)
            .collect(),
        None => vec!["characters".into(), "locations".into(), "vehicles".into()],
    };
    for fixed in FIXED_SECTIONS {
        if !keys.iter().any(|k| k == fixed) {
            keys.push(fixed.to_string());
        }
    }
    keys
}

/// The declaration of one category (`None` for the fixed sections).
pub fn category<'a>(wiki: &'a Value, key: &str) -> Option<&'a Value> {
    wiki.get("categories")
        .and_then(Value::as_array)?
        .iter()
        .find(|c| c.get("key").and_then(Value::as_str) == Some(key))
}

/// The fact fields a category declares, as `(key, type)` pairs.
pub fn fields<'a>(wiki: &'a Value, section: &str) -> Vec<(&'a str, &'a str)> {
    category(wiki, section)
        .and_then(|c| c.get("fields"))
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|field| {
            Some((
                field.get("key")?.as_str()?,
                field.get("type").and_then(Value::as_str).unwrap_or("text"),
            ))
        })
        .collect()
}

/// The entries of one section (empty if the section is missing).
pub fn entries<'a>(wiki: &'a Value, section: &str) -> &'a [Value] {
    wiki.get(section).and_then(Value::as_array).map_or(&[], Vec::as_slice)
}

/// Picture files in `images/<section>/`, as lower-case stem to file name.
/// One directory listing per section instead of several probes per entry.
fn section_images(root: &Path, section: &str) -> BTreeMap<String, String> {
    let mut best: BTreeMap<String, (usize, String)> = BTreeMap::new();
    for entry in std::fs::read_dir(root.join("images").join(section))
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
    {
        let name = entry.file_name().to_string_lossy().into_owned();
        let Some((stem, ext)) = name.rsplit_once('.') else {
            continue;
        };
        let Some(rank) = IMAGE_EXTENSIONS
            .iter()
            .position(|known| known.eq_ignore_ascii_case(ext))
        else {
            continue;
        };
        let stem = stem.to_lowercase();
        if best.get(&stem).is_none_or(|(held, _)| rank < *held) {
            best.insert(stem, (rank, name));
        }
    }
    best.into_iter().map(|(stem, (_, name))| (stem, name)).collect()
}

/// An entry without an explicit `image` gets `images/<section>/<slug>.<ext>`
/// if such a file exists — drop a picture in the folder and it appears.
fn attach_images(wiki: &mut Value, root: &Path) {
    for section in sections(wiki) {
        let Some(entries) = wiki.get_mut(&section).and_then(Value::as_array_mut) else {
            continue;
        };
        if entries.is_empty() {
            continue;
        }
        let images = section_images(root, &section);
        if images.is_empty() {
            continue;
        }
        for entry in entries {
            if entry.get("image").is_some_and(|i| !i.is_null()) {
                continue;
            }
            let Some(slug) = entry.get("slug").and_then(Value::as_str) else {
                continue;
            };
            if let Some(file) = images.get(&slug.to_lowercase()) {
                entry["image"] = Value::String(format!("/images/{section}/{file}"));
            }
        }
    }
}

// ---------- in-memory cache ----------

/// One loaded state of the wiki, shared between requests.
pub struct Snapshot {
    /// The published wiki (no drafts) as JSON, exactly as `/api/wiki`
    /// serves it. Encoded once per load, not once per request.
    pub json: String,
    pub index: search::Index,
}

impl Snapshot {
    fn load(root: &Path) -> Self {
        let wiki = load(root);
        Self {
            json: serde_json::to_string(&wiki).unwrap_or_else(|_| "{}".into()),
            index: search::Index::build(&wiki),
        }
    }
}

/// What the loaded wiki depends on: size and modification time of every
/// data file, and the names of the files in each entry-image folder.
#[derive(PartialEq, Eq, Debug)]
struct Fingerprint {
    data: Vec<(PathBuf, u64, Option<SystemTime>)>,
    images: Vec<String>,
}

impl Fingerprint {
    fn read(root: &Path) -> Self {
        let mut paths = vec![root.join("data").join("wiki.json")];
        paths.extend(split_files(root));
        let data = paths
            .into_iter()
            .map(|path| {
                let meta = std::fs::metadata(&path).ok();
                let size = meta.as_ref().map_or(u64::MAX, std::fs::Metadata::len);
                let modified = meta.and_then(|m| m.modified().ok());
                (path, size, modified)
            })
            .collect();

        // Entry pictures live one folder down: images/<section>/<slug>.<ext>.
        let mut images = Vec::new();
        for folder in std::fs::read_dir(root.join("images"))
            .into_iter()
            .flatten()
            .filter_map(Result::ok)
            .filter(|e| e.path().is_dir())
        {
            let section = folder.file_name().to_string_lossy().into_owned();
            for file in std::fs::read_dir(folder.path())
                .into_iter()
                .flatten()
                .filter_map(Result::ok)
            {
                images.push(format!("{section}/{}", file.file_name().to_string_lossy()));
            }
        }
        images.sort();
        Self { data, images }
    }
}

/// The wiki held in memory. `get` is cheap: it compares file sizes and
/// modification times, and re-reads only when something changed.
pub struct Store {
    root: PathBuf,
    cached: Mutex<Option<(Fingerprint, Arc<Snapshot>)>>,
}

impl Store {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            cached: Mutex::new(None),
        }
    }

    pub fn get(&self) -> Arc<Snapshot> {
        // Fingerprint first: a file saved while loading makes the next call reload.
        let now = Fingerprint::read(&self.root);
        let mut cached = self.cached.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        if let Some((seen, snapshot)) = cached.as_ref() {
            if *seen == now {
                return snapshot.clone();
            }
        }
        let snapshot = Arc::new(Snapshot::load(&self.root));
        *cached = Some((now, snapshot.clone()));
        snapshot
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use serde_json::json;

    /// A scratch app folder for one test; removed on drop.
    pub struct TempRoot(pub PathBuf);

    impl TempRoot {
        pub fn new(name: &str) -> Self {
            let root = std::env::temp_dir().join(format!("gta6hq-{name}-{}", std::process::id()));
            let _ = std::fs::remove_dir_all(&root);
            std::fs::create_dir_all(root.join("data")).unwrap();
            Self(root)
        }

        pub fn write(&self, relative: &str, text: &str) {
            let path = self.0.join(relative);
            std::fs::create_dir_all(path.parent().unwrap()).unwrap();
            std::fs::write(path, text).unwrap();
        }
    }

    impl Drop for TempRoot {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    const BASE: &str = r#"{
        "categories": [{"key": "vehicles", "label": "Vehicles"}, {"key": "weapons", "label": "Weapons"}],
        "sources": {"a": {"url": "https://example.com"}},
        "vehicles": [{"slug": "one", "name": "One", "summary": "s"}]
    }"#;

    #[test]
    fn v1_files_without_categories_still_have_sections() {
        let v1 = json!({ "characters": [], "locations": [], "vehicles": [] });
        assert_eq!(
            sections(&v1),
            ["characters", "locations", "vehicles", "news", "editions", "faq"]
        );
    }

    #[test]
    fn broken_file_on_disk_falls_back_to_bundled_copy_with_an_error() {
        let root = TempRoot::new("broken");
        root.write("data/wiki.json", "{ not json");

        let wiki = load(&root.0);

        assert!(wiki["_loadError"].as_str().unwrap().contains("not valid JSON"));
        assert!(!entries(&wiki, "characters").is_empty());
    }

    #[test]
    fn a_byte_order_mark_does_not_break_loading() {
        let root = TempRoot::new("bom");
        root.write("data/wiki.json", "\u{feff}{\"characters\": []}");
        root.write(
            "data/wiki/characters.json",
            "\u{feff}[{\"slug\": \"a\", \"name\": \"A\", \"summary\": \"s\"}]",
        );

        let wiki = load(&root.0);

        assert!(wiki.get("_loadError").is_none());
        assert_eq!(entries(&wiki, "characters").len(), 1);
    }

    #[test]
    fn split_files_are_merged_into_the_single_file_shape() {
        let root = TempRoot::new("split");
        root.write("data/wiki.json", BASE);
        root.write(
            "data/wiki/vehicles.json",
            r#"[{"slug": "two", "name": "Two", "summary": "s"}]"#,
        );
        root.write(
            "data/wiki/vehicles.boats.json",
            r#"[{"slug": "three", "name": "Three", "summary": "s"}]"#,
        );
        root.write(
            "data/wiki/weapons.json",
            r#"[{"slug": "w", "name": "W", "summary": "s"}]"#,
        );
        root.write("data/wiki/sources.json", r#"{"b": {"url": "https://example.org"}}"#);
        root.write("data/wiki/notes.txt", "ignored");

        let wiki = load(&root.0);

        assert!(wiki.get("_loadError").is_none(), "{:?}", wiki.get("_loadError"));
        let slugs: Vec<&str> = entries(&wiki, "vehicles")
            .iter()
            .map(|e| e["slug"].as_str().unwrap())
            .collect();
        assert_eq!(slugs, ["one", "three", "two"]);
        assert_eq!(entries(&wiki, "weapons").len(), 1);
        assert!(wiki["sources"]["a"].is_object() && wiki["sources"]["b"].is_object());
    }

    #[test]
    fn a_broken_split_file_is_skipped_and_reported() {
        let root = TempRoot::new("split-broken");
        root.write("data/wiki.json", BASE);
        root.write("data/wiki/weapons.json", "[ oops");
        root.write("data/wiki/sources.json", r#"{"a": {"url": "https://clash.example"}}"#);
        root.write("data/wiki/vehicles.json", r#"{"slug": "not-a-list"}"#);

        let wiki = load(&root.0);

        let error = wiki["_loadError"].as_str().unwrap();
        assert!(error.contains("data/wiki/weapons.json is not valid JSON"), "{error}");
        assert!(error.contains("source id already defined: a"), "{error}");
        assert!(error.contains("data/wiki/vehicles.json"), "{error}");
        // The good data is still there.
        assert_eq!(entries(&wiki, "vehicles").len(), 1);
        assert_eq!(wiki["sources"]["a"]["url"], "https://example.com");
    }

    #[test]
    fn drafts_are_loaded_in_full_but_not_published() {
        let root = TempRoot::new("drafts");
        root.write(
            "data/wiki.json",
            r#"{"categories": [{"key": "missions", "label": "Missions"}],
                "missions": [
                    {"slug": "a", "name": "A", "summary": "s", "status": "draft"},
                    {"slug": "b", "name": "B", "summary": "s", "status": "published"},
                    {"slug": "c", "name": "C", "summary": "s"}
                ]}"#,
        );

        assert_eq!(entries(&load_full(&root.0), "missions").len(), 3);
        let shown = load(&root.0);
        let slugs: Vec<&str> = entries(&shown, "missions")
            .iter()
            .map(|e| e["slug"].as_str().unwrap())
            .collect();
        assert_eq!(slugs, ["b", "c"]);
    }

    #[test]
    fn entry_images_are_attached_from_the_section_folder() {
        let root = TempRoot::new("images");
        root.write("data/wiki.json", BASE);
        root.write(
            "data/wiki/vehicles.json",
            r#"[{"slug": "two", "name": "Two", "summary": "s", "image": "/images/custom.jpg"},
                {"slug": "three", "name": "Three", "summary": "s"}]"#,
        );
        root.write("images/vehicles/one.png", "x");
        root.write("images/vehicles/one.jpg", "x");
        root.write("images/vehicles/two.jpg", "x");
        root.write("images/vehicles/readme.txt", "x");

        let wiki = load(&root.0);
        let vehicles = entries(&wiki, "vehicles");

        // jpg outranks png; an explicit image is kept; no file, no image.
        assert_eq!(vehicles[0]["image"], "/images/vehicles/one.jpg");
        assert_eq!(vehicles[1]["image"], "/images/custom.jpg");
        assert!(vehicles[2].get("image").is_none());
    }

    #[test]
    fn the_store_reuses_the_loaded_wiki_until_a_file_changes() {
        let root = TempRoot::new("store");
        root.write("data/wiki.json", BASE);
        let store = Store::new(root.0.clone());

        let count = |snapshot: &Snapshot| {
            let wiki: Value = serde_json::from_str(&snapshot.json).unwrap();
            entries(&wiki, "vehicles").len()
        };
        let first = store.get();
        let again = store.get();
        assert!(Arc::ptr_eq(&first, &again), "unchanged files must not be re-read");
        assert_eq!(count(&first), 1);
        assert_eq!(serde_json::from_str::<Value>(&first.json).unwrap(), load(&root.0));

        // A new split file, a changed file and a new picture each cause a reload.
        root.write(
            "data/wiki/vehicles.json",
            r#"[{"slug": "two", "name": "Two", "summary": "s"}]"#,
        );
        let second = store.get();
        assert!(!Arc::ptr_eq(&first, &second));
        assert_eq!(count(&second), 2);
        let query = search::Query {
            text: "two",
            ..search::Query::default()
        };
        assert!(first.index.page(&query, 0, 10).hits.is_empty());
        assert_eq!(second.index.page(&query, 0, 10).total, 1);

        root.write("data/wiki/vehicles.json", "[]");
        let third = store.get();
        assert_eq!(count(&third), 1);

        root.write("images/vehicles/one.jpg", "x");
        let fourth = store.get();
        assert!(!Arc::ptr_eq(&third, &fourth));
        assert!(fourth.json.contains("/images/vehicles/one.jpg"));
        assert!(Arc::ptr_eq(&fourth, &store.get()));
    }
}
