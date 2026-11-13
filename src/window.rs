//! The native app window: a tao window hosting a wry web view (WebView2 on Windows,
//! the system WebKit on macOS, WebKitGTK on Linux).

use std::path::Path;

use tao::{
    dpi::LogicalSize,
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoopBuilder},
    window::{Icon, ResizeDirection, WindowBuilder},
};
use wry::{NewWindowResponse, WebContext, WebViewBuilder};

const BACKGROUND: (u8, u8, u8, u8) = (10, 3, 24, 255);

/// What the page's own window buttons and edges can ask the window to do.
/// The window has no Windows title bar; the app draws its own controls.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Command {
    Minimize,
    ToggleMaximize,
    Close,
    Drag,
    Resize(ResizeDirection),
}

/// The command a message from the page stands for. Anything else is ignored.
fn command(message: &str) -> Option<Command> {
    Some(match message {
        "minimize" => Command::Minimize,
        "maximize" => Command::ToggleMaximize,
        "close" => Command::Close,
        "drag" => Command::Drag,
        "resize:n" => Command::Resize(ResizeDirection::North),
        "resize:s" => Command::Resize(ResizeDirection::South),
        "resize:e" => Command::Resize(ResizeDirection::East),
        "resize:w" => Command::Resize(ResizeDirection::West),
        "resize:ne" => Command::Resize(ResizeDirection::NorthEast),
        "resize:nw" => Command::Resize(ResizeDirection::NorthWest),
        "resize:se" => Command::Resize(ResizeDirection::SouthEast),
        "resize:sw" => Command::Resize(ResizeDirection::SouthWest),
        _ => return None,
    })
}

pub fn run(url: &str, root: &Path) -> ! {
    let event_loop = EventLoopBuilder::<Command>::with_user_event().build();
    let commands = event_loop.create_proxy();
    let window = undecorated(WindowBuilder::new())
        .with_title("GTA 6 HQ")
        .with_inner_size(LogicalSize::new(1440.0, 900.0))
        .with_min_inner_size(LogicalSize::new(900.0, 600.0))
        .with_window_icon(load_icon(&root.join("images").join("gta6.png")))
        .build(&event_loop)
        .unwrap_or_else(|e| {
            error_dialog(&format!("GTA 6 HQ could not open its window.\n\n{e}"));
            std::process::exit(1);
        });

    theme_window_frame(&window);

    // Keep the web view's profile in the app's cache folder rather than beside the program.
    let mut context = WebContext::new(Some(crate::cache_dir(root).join("webview")));
    let app_origin = url.trim_end_matches('/').to_string();
    let stay_in_app = {
        let app_origin = app_origin.clone();
        move |target: String| {
            if is_app_url(&target, &app_origin) {
                return true;
            }
            open_in_browser(&target);
            false
        }
    };
    let builder = WebViewBuilder::new_with_web_context(&mut context)
        // The page asks which system it is on: macOS keeps its own window buttons.
        .with_initialization_script(concat_os_script())
        .with_url(url)
        .with_background_color(BACKGROUND)
        .with_autoplay(true)
        .with_devtools(cfg!(debug_assertions))
        // Source links and map credits open in the default browser; the app
        // window itself never leaves the app.
        .with_navigation_handler(stay_in_app)
        // Window buttons, dragging and edge resizing, asked for by the app's own page only.
        .with_ipc_handler({
            let app_origin = app_origin.clone();
            move |request| {
                if is_app_url(&request.uri().to_string(), &app_origin) {
                    if let Some(command) = command(request.body()) {
                        let _ = commands.send_event(command);
                    }
                }
            }
        })
        .with_new_window_req_handler(move |target, _features| {
            if !is_app_url(&target, &app_origin) {
                open_in_browser(&target);
            }
            NewWindowResponse::Deny
        });
    #[cfg(any(windows, target_os = "macos"))]
    let webview = builder.build(&window);
    // On Linux the view goes inside the window's GTK box, which works on Wayland as well as X11.
    #[cfg(not(any(windows, target_os = "macos")))]
    let webview = {
        use tao::platform::unix::WindowExtUnix;
        use wry::WebViewBuilderExtUnix;
        match window.default_vbox() {
            Some(vbox) => builder.build_gtk(vbox),
            None => builder.build(&window),
        }
    };
    let webview = webview.unwrap_or_else(|e| {
        let needs = if cfg!(windows) {
            "The Microsoft Edge WebView2 Runtime is required (it ships with Windows 11)."
        } else if cfg!(target_os = "macos") {
            "macOS 11 or later is required."
        } else {
            "WebKitGTK 4.1 is required (the package is usually called libwebkit2gtk-4.1-0 or webkit2gtk4.1)."
        };
        eprintln!("GTA 6 HQ could not start its web view. {needs} {e}");
        error_dialog(&format!("GTA 6 HQ could not start its web view.\n\n{needs}\n\n{e}"));
        std::process::exit(1);
    });

    // Tell the page whether the window is maximised, so its button shows the right icon.
    let report_state = move |maximized: bool| {
        let _ = webview.evaluate_script(&format!("window.setWindowState && window.setWindowState({maximized})"));
    };

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            }
            | Event::UserEvent(Command::Close) => *control_flow = ControlFlow::Exit,
            Event::WindowEvent {
                event: WindowEvent::Resized(_),
                ..
            } => report_state(window.is_maximized()),
            Event::UserEvent(Command::Minimize) => window.set_minimized(true),
            Event::UserEvent(Command::ToggleMaximize) => window.set_maximized(!window.is_maximized()),
            Event::UserEvent(Command::Drag) => {
                let _ = window.drag_window();
            }
            Event::UserEvent(Command::Resize(direction)) if !window.is_maximized() => {
                let _ = window.drag_resize_window(direction);
            }
            _ => {}
        }
    })
}

