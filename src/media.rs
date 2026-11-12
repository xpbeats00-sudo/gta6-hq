//! Media library: every image under `images/` and every video in
//! `wallpapers/`, joined with the rights manifest in `data/media.json`.
//!
//! Files in `staging/` are never served or listed: that folder is the holding
//! area for media whose source and rights have not been recorded yet.

use std::{
    collections::BTreeMap,
    fs,
    io::Read,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::content::IMAGE_EXTENSIONS;

pub const VIDEO_EXTENSIONS: [&str; 3] = ["mp4", "webm", "mov"];
pub const RIGHTS_STATES: [&str; 4] = ["approved", "permission_required", "unknown", "rejected"];
/// App chrome, not gallery material.
const HIDDEN: [&str; 2] = ["images/gta6.png", "wallpapers/gta6splashscreen.mp4"];

/// One record in `data/media.json`.
#[derive(Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct Asset {
    /// Path relative to the app folder, e.g. `images/pier-showdown.jpg`.
    pub file: String,
    pub title: String,
    pub alt: String,
    pub creator: String,
    pub source: String,
    pub license: String,
    /// approved | permission_required | unknown | rejected
    pub rights_status: String,
    /// staged | approved | rejected
    pub approval_status: String,
    pub derived_from: String,
    pub related: Vec<String>,
}

#[derive(Deserialize, Default)]
#[serde(default)]
pub struct Manifest {
    pub assets: Vec<Asset>,
}

#[derive(Serialize)]
pub struct Item {
    pub src: String,
    pub title: String,
    pub alt: String,
    /// Sub-folder of `images/` ("characters", "vehicles", ...) or "" for the top level.
    pub group: String,
    /// The manifest's rights status, or "unreviewed" for files it does not list.
    pub rights: String,
    pub credit: String,
    pub related: Vec<String>,
}

#[derive(Serialize)]
pub struct Catalogue {
    pub images: Vec<Item>,
    pub videos: Vec<Item>,
}

pub fn load_manifest(root: &Path) -> Result<Manifest, String> {
    let path = root.join("data").join("media.json");
    match fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(text.trim_start_matches('\u{feff}'))
            .map_err(|e| format!("data/media.json is not valid: {e}")),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Manifest::default()),
        Err(e) => Err(format!("data/media.json could not be read: {e}")),
    }
}

/// Media files on disk, as paths relative to the app folder with `/` separators.
pub fn files_on_disk(root: &Path) -> Vec<String> {
    let mut found = Vec::new();
    walk(&root.join("images"), "images", &IMAGE_EXTENSIONS, true, &mut found);
    walk(
        &root.join("wallpapers"),
        "wallpapers",
        &VIDEO_EXTENSIONS,
        false,
        &mut found,
    );
    found
}

pub fn scan(root: &Path) -> Catalogue {
    let manifest = load_manifest(root).unwrap_or_default();
    let by_file: BTreeMap<&str, &Asset> = manifest.assets.iter().map(|a| (a.file.as_str(), a)).collect();

    let mut catalogue = Catalogue {
        images: Vec::new(),
        videos: Vec::new(),
    };
    for file in files_on_disk(root) {
        if HIDDEN.contains(&file.to_lowercase().as_str()) {
            continue;
        }
        let asset = by_file.get(file.as_str()).copied();
        // Staged and rejected assets stay out of the gallery.
        if asset.is_some_and(|a| a.approval_status != "approved" || a.rights_status == "rejected") {
            continue;
        }

        let stem = Path::new(&file)
            .file_stem()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default();
        let fallback_title = title_from(&stem);
        let parts: Vec<&str> = file.split('/').collect();
        let item = Item {
            src: format!("/{file}"),
            title: asset
                .map(|a| a.title.clone())
                .filter(|t| !t.is_empty())
                .unwrap_or(fallback_title.clone()),
            alt: asset
                .map(|a| a.alt.clone())
                .filter(|t| !t.is_empty())
                .unwrap_or(fallback_title),
            group: if parts.len() > 2 {
                parts[1].to_string()
            } else {
                String::new()
            },
            rights: asset.map_or("unreviewed".to_string(), |a| a.rights_status.clone()),
            credit: asset.map(credit).unwrap_or_default(),
            related: asset.map(|a| a.related.clone()).unwrap_or_default(),
        };
        if parts[0] == "wallpapers" {
            catalogue.videos.push(item);
        } else {
            catalogue.images.push(item);
        }
    }
    catalogue
}

