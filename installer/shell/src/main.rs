//! GTA 6 HQ Setup: the installer's own window.
//!
//! It shows pages in the app's look (live wallpaper, sliding picture cards, the loading ring)
//! and does the installing by running the Inno Setup installer it carries, silently, while
//! reading that installer's log to show how far along it is. Inno Setup still does the real
//! work: copying files, shortcuts, and the entry under "Installed apps" with its uninstaller.
//!
//! If the window cannot be shown (no WebView2 runtime), the carried installer is run with its
//! own pages instead, so setup always works.
//!
//! `--demo` shows the pages and a pretend installation without installing anything.
#![windows_subsystem = "windows"]

use std::{
    borrow::Cow,
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};

use tao::{
    dpi::{LogicalSize, PhysicalPosition},
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoopBuilder, EventLoopProxy},
    window::{Icon, WindowBuilder},
};
use wry::{
    http::{header, Request, Response, StatusCode},
    WebViewBuilder,
};

include!(concat!(env!("OUT_DIR"), "/assets.rs"));
include!(concat!(env!("OUT_DIR"), "/payload.rs"));

const ORIGIN: &str = "http://setup.localhost";
const DISCORD_INVITE: &str = "https://discord.gg/YhMHr8N4an";
const APP_EXE: &str = "gta6-hq.exe";
const BACKGROUND: (u8, u8, u8, u8) = (11, 10, 22, 255);
const ICON_SIZE: u32 = 128;

/// What the page, or the installing thread, asks the window to do.
#[derive(Debug, Clone, PartialEq, Eq)]
enum Msg {
    Drag,
    Minimize,
    Close,
    Install { desktop_shortcut: bool },
    Progress(u8),
    Installed,
    Failed(String),
    Finish { open_app: bool, open_discord: bool },
}

/// The request a message from the page stands for. Anything else is ignored.
fn message(text: &str) -> Option<Msg> {
    Some(match text {
        "drag" => Msg::Drag,
        "minimize" => Msg::Minimize,
        "close" => Msg::Close,
        "install:0" => Msg::Install {
            desktop_shortcut: false,
        },
        "install:1" => Msg::Install { desktop_shortcut: true },
        "finish:00" => Msg::Finish {
            open_app: false,
            open_discord: false,
        },
        "finish:01" => Msg::Finish {
            open_app: false,
            open_discord: true,
        },
        "finish:10" => Msg::Finish {
            open_app: true,
            open_discord: false,
        },
        "finish:11" => Msg::Finish {
            open_app: true,
            open_discord: true,
        },
        _ => return None,
    })
}

