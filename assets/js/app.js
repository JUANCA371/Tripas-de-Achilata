const allowedTags = new Set([
  "a", "audio", "b", "blockquote", "br", "caption", "code", "div", "em",
  "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
  "i", "iframe", "img", "li", "ol", "p", "picture", "pre", "source",
  "span", "strong", "table", "tbody", "td", "tfoot", "th", "thead",
  "tr", "u", "ul", "video"
]);
const removedTags = new Set(["script", "style", "object", "embed", "form", "input", "button"]);
const blockTags = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BR", "DD", "DIV", "DL",
  "DT", "FIGCAPTION", "FIGURE", "FOOTER", "H1", "H2", "H3", "H4", "H5",
  "H6", "HEADER", "HR", "LI", "MAIN", "OL", "P", "PRE", "SECTION", "UL"
]);
const gamesAlbumPostId = "tag:blogger.com,1999:blog-8284143732508605077.post-2255759889102110623";
const ebookPdfUrl = "https://drive.google.com/file/d/1LlUjrUUYZ3zBI6d5K4ygfcWfkV0gcaEs/view?usp=sharing";
const postSearch = document.querySelector("#post-search");
const searchStatus = document.querySelector("#search-status");
const searchClear = document.querySelector("#search-clear");
const archiveYears = document.querySelector("#archive-years");
const yearFilters = document.querySelector("#year-filters");
const featuredPosts = document.querySelector("#featured-posts");
const originSection = document.querySelector('[data-year-section="2018"]');
const archiveSummary = document.querySelector("#archive-summary");
const allCount = document.querySelector("#all-count");
const themeToggle = document.querySelector("#theme-toggle");
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

