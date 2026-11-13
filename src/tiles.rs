//! Leonida map tiles.
//!
//! Tiles come from the community map hosted at gta6-wiki.org (GTA VI mapping
//! community via gtadb.org, CC BY 4.0). Each tile is fetched at most once and
//! kept in `cache/tiles/`, so the map keeps working offline for areas already
//! viewed and the provider is not asked twice for the same tile. The cache is
//! never pruned automatically; delete `cache/tiles/` to reset it (the whole
//! pyramid is about 360 tiles).

use std::{fs, path::Path, sync::OnceLock, time::Duration};

const UPSTREAM: &str = "https://gta6-wiki.org/maps/tiles/yanis-17";
pub const MAX_ZOOM: u8 = 5;
/// Anything larger than this is not a map tile.
const MAX_TILE_BYTES: u64 = 4 * 1024 * 1024;

#[derive(Debug, PartialEq, Eq)]
pub enum TileError {
    /// Outside the tile pyramid, or the provider has no such tile.
    NotFound,
    /// Offline, timed out, rate limited or a provider error.
    Unavailable,
}

pub fn get(root: &Path, z: u8, y: u32, x: u32) -> Result<Vec<u8>, TileError> {
    if z > MAX_ZOOM || x >= (1 << z) || y >= (1 << z) {
        return Err(TileError::NotFound);
    }
    let cached = crate::cache_dir(root)
        .join("tiles")
        .join(z.to_string())
        .join(y.to_string())
        .join(format!("{x}.webp"));
    if let Ok(bytes) = fs::read(&cached) {
        if is_webp(&bytes) {
            return Ok(bytes);
        }
    }

    let bytes = fetch(&format!("{UPSTREAM}/{z}/{y}/{x}.webp"))?;
    store(&cached, &bytes);
    Ok(bytes)
}

fn fetch(url: &str) -> Result<Vec<u8>, TileError> {
    static AGENT: OnceLock<ureq::Agent> = OnceLock::new();
    let agent = AGENT.get_or_init(|| {
        ureq::Agent::config_builder()
            .timeout_global(Some(Duration::from_secs(15)))
            .user_agent("gta6-hq-desktop")
            .build()
            .into()
    });

    let mut response = agent.get(url).call().map_err(|error| match error {
        ureq::Error::StatusCode(404) => TileError::NotFound,
        _ => TileError::Unavailable,
    })?;
    let bytes = response
        .body_mut()
        .with_config()
        .limit(MAX_TILE_BYTES)
        .read_to_vec()
        .map_err(|_| TileError::Unavailable)?;
    // A captive portal or error page must never be cached as a tile.
    if is_webp(&bytes) {
        Ok(bytes)
    } else {
        Err(TileError::Unavailable)
    }
}

/// Write to a temporary file and rename, so a crash or a second request for
/// the same tile can never leave a half-written file in the cache.
fn store(path: &Path, bytes: &[u8]) {
    let Some(dir) = path.parent() else { return };
    if fs::create_dir_all(dir).is_err() {
        return;
    }
    let temporary = path.with_extension(format!("tmp{}", std::process::id()));
    if fs::write(&temporary, bytes).is_ok() && fs::rename(&temporary, path).is_err() {
        let _ = fs::remove_file(&temporary);
    }
}

fn is_webp(bytes: &[u8]) -> bool {
    bytes.len() > 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_tiles_outside_the_pyramid() {
        let root = Path::new("does-not-exist");
        assert_eq!(get(root, MAX_ZOOM + 1, 0, 0), Err(TileError::NotFound));
        assert_eq!(get(root, 0, 0, 1), Err(TileError::NotFound));
        assert_eq!(get(root, 2, 4, 0), Err(TileError::NotFound));
    }

    #[test]
    fn only_webp_data_counts_as_a_tile() {
        assert!(is_webp(b"RIFF\x10\x00\x00\x00WEBPVP8 ..."));
        assert!(!is_webp(b"<html>Sign in to the wifi</html>"));
        assert!(!is_webp(b""));
    }

    #[test]
    fn cached_tiles_are_served_without_the_network_and_junk_is_ignored() {
        let root = std::env::temp_dir().join(format!("gta6hq-tiles-{}", std::process::id()));
        let dir = root.join("cache").join("tiles").join("0").join("0");
        fs::create_dir_all(&dir).unwrap();
        let tile = b"RIFF\x10\x00\x00\x00WEBPVP8 test".to_vec();
        store(&dir.join("0.webp"), &tile);

        let served = get(&root, 0, 0, 0);
        let leftovers = fs::read_dir(&dir).unwrap().count();
        fs::remove_dir_all(&root).unwrap();

        assert_eq!(served, Ok(tile));
        assert_eq!(leftovers, 1, "no temporary files left behind");
    }
}