fn main() {
    let demo = std::env::args().any(|a| a == "--demo");
    let event_loop = EventLoopBuilder::<Msg>::with_user_event().build();
    let proxy = event_loop.create_proxy();

    let window = {
        use tao::platform::windows::WindowBuilderExtWindows;
        WindowBuilder::new()
            .with_title("GTA 6 HQ Setup")
            .with_inner_size(LogicalSize::new(980.0, 620.0))
            .with_resizable(false)
            .with_decorations(false)
            .with_undecorated_shadow(true)
            .with_visible(false)
            .with_window_icon(
                Icon::from_rgba(include_bytes!("../assets/icon.rgba").to_vec(), ICON_SIZE, ICON_SIZE).ok(),
            )
            .build(&event_loop)
    };
    let Ok(window) = window else {
        return run_plain_installer();
    };
    centre(&window);
    theme_window_frame(&window);

    // Keep WebView2's own files in the temp folder. Left alone, it would create a
    // "<setup name>.WebView2" folder beside the setup file, in the user's Downloads.
    let mut context = wry::WebContext::new(Some(std::env::temp_dir().join("gta6hq-setup-webview")));
    let webview = WebViewBuilder::new_with_web_context(&mut context)
        .with_custom_protocol("setup".into(), |_id, request| serve(&request))
        .with_url("setup://localhost/index.html")
        .with_initialization_script(page_info())
        .with_background_color(BACKGROUND)
        .with_autoplay(true)
        .with_devtools(false)
        // The window shows only its own pages; nothing else can be navigated to or opened.
        .with_navigation_handler(|target| target.starts_with(ORIGIN))
        .with_new_window_req_handler(|_, _| wry::NewWindowResponse::Deny)
        .with_ipc_handler({
            let proxy = proxy.clone();
            move |request| {
                if request.uri().to_string().starts_with(ORIGIN) {
                    if let Some(msg) = message(request.body()) {
                        let _ = proxy.send_event(msg);
                    }
                }
            }
        })
        .build(&window);
    let Ok(webview) = webview else {
        return run_plain_installer();
    };
    window.set_visible(true);

    let installing = Arc::new(AtomicBool::new(false));
    let installed_exe: Arc<Mutex<Option<PathBuf>>> = Arc::default();
    let tell = move |script: String| {
        let _ = webview.evaluate_script(&script);
    };

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            // Closing is refused while files are being copied.
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            }
            | Event::UserEvent(Msg::Close) => {
                if !installing.load(Ordering::SeqCst) {
                    *control_flow = ControlFlow::Exit;
                }
            }
            Event::UserEvent(Msg::Drag) => {
                let _ = window.drag_window();
            }
            Event::UserEvent(Msg::Minimize) => window.set_minimized(true),
            Event::UserEvent(Msg::Install { desktop_shortcut }) => {
                if !installing.swap(true, Ordering::SeqCst) {
                    let (proxy, found) = (proxy.clone(), installed_exe.clone());
                    thread::spawn(move || {
                        let outcome = if demo {
                            pretend(&proxy)
                        } else {
                            install(desktop_shortcut, &proxy, &found)
                        };
                        let _ = proxy.send_event(match outcome {
                            Ok(()) => Msg::Installed,
                            Err(reason) => Msg::Failed(reason),
                        });
                    });
                }
            }
            Event::UserEvent(Msg::Progress(percent)) => tell(format!("window.setup.progress({percent})")),
            Event::UserEvent(Msg::Installed) => {
                installing.store(false, Ordering::SeqCst);
                tell("window.setup.done()".into());
            }
            Event::UserEvent(Msg::Failed(reason)) => {
                installing.store(false, Ordering::SeqCst);
                tell(format!("window.setup.failed({})", js_string(&reason)));
            }
            Event::UserEvent(Msg::Finish { open_app, open_discord }) => {
                if !demo {
                    if open_discord {
                        open_in_browser(DISCORD_INVITE);
                    }
                    if let (true, Some(exe)) = (open_app, installed_exe.lock().unwrap().clone()) {
                        let _ = Command::new(&exe)
                            .current_dir(exe.parent().unwrap_or(Path::new(".")))
                            .spawn();
                    }
                }
                *control_flow = ControlFlow::Exit;
            }
            _ => {}
        }
    })
}

// ---------- the pages and their files ----------

/// What the page needs to know before it draws: the version and which pictures it carries.
fn page_info() -> String {
    let list = |folder: &str| {
        let names: Vec<String> = ASSETS
            .iter()
            .filter(|(name, _)| name.starts_with(folder))
            .map(|(name, _)| js_string(name))
            .collect();
        format!("[{}]", names.join(","))
    };
    format!(
        "window.SETUP = {{ version: {}, walls: {}, cards: {} }};",
        js_string(env!("APP_VERSION")),
        list("walls/"),
        list("cards/")
    )
}

/// A string as a JavaScript literal.
fn js_string(text: &str) -> String {
    let mut out = String::from("\"");
    for c in text.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => {}
            '<' => out.push_str("\\x3c"),
            c if (c as u32) < 0x20 => {}
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

fn content_type(name: &str) -> &'static str {
    match name.rsplit('.').next().unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" => "text/javascript; charset=utf-8",
        "txt" => "text/plain; charset=utf-8",
        "png" => "image/png",
        "jpg" => "image/jpeg",
        "mp4" => "video/mp4",
        _ => "application/octet-stream",
    }
}

/// The byte range a `Range: bytes=a-b` header asks for, within a file of `len` bytes.
fn byte_range(header: &str, len: usize) -> Option<(usize, usize)> {
    let (from, to) = header.strip_prefix("bytes=")?.split_once('-')?;
    let last = len.checked_sub(1)?;
    let (start, end) = match (from.trim(), to.trim()) {
        ("", "") => return None,
        ("", suffix) => (len.saturating_sub(suffix.parse().ok()?), last),
        (from, "") => (from.parse().ok()?, last),
        (from, to) => (from.parse().ok()?, to.parse::<usize>().ok()?.min(last)),
    };
    (start <= end && end <= last).then_some((start, end))
}

