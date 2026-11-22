//! Global search across every wiki section.
//!
//! The words of every entry are indexed once per load ([`Index::build`]);
//! a query then only looks up its own words, so search stays quick with
//! thousands of entries.

use std::{
    collections::{BTreeMap, HashMap},
    ops::Bound,
};

use serde::Serialize;
use serde_json::Value;

use crate::content;

/// Results returned when the request does not say how many it wants.
pub const DEFAULT_LIMIT: usize = 50;
pub const MAX_LIMIT: usize = 200;

#[derive(Serialize, Debug)]
pub struct Hit {
    pub section: String,
    pub slug: String,
    pub name: String,
    /// Empty for a spoiler entry unless the query asked for spoilers.
    pub summary: String,
    pub image: Option<String>,
    pub art: Option<String>,
    pub confidence: String,
    pub spoiler: bool,
    pub score: u32,
}

/// One page of results, with the number of matches in total.
#[derive(Serialize, Debug)]
pub struct Page {
    pub total: usize,
    pub offset: usize,
    pub limit: usize,
    pub hits: Vec<Hit>,
}

#[derive(Default, Clone, Copy, PartialEq, Eq)]
pub enum Sort {
    /// Best match first; ties by name.
    #[default]
    Relevance,
    Name,
}

#[derive(Default)]
pub struct Query<'a> {
    pub text: &'a str,
    /// Only search this section.
    pub section: Option<&'a str>,
    /// Entries marked `rumor` are left out unless this is set.
    pub include_rumors: bool,
    /// Without this, spoiler entries match on their name, aliases and tags
    /// only, and their summary is withheld.
    pub include_spoilers: bool,
    pub sort: Sort,
}

const NAME: usize = 0;
const TAGS: usize = 1;
const BODY: usize = 2;
/// Name and alias matches outrank tag matches, which outrank the text.
const WEIGHTS: [u32; 3] = [6, 3, 1];

struct Doc {
    section: String,
    slug: String,
    name: String,
    /// The name's meaningful words (no filler, apostrophes joined), for ranking an entry whose name
    /// starts with, or is, the query first.
    name_words: Vec<String>,
    summary: String,
    image: Option<String>,
    art: Option<String>,
    confidence: String,
    spoiler: bool,
}

#[derive(Clone, Copy)]
struct Posting {
    doc: u32,
    field: u8,
}

/// Every word of every entry, mapped to where it occurs. Sorted, so all
/// words starting with a prefix sit next to each other.
#[derive(Default)]
pub struct Index {
    docs: Vec<Doc>,
    words: BTreeMap<String, Vec<Posting>>,
}

impl Index {
    pub fn build(wiki: &Value) -> Self {
        let mut index = Self::default();
        for section in content::sections(wiki) {
            for entry in content::entries(wiki, &section) {
                let text = |key: &str| entry.get(key).and_then(Value::as_str).unwrap_or_default();
                let confidence = match text("confidence") {
                    "" => "unknown",
                    other => other,
                };
                let name = words(&format!("{} {}", text("name"), joined(entry.get("aliases"))));
                let tags = words(&joined(entry.get("tags")));
                let body = words(&format!(
                    "{} {} {} {} {} {}",
                    text("summary"),
                    text("role"),
                    text("region"),
                    text("class"),
                    joined(entry.get("body")),
                    facts_text(entry.get("facts")),
                ));

                let doc = u32::try_from(index.docs.len()).unwrap_or(u32::MAX);
                for (field, field_words) in [(NAME, name), (TAGS, tags), (BODY, body)] {
                    for word in field_words {
                        index.words.entry(word).or_default().push(Posting {
                            doc,
                            field: field as u8,
                        });
                    }
                }
                index.docs.push(Doc {
                    section: section.clone(),
                    slug: text("slug").to_string(),
                    name: text("name").to_string(),
                    name_words: core(text("name")),
                    summary: text("summary").to_string(),
                    image: entry.get("image").and_then(Value::as_str).map(str::to_string),
                    art: entry.get("art").and_then(Value::as_str).map(str::to_string),
                    confidence: confidence.to_string(),
                    spoiler: content::is_spoiler(entry),
                });
            }
        }
        index
    }

