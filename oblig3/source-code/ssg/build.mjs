import fs from "fs-extra";
import path from "node:path";
import { minify } from "html-minifier-terser";

const ROOT = path.resolve(process.cwd());
const DIST = path.join(ROOT, "dist");
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");

// helpers
const htmlEscape = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const minifyHtml = (html) =>
  minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    removeOptionalTags: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    minifyCSS: true,
  });

// depth -> "../../" style prefix (0 = "")
const prefixForDepth = (depth = 0) => (depth <= 0 ? "" : "../".repeat(depth));

// asset path that always works (removes leading "/")
const asset = (p = "", depth = 0) =>
  `${prefixForDepth(depth)}${String(p).replace(/^\/+/, "")}`;

// Card image for the home page
const getCardImage = (f) => f.image ?? f.movie_banner ?? "";

// Banner image for detail pages
const getBannerImage = (f) => f.movie_banner ?? f.image ?? "";

// -----------------------------------------------------------------------------
// LOAD DATA FROM complete-backup.json
// -----------------------------------------------------------------------------
const backup = JSON.parse(
  await fs.readFile(path.join(DATA, "complete-backup.json"), "utf8")
);

const films = backup.films || [];
const species = backup.species || [];
const people = backup.people || [];
const locations = backup.locations || [];
const vehicles = backup.vehicles || [];

// lookup maps
const locationsById = Object.fromEntries(locations.map((l) => [l.id, l]));
const vehiclesById = Object.fromEntries(vehicles.map((v) => [v.id, v]));

// Small helpers
const cap = (s) =>
  !s
    ? ""
    : String(s)
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
      .join(" ");

const initials = (name) => {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  return (
    (parts[0][0] +
      (parts.length > 1 ? parts[parts.length - 1][0] : "")
    ).toUpperCase()
  );
};

const avatarClass = (gender) => {
  const g = String(gender || "").toLowerCase();
  if (g === "female") return "avatar-female";
  if (g === "male") return "avatar-male";
  return "avatar-neutral";
};

const idFrom = (v) => {
  if (!v) return null;
  if (typeof v === "string") {
    const m = v.match(/[0-9a-f-]{36}/i);
    return m ? m[0] : v; // if it already is an id, or path with id at end
  }
  return v.id ?? null;
};

const heroClassForClassification = (classification = "") => {
  const c = String(classification || "").toLowerCase();
  if (c.includes("mammal")) return "species-hero-mammal";
  if (c.includes("spirit") || c.includes("god")) return "species-hero-spirit";
  if (c.includes("bird") || c.includes("avian")) return "species-hero-bird";
  return "species-hero-default";
};

// Build lookup maps
const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));

const peopleBySpecies = people.reduce((acc, p) => {
  const sid = idFrom(p.species);
  if (!sid) return acc;
  (acc[sid] ||= []).push(p);
  return acc;
}, {});

// base layout (depth-aware for CSS/links)
const layout = ({
  title,
  description = "",
  body,
  depth = 0,
  headerVariant = "home",
  decorations = false, // only true on the home page
}) => {
  const prefix = prefixForDepth(depth);

  let headerHTML;
  if (headerVariant === "detail") {
    headerHTML = `
      <header>
        <div class="container">
          <h1 class="logo">STUDIO GHIBLI</h1>
          <a href="${prefix}" class="back-btn">← Back to All Films</a>
        </div>
      </header>
    `;
  } else if (headerVariant === "species") {
    headerHTML = `
      <header>
        <div class="container header-with-buttons">
          <h1 class="logo">STUDIO GHIBLI</h1>
          <div class="species-header-buttons">
            <a href="${prefix}" class="back-btn">← All Films</a>
            <a href="javascript:history.back()" class="back-btn">← Back</a>
          </div>
        </div>
      </header>
    `;
  } else {
    headerHTML = `
      <header>
        <div class="container">
          <h1 class="logo">STUDIO GHIBLI</h1>
          <p class="tagline">Explore the Magical World of Ghibli</p>
        </div>
      </header>
    `;
  }

  const decorationHTML = !decorations
    ? ""
    : `
      <div class="clouds" aria-hidden="true"></div>

      <div class="soot-sprites decorations" aria-hidden="true">
        <div class="soot-sprite"><div class="soot-limbs"></div></div>
        <div class="soot-sprite"><div class="soot-limbs"></div></div>
        <div class="soot-sprite"><div class="soot-limbs"></div></div>
        <div class="soot-sprite"><div class="soot-limbs"></div></div>
        <div class="soot-sprite"><div class="soot-limbs"></div></div>
        <div class="soot-sprite"><div class="soot-limbs"></div></div>
      </div>

      <!-- KODAMA GHOSTS -->
      <div class="kodama-container decorations" aria-hidden="true">
        <div class="kodama"></div>
        <div class="kodama"></div>
        <div class="kodama"></div>
      </div>

      <div class="leaves decorations" aria-hidden="true">
        <div class="leaf"></div>
        <div class="leaf"></div>
        <div class="leaf"></div>
        <div class="leaf"></div>
      </div>
    `;

  const sootScript = decorations
    ? `<script defer src="${prefix}soot.js"></script>`
    : "";

  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(description)}"/>
  <link rel="stylesheet" href="${prefix}styles.css"/>
  ${sootScript}