/// No Windows title bar or frame; a shadow is kept so the window still reads as a window.
#[cfg(windows)]
fn undecorated(builder: WindowBuilder) -> WindowBuilder {
    use tao::platform::windows::WindowBuilderExtWindows;
    builder.with_decorations(false).with_undecorated_shadow(true)
}

/// macOS keeps its own frame, so the window has the system's close, minimise and zoom buttons,
/// rounded corners and edge resizing; the title bar is made see-through and the page runs under it.
#[cfg(target_os = "macos")]
fn undecorated(builder: WindowBuilder) -> WindowBuilder {
    use tao::platform::macos::WindowBuilderExtMacOS;
    builder
        .with_titlebar_transparent(true)
        .with_fullsize_content_view(true)
        .with_title_hidden(true)
}

#[cfg(not(any(windows, target_os = "macos")))]
fn undecorated(builder: WindowBuilder) -> WindowBuilder {
    builder.with_decorations(false)
}

/// A one-line script that tells the page which system it is running on.
fn concat_os_script() -> &'static str {
    if cfg!(target_os = "macos") {
        "window.__OS__ = 'macos';"
    } else if cfg!(windows) {
        "window.__OS__ = 'windows';"
    } else {
        "window.__OS__ = 'linux';"
    }
}

fn is_app_url(target: &str, app_origin: &str) -> bool {
    target == app_origin
        || target
            .strip_prefix(app_origin)
            .is_some_and(|rest| rest.starts_with(['/', '#', '?']))
        || target.starts_with("about:")
        || target.starts_with("data:")
        || target.starts_with("blob:")
}

/// Hand a web link to the default browser. Only http(s) links are passed on,
/// and the URL goes to the system as a single argument, never through a shell.
fn open_in_browser(url: &str) {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return;
    }
    #[cfg(windows)]
    let _ = std::process::Command::new("rundll32")
        .args(["url.dll,FileProtocolHandler", url])
        .spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(url).spawn();
    #[cfg(all(unix, not(target_os = "macos")))]
    let _ = std::process::Command::new("xdg-open").arg(url).spawn();
}