    /// How well each entry matches one query word: 2 for a whole word, 1 for a prefix, weighted by
    /// field. `loose` also accepts another form of the word (plural, "-ing", a dropped "e") as a
    /// whole word, and, when nothing starts with the word at all, a near spelling as a prefix.
    fn term_scores(&self, term: &str, query: &Query, loose: bool) -> HashMap<u32, u32> {
        let mut best: HashMap<u32, [u32; 3]> = HashMap::new();
        fn add(best: &mut HashMap<u32, [u32; 3]>, postings: &[Posting], strength: u32) {
            for posting in postings {
                let fields = best.entry(posting.doc).or_default();
                let field = &mut fields[usize::from(posting.field)];
                *field = (*field).max(strength);
            }
        }
        for (word, postings) in self.prefixed(term) {
            add(&mut best, postings, if word == term { 2 } else { 1 });
        }
        if loose {
            let root = stem(term);
            if root != term && root.len() >= 3 {
                for (word, postings) in self.prefixed(root.trim_end_matches('i')) {
                    if stem(word) == root {
                        add(&mut best, postings, 2);
                    }
                }
            }
            if best.is_empty() && term.chars().count() >= 4 {
                let allowed = if term.chars().count() >= 7 { 2 } else { 1 };
                for (word, postings) in &self.words {
                    if near(term, word, allowed) {
                        add(&mut best, postings, 1);
                    }
                }
            }
        }
        best.into_iter()
            .filter_map(|(doc, mut fields)| {
                if self.docs[doc as usize].spoiler && !query.include_spoilers {
                    fields[BODY] = 0;
                }
                let score: u32 = fields.iter().zip(WEIGHTS).map(|(found, weight)| found * weight).sum();
                (score > 0).then_some((doc, score))
            })
            .collect()
    }

    /// Indexed words that start with `prefix`.
    fn prefixed<'s>(&'s self, prefix: &'s str) -> impl Iterator<Item = (&'s String, &'s Vec<Posting>)> + 's {
        self.words
            .range::<str, _>((Bound::Included(prefix), Bound::Unbounded))
            .take_while(move |(word, _)| word.starts_with(prefix))
    }

    /// Every query word must match somewhere in an entry. Whole words outrank prefixes, and an
    /// entry whose name starts with the query, or is exactly the query, comes first. Filler words
    /// ("how to", "where is") are skipped when other words remain. Ties sort by name.
    fn ranked(&self, query: &Query) -> Vec<(u32, u32)> {
        let all = words(query.text);
        let mut terms = without_filler(&all);
        if terms.is_empty() {
            terms = all;
        }
        let asked = core(query.text);
        let mut ranked = self.matching(&terms, query, true);
        // A longer question where one word matches nothing ("make money fast") still finds the
        // entries that match all the other words.
        if ranked.is_empty() && terms.len() >= 3 {
            for skip in 0..terms.len() {
                let rest: Vec<String> = terms
                    .iter()
                    .enumerate()
                    .filter(|(i, _)| *i != skip)
                    .map(|(_, t)| t.clone())
                    .collect();
                for found in self.matching(&rest, query, true) {
                    if let Some(known) = ranked.iter_mut().find(|(doc, _)| *doc == found.0) {
                        known.1 = known.1.max(found.1);
                    } else {
                        ranked.push(found);
                    }
                }
            }
        }
        let same = |a: &str, b: &str| a == b || stem(a) == stem(b);
        let asked_joined = asked.concat();
        for (doc, score) in &mut ranked {
            let name = &self.docs[*doc as usize].name_words;
            if let (Some(first_name), Some(first_term)) = (name.first(), asked.first()) {
                if first_name == first_term {
                    // Short names first: "Jason Duval" before "Jason Duval's car".
                    *score += if name.len() <= 2 { 12 } else { 8 };
                } else if same(first_name, first_term) {
                    // Only the root matches ("jasons" for "jason"): a smaller lift.
                    *score += 4;
                }
            }
            // Exactly the name, however it was spaced ("drequan priest", "dre quan priest").
            let joined = name.concat();
            if !joined.is_empty()
                && (joined == asked_joined
                    || (name.len() == asked.len() && name.iter().zip(&asked).all(|(n, t)| same(n, t))))
            {
                *score += 6;
            }
        }
        self.sorted(ranked, query)
    }

