// ssg/normalize-data.mjs
import fs from "fs-extra";
import path from "node:path";

const DATA = path.resolve("data");

const stripId = (v) => {
  if (!v) return null;
  if (typeof v !== "string") return v.id ?? null;
  // handle "/api/foo/<id>" and full urls
  const m = v.match(/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/i);
  return m ? m[0] : null;
};

const toLocalImage = (src) => {
  if (!src) return "";
  try {
    // if full URL, grab basename
    if (/^https?:\/\//i.test(src)) {
      const u = new URL(src);
      const base = path.basename(u.pathname);
      return `images/${base}`;
    }
    // if it had "api-backup/images/...", keep just the basename
    const base = path.basename(src);
    return `images/${base}`;
  } catch {
    const base = path.basename(String(src));
    return `images/${base}`;
  }
};

async function run() {
  const filmsPath = path.join(DATA, "films.json");
  const speciesPath = path.join(DATA, "species.json");
  const peoplePath = path.join(DATA, "people.json");

  const films = JSON.parse(await fs.readFile(filmsPath, "utf8"));
  const species = JSON.parse(await fs.readFile(speciesPath, "utf8"));
  const people = JSON.parse(await fs.readFile(peoplePath, "utf8"));

  // Normalize films
  const filmsClean = films.map((f) => ({
    id: f.id,
    href: `film/${f.id}/`,
    title: f.title,
    original_title: f.original_title,
    original_title_romanised: f.original_title_romanised,
    image: toLocalImage(f.image),
    movie_banner: toLocalImage(f.movie_banner),
    description: f.description,
    director: f.director,
    producer: f.producer,
    release_date: f.release_date,
    running_time: f.running_time,
    rt_score: f.rt_score,
    people: Array.isArray(f.people) ? f.people.map(stripId).filter(Boolean) : [],
    species: Array.isArray(f.species) ? f.species.map(stripId).filter(Boolean) : []
  }));

  // Normalize species
  const speciesClean = species.map((s) => ({
    id: s.id,
    href: `species/${s.id}/`,
    name: s.name,
    classification: s.classification ?? s.class ?? "",
    eye_colors: s.eye_colors ?? "",
    hair_colors: s.hair_colors ?? ""
  }));

  // Normalize people
  const peopleClean = people.map((p) => ({
    id: p.id,
    name: p.name,
    gender: p.gender ?? "",
    age: p.age ?? "",
    image: toLocalImage(p.image || ""),
    species: stripId(p.species)
  }));

  await fs.writeJson(path.join(DATA, "films.json"), filmsClean, { spaces: 2 });
  await fs.writeJson(path.join(DATA, "species.json"), speciesClean, { spaces: 2 });
  await fs.writeJson(path.join(DATA, "people.json"), peopleClean, { spaces: 2 });

  console.log("Normalized data, data/*.json");
  console.log("Remember to place all used image files in public/images/");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