</head>
<body>
  ${decorationHTML}

  ${headerHTML}

  <main class="container">
    ${body}
  </main>

  <footer>
    <div class="container">
      <p>Data provided by <a href="https://ghibliapi.vercel.app/" target="_blank" rel="noopener">Ghibli API</a></p>
      <p>&copy; 2025 Studio Ghibli Fan Site</p>
    </div>
  </footer>
</body>
</html>`;
};

// -----------------------------------------------------------------------------
// HOME PAGE
// -----------------------------------------------------------------------------
const HomePage = (list) => {
  const items = list
    .map((f) => {
      const poster = getCardImage(f);
      const href = f.href ? f.href.replace(/^\/+/, "") : `film/${f.id}/`;

      const year = f.release_date ?? "";
      const director = f.director ?? "";
      const producer = f.producer ?? "";
      const runtime = f.running_time ? `${f.running_time} mins` : "";
      const rt = f.rt_score ? Number(f.rt_score) : null;

      return `
      <article class="film-card">
        <a class="film-link" href="${href}">
          ${poster
          ? `
            <img src="${htmlEscape(poster)}"
                 alt="${htmlEscape(f.title)}"
                 class="film-image"
                 loading="lazy"
                 decoding="async">`
          : ``
        }

          <div class="film-content">
            ${year ? `<div class="release-year">${htmlEscape(year)}</div>` : ``}

            <h2 class="film-title">${htmlEscape(f.title)}</h2>

            ${f.original_title
          ? `
              <div class="original-title">
                ${htmlEscape(f.original_title)}
                ${f.original_title_romanised
            ? ` (${htmlEscape(f.original_title_romanised)})`
            : ``
          }
              </div>`
          : ``
        }

            <div class="film-info">
              ${director
          ? `
                <div class="info-item">
                  <span class="info-label">Director:</span>
                  <span>${htmlEscape(director)}</span>
                </div>`
          : ``
        }

              ${producer
          ? `
                <div class="info-item">
                  <span class="info-label">Producer:</span>
                  <span>${htmlEscape(producer)}</span>
                </div>`
          : ``
        }

              ${runtime
          ? `
                <div class="info-item">
                  <span class="info-label">Runtime:</span>
                  <span>${htmlEscape(runtime)}</span>
                </div>`
          : ``
        }

              ${rt !== null
          ? `
                <div class="info-item">
                  <span class="rt-score">⭐ ${htmlEscape(String(rt))}%</span>
                </div>`
          : ``
        }
            </div>

            ${f.description
          ? `
              <div class="description">
                ${htmlEscape(f.description)}
              </div>`
          : ``
        }
          </div>
        </a>
      </article>
    `;
    })
    .join("");

  return layout({
    title: "Studio Ghibli Films",
    description:
      "Explore Studio Ghibli films: titles, years, directors and more.",
    body: `<section class="films-grid" aria-label="Films">${items}</section>`,
    depth: 0,
    headerVariant: "home",
    decorations: true,
  });
};

// -----------------------------------------------------------------------------
// FILM DETAIL PAGE
// -----------------------------------------------------------------------------
const FilmPage = (film) => {
  const depth = 2;
  const prefix = prefixForDepth(depth);
  const poster = getBannerImage(film);

  const peopleIds = Array.isArray(film.people)
    ? film.people.map(idFrom).filter(Boolean)
    : [];
  const chars = peopleIds
    .map((id) => people.find((p) => p.id === id))
    .filter(Boolean);

  const speciesIds = Array.isArray(film.species)
    ? film.species.map(idFrom).filter(Boolean)
    : [];
  const speciesTags = speciesIds
    .map((id) => speciesById[id]?.name)
    .filter(Boolean)
    .map((name) => `<div class="info-tag">${htmlEscape(name)}</div>`)
    .join("");

  const locationIds = Array.isArray(film.locations)
    ? film.locations.map(idFrom).filter(Boolean)
    : [];
  const vehicleIds = Array.isArray(film.vehicles)
    ? film.vehicles.map(idFrom).filter(Boolean)
    : [];

  const locationTags = locationIds
    .map((id) => locationsById[id]?.name)
    .filter(Boolean)
    .map((n) => `<div class="info-tag">${htmlEscape(n)}</div>`)
    .join("");

  const vehicleTags = vehicleIds
    .map((id) => vehiclesById[id]?.name)
    .filter(Boolean)
    .map((n) => `<div class="info-tag">${htmlEscape(n)}</div>`)
    .join("");

  const characterCards = chars
    .map((p) => {
      const specId = idFrom(p.species);
      const specName = specId ? speciesById[specId]?.name || "" : "";

      const specLink = specId
        ? `<a href="${prefix}species/${specId}/" class="species-link">${htmlEscape(
          specName
        )}</a>`
        : htmlEscape(specName);

      const hasEye =
        p.eye_color !== undefined &&
        p.eye_color !== null &&
        String(p.eye_color).trim() !== "";

      const hasHair =
        p.hair_color !== undefined &&
        p.hair_color !== null &&
        String(p.hair_color).trim() !== "";

      return `
      <div class="character-card">
        <div class="character-avatar ${avatarClass(p.gender)}">${initials(
        p.name
      )}</div>
        <h4>${htmlEscape(p.name)}</h4>
        <div class="character-details">
          ${p.gender
          ? `
            <div class="character-detail-item">
              <span class="detail-label">Gender:</span>
              <span class="detail-value">${htmlEscape(cap(p.gender))}</span>
            </div>`
          : ``
        }

          ${p.age
          ? `
            <div class="character-detail-item">
              <span class="detail-label">Age:</span>
              <span class="detail-value">${htmlEscape(p.age)}</span>
            </div>`
          : ``
        }

          ${hasEye
          ? `
            <div class="character-detail-item">
              <span class="detail-label">Eye Color:</span>
              <span class="detail-value">${htmlEscape(
            cap(p.eye_color)
          )}</span>
            </div>`
          : ``
        }

          ${hasHair
          ? `
            <div class="character-detail-item">
              <span class="detail-label">Hair Color:</span>
              <span class="detail-value">${htmlEscape(
            cap(p.hair_color)
          )}</span>
            </div>`
          : ``
        }

          ${specName
          ? `
            <div class="character-detail-item">
              <span class="detail-label">Species:</span>
              <span class="detail-value">${specLink || "Unknown"}</span>
            </div>`
          : ``
        }
        </div>
      </div>
    `;
    })
    .join("");

  return layout({
    title: `${film.title} - Studio Ghibli`,
    description: `${film.title} (${film.release_date})${film.director ? ` by ${film.director}` : ""
      }`,
    depth,
    headerVariant: "detail",
    decorations: false,
    body: `
    <article class="film-detail">
      ${poster
        ? `
        <div class="detail-hero">
          <img class="detail-banner" src="${asset(
          poster,
          depth
        )}" alt="${htmlEscape(film.title)}" loading="lazy" decoding="async">
        </div>`
        : ``
      }

      <div class="detail-header">
        <h2>${htmlEscape(film.title)}</h2>
        ${film.original_title
        ? `
          <div class="detail-original-title">
            ${htmlEscape(film.original_title)}${film.original_title_romanised
          ? ` (${htmlEscape(film.original_title_romanised)})`
          : ``
        }
          </div>`
        : ``
      }

        <div class="info-grid">
          ${film.release_date
        ? `
            <div class="info-box">
              <div class="info-box-label">Release Year</div>
              <div class="info-box-value">${htmlEscape(
          film.release_date
        )}</div>
            </div>`
        : ``
      }
          ${film.director
        ? `
            <div class="info-box">
              <div class="info-box-label">Director</div>
              <div class="info-box-value">${htmlEscape(
          film.director
        )}</div>
            </div>`
        : ``
      }
          ${film.producer
        ? `
            <div class="info-box">
              <div class="info-box-label">Producer</div>
              <div class="info-box-value">${htmlEscape(
          film.producer
        )}</div>
            </div>`
        : ``
      }
          ${film.running_time
        ? `
            <div class="info-box">
              <div class="info-box-label">Running Time</div>
              <div class="info-box-value">${htmlEscape(
          film.running_time
        )} mins</div>
            </div>`
        : ``
      }
          ${film.rt_score
        ? `
            <div class="info-box">
              <div class="info-box-label">RT Score</div>
              <div class="info-box-value">⭐ ${htmlEscape(
          String(film.rt_score)
        )}%</div>
            </div>`
        : ``
      }
        </div>

        ${film.description
        ? `
          <div class="detail-description">
            ${htmlEscape(film.description)}
          </div>`
        : ``
      }
      </div>

      <section class="characters-section">
        <h3 class="section-title">Characters (${chars.length})</h3>
        <div class="characters-grid">
          ${chars.length
        ? characterCards
        : `<p style="text-align:center; grid-column:1/-1; color: var(--text-dark);">No character information available for this film.</p>`
      }
        </div>
      </section>

      <section class="additional-section">
        <h3 class="section-title">Additional Information</h3>

        <div class="info-section">
          <h4>Locations (${locationTags ? locationIds.length : 0})</h4>
          <div class="info-list">${locationTags || `<div class="info-tag">None</div>`
      }</div>
        </div>

        <div class="info-section">
          <h4>Species (${speciesTags ? speciesIds.length : 0})</h4>
          <div class="info-list">${speciesTags || `<div class="info-tag">None</div>`
      }</div>
        </div>

        <div class="info-section">
          <h4>Vehicles (${vehicleTags ? vehicleIds.length : 0})</h4>
          <div class="info-list">${vehicleTags || `<div class="info-tag">None</div>`
      }</div>
        </div>
      </section>
    </article>
  `,
  });
};

// -----------------------------------------------------------------------------
// SPECIES DETAIL PAGE
// -----------------------------------------------------------------------------
const SpeciesPage = (sp, chars = []) => {
  const depth = 2;

  // Films that feature this species
  const filmsForSpecies = (() => {
    // Prefer the explicit films list on the species object
    if (Array.isArray(sp.films) && sp.films.length) {
      const ids = sp.films.map(idFrom).filter(Boolean); // from "data/films/..." to bare ids
      return films.filter((f) => ids.includes(f.id));
    }

    // Fallback: scan films' species arrays (for data shapes that only link that way)
    return films.filter((f) => {
      if (!Array.isArray(f.species)) return false;
      const ids = f.species.map(idFrom).filter(Boolean);
      return ids.includes(sp.id);
    });
  })();

  // Character cards (same visual style as film details, but WITHOUT species row)
  const characterCards = chars
    .map((p) => {
      const hasEye =
        p.eye_color !== undefined &&
        p.eye_color !== null &&
        String(p.eye_color).trim() !== "";
      const hasHair =
        p.hair_color !== undefined &&
        p.hair_color !== null &&
        String(p.hair_color).trim() !== "";

      return `
        <div class="character-card">
          <div class="character-avatar ${avatarClass(p.gender)}">
            ${initials(p.name)}
          </div>
          <h4>${htmlEscape(p.name)}</h4>
          <div class="character-details">
            ${p.gender ? `
              <div class="character-detail-item">
                <span class="detail-label">Gender:</span>
                <span class="detail-value">${htmlEscape(cap(p.gender))}</span>
              </div>` : ``}
            ${p.age ? `
              <div class="character-detail-item">
                <span class="detail-label">Age:</span>
                <span class="detail-value">${htmlEscape(p.age)}</span>
              </div>` : ``}
            ${hasEye ? `
              <div class="character-detail-item">
                <span class="detail-label">Eye Color:</span>
                <span class="detail-value">${htmlEscape(cap(p.eye_color))}</span>
              </div>` : ``}
            ${hasHair ? `
              <div class="character-detail-item">
                <span class="detail-label">Hair Color:</span>
                <span class="detail-value">${htmlEscape(cap(p.hair_color))}</span>
              </div>` : ``}
          </div>
        </div>
      `;
    })
    .join("");

  // Film chips
  const filmChips = filmsForSpecies
    .map(
      (f) => `
        <a href="${prefixForDepth(depth)}film/${f.id}/"
           class="info-tag"
           style="text-decoration:none; cursor:pointer;">
          ${htmlEscape(f.title)}
        </a>
      `
    )
    .join("");

  return layout({
    title: `${sp.name} - Species`,
    description: `Characters and films for the ${sp.name} species from Studio Ghibli films.`,
    depth,
    headerVariant: "species",
    decorations: false,
    body: `
      <section class="species-detail">
        <div class="species-hero ${heroClassForClassification(sp.classification)}">
          <div class="species-hero-content">
            <h2 class="species-hero-title">${htmlEscape(sp.name)}</h2>
            <p class="species-hero-subtitle">
              ${htmlEscape(sp.classification || "Unknown Classification")}
            </p>
          </div>
        </div>

        <div class="detail-header">
          <h2>${htmlEscape(sp.name)}</h2>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-box-label">Classification</div>
              <div class="info-box-value">${htmlEscape(sp.classification || "Unknown")}</div>
            </div>
            <div class="info-box">
              <div class="info-box-label">Eye Colors</div>
              <div class="info-box-value">${htmlEscape(sp.eye_colors || "Unknown")}</div>
            </div>
            <div class="info-box">
              <div class="info-box-label">Hair Colors</div>
              <div class="info-box-value">${htmlEscape(sp.hair_colors || "Unknown")}</div>
            </div>
          </div>
        </div>

        <section class="characters-section">
          <h3 class="section-title">
            Characters of this Species (${chars.length})
          </h3>
          <div class="characters-grid">
            ${chars.length
        ? characterCards
        : `<p style="text-align:center; grid-column:1/-1; color: var(--text-dark);">
                     No character information available.
                   </p>`
      }
          </div>
        </section>

        <section class="additional-section">
          <h3 class="section-title">Films Featuring this Species</h3>
          <div class="info-list">
            ${filmsForSpecies.length
        ? filmChips
        : `<div class="info-tag">None</div>`
      }
          </div>
        </section>
      </section>
    `
  });
};

// -----------------------------------------------------------------------------
// BUILD
// -----------------------------------------------------------------------------
async function build() {
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.ensureDir(DIST);
  await fs.copy(PUBLIC, DIST);

  const filmList = [...films].sort(
    (a, b) => Number(a.release_date) - Number(b.release_date)
  );
  await writeHtml(path.join(DIST, "index.html"), HomePage(filmList));

  for (const film of films) {
    const dir = path.join(DIST, "film", film.id);
    await fs.ensureDir(dir);
    await writeHtml(path.join(dir, "index.html"), FilmPage(film));
  }

  for (const sp of species) {
    const chars = (peopleBySpecies[sp.id] || []).sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
    const dir = path.join(DIST, "species", sp.id);
    await fs.ensureDir(dir);
    await writeHtml(path.join(dir, "index.html"), SpeciesPage(sp, chars));
  }

  console.log("Build complete, dist/");
}

async function writeHtml(file, html) {
  const min = await minifyHtml(html);
  await fs.writeFile(file, min, "utf8");
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