function highResolutionImageUrl(value, size = "s1600") {
  const safeImageUrl = safeUrl(value);
  if (!safeImageUrl) return "";

  const url = new URL(safeImageUrl);
  const sizePattern = /\/(?:s\d+(?:-[a-z]+)?|w\d+-h\d+(?:-[a-z-]+)?)\//i;
  const sizeSuffixPattern = /=(?:s\d+(?:-[a-z]+)?|w\d+(?:-h\d+)?(?:-[a-z-]+)?)$/i;
  if (sizePattern.test(url.pathname)) {
    url.pathname = url.pathname.replace(sizePattern, `/${size}/`);
  } else if (/\/img\/a\//i.test(url.pathname)) {
    url.pathname = sizeSuffixPattern.test(url.pathname)
      ? url.pathname.replace(sizeSuffixPattern, `=${size}`)
      : `${url.pathname}=${size}`;
  }
  return url.href;
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
    const src = highResolutionImageUrl(node.getAttribute("src") || node.getAttribute("data-src"), "s640");
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
    element.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
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

function getPostImageUrl(post, size = "s1600") {
  if (!post.content) return "";
  const fragment = new DOMParser().parseFromString(post.content, "text/html");
  const sourceImage = fragment.querySelector("img[src], img[data-src]");
  return sourceImage
    ? highResolutionImageUrl(sourceImage.getAttribute("src") || sourceImage.getAttribute("data-src"), size)
    : "";
}

function getPostTitle(post) {
  return post.id === gamesAlbumPostId
    ? post.title.replace("PANCHQUEROS", "PANCHUQUEROS")
    : post.title;
}

function getReadableText(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const text = [...node.childNodes].map(getReadableText).join("");
  return blockTags.has(node.tagName) ? ` ${text} ` : text;
}

function groupConsecutiveImages(container) {
  [...container.children].forEach((child) => groupConsecutiveImages(child));

  const hasMedia = (node) => node.nodeType === Node.ELEMENT_NODE
    && (node.matches("img, video") || node.querySelector("img, video"));
  const isEmptySeparator = (node) => node.nodeType === Node.TEXT_NODE
    ? !node.textContent.trim()
    : node.nodeType === Node.ELEMENT_NODE && !node.textContent.trim() && !hasMedia(node);
  let run = [];
  const flushRun = () => {
    const images = run.filter(hasMedia);
    if (images.length > 1) {
      const gallery = document.createElement("div");
      gallery.className = "post-gallery";
      container.insertBefore(gallery, run[0]);
      run.forEach((node) => {
        if (images.includes(node)) gallery.append(node);
        else node.remove();
      });
    }
    run = [];
  };

  [...container.childNodes].forEach((node) => {
    const isElement = node.nodeType === Node.ELEMENT_NODE;
    const containsGallery = isElement && node.querySelector(".post-gallery");
    const containsMedia = hasMedia(node);
    const hasText = !isEmptySeparator(node) && node.textContent.trim().length > 0;
    if (containsGallery) {
      flushRun();
    } else if (containsMedia && !hasText) {
      run.push(node);
    } else if (run.length && isEmptySeparator(node)) {
      run.push(node);
    } else {
      flushRun();
    }
  });
  flushRun();
}

function makePostCard(post) {
  const article = document.createElement("article");
  article.className = "post-card";
  article.dataset.year = post.published.slice(0, 4);
  article.dataset.postId = post.id;
  article.dataset.searchText = `${getPostTitle(post)} ${post.content}`.toLocaleLowerCase("es");
  const fragment = new DOMParser().parseFromString(post.content, "text/html");
  const imageUrl = getPostImageUrl(post, "s800");
  if (imageUrl) {
    const imageContainer = document.createElement("div");
    imageContainer.className = "post-image";
    imageContainer.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => imageContainer.remove(), { once: true });
    imageContainer.append(image);
    article.append(imageContainer);
  }

  const heading = document.createElement("h4");
  heading.className = "post-title";
  const titleLink = document.createElement("a");
  titleLink.href = safeUrl(post.url);
  titleLink.target = "_blank";
  titleLink.rel = "noopener noreferrer";
  titleLink.textContent = getPostTitle(post);
  heading.append(titleLink);

  const date = document.createElement("p");
  date.className = "post-date";
  const time = document.createElement("time");
  time.dateTime = post.published;
  time.textContent = formatDate(post.published);
  date.append(time);

  const content = document.createElement("div");
  content.className = "post-content";
  const isEbook = post.title.toLocaleUpperCase("es").includes("CONTAGIANDO PALABRAS")
    && post.title.toLocaleUpperCase("es").includes("EBOOK");
  if (isEbook) fragment.querySelectorAll('iframe, a[href*="drive.google.com"]').forEach((embed) => embed.remove());
  if (post.id === gamesAlbumPostId) {
    const oracleHeading = [...fragment.body.querySelectorAll("div")]
      .find((element) => element.textContent.trim() === "EL ORÁCULO LITERARIO EN LA ESCUELA");
    oracleHeading?.after(fragment.createElement("br"));
  }
  fragment.body.childNodes.forEach((child) => content.append(copySafeContent(child)));
  groupConsecutiveImages(content);

  article.append(heading, date);
  if (isEbook) {
    const ebookLink = document.createElement("a");
    ebookLink.className = "ebook-link";
    ebookLink.href = safeUrl(ebookPdfUrl);
    ebookLink.target = "_blank";
    ebookLink.rel = "noopener noreferrer";
    ebookLink.textContent = "Abrir el ebook en PDF";
    article.append(ebookLink);
  }
  if (content.textContent.trim() || content.querySelector("img, iframe, audio, video")) {
    const reading = document.createElement("details");
    reading.className = "post-reading";
    const summary = document.createElement("summary");
    summary.textContent = "Leer publicación";
    reading.append(summary);
    reading.append(content);
    reading.addEventListener("toggle", () => {
      article.classList.toggle("is-expanded", reading.open);
    });
    article.append(reading);
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

function makeFeaturedCard(post) {
  const article = document.createElement("article");
  article.className = "featured-card";

  const image = document.createElement("img");
  const imageUrl = getPostImageUrl(post, "s800");
  image.src = imageUrl;
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => image.closest(".featured-image").remove(), { once: true });

  const imageContainer = document.createElement("div");
  imageContainer.className = "featured-image";
  imageContainer.append(image);

  const copy = document.createElement("div");
  copy.className = "featured-copy";
  const label = document.createElement("p");
  label.className = "featured-label";
  label.textContent = `Proyecto · ${post.published.slice(0, 4)}`;
  const title = document.createElement("h3");
  title.textContent = getPostTitle(post);
  const description = document.createElement("p");
  description.className = "featured-description";
  const fragment = new DOMParser().parseFromString(post.content, "text/html");
  const text = getReadableText(fragment.body).replace(/\s+/g, " ").trim();
  description.textContent = post.id === gamesAlbumPostId
    ? "Un álbum de los Juegos Achilateros 2019, con juegos, música y momentos compartidos."
    : text.length > 132 ? `${text.slice(0, 129).trimEnd()}…` : text;
  const link = document.createElement("a");
  link.className = "featured-link";
  link.href = "#archivo";
  link.dataset.openPost = post.id;
  link.textContent = "Leer la historia";
  link.setAttribute("aria-label", `Leer ${getPostTitle(post)}`);

  copy.append(label, title, description, link);
  article.append(imageContainer, copy);
  return article;
}

function renderFeatured(posts) {
  const featured = [];
  const years = [...new Set(posts.map((post) => post.published.slice(0, 4)))]
    .sort((first, second) => Number(second) - Number(first));

  for (const year of years) {
    const post = posts
      .filter((entry) => entry.published.startsWith(year) && getPostImageUrl(entry))
      .sort((first, second) => second.published.localeCompare(first.published))[0];
    if (post) featured.push(post);
    if (featured.length === 3) break;
  }

  featured.forEach((post) => featuredPosts.append(makeFeaturedCard(post)));
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
    const title = document.createElement("h3");
    title.textContent = year;
    const count = document.createElement("span");
    count.className = "year-count";
    count.textContent = `${groups.get(year).length} entradas`;
    heading.append(title, count);
    const list = document.createElement("div");
    list.className = "post-list";
    const yearPosts = groups.get(year).sort((a, b) => b.published.localeCompare(a.published));
    yearPosts.forEach((post) => list.append(makePostCard(post)));
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
  const entryTotal = document.querySelector("[data-entry-total]");
  if (entryTotal) entryTotal.textContent = posts.length.toString();
  archiveSummary.textContent = `${posts.length} publicaciones · ${years.length} años`;
  renderFeatured(posts);
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
  searchClear.hidden = !query;
  searchStatus.textContent = query && visible === 0
    ? "No hay publicaciones que coincidan con la búsqueda."
    : query ? `${visible} publicaciones encontradas.`
      : activeYear !== "all" ? `${visible} publicaciones de ${activeYear}.` : "";
  document.querySelectorAll(".archive-filter").forEach((button) => {
    const isActive = button.dataset.yearFilter === activeYear;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateTheme() {
  const isDark = document.documentElement.dataset.theme === "dark";
  themeToggle.textContent = isDark ? "Modo claro" : "Modo oscuro";
  themeToggle.setAttribute("aria-label", isDark ? "Activar modo claro" : "Activar modo oscuro");
}

function initializeHeroCarousel() {
  const carousel = document.querySelector("[data-hero-carousel]");
  const slides = [...carousel.querySelectorAll("[data-hero-slide]")];
  const buttons = [...carousel.querySelectorAll("[data-hero-slide-button]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = 0;
  let timerId = 0;

  const showSlide = (index) => {
    activeIndex = index;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
      buttons[slideIndex].classList.toggle("is-active", isActive);
      buttons[slideIndex].setAttribute("aria-pressed", String(isActive));
    });
  };

  const stopRotation = () => {
    window.clearInterval(timerId);
    timerId = 0;
  };

  const startRotation = () => {
    if (reducedMotion.matches || document.hidden || timerId || carousel.matches(":hover, :focus-within")) return;
    timerId = window.setInterval(() => showSlide((activeIndex + 1) % slides.length), 6500);
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      showSlide(Number(button.dataset.heroSlideButton));
      stopRotation();
      startRotation();
    });
  });
  carousel.addEventListener("mouseenter", stopRotation);
  carousel.addEventListener("mouseleave", startRotation);
  carousel.addEventListener("focusin", stopRotation);
  carousel.addEventListener("focusout", (event) => {
    if (!carousel.contains(event.relatedTarget)) startRotation();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopRotation();
    else startRotation();
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) stopRotation();
    else startRotation();
  });
  startRotation();
}

document.addEventListener("click", (event) => {
  const featuredLink = event.target.closest("[data-open-post]");
  if (featuredLink) {
    const post = postCards.find((card) => card.dataset.postId === featuredLink.dataset.openPost);
    if (!post) return;
    activeYear = post.dataset.year;
    postSearch.value = "";
    updateFilters();
    post.querySelector(".post-reading")?.setAttribute("open", "");
    window.requestAnimationFrame(() => post.scrollIntoView({ behavior: "smooth", block: "start" }));
    return;
  }

  const button = event.target.closest("[data-year-filter]");
  if (!button) return;
  activeYear = button.dataset.yearFilter;
  updateFilters();
});
postSearch.addEventListener("input", updateFilters);
searchClear.addEventListener("click", () => {
  postSearch.value = "";
  updateFilters();
  postSearch.focus();
});
themeToggle.addEventListener("click", () => {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  updateTheme();
});

updateTheme();
initializeHeroCarousel();

fetch("assets/data/posts.json")
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
