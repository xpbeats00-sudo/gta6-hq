//! Bulk import and entry templates for the command line.
//!
//!   gta6-hq --template vehicles            an empty entry to fill in
//!   gta6-hq --template vehicles --csv      the same as a CSV header row
//!   gta6-hq --import batch.json --dry-run  check a batch, write nothing
//!   gta6-hq --import batch.json            add the batch
//!   gta6-hq --import batch.json --update   also replace entries that exist
//!
//! A batch is all or nothing: it is merged in memory, checked with the same
//! rules as `--validate`, and written only if there is not a single error.
//! Before any file is replaced it is copied to `backups/import-<time>/`.

use std::{
    collections::BTreeSet,
    fmt::Write as _,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use serde_json::{json, Map, Value};

use crate::{
    content,
    validate::{self, Report, Severity},
};

/// Entries to add, each with the section it belongs to, plus any new sources.
#[derive(Debug, Default)]
pub struct Batch {
    pub entries: Vec<(String, Value)>,
    pub sources: Map<String, Value>,
}

#[derive(Clone, Copy, Default)]
pub struct Options {
    /// Check and report, but write nothing.
    pub dry_run: bool,
    /// Allow entries that already exist to be replaced.
    pub update: bool,
}

/// What an import did, or would do.
#[derive(Debug, Default)]
pub struct Outcome {
    pub added: Vec<String>,
    pub updated: Vec<String>,
    pub sources_added: Vec<String>,
    /// Data files written (relative to the app folder).
    pub files: Vec<String>,
    /// Where the previous versions of those files were saved.
    pub backup: Option<String>,
    pub warnings: Vec<String>,
    pub dry_run: bool,
}

impl Outcome {
    pub fn to_text(&self) -> String {
        let mut out = String::new();
        let verb = if self.dry_run { "Would add" } else { "Added" };
        let _ = writeln!(out, "{verb} {} entries:", self.added.len());
        for subject in &self.added {
            let _ = writeln!(out, "  + {subject}");
        }
        if !self.updated.is_empty() {
            let verb = if self.dry_run { "Would replace" } else { "Replaced" };
            let _ = writeln!(out, "{verb} {} existing entries:", self.updated.len());
            for subject in &self.updated {
                let _ = writeln!(out, "  ~ {subject}");
            }
        }
        if !self.sources_added.is_empty() {
            let _ = writeln!(out, "New sources: {}", self.sources_added.join(", "));
        }
        for warning in &self.warnings {
            let _ = writeln!(out, "Warning: {warning}");
        }
        if self.dry_run {
            let _ = writeln!(out, "Dry run: nothing was written. Files that would change:");
        } else {
            let _ = writeln!(out, "Files written:");
        }
        for file in &self.files {
            let _ = writeln!(out, "  {file}");
        }
        if let Some(backup) = &self.backup {
            let _ = writeln!(out, "Previous versions saved in {backup}");
        }
        out
    }
}

// ---------- templates ----------

/// An empty entry for `section`, wrapped so the output can be filled in and
/// passed straight to `--import`. New entries start as drafts.
pub fn template(wiki: &Value, section: &str) -> Result<Value, String> {
    known_section(wiki, section)?;
    let mut facts = Map::new();
    for (key, kind) in content::fields(wiki, section) {
        let empty = match kind {
            "text" | "entry" => json!(""),
            "list" => json!([]),
            _ => Value::Null,
        };
        facts.insert(key.to_string(), empty);
    }
    let mut entry = Map::new();
    for (key, value) in [
        ("slug", json!("")),
        ("name", json!("")),
        ("summary", json!("")),
        ("body", json!([])),
        ("confidence", json!("unknown")),
        ("sources", json!([])),
        ("verified", json!("")),
        ("status", json!("draft")),
        ("spoiler", json!(false)),
        ("aliases", json!([])),
        ("tags", json!([])),
        ("related", json!([])),
        ("x", Value::Null),
        ("y", Value::Null),
    ] {
        entry.insert(key.to_string(), value);
    }
    if !facts.is_empty() {
        entry.insert("facts".to_string(), Value::Object(facts));
    }
    let mut file = Map::new();
    file.insert("sources".to_string(), json!({}));
    file.insert(section.to_string(), json!([entry]));
    Ok(Value::Object(file))
}

/// The CSV header row for `section`.
pub fn template_csv(wiki: &Value, section: &str) -> Result<String, String> {
    known_section(wiki, section)?;
    let mut columns: Vec<String> = [
        "section",
        "slug",
        "name",
        "summary",
        "body",
        "confidence",
        "sources",
        "verified",
        "status",
        "spoiler",
        "aliases",
        "tags",
        "related",
        "x",
        "y",
    ]
    .map(str::to_string)
    .to_vec();
    columns.extend(
        content::fields(wiki, section)
            .iter()
            .map(|(key, _)| format!("facts.{key}")),
    );
    Ok(format!("{}\n", columns.join(",")))
}

fn known_section(wiki: &Value, section: &str) -> Result<(), String> {
    let sections = content::sections(wiki);
    if sections.iter().any(|s| s == section) {
        Ok(())
    } else {
        Err(format!(
            "`{section}` is not a category. Categories: {}.",
            sections.join(", ")
        ))
    }
}

// ---------- reading a batch ----------

/// A JSON batch is either `{ "<section>": [entries…], "sources": {…} }`
/// (the shape `--template` prints) or a list of entries that each name
/// their `section`.
pub fn parse_json(text: &str) -> Result<Batch, String> {
    let value: Value = serde_json::from_str(text.trim_start_matches('\u{feff}'))
        .map_err(|e| format!("The import file is not valid JSON: {e}"))?;
    let mut batch = Batch::default();
    match value {
        Value::Array(entries) => {
            for (index, mut entry) in entries.into_iter().enumerate() {
                let section = entry
                    .as_object_mut()
                    .and_then(|fields| fields.remove("section"))
                    .and_then(|s| s.as_str().map(str::to_string))
                    .ok_or_else(|| format!("Entry {} has no `section`.", index + 1))?;
                batch.entries.push((section, entry));
            }
        }
        Value::Object(top) => {
            for (key, value) in top {
                match (key.as_str(), value) {
                    ("sources", Value::Object(sources)) => batch.sources = sources,
                    ("sources", _) => return Err("`sources` must be an object of id: details.".into()),
                    (_, Value::Array(entries)) => {
                        batch
                            .entries
                            .extend(entries.into_iter().map(|entry| (key.clone(), entry)));
                    }
                    _ => return Err(format!("`{key}` must be a list of entries.")),
                }
            }
        }
        _ => return Err("The import file must be a JSON object or a list of entries.".into()),
    }
    Ok(batch)
}

const LIST_COLUMNS: [&str; 5] = ["sources", "aliases", "tags", "related", "ties"];

/// A CSV batch: one entry per row, a `section` column, lists separated by
/// `;`, body paragraphs by `|`, and fact values in `facts.<field>` columns.
/// Empty cells are left out. `wiki` supplies the type of each fact field.
pub fn parse_csv(text: &str, wiki: &Value) -> Result<Batch, String> {
    let mut rows = csv_rows(text.trim_start_matches('\u{feff}'))?.into_iter();
    let header: Vec<String> = rows
        .next()
        .ok_or("The CSV file is empty.")?
        .iter()
        .map(|h| h.trim().to_string())
        .collect();
    if !header.iter().any(|h| h == "section") || !header.iter().any(|h| h == "slug") {
        return Err("The CSV file needs `section` and `slug` columns in its first row.".into());
    }

    let mut batch = Batch::default();
    for (index, row) in rows.enumerate() {
        let line = index + 2;
        if row.iter().all(|cell| cell.trim().is_empty()) {
            continue;
        }
        if row.len() > header.len() {
            return Err(format!("Row {line} has more cells than the header row."));
        }
        // Known before the other cells are read: fact types depend on it.
        let section = header
            .iter()
            .zip(&row)
            .find(|(column, _)| *column == "section")
            .map(|(_, cell)| cell.trim().to_string())
            .unwrap_or_default();
        let mut entry = Map::new();
        let mut facts = Map::new();
        for (column, cell) in header.iter().zip(&row) {
            let cell = cell.trim();
            if cell.is_empty() || column == "section" {
                continue;
            }
            let list = || Value::Array(split_cell(cell, ';'));
            let number = || {
                cell.parse::<f64>()
                    .ok()
                    .and_then(serde_json::Number::from_f64)
                    .map(Value::Number)
                    .ok_or_else(|| format!("Row {line}: `{column}` must be a number, but is `{cell}`."))
            };
            let boolean = || match cell.to_lowercase().as_str() {
                "true" | "yes" | "1" => Ok(Value::Bool(true)),
                "false" | "no" | "0" => Ok(Value::Bool(false)),
                _ => Err(format!(
                    "Row {line}: `{column}` must be true or false, but is `{cell}`."
                )),
            };
            if let Some(field) = column.strip_prefix("facts.") {
                let kind = content::fields(wiki, &section)
                    .iter()
                    .find(|(key, _)| *key == field)
                    .map_or("text", |(_, kind)| *kind);
                let value = match kind {
                    "number" => whole_or_float(number()?),
                    "boolean" => boolean()?,
                    "list" => list(),
                    _ => Value::String(cell.to_string()),
                };
                facts.insert(field.to_string(), value);
            } else if LIST_COLUMNS.contains(&column.as_str()) {
                entry.insert(column.clone(), list());
            } else if column == "body" {
                entry.insert(column.clone(), Value::Array(split_cell(cell, '|')));
            } else if column == "spoiler" {
                entry.insert(column.clone(), boolean()?);
            } else if column == "x" || column == "y" {
                entry.insert(column.clone(), number()?);
            } else {
                entry.insert(column.clone(), Value::String(cell.to_string()));
            }
        }
        if section.is_empty() {
            return Err(format!("Row {line} has no `section`."));
        }
        if !facts.is_empty() {
            entry.insert("facts".to_string(), Value::Object(facts));
        }
        batch.entries.push((section, Value::Object(entry)));
    }
    Ok(batch)
}

/// "4" stays a whole number in the data file rather than becoming 4.0.
fn whole_or_float(value: Value) -> Value {
    match value.as_f64() {
        Some(n) if n.fract() == 0.0 && n.abs() < 9e15 => json!(n as i64),
        _ => value,
    }
}

fn split_cell(cell: &str, separator: char) -> Vec<Value> {
    cell.split(separator)
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(|part| Value::String(part.to_string()))
        .collect()
}

/// Minimal CSV reader: commas, double-quoted cells, `""` for a quote inside
/// one, and line breaks inside quoted cells.
fn csv_rows(text: &str) -> Result<Vec<Vec<String>>, String> {
    let mut rows = Vec::new();
    let mut row = Vec::new();
    let mut cell = String::new();
    let mut quoted = false;
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        if quoted {
            match c {
                '"' if chars.peek() == Some(&'"') => {
                    chars.next();
                    cell.push('"');
                }
                '"' => quoted = false,
                _ => cell.push(c),
            }
            continue;
        }
        match c {
            '"' if cell.is_empty() => quoted = true,
            ',' => row.push(std::mem::take(&mut cell)),
            '\r' => {}
            '\n' => {
                row.push(std::mem::take(&mut cell));
                rows.push(std::mem::take(&mut row));
            }
            _ => cell.push(c),
        }
    }
    if quoted {
        return Err("The CSV file has a quoted cell that is never closed.".into());
    }
    if !cell.is_empty() || !row.is_empty() {
        row.push(cell);
        rows.push(row);
    }
    Ok(rows)
}