/// Answer the page's request for one of the files carried inside this exe.
/// Videos are asked for in pieces, so byte ranges are honoured.
fn serve(request: &Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
    let name = request.uri().path().trim_start_matches('/');
    let Some(&(name, bytes)) = ASSETS.iter().find(|(known, _)| *known == name) else {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Cow::Borrowed(&[][..]))
            .unwrap();
    };
    let reply = Response::builder()
        .header(header::CONTENT_TYPE, content_type(name))
        .header(header::ACCEPT_RANGES, "bytes")
        .header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'")
        .header("X-Content-Type-Options", "nosniff");
    let range = request
        .headers()
        .get(header::RANGE)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| byte_range(v, bytes.len()));
    match range {
        Some((start, end)) => reply
            .status(StatusCode::PARTIAL_CONTENT)
            .header(header::CONTENT_RANGE, format!("bytes {start}-{end}/{}", bytes.len()))
            .body(Cow::Borrowed(&bytes[start..=end])),
        None => reply.body(Cow::Borrowed(bytes)),
    }
    .unwrap()
}

// ---------- installing ----------

/// A private folder under the user's temp folder for the carried installer and its log.
fn work_folder() -> Result<PathBuf, String> {
    let folder = std::env::temp_dir().join(format!("gta6hq-setup-{}", std::process::id()));
    fs::create_dir_all(&folder).map_err(|e| format!("Could not create a temporary folder: {e}"))?;
    Ok(folder)
}

/// Write the carried installer out so it can be run.
fn unpack(folder: &Path) -> Result<PathBuf, String> {
    if PAYLOAD.is_empty() {
        return Err("This copy of Setup carries no installer. Download it again from the releases page.".into());
    }
    let core = folder.join("GTA6HQ-Setup-core.exe");
    fs::write(&core, PAYLOAD).map_err(|e| format!("Could not unpack the installer: {e}"))?;
    Ok(core)
}

/// How many files the installer's log says it has copied, and where the app's exe went.
fn read_log(log: &Path) -> (u32, Option<PathBuf>) {
    let text = String::from_utf8_lossy(&fs::read(log).unwrap_or_default()).into_owned();
    let mut copied = 0;
    let mut exe = None;
    for line in text.lines() {
        if let Some((_, path)) = line.split_once("Dest filename: ") {
            copied += 1;
            if path.trim().ends_with(APP_EXE) {
                exe = Some(PathBuf::from(path.trim()));
            }
        }
    }
    (copied, exe)
}

/// The share of files copied, as a percentage held below 100 until the installer has finished.
fn percent(copied: u32, total: u32) -> u8 {
    if total == 0 {
        return 0;
    }
    (u64::from(copied) * 100 / u64::from(total)).min(99) as u8
}

/// Run the carried installer silently and report its progress from its log.
fn install(desktop_shortcut: bool, proxy: &EventLoopProxy<Msg>, found: &Mutex<Option<PathBuf>>) -> Result<(), String> {
    let folder = work_folder()?;
    let result = (|| {
        let core = unpack(&folder)?;
        let log = folder.join("install.log");
        let total: u32 = env!("SETUP_FILE_COUNT").parse().unwrap_or(0);
        let mut child = Command::new(&core)
            .args(["/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/CLOSEAPPLICATIONS"])
            .arg(format!("/LOG={}", log.display()))
            .arg(if desktop_shortcut {
                "/TASKS=desktopicon"
            } else {
                "/TASKS="
            })
            .spawn()
            .map_err(|e| format!("Could not start the installer: {e}"))?;
        let status = loop {
            if let Some(status) = child
                .try_wait()
                .map_err(|e| format!("Lost track of the installer: {e}"))?
            {
                break status;
            }
            let _ = proxy.send_event(Msg::Progress(percent(read_log(&log).0, total)));
            thread::sleep(Duration::from_millis(200));
        };
        if !status.success() {
            return Err(match status.code() {
                Some(5) => "Setup was cancelled.".to_string(),
                Some(code) => {
                    format!("The installer stopped with code {code}. Close GTA 6 HQ if it is open, then try again.")
                }
                None => "The installer stopped unexpectedly.".to_string(),
            });
        }
        *found.lock().unwrap() = read_log(&log).1;
        Ok(())
    })();
    let _ = fs::remove_dir_all(&folder);
    result
}

/// `--demo`: count to 100 without installing anything, to look at the pages.
fn pretend(proxy: &EventLoopProxy<Msg>) -> Result<(), String> {
    for step in 0..=50u8 {
        let _ = proxy.send_event(Msg::Progress((step * 2).min(99)));
        thread::sleep(Duration::from_millis(90));
    }
    Ok(())
}