/// Show a startup error. Release builds have no console on Windows, so
/// without this a failed launch would be silent.
pub fn error_dialog(message: &str) {
    #[cfg(windows)]
    {
        #[link(name = "user32")]
        extern "system" {
            fn MessageBoxW(window: *mut core::ffi::c_void, text: *const u16, caption: *const u16, kind: u32) -> i32;
        }
        const MB_ICONERROR: u32 = 0x10;
        let wide = |s: &str| s.encode_utf16().chain(std::iter::once(0)).collect::<Vec<u16>>();
        let (text, caption) = (wide(message), wide("GTA 6 HQ"));
        // SAFETY: both pointers are valid, NUL-terminated UTF-16 buffers that
        // outlive the call, and a null owner window is allowed.
        unsafe {
            MessageBoxW(std::ptr::null_mut(), text.as_ptr(), caption.as_ptr(), MB_ICONERROR);
        }
    }
    #[cfg(not(windows))]
    let _ = message;
}

/// Give the frameless window a pink border and rounded corners.
/// Windows 11 only; older versions ignore it.
#[cfg(windows)]
fn theme_window_frame(window: &tao::window::Window) {
    use tao::platform::windows::WindowExtWindows;

    #[link(name = "dwmapi")]
    extern "system" {
        fn DwmSetWindowAttribute(hwnd: isize, attribute: u32, value: *const u32, size: u32) -> i32;
    }
    const DWMWA_WINDOW_CORNER_PREFERENCE: u32 = 33;
    const DWMWA_BORDER_COLOR: u32 = 34;
    const DWMWCP_ROUND: u32 = 2;
    /// A COLORREF is 0x00BBGGRR.
    const fn colour(r: u8, g: u8, b: u8) -> u32 {
        (b as u32) << 16 | (g as u32) << 8 | r as u32
    }

    let hwnd = window.hwnd();
    for (attribute, value) in [
        (DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND),
        (DWMWA_BORDER_COLOR, colour(238, 63, 124)),
    ] {
        // SAFETY: `hwnd` is this live window, and `value` is a u32 that outlives the call.
        unsafe {
            DwmSetWindowAttribute(hwnd, attribute, &value, 4);
        }
    }
}

#[cfg(not(windows))]
fn theme_window_frame(_window: &tao::window::Window) {}

/// The logo, letterboxed into a square, as the window/taskbar icon.
fn load_icon(path: &Path) -> Option<Icon> {
    const SIZE: u32 = 256;
    let logo = image::open(path).ok()?.into_rgba8();
    let scale = SIZE as f32 / logo.width().max(logo.height()) as f32;
    let (w, h) = (
        ((logo.width() as f32 * scale) as u32).max(1),
        ((logo.height() as f32 * scale) as u32).max(1),
    );
    let small = image::imageops::resize(&logo, w, h, image::imageops::FilterType::Lanczos3);
    let mut canvas = image::RgbaImage::new(SIZE, SIZE);
    image::imageops::overlay(
        &mut canvas,
        &small,
        i64::from((SIZE - w) / 2),
        i64::from((SIZE - h) / 2),
    );
    Icon::from_rgba(canvas.into_raw(), SIZE, SIZE).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_known_window_commands_are_accepted() {
        assert_eq!(command("minimize"), Some(Command::Minimize));
        assert_eq!(command("maximize"), Some(Command::ToggleMaximize));
        assert_eq!(command("close"), Some(Command::Close));
        assert_eq!(command("drag"), Some(Command::Drag));
        assert_eq!(command("resize:se"), Some(Command::Resize(ResizeDirection::SouthEast)));
        assert_eq!(command("resize:up"), None);
        assert_eq!(command("exec:calc"), None);
        assert_eq!(command(""), None);
    }

    #[test]
    fn only_the_apps_own_origin_stays_in_the_window() {
        let origin = "http://127.0.0.1:4600";
        assert!(is_app_url("http://127.0.0.1:4600/", origin));
        assert!(is_app_url("http://127.0.0.1:4600/#/map", origin));
        assert!(!is_app_url("http://127.0.0.1:46001/", origin));
        assert!(!is_app_url("https://www.rockstargames.com/VI", origin));
        assert!(!is_app_url("http://127.0.0.1:4600.evil.example/", origin));
    }
}