    /// The plain ranking: every word as typed, whole word or prefix, no extras.
    #[cfg(test)]
    fn strict(&self, query: &Query) -> Vec<(u32, u32)> {
        let ranked = self.matching(&words(query.text), query, false);
        self.sorted(ranked, query)
    }

    fn matching(&self, terms: &[String], query: &Query, loose: bool) -> Vec<(u32, u32)> {
        let mut matched: Option<HashMap<u32, u32>> = None;
        for term in terms {
            let scored = self.term_scores(term, query, loose);
            matched = Some(match matched {
                None => scored,
                Some(so_far) => so_far
                    .into_iter()
                    .filter_map(|(doc, total)| scored.get(&doc).map(|score| (doc, total + score)))
                    .collect(),
            });
        }
        matched
            .unwrap_or_default()
            .into_iter()
            .filter(|(doc, _)| {
                let doc = &self.docs[*doc as usize];
                query.section.is_none_or(|only| only == doc.section)
                    && (doc.confidence != "rumor" || query.include_rumors)
            })
            .collect()
    }

    fn sorted(&self, mut ranked: Vec<(u32, u32)>, query: &Query) -> Vec<(u32, u32)> {
        let name = |doc: u32| &self.docs[doc as usize].name;
        ranked.sort_by(|a, b| {
            let by_score = if query.sort == Sort::Name {
                std::cmp::Ordering::Equal
            } else {
                b.1.cmp(&a.1)
            };
            by_score
                .then_with(|| name(a.0).cmp(name(b.0)))
                .then_with(|| a.0.cmp(&b.0))
        });
        ranked
    }

    fn hit(&self, doc: u32, score: u32, query: &Query) -> Hit {
        let doc = &self.docs[doc as usize];
        let hidden = doc.spoiler && !query.include_spoilers;
        Hit {
            section: doc.section.clone(),
            slug: doc.slug.clone(),
            name: doc.name.clone(),
            summary: if hidden { String::new() } else { doc.summary.clone() },
            image: if hidden { None } else { doc.image.clone() },
            art: doc.art.clone(),
            confidence: doc.confidence.clone(),
            spoiler: doc.spoiler,
            score,
        }
    }

    /// Every match, best first.
    #[cfg(test)]
    pub fn search(&self, query: &Query) -> Vec<Hit> {
        self.ranked(query)
            .into_iter()
            .map(|(doc, score)| self.hit(doc, score, query))
            .collect()
    }

    /// `limit` matches starting at `offset`, and how many there are in all.
    pub fn page(&self, query: &Query, offset: usize, limit: usize) -> Page {
        let limit = limit.clamp(1, MAX_LIMIT);
        let ranked = self.ranked(query);
        Page {
            total: ranked.len(),
            offset,
            limit,
            hits: ranked
                .into_iter()
                .skip(offset)
                .take(limit)
                .map(|(doc, score)| self.hit(doc, score, query))
                .collect(),
        }
    }
}

/// Search a wiki without keeping the index (tests and one-off use).
#[cfg(test)]
pub fn search(wiki: &Value, query: &Query) -> Vec<Hit> {
    Index::build(wiki).search(query)
}

/// Words that carry no meaning in a question such as "how do I rob a bank" or "where is the
/// beach". They are dropped from a query unless nothing else is left.
const FILLER: &[&str] = &[
    "a", "an", "the", "to", "of", "in", "on", "at", "for", "and", "or", "how", "do", "does", "did", "i", "is", "are",
    "where", "what", "which", "can", "you", "my", "me", "find", "with", "gta",
];