/// The fallback when the window cannot be shown: run the carried installer with its own pages.
fn run_plain_installer() {
    if let Ok(folder) = work_folder() {
        if let Ok(core) = unpack(&folder) {
            let _ = Command::new(core).status();
        }
        let _ = fs::remove_dir_all(folder);
    }
}

/// Hand a web link to the default browser, as a single argument and never through a shell.
fn open_in_browser(url: &str) {
    if url.starts_with("https://") {
        let _ = Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", url])
            .spawn();
    }
}

// ---------- the window ----------

fn centre(window: &tao::window::Window) {
    if let Some(monitor) = window.current_monitor() {
        let (screen, size, origin) = (monitor.size(), window.outer_size(), monitor.position());
        window.set_outer_position(PhysicalPosition::new(
            origin.x + (screen.width as i32 - size.width as i32) / 2,
            origin.y + (screen.height as i32 - size.height as i32) / 2,
        ));
    }
}

/// A pink border and rounded corners, as on the app's window. Windows 11 only; older versions ignore it.
fn theme_window_frame(window: &tao::window::Window) {
    use tao::platform::windows::WindowExtWindows;

    #[link(name = "dwmapi")]
    extern "system" {
        fn DwmSetWindowAttribute(hwnd: isize, attribute: u32, value: *const u32, size: u32) -> i32;
    }
    const DWMWA_WINDOW_CORNER_PREFERENCE: u32 = 33;
    const DWMWA_BORDER_COLOR: u32 = 34;
    const DWMWCP_ROUND: u32 = 2;
    /// A COLORREF is 0x00BBGGRR; this is the app's pink, #ee3f7c.
    const PINK: u32 = 0x7c << 16 | 0x3f << 8 | 0xee;

    let hwnd = window.hwnd();
    for (attribute, value) in [
        (DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND),
        (DWMWA_BORDER_COLOR, PINK),
    ] {
        // SAFETY: `hwnd` is this live window, and `value` is a u32 that outlives the call.
        unsafe {
            DwmSetWindowAttribute(hwnd, attribute, &value, 4);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_known_messages_are_accepted() {
        assert_eq!(message("drag"), Some(Msg::Drag));
        assert_eq!(message("install:1"), Some(Msg::Install { desktop_shortcut: true }));
        assert_eq!(
            message("finish:10"),
            Some(Msg::Finish {
                open_app: true,
                open_discord: false
            })
        );
        assert_eq!(message("install:2"), None);
        assert_eq!(message("finish:1"), None);
        assert_eq!(message("run:calc.exe"), None);
    }

    #[test]
    fn byte_ranges_are_read_and_bounded() {
        assert_eq!(byte_range("bytes=0-99", 1000), Some((0, 99)));
        assert_eq!(byte_range("bytes=900-", 1000), Some((900, 999)));
        assert_eq!(byte_range("bytes=-100", 1000), Some((900, 999)));
        assert_eq!(byte_range("bytes=0-5000", 1000), Some((0, 999)));
        assert_eq!(byte_range("bytes=1000-", 1000), None);
        assert_eq!(byte_range("bytes=5-2", 1000), None);
        assert_eq!(byte_range("items=0-1", 1000), None);
        assert_eq!(byte_range("bytes=0-", 0), None);
    }

    #[test]
    fn progress_stays_below_100_until_the_installer_ends() {
        assert_eq!(percent(0, 200), 0);
        assert_eq!(percent(100, 200), 50);
        assert_eq!(percent(200, 200), 99);
        assert_eq!(percent(999, 200), 99);
        assert_eq!(percent(5, 0), 0);
    }

    #[test]
    fn strings_cannot_break_out_of_a_script() {
        assert_eq!(js_string("a\"b\\c\n</script>"), "\"a\\\"b\\\\c\\n\\x3c/script>\"");
    }

    #[test]
    fn the_pages_are_carried_and_unknown_files_are_not_served() {
        let get = |path: &str| {
            serve(
                &Request::builder()
                    .uri(format!("{ORIGIN}/{path}"))
                    .body(Vec::new())
                    .unwrap(),
            )
        };
        assert_eq!(get("index.html").status(), StatusCode::OK);
        assert_eq!(get("../Cargo.toml").status(), StatusCode::NOT_FOUND);
        assert_eq!(get("nothing.js").status(), StatusCode::NOT_FOUND);
    }
}
