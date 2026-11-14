//! On Windows, gives the program its file details (name, version, description, icon), the ones
//! shown under Properties > Details. Without them the exe is an anonymous file, which is one of
//! the things antivirus guesswork treats as suspicious. Does nothing on macOS and Linux.

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=Cargo.toml"); // the version shown in the file details
    println!("cargo:rerun-if-changed=installer/gta6-hq.ico");
    // The Microsoft Store edition is the same program under its own name and icon
    // (see scripts/package_store.py). Everything else builds as GTA 6 HQ.
    println!("cargo:rerun-if-env-changed=GTA6_HQ_APP_NAME");
    println!("cargo:rerun-if-env-changed=GTA6_HQ_APP_ICON");
    let name = std::env::var("GTA6_HQ_APP_NAME").unwrap_or_else(|_| "GTA 6 HQ".to_string());
    let icon = std::env::var("GTA6_HQ_APP_ICON").unwrap_or_else(|_| "installer/gta6-hq.ico".to_string());
    println!("cargo:rustc-env=APP_NAME={name}");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    let mut res = winresource::WindowsResource::new();
    res.set_icon(&icon)
        .set("ProductName", &name)
        .set(
            "FileDescription",
            &format!("{name} - unofficial Grand Theft Auto VI fan encyclopedia"),
        )
        .set("CompanyName", &format!("{name} (fan project)"))
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