/// `words` without filler. "gta" always goes; "6" and "vi" only right after it ("gta 6"), so a
/// search such as "chapter 6" keeps its number.
fn without_filler(all: &[String]) -> Vec<String> {
    let mut out = Vec::new();
    for (i, w) in all.iter().enumerate() {
        let after_gta = i > 0 && all[i - 1] == "gta";
        let drop = match w.as_str() {
            "6" | "vi" => after_gta,
            other => FILLER.contains(&other),
        };
        if !drop {
            out.push(w.clone());
        }
    }
    out
}

/// The meaningful words of a name or query, with apostrophes joined ("Dre'Quan" is "drequan").
fn core(text: &str) -> Vec<String> {
    let plain: Vec<String> = text
        .to_lowercase()
        .replace(['\'', '\u{2019}'], "")
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .map(str::to_string)
        .collect();
    let kept = without_filler(&plain);
    if kept.is_empty() {
        plain
    } else {
        kept
    }
}

/// A rough common root, so "cards" finds "card", "racing" finds "race" and "robberies" finds
/// "robbery". Only plain ASCII words of four letters or more are changed.
fn stem(word: &str) -> String {
    let n = word.len();
    if n < 4 || !word.is_ascii() {
        return word.to_string();
    }
    let mut root = if let Some(base) = word.strip_suffix("ies") {
        format!("{base}y")
    } else if let (Some(base), true) = (word.strip_suffix("ing"), n >= 6) {
        base.to_string()
    } else if ["ches", "shes", "sses", "xes"].iter().any(|end| word.ends_with(end)) {
        word[..n - 2].to_string()
    } else if word.ends_with('s') && !["ss", "us", "is"].iter().any(|end| word.ends_with(end)) {
        word[..n - 1].to_string()
    } else {
        word.to_string()
    };
    if root.len() >= 4 && root.ends_with('e') {
        root.pop();
    }
    if root.len() >= 4 && root.ends_with('y') {
        root.pop();
        root.push('i');
    }
    root
}

/// True when `a` and `b` are at most `allowed` single-letter edits apart (typos such as
/// "jewlery" or "basktball").
fn near(a: &str, b: &str, allowed: usize) -> bool {
    let (a, b): (Vec<char>, Vec<char>) = (a.chars().collect(), b.chars().collect());
    if a.len().abs_diff(b.len()) > allowed || b.len() < 4 {
        return false;
    }
    let mut row: Vec<usize> = (0..=b.len()).collect();
    for (i, ca) in a.iter().enumerate() {
        let mut prev = row[0];
        row[0] = i + 1;
        let mut lowest = row[0];
        for (j, cb) in b.iter().enumerate() {
            let here = row[j + 1];
            row[j + 1] = (prev + usize::from(ca != cb)).min(row[j] + 1).min(here + 1);
            prev = here;
            lowest = lowest.min(row[j + 1]);
        }
        if lowest > allowed {
            return false;
        }
    }
    row[b.len()] <= allowed
}

/// Lower-case words. Apostrophes join rather than split, so "Dre'Quan" is
/// findable as "drequan" as well as "dre" and "quan".
fn words(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    let split = |s: &str| -> Vec<String> {
        s.split(|c: char| !c.is_alphanumeric())
            .filter(|w| !w.is_empty())
            .map(str::to_string)
            .collect()
    };
    let mut all = split(&lower);
    if lower.contains(['\'', '\u{2019}']) {
        for word in split(&lower.replace(['\'', '\u{2019}'], "")) {
            if !all.contains(&word) {
                all.push(word);
            }
        }
    }
    all
}

/// A JSON string, or an array of strings joined by spaces.
fn joined(value: Option<&Value>) -> String {
    match value {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Array(items)) => items.iter().filter_map(Value::as_str).collect::<Vec<_>>().join(" "),
        _ => String::new(),
    }
}

