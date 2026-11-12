; GTA 6 HQ installer (Inno Setup 6).
;
; Build with scripts/package_release.py, which passes the version from Cargo.toml:
;   ISCC /DAppVersion=0.1.1 installer\gta6-hq.iss
;
; Installs for the current user only, into a folder the app can write to
; (it keeps its map tile cache and data files beside the executable), so no
; administrator prompt is needed.

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
#ifdef Preview
; A look-only build for checking the pages (ISCC /DPreview): it installs no files, registers
; nothing with Windows and uses its own id, so it cannot disturb a real installation.
AppId=GTA6HQ-look-preview
Uninstallable=no
CreateAppDir=no
#else
AppId={{6B0F5C3E-7A54-4E0B-9B5E-3D1C7A2F6A11}
#endif
AppName=GTA 6 HQ
AppVersion={#AppVersion}
AppVerName=GTA 6 HQ {#AppVersion}
AppPublisher=GTA 6 HQ (unofficial fan project)
AppPublisherURL=https://github.com/xpbeats00-sudo/gta6-hq
AppSupportURL=https://github.com/xpbeats00-sudo/gta6-hq/issues
AppUpdatesURL=https://github.com/xpbeats00-sudo/gta6-hq/releases
VersionInfoVersion={#AppVersion}
PrivilegesRequired=lowest
DefaultDirName={localappdata}\Programs\GTA6HQ
DefaultGroupName=GTA 6 HQ
DisableProgramGroupPage=yes
DisableDirPage=auto
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SourceDir=..
OutputDir=dist
OutputBaseFilename=GTA6HQ-{#AppVersion}-Setup
SetupIconFile=installer\gta6-hq.ico
UninstallDisplayIcon={app}\gta6-hq.ico
UninstallDisplayName=GTA 6 HQ
Compression=lzma2
SolidCompression=yes
; The look: a dark window with the app's sunset colours. The pictures are drawn by
; scripts/make_installer_art.py from the app's own images.
WizardStyle=modern dark
WizardSizePercent=130
WizardBackColor=#0b0a16
WizardBackImageFile=installer\wizard-back.png
WizardImageFile=installer\wizard-side.png
WizardSmallImageFile=installer\wizard-small.png
CloseApplications=yes
InfoBeforeFile=installer\notice.txt

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
#ifndef Preview
Source: "target\release\gta6-hq.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "installer\gta6-hq.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "ui\*"; DestDir: "{app}\ui"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "data\*"; DestDir: "{app}\data"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "images\*"; DestDir: "{app}\images"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "wallpapers\*"; DestDir: "{app}\wallpapers"; Flags: ignoreversion recursesubdirs createallsubdirs
#endif

[Icons]
#ifndef Preview
Name: "{group}\GTA 6 HQ"; Filename: "{app}\gta6-hq.exe"; WorkingDir: "{app}"; IconFilename: "{app}\gta6-hq.ico"
Name: "{group}\Uninstall GTA 6 HQ"; Filename: "{uninstallexe}"
Name: "{autodesktop}\GTA 6 HQ"; Filename: "{app}\gta6-hq.exe"; WorkingDir: "{app}"; IconFilename: "{app}\gta6-hq.ico"; Tasks: desktopicon
#endif

[Run]
#ifndef Preview
Filename: "{app}\gta6-hq.exe"; Description: "Open GTA 6 HQ"; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent
#endif
; Ticked by default on the last page; opens the invite in the browser.
Filename: "https://discord.gg/YhMHr8N4an"; Description: "Join the GTA 6 HQ community on Discord"; Flags: shellexec nowait postinstall skipifsilent

[UninstallDelete]
; Created by the app while it runs: the map tile cache and backups made by --import.
Type: filesandordirs; Name: "{app}\cache"
Type: filesandordirs; Name: "{app}\backups"
