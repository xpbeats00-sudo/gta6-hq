//! The native app window: a tao window hosting a wry (WebView2) view.

use std::path::Path;

use tao::{
    dpi::LogicalSize,
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    window::{Icon, WindowBuilder},
};
use wry::{NewWindowResponse, WebContext, WebViewBuilder};

const BACKGROUND: (u8, u8, u8, u8) = (10, 3, 24, 255);

pub fn run(url: &str, root: &Path) -> ! {
    let event_loop = EventLoop::new();
    let window = WindowBuilder::new()
        .with_title("GTA 6 HQ")
        .with_inner_size(LogicalSize::new(1440.0, 900.0))
        .with_min_inner_size(LogicalSize::new(900.0, 600.0))
        .with_window_icon(load_icon(&root.join("images").join("gta6.png")))
        .build(&event_loop)
        .unwrap_or_else(|e| {
            error_dialog(&format!("GTA 6 HQ could not open its window.\n\n{e}"));
            std::process::exit(1);
        });

    // Keep WebView2's profile in the app's cache folder rather than beside the exe.
    let mut context = WebContext::new(Some(root.join("cache").join("webview")));
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
    let webview = WebViewBuilder::new_with_web_context(&mut context)
        .with_url(url)
        .with_background_color(BACKGROUND)
        .with_autoplay(true)
        .with_devtools(cfg!(debug_assertions))
        // Source links and map credits open in the default browser; the app
        // window itself never leaves the app.
        .with_navigation_handler(stay_in_app)
        .with_new_window_req_handler(move |target, _features| {
            if !is_app_url(&target, &app_origin) {
                open_in_browser(&target);
            }
            NewWindowResponse::Deny
        })
        .build(&window);
    let _webview = webview.unwrap_or_else(|e| {
        error_dialog(&format!(
            "GTA 6 HQ could not start its web view.\n\nThe Microsoft Edge WebView2 Runtime is required (it ships with Windows 11).\n\n{e}"
        ));
        std::process::exit(1);
    });

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            *control_flow = ControlFlow::Exit;
        }
    })
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
    fn only_the_apps_own_origin_stays_in_the_window() {
        let origin = "http://127.0.0.1:4600";
        assert!(is_app_url("http://127.0.0.1:4600/", origin));
        assert!(is_app_url("http://127.0.0.1:4600/#/map", origin));
        assert!(!is_app_url("http://127.0.0.1:46001/", origin));
        assert!(!is_app_url("https://www.rockstargames.com/VI", origin));
        assert!(!is_app_url("http://127.0.0.1:4600.evil.example/", origin));
    }
}
