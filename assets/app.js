const allowedTags = new Set([
  "a", "audio", "b", "blockquote", "br", "caption", "code", "div", "em",
  "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
  "i", "iframe", "img", "li", "ol", "p", "picture", "pre", "source",
  "span", "strong", "table", "tbody", "td", "tfoot", "th", "thead",
  "tr", "u", "ul", "video"
]);
const removedTags = new Set(["script", "style", "object", "embed", "form", "input", "button"]);
const postSearch = document.querySelector("#post-search");
const searchStatus = document.querySelector("#search-status");
const archiveYears = document.querySelector("#archive-years");
const yearFilters = document.querySelector("#year-filters");
const originSection = document.querySelector('[data-year-section="2018"]');
const archiveSummary = document.querySelector("#archive-summary");
const allCount = document.querySelector("#all-count");
let activeYear = "all";
let postCards = [];

function safeUrl(value, base = window.location.href) {
  try {
    const url = new URL(value, base);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function copySafeContent(node) {
  if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
  if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();

  const tag = node.tagName.toLowerCase();
  if (removedTags.has(tag)) return document.createDocumentFragment();

  if (!allowedTags.has(tag)) {
    const children = document.createDocumentFragment();
    node.childNodes.forEach((child) => children.append(copySafeContent(child)));
    return children;
  }

  const element = document.createElement(tag);
  if (tag === "a") {
    const href = safeUrl(node.getAttribute("href"));
    if (href) {
      element.href = href;
      element.target = "_blank";
      element.rel = "noopener noreferrer";
    }
    if (node.title) element.title = node.title;
  } else if (tag === "img") {
    const src = safeUrl(node.getAttribute("src") || node.getAttribute("data-src"));
    if (src) element.src = src;
    element.alt = node.getAttribute("alt") || "";
    element.loading = "lazy";
    element.decoding = "async";
    for (const dimension of ["width", "height"]) {
      const value = node.getAttribute(dimension);
      if (value && /^\d{1,4}$/.test(value)) element.setAttribute(dimension, value);
    }
  } else if (tag === "iframe") {
    const src = safeUrl(node.getAttribute("src"));
    if (src) element.src = src;
    element.title = node.getAttribute("title") || "Contenido multimedia de esta entrada";
    element.loading = "lazy";
    element.allowFullscreen = true;
    element.referrerPolicy = "strict-origin-when-cross-origin";
    element.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  } else if (["audio", "video", "source"].includes(tag)) {
    const src = safeUrl(node.getAttribute("src"));
    if (src) element.src = src;
    if (tag !== "source") {
      element.controls = true;
      element.preload = "none";
    }
    const type = node.getAttribute("type");
    if (type && /^[\w.+/-]+$/.test(type)) element.type = type;
  }

  node.childNodes.forEach((child) => element.append(copySafeContent(child)));
  return element;
}

function formatDate(value) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, day, 12));
}

function makePostCard(post) {
  const article = document.createElement("article");
  article.className = "post-card";
  article.dataset.year = post.published.slice(0, 4);
  article.dataset.searchText = `${post.title} ${post.content}`.toLocaleLowerCase("es");

  const heading = document.createElement("h3");
  heading.className = "post-title";
  const titleLink = document.createElement("a");
  titleLink.href = safeUrl(post.url);
  titleLink.target = "_blank";
  titleLink.rel = "noopener noreferrer";
  titleLink.textContent = post.title;
  heading.append(titleLink);

  const date = document.createElement("p");
  date.className = "post-date";
  const time = document.createElement("time");
  time.dateTime = post.published;
  time.textContent = formatDate(post.published);
  date.append(time);

  const content = document.createElement("div");
  content.className = "post-content";
  const fragment = new DOMParser().parseFromString(post.content, "text/html");
  fragment.body.childNodes.forEach((child) => content.append(copySafeContent(child)));

  article.append(heading, date);
  if (content.textContent.trim() || content.querySelector("img, iframe, audio, video")) {
    article.append(content);
  } else {
    const note = document.createElement("p");
    note.className = "archive-note";
    note.textContent = "Esta entrada figura en el archivo original, pero no conserva contenido publicado.";
    article.append(note);
  }

  const originalLink = document.createElement("a");
  originalLink.className = "original-link";
  originalLink.href = safeUrl(post.url);
  originalLink.target = "_blank";
  originalLink.rel = "noopener noreferrer";
  originalLink.textContent = "Ver entrada en el blog original";
  article.append(originalLink);
  return article;
}

function renderArchive(posts) {
  const groups = new Map();
  posts.forEach((post) => {
    const year = post.published.slice(0, 4);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(post);
  });
  const years = [...groups.keys()].sort((a, b) => Number(b) - Number(a));
  const originPosts = groups.get("2018") || [];
  originPosts.sort((a, b) => a.published.localeCompare(b.published));
  originSection.querySelector('[data-year-count="2018"]').textContent = `${originPosts.length} entradas`;
  originPosts.forEach((post) => originSection.querySelector('[data-post-list="2018"]').append(makePostCard(post)));

  const laterYears = years.filter((year) => year !== "2018");
  for (const year of laterYears) {
    const section = document.createElement("section");
    section.className = "year-section";
    section.dataset.yearSection = year;
    const heading = document.createElement("div");
    heading.className = "year-heading";
    const title = document.createElement("h2");
    title.textContent = year;
    const count = document.createElement("span");
    count.className = "year-count";
    count.textContent = `${groups.get(year).length} entradas`;
    heading.append(title, count);
    const list = document.createElement("div");
    list.className = "post-list";
    groups.get(year).sort((a, b) => b.published.localeCompare(a.published))
      .forEach((post) => list.append(makePostCard(post)));
    section.append(heading, list);
    archiveYears.append(section);
  }

  for (const year of years) {
    const button = document.createElement("button");
    button.className = "archive-filter";
    button.type = "button";
    button.dataset.yearFilter = year;
    button.setAttribute("aria-pressed", "false");
    button.textContent = `${year} (${groups.get(year).length})`;
    yearFilters.append(button);
  }

  postCards = [...document.querySelectorAll(".post-card")];
  allCount.textContent = `(${posts.length})`;
  archiveSummary.textContent = `${posts.length} entradas · ${years.length} años`;
}

function updateFilters() {
  const query = postSearch.value.trim().toLocaleLowerCase("es");
  let visible = 0;
  postCards.forEach((card) => {
    const matchesYear = activeYear === "all" || card.dataset.year === activeYear;
    const matchesText = !query || card.dataset.searchText.includes(query);
    card.hidden = !(matchesYear && matchesText);
    if (!card.hidden) visible += 1;
  });
  searchStatus.textContent = query && visible === 0
    ? "No hay entradas que coincidan con la búsqueda."
    : query ? `${visible} entradas encontradas.` : "";
  document.querySelectorAll(".archive-filter").forEach((button) => {
    const isActive = button.dataset.yearFilter === activeYear;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-year-filter]");
  if (!button) return;
  activeYear = button.dataset.yearFilter;
  updateFilters();
});
postSearch.addEventListener("input", updateFilters);

fetch("assets/posts.json")
  .then((response) => {
    if (!response.ok) throw new Error(`No se pudo cargar el archivo (${response.status}).`);
    return response.json();
  })
  .then((posts) => {
    if (!Array.isArray(posts) || posts.length === 0) throw new Error("El archivo no contiene entradas.");
    renderArchive(posts);
    updateFilters();
  })
  .catch((error) => {
    console.error(error);
    document.querySelector("#load-error").hidden = false;
    archiveSummary.textContent = "Archivo no disponible";
  });