/// The text and list values of an entry's `facts`.
fn facts_text(facts: Option<&Value>) -> String {
    facts
        .and_then(Value::as_object)
        .into_iter()
        .flat_map(|facts| facts.values())
        .map(|value| joined(Some(value)))
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn wiki() -> Value {
        json!({
            "characters": [
                {"slug": "lucia-caminos", "name": "Lucia Caminos", "summary": "Fresh out of prison.", "tags": ["protagonist"]},
                {"slug": "jason-duval", "name": "Jason Duval", "summary": "Works the Keys with Lucia.", "tags": ["protagonist"]},
                {"slug": "drequan-priest", "name": "Dre'Quan Priest", "summary": "Label head.", "aliases": ["DQ"]},
                {"slug": "secret", "name": "Secret Twin", "summary": "Lucia has a twin.", "confidence": "rumor"}
            ],
            "locations": [
                {"slug": "vice-city", "name": "Vice City", "summary": "Neon and beaches.", "body": ["Home of the protagonists."]}
            ],
            "vehicles": []
        })
    }

    fn find(text: &str) -> Vec<Hit> {
        search(
            &wiki(),
            &Query {
                text,
                ..Query::default()
            },
        )
    }

    #[test]
    fn name_matches_rank_above_text_matches() {
        let hits = find("lucia");
        assert_eq!(hits.len(), 2);
        assert_eq!(hits[0].slug, "lucia-caminos");
        assert_eq!(hits[1].slug, "jason-duval");
    }

    #[test]
    fn every_word_must_match_and_prefixes_count() {
        assert_eq!(find("vice bea").len(), 1);
        assert!(find("vice mountain").is_empty());
        assert_eq!(find("protag").len(), 3);
    }

    #[test]
    fn empty_and_punctuation_only_queries_return_nothing() {
        assert!(find("  ").is_empty());
        assert!(find("?!...").is_empty());
    }

    #[test]
    fn case_and_apostrophes_do_not_matter() {
        for query in ["DREQUAN", "dre'quan", "Dre\u{2019}Quan", "dre quan", "dq"] {
            let hits = find(query);
            assert_eq!(hits.len(), 1, "query {query:?}");
            assert_eq!(hits[0].slug, "drequan-priest");
        }
    }

    #[test]
    fn rumors_are_excluded_unless_asked_for() {
        assert!(find("twin").is_empty());
        let with = search(
            &wiki(),
            &Query {
                text: "twin",
                include_rumors: true,
                ..Query::default()
            },
        );
        assert_eq!(with.len(), 1);
        assert_eq!(with[0].confidence, "rumor");
    }

    #[test]
    fn section_filter_limits_results() {
        let only = search(
            &wiki(),
            &Query {
                text: "protag",
                section: Some("locations"),
                ..Query::default()
            },
        );
        assert_eq!(only.len(), 1);
        assert_eq!(only[0].section, "locations");
    }

    #[test]
    fn scores_are_the_weighted_sum_over_fields_and_words() {
        // "lucia": whole word in the name (2 x 6). "protag": prefix of a tag (1 x 3). Plus 12 because
        // the two-word name starts with the first word of the query.
        let hits = find("lucia protag");
        assert_eq!(hits[0].slug, "lucia-caminos");
        assert_eq!(hits[0].score, 27);
        // Jason: "lucia" whole word in the summary (2 x 1) + tag prefix (1 x 3).
        assert_eq!(hits[1].score, 5);
    }

    #[test]
    fn the_index_is_reused_and_pages_report_the_total() {
        let mut big = json!({ "categories": [{"key": "vehicles", "label": "Vehicles"}], "vehicles": [] });
        let entries = big["vehicles"].as_array_mut().unwrap();
        for n in 0..3000 {
            entries.push(json!({
                "slug": format!("car-{n:04}"), "name": format!("Car {n:04}"),
                "summary": "A test car.", "tags": [if n % 2 == 0 { "even" } else { "odd" }]
            }));
        }
        let index = Index::build(&big);

        let query = Query {
            text: "car even",
            ..Query::default()
        };
        let page = index.page(&query, 0, 25);
        assert_eq!(page.total, 1500);
        assert_eq!(page.hits.len(), 25);
        assert_eq!(page.hits[0].slug, "car-0000");
        let next = index.page(&query, 25, 25);
        assert_eq!(next.hits[0].slug, "car-0050");
        assert_eq!(next.offset, 25);

        // Limits are capped; an offset past the end is an empty page with the same total.
        assert_eq!(index.page(&query, 0, 100_000).hits.len(), MAX_LIMIT);
        let past = index.page(&query, 5000, 25);
        assert!(past.hits.is_empty());
        assert_eq!(past.total, 1500);
        // An exact name still comes first among thousands.
        let exact = index.page(
            &Query {
                text: "car 1234",
                ..Query::default()
            },
            0,
            5,
        );
        assert_eq!(exact.total, 1);
        assert_eq!(exact.hits[0].slug, "car-1234");
    }

    /// The search as it was before the index existed: scan every entry and
    /// tokenise it for each query. Kept as the reference for ranking.
    fn reference(wiki: &Value, text: &str, section: Option<&str>) -> Vec<(String, String, u32)> {
        let field_score = |field: &[String], term: &str| -> u32 {
            field
                .iter()
                .map(|word| {
                    if word == term {
                        2
                    } else if word.starts_with(term) {
                        1
                    } else {
                        0
                    }
                })
                .max()
                .unwrap_or(0)
        };
        let terms = words(text);
        if terms.is_empty() {
            return Vec::new();
        }
        let mut hits = Vec::new();
        for key in content::sections(wiki) {
            if section.is_some_and(|only| only != key) {
                continue;
            }
            for entry in content::entries(wiki, &key) {
                let text = |key: &str| entry.get(key).and_then(Value::as_str).unwrap_or_default();
                if text("confidence") == "rumor" {
                    continue;
                }
                let name = words(&format!("{} {}", text("name"), joined(entry.get("aliases"))));
                let tags = words(&joined(entry.get("tags")));
                let body = words(&format!(
                    "{} {} {} {} {} {}",
                    text("summary"),
                    text("role"),
                    text("region"),
                    text("class"),
                    joined(entry.get("body")),
                    facts_text(entry.get("facts")),
                ));
                let mut score = 0;
                let all_match = terms.iter().all(|term| {
                    let best = field_score(&name, term) * 6 + field_score(&tags, term) * 3 + field_score(&body, term);
                    score += best;
                    best > 0
                });
                if all_match {
                    hits.push((key.clone(), text("slug").to_string(), text("name").to_string(), score));
                }
            }
        }
        hits.sort_by(|a, b| b.3.cmp(&a.3).then_with(|| a.2.cmp(&b.2)));
        hits.into_iter()
            .map(|(key, slug, _, score)| (key, slug, score))
            .collect()
    }

    #[test]
    fn the_index_ranks_the_real_wiki_exactly_like_a_full_scan() {
        // Fact values (new) are part of the text; spoilers are switched on so nothing is withheld.
        let wiki = content::bundled();
        let index = Index::build(&wiki);
        let queries = [
            "lucia",
            "jason duval",
            "vice",
            "vice city",
            "keys",
            "boat",
            "release date",
            "price",
            "a",
            "s",
            "the",
            "drequan",
            "dre'quan",
            "ultimate edition",
            "vapid",
            "gator",
            "radio",
            "bank",
            "p",
            "mo",
            "zzz",
            "trailer 2",
            "leonida keys smuggling",
            "ca",
            "re",
            "in",
        ];
        for text in queries {
            for section in [None, Some("characters"), Some("vehicles"), Some("news")] {
                let expected = reference(&wiki, text, section);
                let query = Query {
                    text,
                    section,
                    include_spoilers: true,
                    ..Query::default()
                };
                let got: Vec<(String, String, u32)> = index
                    .strict(&query)
                    .into_iter()
                    .map(|(doc, score)| {
                        let hit = index.hit(doc, score, &query);
                        (hit.section, hit.slug, hit.score)
                    })
                    .collect();
                assert_eq!(got, expected, "query {text:?} in {section:?}");
            }
        }
        assert!(!reference(&wiki, "vice", None).is_empty());
    }

    #[test]
    fn sorting_by_name_ignores_the_score() {
        let hits = search(
            &wiki(),
            &Query {
                text: "lucia",
                sort: Sort::Name,
                ..Query::default()
            },
        );
        let slugs: Vec<&str> = hits.iter().map(|h| h.slug.as_str()).collect();
        assert_eq!(slugs, ["jason-duval", "lucia-caminos"]);
    }

    #[test]
    fn fact_values_are_searchable() {
        let wiki = json!({
            "vehicles": [{"slug": "x", "name": "Thing", "summary": "s",
                "facts": {"manufacturer": "Vapid", "seats": 2, "features": ["Convertible roof"]}}]
        });
        for text in ["vapid", "convertible"] {
            let hits = search(
                &wiki,
                &Query {
                    text,
                    ..Query::default()
                },
            );
            assert_eq!(hits.len(), 1, "query {text:?}");
        }
    }

    #[test]
    fn spoiler_text_is_neither_matched_nor_returned_unless_spoilers_are_on() {
        let wiki = json!({
            "categories": [{"key": "missions", "label": "Missions"}],
            "missions": [{"slug": "finale", "name": "The Last Job", "summary": "The betrayal is revealed.",
                "body": ["Everything burns."], "tags": ["heist"], "spoiler": true,
                "image": "/images/missions/finale.jpg"}]
        });
        let off = |text| {
            search(
                &wiki,
                &Query {
                    text,
                    ..Query::default()
                },
            )
        };
        let on = |text| {
            search(
                &wiki,
                &Query {
                    text,
                    include_spoilers: true,
                    ..Query::default()
                },
            )
        };

        // Hidden text does not match, so a search cannot be used to probe it.
        assert!(off("betrayal").is_empty());
        assert!(off("burns").is_empty());
        // The title and tags still find it, without the snippet or picture.
        let hits = off("last job");
        assert_eq!(hits.len(), 1);
        assert!(hits[0].spoiler);
        assert_eq!(hits[0].summary, "");
        assert!(hits[0].image.is_none());
        assert_eq!(off("heist").len(), 1);

        let hits = on("betrayal");
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].summary, "The betrayal is revealed.");
        assert!(hits[0].image.is_some());
    }

    #[test]
    fn questions_plurals_and_typos_still_find_the_entry() {
        let wiki = json!({
            "categories": [{"key": "gameplay", "label": "Gameplay"}, {"key": "collectibles", "label": "Collectibles"}],
            "gameplay": [
                {"slug": "bank-jobs", "name": "Bank jobs", "summary": "Robbing a branch.", "tags": ["robbery"]},
                {"slug": "making-money", "name": "Making money", "summary": "Ways to earn cash."}
            ],
            "collectibles": [
                {"slug": "card-1", "name": "Collectible card", "summary": "A trading card."},
                {"slug": "ring", "name": "Diamond ring", "summary": "Sold at a jewelry store."}
            ]
        });
        let find = |text: &str| -> Vec<String> {
            search(
                &wiki,
                &Query {
                    text,
                    ..Query::default()
                },
            )
            .into_iter()
            .map(|h| h.slug)
            .collect()
        };
        assert_eq!(find("how do I rob a bank"), ["bank-jobs"]);
        assert_eq!(find("robberies"), ["bank-jobs"]);
        assert_eq!(find("cards"), ["card-1"]);
        assert_eq!(find("make money"), ["making-money"]);
        assert_eq!(find("make money fast"), ["making-money"]);
        assert_eq!(without_filler(&words("gta 6 chapter 6")), ["chapter", "6"]);
        assert_eq!(core("The End of the Road"), ["end", "road"]);
        assert_eq!(core("Dre'Quan Priest").concat(), core("dre quan priest").concat());
        assert_eq!(find("jewlery"), ["ring"]);
        // Every meaningful word must still match.
        assert!(find("bank mountain").is_empty());
    }

    #[test]
    fn near_spellings_and_roots() {
        assert!(near("basktball", "basketball", 2));
        assert!(near("jewlery", "jewelry", 2));
        assert!(!near("bank", "tank", 0));
        assert!(!near("car", "cat", 1)); // too short to guess
        assert_eq!(stem("cards"), "card");
        assert_eq!(stem("racing"), stem("race"));
        assert_eq!(stem("robberies"), stem("robbery"));
        assert_eq!(stem("boss"), "boss");
    }
}
