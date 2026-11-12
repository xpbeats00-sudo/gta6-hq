//! Gathers what the setup window carries inside its exe: its pages, the pictures and live
//! wallpapers, the notice, and the Inno Setup installer that does the real work.
use std::{env, fmt::Write as _, fs, path::Path};

fn main() {
    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let repo = here.join("../..");
    let out = Path::new(&env::var("OUT_DIR").unwrap()).to_path_buf();
    let mut table = String::from("pub static ASSETS: &[(&str, &[u8])] = &[\n");
    let mut add = |name: &str, file: &Path| {
        println!("cargo:rerun-if-changed={}", file.display());
        writeln!(
            table,
            "    ({name:?}, include_bytes!({:?})),",
            file.canonicalize().unwrap()
        )
        .unwrap();
    };
    for name in ["index.html", "setup.css", "setup.js"] {
        add(name, &here.join("ui").join(name));
    }
    add("logo.png", &repo.join("images/gta6.png"));
    add("notice.txt", &here.join("../notice.txt"));
    // Live wallpapers shown behind the pages, in this order.
    for name in [
        "jason-and-lucia-vice-city-sunset-gta-vi.mp4",
        "gta-vi-pier-showdown-jason-lucia.mp4",
    ] {
        add(&format!("walls/{name}"), &repo.join("wallpapers").join(name));
    }
    let mut cards: Vec<_> = fs::read_dir(here.join("assets/cards"))
        .unwrap()
        .flatten()
        .map(|e| e.path())
        .collect();
    cards.sort();
    for card in &cards {
        add(&format!("cards/{}", card.file_name().unwrap().to_string_lossy()), card);
    }
    table.push_str("];\n");
    fs::write(out.join("assets.rs"), table).unwrap();

    // The installer it carries. scripts/package_release.py puts it in payload/ before building;
    // without it the window still builds, for working on its look, but cannot install.
    let payload = here.join("payload/core.exe");
    println!("cargo:rerun-if-changed={}", payload.display());
    let carried = if payload.exists() {
        payload
    } else {
        fs::write(out.join("empty"), b"").unwrap();
        out.join("empty")
    };
    fs::write(
        out.join("payload.rs"),
        format!(
            "pub static PAYLOAD: &[u8] = include_bytes!({:?});\n",
            carried.canonicalize().unwrap()
        ),
    )
    .unwrap();
    let files = fs::read_to_string(here.join("payload/files.txt")).unwrap_or_default();
    println!("cargo:rerun-if-changed={}", here.join("payload/files.txt").display());
    println!(
        "cargo:rustc-env=SETUP_FILE_COUNT={}",
        files.trim().parse::<u32>().unwrap_or(0)
    );

    // The version comes from the app's own Cargo.toml.
    let manifest = fs::read_to_string(repo.join("Cargo.toml")).unwrap();
    println!("cargo:rerun-if-changed={}", repo.join("Cargo.toml").display());
    let version = manifest
        .lines()
        .find_map(|l| l.strip_prefix("version = "))
        .unwrap_or("\"\"")
        .trim_matches('"');
    println!("cargo:rustc-env=APP_VERSION={version}");

    println!("cargo:rerun-if-changed=setup.rc");
    embed_resource::compile("setup.rc", embed_resource::NONE)
        .manifest_optional()
        .unwrap();
}
