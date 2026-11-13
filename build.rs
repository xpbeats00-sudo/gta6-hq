//! On Windows, gives the program its file details (name, version, description, icon), the ones
//! shown under Properties > Details. Without them the exe is an anonymous file, which is one of
//! the things antivirus guesswork treats as suspicious. Does nothing on macOS and Linux.

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=installer/gta6-hq.ico");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    let mut res = winresource::WindowsResource::new();
    res.set_icon("installer/gta6-hq.ico")
        .set("ProductName", "GTA 6 HQ")
        .set(
            "FileDescription",
            "GTA 6 HQ - unofficial Grand Theft Auto VI fan encyclopedia",
        )
        .set("CompanyName", "GTA 6 HQ (fan project)")
        .set(
            "LegalCopyright",
            "Unofficial fan project. Not affiliated with Rockstar Games or Take-Two Interactive.",
        )
        .set("OriginalFilename", "gta6-hq.exe")
        .set("InternalName", "gta6-hq");
    if let Err(error) = res.compile() {
        panic!("could not add the Windows file details: {error}");
    }
}