// ---------- applying a batch ----------

/// One data file as it will be after the import.
struct DataFile {
    path: PathBuf,
    /// Path relative to the app folder, with `/` separators.
    label: String,
    /// `None` for `data/wiki.json`; the top-level key for a split file.
    key: Option<String>,
    value: Value,
    existed: bool,
    changed: bool,
}

fn slug_of(entry: &Value) -> &str {
    entry.get("slug").and_then(Value::as_str).unwrap_or_default()
}

/// Check a batch against the data on disk and, unless it is a dry run,
/// write it. `Err` lists every reason the batch was refused; nothing has
/// been written in that case.
pub fn import(root: &Path, batch: Batch, options: Options) -> Result<Outcome, Vec<String>> {
    if batch.entries.is_empty() && batch.sources.is_empty() {
        return Err(vec!["The import file contains no entries.".into()]);
    }

    // The data as it is now, file by file. Importing on top of a file that
    // cannot be read would hide whatever is wrong with it.
    let mut errors = Vec::new();
    let mut files = Vec::new();
    let main_path = root.join("data").join("wiki.json");
    match content::read_json(&main_path, "data/wiki.json") {
        Ok(value) if value.is_object() => files.push(DataFile {
            path: main_path,
            label: "data/wiki.json".into(),
            key: None,
            value,
            existed: true,
            changed: false,
        }),
        Ok(_) => errors.push("data/wiki.json is not a JSON object.".into()),
        Err(error) => errors.push(format!("{error}.")),
    }
    for path in content::split_files(root) {
        let label = format!("data/wiki/{}", path.file_name().unwrap_or_default().to_string_lossy());
        match (content::read_json(&path, &label), content::split_key(&path)) {
            (Ok(value), Some(key)) => files.push(DataFile {
                path,
                label,
                key: Some(key),
                value,
                existed: true,
                changed: false,
            }),
            (Ok(_), None) => {}
            (Err(error), _) => errors.push(format!("{error}.")),
        }
    }
    if !errors.is_empty() {
        errors.push("Fix the data files first; nothing was imported.".into());
        return Err(errors);
    }

    let before = merged(&files).map_err(|e| vec![e])?;
    let sections = content::sections(&before);
    let mut outcome = Outcome {
        dry_run: options.dry_run,
        ..Outcome::default()
    };

    // Sources first, so entries in the same batch can cite them.
    let registered = before.get("sources").and_then(Value::as_object);
    let mut new_sources = Map::new();
    for (id, source) in batch.sources {
        match registered.and_then(|all| all.get(&id)) {
            Some(existing) if *existing == source => {}
            Some(_) => errors.push(format!(
                "sources/{id}: this source id is already registered with different details."
            )),
            None => {
                outcome.sources_added.push(id.clone());
                new_sources.insert(id, source);
            }
        }
    }
    if !new_sources.is_empty() {
        let file = split_file(&mut files, root, "sources", || Value::Object(Map::new()));
        match file.value.as_object_mut() {
            Some(existing) => {
                existing.extend(new_sources);
                file.changed = true;
            }
            None => errors.push(format!("{} is not an object of sources.", file.label)),
        }
    }

    let mut seen = BTreeSet::new();
    for (index, (section, entry)) in batch.entries.into_iter().enumerate() {
        let slug = slug_of(&entry).to_string();
        let subject = if slug.is_empty() {
            format!("{section} (entry {})", index + 1)
        } else {
            format!("{section}/{slug}")
        };
        if !sections.contains(&section) {
            errors.push(format!(
                "{subject}: `{section}` is not a category. Categories: {}.",
                sections.join(", ")
            ));
            continue;
        }
        if !entry.is_object() {
            errors.push(format!("{subject}: an entry must be a JSON object."));
            continue;
        }
        if slug.is_empty() {
            errors.push(format!("{subject}: entry has no `slug`."));
            continue;
        }
        if !seen.insert(subject.clone()) {
            errors.push(format!("{subject}: duplicate slug, listed twice in the import file."));
            continue;
        }

        // Replace the entry where it lives now, or add it to the section's split file.
        let holder = files.iter_mut().find_map(|file| {
            let list = match &file.key {
                None => file.value.get_mut(&section),
                Some(key) if *key == section => Some(&mut file.value),
                Some(_) => None,
            };
            let position = list
                .as_ref()
                .and_then(|list| list.as_array())
                .and_then(|entries| entries.iter().position(|e| slug_of(e) == slug))?;
            file.changed = true;
            Some(&mut list?.as_array_mut()?[position])
        });
        match holder {
            Some(existing) if options.update => {
                *existing = entry;
                outcome.updated.push(subject);
            }
            Some(_) => errors.push(format!(
                "{subject}: duplicate slug, this entry already exists. Use --update to replace it."
            )),
            None => {
                let file = split_file(&mut files, root, &section, || Value::Array(Vec::new()));
                match file.value.as_array_mut() {
                    Some(entries) => {
                        entries.push(entry);
                        file.changed = true;
                        outcome.added.push(subject);
                    }
                    None => errors.push(format!("{} is not a list of entries.", file.label)),
                }
            }
        }
    }

    // The same checks as `--validate`, on the data as it would be afterwards.
    match merged(&files) {
        Ok(after) => {
            let mut report = Report::default();
            validate::check_wiki(&after, root, &mut report);
            let touched: BTreeSet<&str> = outcome
                .added
                .iter()
                .chain(&outcome.updated)
                .map(String::as_str)
                .collect();
            for issue in &report.issues {
                let line = format!("{}: {} [{}]", issue.subject, issue.message, issue.code);
                match issue.severity {
                    Severity::Error => errors.push(line),
                    Severity::Warning if touched.contains(issue.subject.as_str()) => outcome.warnings.push(line),
                    _ => {}
                }
            }
        }
        Err(error) => errors.push(error),
    }
    if !errors.is_empty() {
        return Err(errors);
    }

    let changed: Vec<&DataFile> = files.iter().filter(|file| file.changed).collect();
    outcome.files = changed.iter().map(|file| file.label.clone()).collect();
    if !options.dry_run {
        outcome.backup = write_all(root, &changed).map_err(|e| vec![e])?;
    }
    Ok(outcome)
}