fn credit(asset: &Asset) -> String {
    [&asset.creator, &asset.source, &asset.license]
        .into_iter()
        .filter(|part| !part.is_empty())
        .cloned()
        .collect::<Vec<_>>()
        .join(" · ")
}

/// SHA-256 of a file, as lowercase hex.
pub fn sha256(path: &Path) -> Option<String> {
    let mut file = fs::File::open(path).ok()?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer).ok()?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Some(hasher.finalize().iter().map(|b| format!("{b:02x}")).collect())
}

/// Groups of byte-identical files (two or more paths per group).
pub fn duplicates(root: &Path, files: &[String]) -> Vec<Vec<String>> {
    let mut by_hash: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for file in files {
        if let Some(hash) = sha256(&to_path(root, file)) {
            by_hash.entry(hash).or_default().push(file.clone());
        }
    }
    by_hash.into_values().filter(|group| group.len() > 1).collect()
}

pub fn to_path(root: &Path, relative: &str) -> PathBuf {
    relative
        .split('/')
        .fold(root.to_path_buf(), |path, part| path.join(part))
}

fn walk(dir: &Path, prefix: &str, extensions: &[&str], recurse: bool, out: &mut Vec<String>) {
    let Ok(read) = fs::read_dir(dir) else { return };
    let mut entries: Vec<_> = read.filter_map(Result::ok).collect();
    entries.sort_by_key(fs::DirEntry::file_name);

    for entry in entries {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        if path.is_dir() {
            if recurse {
                walk(&path, &format!("{prefix}/{name}"), extensions, recurse, out);
            }
            continue;
        }
        let extension = path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        if extensions.contains(&extension.as_str()) {
            out.push(format!("{prefix}/{name}"));
        }
    }
}

/// "gta-vi-pier-showdown" -> "GTA VI Pier Showdown"
fn title_from(stem: &str) -> String {
    stem.split(['-', '_', ' '])
        .filter(|w| !w.is_empty())
        .map(|w| match w.to_lowercase().as_str() {
            "gta" => "GTA".to_string(),
            "vi" => "VI".to_string(),
            "and" | "of" | "the" | "on" => w.to_lowercase(),
            _ => {
                let mut chars = w.chars();
                chars.next().map_or_else(String::new, |first| {
                    first.to_uppercase().collect::<String>() + chars.as_str()
                })
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn titles_are_readable() {
        assert_eq!(
            title_from("gta-vi-pier-showdown-jason-lucia"),
            "GTA VI Pier Showdown Jason Lucia"
        );
        assert_eq!(title_from("dawn-of-the-heist"), "Dawn of the Heist");
    }

    #[test]
    fn staged_and_rejected_assets_stay_out_of_the_gallery_and_duplicates_are_found() {
        let root = std::env::temp_dir().join(format!("gta6hq-media-{}", std::process::id()));
        fs::create_dir_all(root.join("images")).unwrap();
        fs::create_dir_all(root.join("data")).unwrap();
        for name in ["shown.jpg", "staged.jpg", "rejected.jpg", "copy.jpg", "unlisted.png"] {
            let bytes: &[u8] = if name == "unlisted.png" {
                b"different"
            } else {
                b"same bytes"
            };
            fs::write(root.join("images").join(name), bytes).unwrap();
        }
        fs::write(
            root.join("data").join("media.json"),
            r#"{"assets":[
              {"file":"images/shown.jpg","approval_status":"approved","rights_status":"unknown"},
              {"file":"images/copy.jpg","approval_status":"approved","rights_status":"approved"},
              {"file":"images/staged.jpg","approval_status":"staged","rights_status":"unknown"},
              {"file":"images/rejected.jpg","approval_status":"approved","rights_status":"rejected"}]}"#,
        )
        .unwrap();

        let shown: Vec<(String, String)> = scan(&root).images.into_iter().map(|i| (i.src, i.rights)).collect();
        let groups = duplicates(&root, &files_on_disk(&root));
        fs::remove_dir_all(&root).unwrap();

        assert_eq!(
            shown,
            [
                ("/images/copy.jpg".to_string(), "approved".to_string()),
                ("/images/shown.jpg".to_string(), "unknown".to_string()),
                ("/images/unlisted.png".to_string(), "unreviewed".to_string()),
            ]
        );
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].len(), 4);
    }
}
