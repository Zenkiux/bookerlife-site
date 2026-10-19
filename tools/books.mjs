// Dev-time helper, not a build step: writes the shelf markup into the HTML
// between <!--shelf:NAME keys...--> and <!--/shelf--> markers, so the shelves
// work without JavaScript. Run: node tools/books.mjs
// Books, metadata and spine colours come from the app's sample library
// (app/lib/features/debug/sample_library.dart); heights are estimates in cm.
import { readFile, writeFile } from "node:fs/promises";

export const BOOKS = {
  hailmary: ["Project Hail Mary", "Andy Weir", 476, 2021, "Ballantine Books", "Science fiction", "#433D27", 24.1, 265, 400],
  piranesi: ["Piranesi", "Susanna Clarke", 272, 2020, "Bloomsbury Publishing", "Fantasy", "#201917", 21.6, 353, 500],
  tomorrow: ["Tomorrow, and Tomorrow, and Tomorrow", "Gabrielle Zevin", 401, 2022, "Knopf", "Literary fiction", "#979D8E", 24.3, 329, 500],
  babel: ["Babel", "R. F. Kuang", 545, 2022, "Harper Voyager", "Fantasy", "#3C3B3A", 23.5, 329, 500],
  klara: ["Klara and the Sun", "Kazuo Ishiguro", 303, 2021, "Knopf", "Literary fiction", "#E4574A", 24.1, 296, 450],
  copperhead: ["Demon Copperhead", "Barbara Kingsolver", 548, 2022, "Harper", "Literary fiction", "#BCB5A9", 24.1, 331, 500],
  chemistry: ["Lessons in Chemistry", "Bonnie Garmus", 390, 2022, "Doubleday", "Literary fiction", "#CF655A", 24.1, 328, 500],
  circe: ["Circe", "Madeline Miller", 393, 2018, "Little, Brown and Company", "Fantasy", "#7A5520", 21, 315, 475],
  achilles: ["The Song of Achilles", "Madeline Miller", 378, 2011, "Ecco", "Fantasy", "#4F8A9A", 20.3, 331, 500],
  midnight: ["The Midnight Library", "Matt Haig", 288, 2020, "Viking", "Literary fiction", "#2C3642", 21.6, 331, 500],
  educated: ["Educated", "Tara Westover", 334, 2018, "Random House", "Nonfiction", "#E9E2D6", 24.1, 329, 500],
  dune: ["Dune", "Frank Herbert", 535, 1965, "Ace Books", "Science fiction", "#C4673F", 17.5, 265, 475],
  evelyn: ["The Seven Husbands of Evelyn Hugo", "Taylor Jenkins Reid", 400, 2017, "Washington Square Press", "Literary fiction", "#2F5A3A", 21, 321, 500],
  normal: ["Normal People", "Sally Rooney", 288, 2018, "Hogarth", "Literary fiction", "#2F4B44", 21.6, 325, 500],
  remains: ["The Remains of the Day", "Kazuo Ishiguro", 245, 1989, "Vintage International", "Literary fiction", "#291B13", 20.3, 332, 500],
  habits: ["Atomic Habits", "James Clear", 320, 2018, "Avery", "Nonfiction", "#EAE2D1", 23.5, 331, 500],
  crawdads: ["Where the Crawdads Sing", "Delia Owens", 384, 2018, "G. P. Putnam’s Sons", "Literary fiction", "#BF8D76", 24.1, 332, 500],
  sapiens: ["Sapiens", "Yuval Noah Harari", 443, 2011, "Harper", "Nonfiction", "#F1ECE6", 23.4, 316, 499],
  kahneman: ["Thinking, Fast and Slow", "Daniel Kahneman", 499, 2011, "Farrar, Straus and Giroux", "Nonfiction", "#F2F0EA", 20.8, 334, 499],
  pride: ["Pride and Prejudice", "Jane Austen", 435, 1813, "Penguin Books", "Classics", "#534436", 19.8, 320, 500],
  body: ["The Body Keeps the Score", "Bessel van der Kolk", 464, 2014, "Penguin Books", "Nonfiction", "#5282B4", 21.3, 325, 500],
  fourth: ["Fourth Wing", "Rebecca Yarros", 517, 2023, "Entangled Publishing", "Fantasy", "#1D1B18", 23.5, 329, 500],
};

const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// mode "static": a plain figure. mode "pick": a button that opens the book's details.
function book(k, mode, eager) {
  const [t, a, p, y, pub, sub, c, h, w, ih] = BOOKS[k];
  const img = `<img src="assets/covers/${k}.jpg" alt="${mode === "pick" ? "" : esc(`${t} by ${a}`)}" width="${w}" height="${ih}"${eager ? "" : ' loading="lazy"'} decoding="async">`;
  const data = `data-k="${k}" data-title="${esc(t)}" data-author="${esc(a)}" data-pages="${p}" data-year="${y}" data-publisher="${esc(pub)}" data-subject="${esc(sub)}" data-color="${c}" data-h="${h}" style="--h:${h}"`;
  return mode === "pick"
    ? `<li class="book" ${data}><button type="button" class="book-btn" aria-label="${esc(`${t} by ${a}`)}" aria-pressed="false">${img}</button></li>`
    : `<li class="book" ${data}>${img}</li>`;
}

const files = process.argv.slice(2).length ? process.argv.slice(2) : ["index.html"];
for (const f of files) {
  let html = await readFile(f, "utf8");
  html = html.replace(/(<!--shelf:(\S+) (static|pick)( eager)? ([a-z ]+)-->)[\s\S]*?(<!--\/shelf-->)/g,
    (_, open, _name, mode, eager, keys, close) => `${open}\n${keys.trim().split(/\s+/).map(k => book(k, mode, !!eager)).join("\n")}\n${close}`);
  await writeFile(f, html);
  console.log("shelves written:", f);
}