/// The split file `data/wiki/<key>.json`, created (in memory) if needed.
fn split_file<'a>(files: &'a mut Vec<DataFile>, root: &Path, key: &str, empty: impl Fn() -> Value) -> &'a mut DataFile {
    let label = format!("data/wiki/{key}.json");
    let position = files.iter().position(|file| file.label == label).unwrap_or_else(|| {
        files.push(DataFile {
            path: root.join("data").join("wiki").join(format!("{key}.json")),
            label,
            key: Some(key.to_string()),
            value: empty(),
            existed: false,
            changed: false,
        });
        files.len() - 1
    });
    &mut files[position]
}

/// All data files merged the way the app loads them.
fn merged(files: &[DataFile]) -> Result<Value, String> {
    let mut wiki = files
        .iter()
        .find(|file| file.key.is_none())
        .map(|file| file.value.clone())
        .ok_or("data/wiki.json is missing.")?;
    let mut parts: Vec<&DataFile> = files.iter().filter(|file| file.key.is_some()).collect();
    parts.sort_by(|a, b| a.path.cmp(&b.path));
    for file in parts {
        let key = file.key.as_deref().unwrap_or_default();
        content::merge_part(&mut wiki, key, file.value.clone()).map_err(|e| format!("{}: {e}", file.label))?;
    }
    Ok(wiki)
}

