//! GTA 6 HQ — an unofficial Grand Theft Auto VI fan encyclopedia.
//!
//! One executable: an embedded axum server (content, search, media catalogue,
//! map tiles) plus a native window that shows it.
//!
//!   gta6-hq                 open the app window
//!   gta6-hq --serve         run only the server (open it in any browser)
//!   gta6-hq --port 4600     pick the port (default: any free port)
//!   gta6-hq --validate      print the data integrity report and exit
//!   gta6-hq --template KEY  print an empty entry for a category (add --csv for a CSV header)
//!   gta6-hq --import FILE   add a JSON or CSV batch of entries (--dry-run, --update)

#![cfg_attr(all(not(debug_assertions), windows), windows_subsystem = "windows")]

mod content;
mod discord;
mod import;
mod media;
mod search;
mod server;
mod tiles;
mod update;
mod validate;
mod window;

use std::path::{Path, PathBuf};

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let has = |flag: &str| args.iter().any(|a| a == flag);
    let serve_only = has("--serve");
    let port = args
        .iter()
        .position(|a| a == "--port")
        .and_then(|i| args.get(i + 1))
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(if serve_only { 4600 } else { 0 });

    let root = find_root().unwrap_or_else(|| {
        fail("GTA 6 HQ could not find its files.\n\nKeep the program together with its ui, data, images and wallpapers folders, or set GTA6_HQ_ROOT to the folder that holds them.")
    });

    let value_of = |flag: &str| {
        args.iter()
            .position(|a| a == flag)
            .map(|i| args.get(i + 1).filter(|v| !v.starts_with("--")))
    };

    if has("--validate") {
        let report = validate::validate(&root);
        print!("{}", report.to_markdown());
        std::process::exit(i32::from(report.errors > 0));
    }
    if let Some(category) = value_of("--template") {
        let wiki = content::load_full(&root);
        let printed = match category {
            Some(category) if has("--csv") => import::template_csv(&wiki, category),
            Some(category) => import::template(&wiki, category).map(|entry| {
                format!(
                    "{entry:#}
"
                )
            }),
            None => Err(format!(
                "Usage: gta6-hq --template <category> [--csv]. Categories: {}.",
                content::sections(&wiki).join(", ")
            )),
        };
        match printed {
            Ok(text) => print!("{text}"),
            // On standard output, like every other answer from these commands: the
            // release build has no console, and a pipe only carries standard output.
            Err(error) => {
                println!("{error}");
                std::process::exit(1);
            }
        }
        return;
    }
    if let Some(file) = value_of("--import") {
        let Some(file) = file else {
            println!("Usage: gta6-hq --import <file.json|file.csv> [--dry-run] [--update]");
            std::process::exit(1);
        };
        let options = import::Options {
            dry_run: has("--dry-run"),
            update: has("--update"),
        };
        std::process::exit(import::run(&root, Path::new(file), options));
    }

    let runtime = tokio::runtime::Runtime::new().expect("start async runtime");
    // Loopback only: the app is never reachable from other machines.
    let listener = runtime
        .block_on(tokio::net::TcpListener::bind(("127.0.0.1", port)))
        .unwrap_or_else(|e| fail(&format!("GTA 6 HQ could not start on 127.0.0.1:{port}.\n\n{e}")));
    let url = format!("http://{}/", listener.local_addr().expect("local address"));
    // Discord Rich Presence belongs to the desktop app, not to server-only mode.
    let presence = if serve_only { None } else { discord::start(&root) };
    let app = server::router(server::AppState::new(root.clone(), presence));

    if serve_only {
        println!("GTA 6 HQ running at {url}");
        runtime
            .block_on(async { axum::serve(listener, app).await })
            .expect("server stopped");
        return;
    }

    runtime.spawn(async move {
        if let Err(e) = axum::serve(listener, app).await {
            eprintln!("server stopped: {e}");
        }
    });
    window::run(&url, &root);
}

/// Report a startup failure where the person will see it: the console, and
/// (release builds have no console) a message box.
fn fail(message: &str) -> ! {
    eprintln!("{message}");
    window::error_dialog(message);
    std::process::exit(1);
}

/// The app folder holds `ui/`, `data/`, `images/` and `wallpapers/`.
/// Look next to the executable and upwards (covers `target/release/`),
/// then the current directory.
fn find_root() -> Option<PathBuf> {
    let is_root = |p: &Path| p.join("ui").join("index.html").is_file();

    if let Ok(explicit) = std::env::var("GTA6_HQ_ROOT") {
        let p = PathBuf::from(explicit);
        if is_root(&p) {
            return Some(p);
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(found) = exe.ancestors().skip(1).find(|p| is_root(p)) {
            return Some(found.to_path_buf());
        }
    }
    let cwd = std::env::current_dir().ok()?;
    cwd.ancestors().find(|p| is_root(p)).map(Path::to_path_buf)
}