/// Back up, then replace each changed file through a temporary file and a
/// rename, so a file is never left half-written. If anything fails, files
/// already replaced are put back.
fn write_all(root: &Path, changed: &[&DataFile]) -> Result<Option<String>, String> {
    // Two imports in the same second must not share (and overwrite) a backup.
    let stamp = timestamp(SystemTime::now());
    let backup_label = (1..)
        .map(|n| match n {
            1 => format!("backups/import-{stamp}"),
            n => format!("backups/import-{stamp}-{n}"),
        })
        .find(|label| !root.join(label).exists())
        .unwrap_or_default();
    let backup_dir = root.join(&backup_label);
    let io = |what: &str, path: &Path, e: std::io::Error| format!("Could not {what} {}: {e}", path.display());

    // 1. Save what is there now.
    let mut saved = Vec::new();
    for file in changed.iter().filter(|file| file.existed) {
        let copy = backup_dir.join(&file.label);
        if let Some(parent) = copy.parent() {
            std::fs::create_dir_all(parent).map_err(|e| io("create", parent, e))?;
        }
        std::fs::copy(&file.path, &copy).map_err(|e| io("back up", &file.path, e))?;
        saved.push((copy, file.path.clone()));
    }

    // 2. Write every new version next to its target.
    let temp_of = |path: &Path| path.with_extension("json.importing");
    let cleanup = |upto: &[&DataFile]| {
        for file in upto {
            let _ = std::fs::remove_file(temp_of(&file.path));
        }
    };
    for (index, file) in changed.iter().enumerate() {
        let text =
            serde_json::to_string_pretty(&file.value).map_err(|e| format!("Could not encode {}: {e}", file.label));
        let written = text.and_then(|text| {
            if let Some(parent) = file.path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| io("create", parent, e))?;
            }
            std::fs::write(temp_of(&file.path), text + "\n").map_err(|e| io("write", &file.path, e))
        });
        if let Err(error) = written {
            cleanup(&changed[..=index]);
            return Err(format!("{error}. Nothing was changed."));
        }
    }

    // 3. Swap them in.
    for (index, file) in changed.iter().enumerate() {
        if let Err(error) = std::fs::rename(temp_of(&file.path), &file.path) {
            cleanup(changed);
            for done in &changed[..index] {
                if done.existed {
                    if let Some((copy, target)) = saved.iter().find(|(_, target)| *target == done.path) {
                        let _ = std::fs::copy(copy, target);
                    }
                } else {
                    let _ = std::fs::remove_file(&done.path);
                }
            }
            return Err(format!(
                "{}. The files already replaced were restored from {backup_label}.",
                io("replace", &file.path, error)
            ));
        }
    }
    Ok((!saved.is_empty()).then_some(backup_label))
}

/// `YYYYMMDD-HHMMSS` in UTC (no time-zone database needed).
fn timestamp(now: SystemTime) -> String {
    let seconds = now.duration_since(UNIX_EPOCH).map_or(0, |d| d.as_secs());
    let (days, rest) = (seconds / 86_400, seconds % 86_400);
    // Civil date from a day count (Howard Hinnant's algorithm).
    let z = days as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    format!(
        "{year:04}{month:02}{day:02}-{:02}{:02}{:02}",
        rest / 3600,
        rest % 3600 / 60,
        rest % 60
    )
}

/// Command-line entry point: read `file`, import it, print what happened.
/// Returns the process exit code.
pub fn run(root: &Path, file: &Path, options: Options) -> i32 {
    let is_csv = file.extension().is_some_and(|ext| ext.eq_ignore_ascii_case("csv"));
    let batch = std::fs::read_to_string(file)
        .map_err(|e| format!("Could not read {}: {e}", file.display()))
        .and_then(|text| {
            if is_csv {
                parse_csv(&text, &content::load_full(root))
            } else {
                parse_json(&text)
            }
        });
    match batch
        .map_err(|e| vec![e])
        .and_then(|batch| import(root, batch, options))
    {
        Ok(outcome) => {
            print!("{}", outcome.to_text());
            0
        }
        Err(errors) => {
            println!(
                "Import refused: {} problem{}. Nothing was written.",
                errors.len(),
                if errors.len() == 1 { "" } else { "s" }
            );
            for error in errors {
                println!("  - {error}");
            }
            1
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::content::tests::TempRoot;

    const BASE: &str = r#"{
  "categories": [
    {"key": "vehicles", "label": "Vehicles", "fields": [
      {"key": "manufacturer", "label": "Manufacturer", "type": "text"},
      {"key": "seats", "label": "Seats", "type": "number"},
      {"key": "amphibious", "label": "Amphibious", "type": "boolean"},
      {"key": "features", "label": "Features", "type": "list"}
    ]},
    {"key": "missions", "label": "Missions"}
  ],
  "sources": {"src": {"title": "t", "publisher": "p", "url": "https://example.com", "type": "official", "accessed": "2026-11-11"}},
  "vehicles": [
    {"slug": "old", "name": "Old", "summary": "Already here.", "confidence": "official", "sources": ["src"], "verified": "2026-11-11"}
  ]
}"#;

    fn root(name: &str) -> TempRoot {
        let root = TempRoot::new(name);
        root.write("data/wiki.json", BASE);
        root
    }

    fn entry(slug: &str) -> String {
        format!(
            r#"{{"slug": "{slug}", "name": "N {slug}", "summary": "S", "confidence": "official", "sources": ["src"], "verified": "2026-11-11"}}"#
        )
    }

    fn run_json(root: &TempRoot, text: &str, options: Options) -> Result<Outcome, Vec<String>> {
        import(&root.0, parse_json(text).unwrap(), options)
    }

    fn data_files(root: &TempRoot) -> Vec<String> {
        let mut found = vec![std::fs::read_to_string(root.0.join("data/wiki.json")).unwrap()];
        for path in content::split_files(&root.0) {
            found.push(std::fs::read_to_string(path).unwrap());
        }
        found
    }

    #[test]
    fn a_valid_batch_is_added_to_the_section_file_and_the_main_file_is_untouched() {
        let root = root("import-ok");
        let text = format!(
            r#"{{"sources": {{"new": {{"title": "t", "publisher": "p", "url": "https://example.org", "type": "official", "accessed": "2026-11-11"}}}},
                "vehicles": [{}, {{"slug": "b", "name": "B", "summary": "S", "confidence": "official", "sources": ["new"], "verified": "2026-11-11",
                    "facts": {{"manufacturer": "Vapid", "seats": 2}}}}],
                "missions": [{}]}}"#,
            entry("a"),
            entry("m")
        );
        let outcome = run_json(&root, &text, Options::default()).unwrap();

        assert_eq!(outcome.added, ["vehicles/a", "vehicles/b", "missions/m"]);
        assert!(outcome.updated.is_empty());
        assert_eq!(outcome.sources_added, ["new"]);
        assert_eq!(
            outcome.files,
            [
                "data/wiki/sources.json",
                "data/wiki/vehicles.json",
                "data/wiki/missions.json"
            ]
        );
        // Only new files were created, so there was nothing to back up.
        assert!(outcome.backup.is_none());
        assert_eq!(std::fs::read_to_string(root.0.join("data/wiki.json")).unwrap(), BASE);

        let wiki = content::load_full(&root.0);
        assert!(wiki.get("_loadError").is_none());
        assert_eq!(content::entries(&wiki, "vehicles").len(), 3);
        assert_eq!(content::entries(&wiki, "vehicles")[2]["facts"]["seats"], 2);
        assert_eq!(validate::validate(&root.0).errors, 0);
        // No temporary files are left behind.
        assert!(!root.0.join("data/wiki/vehicles.json.importing").exists());

        // A second batch for the same section backs the file up first.
        let again = run_json(
            &root,
            &format!(r#"{{"vehicles": [{}]}}"#, entry("c")),
            Options::default(),
        )
        .unwrap();
        let backup = again.backup.expect("existing file is backed up");
        assert!(backup.starts_with("backups/import-"), "{backup}");
        // A third import straight afterwards gets a backup folder of its own.
        let third = run_json(
            &root,
            &format!(r#"{{"vehicles": [{}]}}"#, entry("d")),
            Options::default(),
        )
        .unwrap();
        assert_ne!(third.backup.as_deref(), Some(backup.as_str()));
        let saved = std::fs::read_to_string(root.0.join(&backup).join("data/wiki/vehicles.json")).unwrap();
        assert!(saved.contains("\"b\"") && !saved.contains("\"c\""));
        assert_eq!(content::entries(&content::load_full(&root.0), "vehicles").len(), 5);
    }

    #[test]
    fn a_dry_run_reports_but_writes_nothing() {
        let root = root("import-dry");
        let before = data_files(&root);
        let outcome = run_json(
            &root,
            &format!(r#"{{"vehicles": [{}]}}"#, entry("a")),
            Options {
                dry_run: true,
                update: false,
            },
        )
        .unwrap();
        assert_eq!(outcome.added, ["vehicles/a"]);
        assert_eq!(outcome.files, ["data/wiki/vehicles.json"]);
        assert!(outcome.to_text().contains("Dry run: nothing was written"));
        assert_eq!(data_files(&root), before);
        assert!(!root.0.join("backups").exists());
    }

    #[test]
    fn any_error_refuses_the_whole_batch() {
        let cases: [(&str, String, &str); 8] = [
            (
                "dup-existing",
                format!(r#"{{"vehicles": [{}, {}]}}"#, entry("fine"), entry("old")),
                "already exists",
            ),
            (
                "dup-batch",
                format!(r#"{{"vehicles": [{}, {}]}}"#, entry("twin"), entry("twin")),
                "listed twice",
            ),
            (
                "unknown-source",
                r#"{"vehicles": [{"slug": "a", "name": "A", "summary": "S", "confidence": "community", "sources": ["nope"], "verified": "2026-11-11"}]}"#.into(),
                "unknown-source",
            ),
            (
                "unsourced",
                r#"{"vehicles": [{"slug": "a", "name": "A", "summary": "S", "confidence": "corroborated"}]}"#.into(),
                "unsourced-claim",
            ),
            (
                "bad-fact",
                r#"{"vehicles": [{"slug": "a", "name": "A", "summary": "S", "confidence": "rumor", "facts": {"seats": "two"}}]}"#.into(),
                "bad-fact",
            ),
            (
                "unknown-fact",
                r#"{"vehicles": [{"slug": "a", "name": "A", "summary": "S", "confidence": "rumor", "facts": {"wheels": 4}}]}"#.into(),
                "unknown-fact",
            ),
            (
                "unknown-section",
                format!(r#"{{"boats": [{}]}}"#, entry("a")),
                "is not a category",
            ),
            (
                "clashing-source",
                r#"{"sources": {"src": {"url": "https://elsewhere.example"}}, "vehicles": []}"#.into(),
                "already registered",
            ),
        ];
        for (name, text, expected) in cases {
            let root = root(&format!("import-refuse-{name}"));
            let before = data_files(&root);
            let errors = run_json(&root, &text, Options::default()).expect_err(name);
            assert!(errors.iter().any(|e| e.contains(expected)), "{name}: {errors:#?}");
            assert_eq!(data_files(&root), before, "{name}: data changed");
            assert!(!root.0.join("backups").exists(), "{name}: backup written");
            assert!(!root.0.join("data/wiki").exists(), "{name}: files written");
        }
    }

    #[test]
    fn update_replaces_an_entry_where_it_lives_after_a_backup() {
        let root = root("import-update");
        root.write("data/wiki/vehicles.json", &format!("[{}]", entry("split")));
        let text = r#"{"vehicles": [
            {"slug": "old", "name": "Old, revised", "summary": "S", "confidence": "official", "sources": ["src"], "verified": "2026-11-12"},
            {"slug": "split", "name": "Split, revised", "summary": "S", "confidence": "official", "sources": ["src"], "verified": "2026-11-12"}
        ]}"#;

        assert!(run_json(&root, text, Options::default()).is_err());
        let outcome = run_json(
            &root,
            text,
            Options {
                dry_run: false,
                update: true,
            },
        )
        .unwrap();

        assert_eq!(outcome.updated, ["vehicles/old", "vehicles/split"]);
        assert!(outcome.added.is_empty());
        let backup = root.0.join(outcome.backup.unwrap());
        assert_eq!(std::fs::read_to_string(backup.join("data/wiki.json")).unwrap(), BASE);
        assert!(backup.join("data/wiki/vehicles.json").is_file());

        let wiki = content::load_full(&root.0);
        let names: Vec<&str> = content::entries(&wiki, "vehicles")
            .iter()
            .map(|e| e["name"].as_str().unwrap())
            .collect();
        assert_eq!(names, ["Old, revised", "Split, revised"]);
        // The rest of the main file survives the rewrite, in its original order.
        let main = std::fs::read_to_string(root.0.join("data/wiki.json")).unwrap();
        assert!(main.find("\"categories\"").unwrap() < main.find("\"sources\"").unwrap());
        assert!(main.find("\"slug\"").unwrap() < main.find("\"name\"").unwrap());
    }

    #[test]
    fn a_broken_data_file_blocks_the_import() {
        let root = root("import-broken");
        root.write("data/wiki/missions.json", "[ oops");
        let errors = run_json(
            &root,
            &format!(r#"{{"vehicles": [{}]}}"#, entry("a")),
            Options::default(),
        )
        .unwrap_err();
        assert!(
            errors[0].contains("data/wiki/missions.json is not valid JSON"),
            "{errors:#?}"
        );
        assert!(!root.0.join("data/wiki/vehicles.json").exists());
    }

    #[test]
    fn json_batches_can_be_a_list_with_sections() {
        let batch =
            parse_json(r#"[{"section": "vehicles", "slug": "a"}, {"section": "missions", "slug": "b"}]"#).unwrap();
        assert_eq!(batch.entries[0].0, "vehicles");
        assert!(batch.entries[0].1.get("section").is_none());
        assert_eq!(batch.entries[1].0, "missions");
        assert!(parse_json(r#"[{"slug": "a"}]"#).is_err());
        assert!(parse_json(r#"{"vehicles": {"slug": "a"}}"#).is_err());
        assert!(parse_json("nope").is_err());
    }

    #[test]
    fn csv_rows_become_typed_entries() {
        let wiki: Value = serde_json::from_str(BASE).unwrap();
        let csv = "\u{feff}section,slug,name,summary,body,confidence,sources,verified,spoiler,tags,x,y,facts.manufacturer,facts.seats,facts.amphibious,facts.features\r\n\
            vehicles,a,\"Car, \"\"A\"\"\",\"Two\nlines\",First.|Second.,official,src; src2,2026-11-11,yes,fast;red,0.5,0.25,Vapid,4,no,Roof rack; Winch\r\n\
            \r\n\
            missions,m,M,S,,rumor,,,,,,,,,,\r\n";
        let batch = parse_csv(csv, &wiki).unwrap();
        assert_eq!(batch.entries.len(), 2);
        let (section, a) = &batch.entries[0];
        assert_eq!(section, "vehicles");
        assert_eq!(a["name"], "Car, \"A\"");
        assert_eq!(a["summary"], "Two\nlines");
        assert_eq!(a["body"], json!(["First.", "Second."]));
        assert_eq!(a["sources"], json!(["src", "src2"]));
        assert_eq!(a["spoiler"], true);
        assert_eq!(a["x"], 0.5);
        assert_eq!(
            a["facts"],
            json!({"manufacturer": "Vapid", "seats": 4, "amphibious": false, "features": ["Roof rack", "Winch"]})
        );
        // Empty cells are simply absent.
        let (_, m) = &batch.entries[1];
        assert_eq!(m.as_object().unwrap().len(), 4);

        assert!(parse_csv("slug,name\na,A\n", &wiki).is_err());
        assert!(parse_csv("section,slug,x\nvehicles,a,east\n", &wiki)
            .unwrap_err()
            .contains("must be a number"));
        assert!(parse_csv("section,slug,spoiler\nvehicles,a,maybe\n", &wiki).is_err());
        assert!(parse_csv("section,slug\nvehicles,\"a\n", &wiki).is_err());
    }

    #[test]
    fn a_csv_batch_imports_like_a_json_one() {
        let root = root("import-csv");
        let wiki = content::load_full(&root.0);
        let csv =
            "section,slug,name,summary,confidence,sources,verified,facts.seats\nvehicles,a,A,S,official,src,2026-11-11,2\n";
        let outcome = import(&root.0, parse_csv(csv, &wiki).unwrap(), Options::default()).unwrap();
        assert_eq!(outcome.added, ["vehicles/a"]);
        assert_eq!(validate::validate(&root.0).errors, 0);
    }

    #[test]
    fn templates_have_the_category_fields_and_validate_once_filled_in() {
        let wiki: Value = serde_json::from_str(BASE).unwrap();
        let template_file = template(&wiki, "vehicles").unwrap();
        let skeleton = &template_file["vehicles"][0];
        assert_eq!(skeleton["status"], "draft");
        assert_eq!(skeleton["spoiler"], false);
        let facts: Vec<&String> = skeleton["facts"].as_object().unwrap().keys().collect();
        assert_eq!(facts, ["manufacturer", "seats", "amphibious", "features"]);
        assert!(template(&wiki, "missions").unwrap()["missions"][0]
            .get("facts")
            .is_none());
        assert!(template(&wiki, "boats").unwrap_err().contains("not a category"));
        assert!(template_csv(&wiki, "vehicles")
            .unwrap()
            .ends_with("x,y,facts.manufacturer,facts.seats,facts.amphibious,facts.features\n"));

        // Fill in only the required text and the template imports cleanly, as a draft.
        let root = root("import-template");
        let mut filled = template_file.clone();
        filled["vehicles"][0]["slug"] = json!("new-car");
        filled["vehicles"][0]["name"] = json!("New car");
        filled["vehicles"][0]["summary"] = json!("Not sourced yet.");
        let outcome = run_json(&root, &filled.to_string(), Options::default()).unwrap();
        assert_eq!(outcome.added, ["vehicles/new-car"]);
        assert_eq!(validate::validate(&root.0).errors, 0);
        assert_eq!(content::entries(&content::load_full(&root.0), "vehicles").len(), 2);
        assert_eq!(content::entries(&content::load(&root.0), "vehicles").len(), 1);
    }

    #[test]
    fn timestamps_are_calendar_dates() {
        let at = |seconds| timestamp(UNIX_EPOCH + std::time::Duration::from_secs(seconds));
        assert_eq!(at(0), "19700101-000000");
        assert_eq!(at(951_782_400), "20000229-000000");
        assert_eq!(at(1_794_441_599), "20261111-235959");
    }
}
