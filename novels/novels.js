const novelList = document.querySelector("#novel-list");
const latestNovel = document.querySelector("#latest-novel");
const lastNovel = document.querySelector("#last-novel");

let novels = [];
let readerState = {
  novel: null,
  chapter: null,
  settings: {
    font: "Noto Sans TC",
    size: 1.08,
    theme: "site"
  }
};

const READER_FONTS = {
  "Noto Sans TC": '"Noto Sans TC", sans-serif',
  "思源宋體": '"Noto Serif TC", serif',
  "等寬字體": '"Share Tech Mono", monospace'
};

const BUILTIN_READER_THEMES = {
  site: {},
  paper: {
    "--reader-bg": "#fffdf7",
    "--reader-text": "#292722",
    "--reader-muted": "#706b61",
    "--reader-accent": "#8a5a44",
    "--reader-border": "#d8d0c1"
  },
  night: {
    "--reader-bg": "#101419",
    "--reader-text": "#e5edf3",
    "--reader-muted": "#93a6b5",
    "--reader-accent": "#7eb6d8",
    "--reader-border": "#293744"
  }
};

function normalizePath() {
  return decodeURIComponent(location.pathname)
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
}

function getNovelByPath() {
  const parts = normalizePath();
  if (parts.length < 2 || parts[0] !== "novels") return null;
  const novelName = parts[1];
  return novels.find((novel) => novel.title === novelName || novel.id === novelName) || null;
}

function getChapterNumber() {
  const parts = normalizePath();
  if (parts.length < 3 || parts[0] !== "novels") return null;
  const chapter = Number(parts[2]);
  return Number.isInteger(chapter) && chapter > 0 ? chapter : null;
}

function novelUrl(novel) {
  return `/novels/${encodeURIComponent(novel.title)}/`;
}

function chapterUrl(novel, chapter) {
  return `/novels/${encodeURIComponent(novel.title)}/${chapter}/`;
}

function getStatusText(status) {
  switch (status) {
    case "ongoing": return "連載中";
    case "completed": return "已完結";
    case "paused": return "暫停連載";
    default: return "作品";
  }
}

function getSavedProgress(novel) {
  try {
    const saved = JSON.parse(localStorage.getItem("novelProgress") || "{}");
    return saved[novel.id || novel.title] || null;
  } catch {
    return null;
  }
}

function saveProgress(novel, chapter, scroll = 0) {
  const key = novel.id || novel.title;
  try {
    const saved = JSON.parse(localStorage.getItem("novelProgress") || "{}");
    saved[key] = {
      novel: key,
      chapter,
      scroll,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem("novelProgress", JSON.stringify(saved));
  } catch (error) {
    console.error("無法儲存閱讀進度：", error);
  }
}

function loadReaderSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("readerSettings") || "{}");
    readerState.settings = { ...readerState.settings, ...saved };
  } catch {}
}

function saveReaderSettings() {
  localStorage.setItem("readerSettings", JSON.stringify(readerState.settings));
}

function getCustomTheme() {
  try {
    return JSON.parse(localStorage.getItem("readerCustomTheme") || "null");
  } catch {
    return null;
  }
}

function saveCustomTheme(theme) {
  localStorage.setItem("readerCustomTheme", JSON.stringify(theme));
}

function getReaderThemeVars(themeName) {
  if (themeName === "custom") {
    return getCustomTheme() || BUILTIN_READER_THEMES.paper;
  }
  return BUILTIN_READER_THEMES[themeName] || {};
}

function applyReaderSettings() {
  const reader = document.querySelector(".reader");
  if (!reader) return;

  reader.style.setProperty("--reader-font", READER_FONTS[readerState.settings.font] || READER_FONTS["Noto Sans TC"]);
  reader.style.setProperty("--reader-size", `${Number(readerState.settings.size) || 1.08}rem`);

  Object.keys(BUILTIN_READER_THEMES.paper).forEach((key) => reader.style.removeProperty(key));

  Object.entries(getReaderThemeVars(readerState.settings.theme)).forEach(([key, value]) => {
    reader.style.setProperty(key, value);
  });

  const custom = getCustomTheme();
  const customOption = document.querySelector("#reader-theme-custom");
  if (customOption) customOption.hidden = !custom;
}

function openReaderSettings() {
  const modal = document.querySelector("#reader-settings");
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("reader-settings-open");
  document.querySelector("#reader-font").value = readerState.settings.font;
  document.querySelector("#reader-size").value = readerState.settings.size;
  document.querySelector("#reader-theme").value = readerState.settings.theme;
}

function closeReaderSettings() {
  const modal = document.querySelector("#reader-settings");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("reader-settings-open");
}

function bindReaderSettings() {
  document.querySelector("#reader-settings-open")?.addEventListener("click", openReaderSettings);
  document.querySelector("#reader-settings-close")?.addEventListener("click", closeReaderSettings);

  document.querySelector("#reader-font")?.addEventListener("change", (event) => {
    readerState.settings.font = event.target.value;
    saveReaderSettings();
    applyReaderSettings();
  });

  document.querySelector("#reader-size")?.addEventListener("input", (event) => {
    readerState.settings.size = Number(event.target.value);
    saveReaderSettings();
    applyReaderSettings();
  });

  document.querySelector("#reader-theme")?.addEventListener("change", (event) => {
    readerState.settings.theme = event.target.value;
    saveReaderSettings();
    applyReaderSettings();
  });

  document.querySelector("#custom-theme-form")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const theme = {
      "--reader-bg": document.querySelector("#custom-bg").value,
      "--reader-text": document.querySelector("#custom-text").value,
      "--reader-muted": document.querySelector("#custom-muted").value,
      "--reader-accent": document.querySelector("#custom-accent").value,
      "--reader-border": document.querySelector("#custom-border").value
    };

    saveCustomTheme(theme);
    readerState.settings.theme = "custom";
    saveReaderSettings();
    applyReaderSettings();
    document.querySelector("#reader-theme").value = "custom";
    closeReaderSettings();
  });

  document.querySelector("#reader-settings")?.addEventListener("click", (event) => {
    if (event.target.id === "reader-settings") closeReaderSettings();
  });
}

function readerSettingsMarkup() {
  const custom = getCustomTheme() || {
    "--reader-bg": "#fffdf7",
    "--reader-text": "#292722",
    "--reader-muted": "#706b61",
    "--reader-accent": "#8a5a44",
    "--reader-border": "#d8d0c1"
  };

  return `
    <div class="reader-settings-modal" id="reader-settings" hidden>
      <div class="reader-settings-panel" role="dialog" aria-modal="true" aria-labelledby="reader-settings-title">
        <div class="reader-settings-heading">
          <div>
            <p class="section-kicker">READER</p>
            <h2 id="reader-settings-title">閱讀器設定</h2>
          </div>
          <button class="reader-settings-close" id="reader-settings-close" type="button">×</button>
        </div>

        <label>字型
          <select id="reader-font">
            <option value="Noto Sans TC">思源黑體</option>
            <option value="思源宋體">思源宋體</option>
            <option value="等寬字體">等寬字體</option>
          </select>
        </label>

        <label>字級
          <input id="reader-size" type="range" min="0.95" max="1.25" step="0.01">
        </label>

        <label>閱讀主題
          <select id="reader-theme">
            <option value="site">跟隨網站</option>
            <option value="paper">紙張</option>
            <option value="night">夜讀</option>
            <option value="custom" id="reader-theme-custom">自訂主題</option>
          </select>
        </label>

        <form id="custom-theme-form" class="custom-theme-form">
          <h3>自訂主題</h3>
          <div class="color-grid">
            <label>背景 <input id="custom-bg" type="color" value="${custom["--reader-bg"]}"></label>
            <label>文字 <input id="custom-text" type="color" value="${custom["--reader-text"]}"></label>
            <label>次要文字 <input id="custom-muted" type="color" value="${custom["--reader-muted"]}"></label>
            <label>強調色 <input id="custom-accent" type="color" value="${custom["--reader-accent"]}"></label>
            <label>分隔線 <input id="custom-border" type="color" value="${custom["--reader-border"]}"></label>
          </div>
          <button class="btn" type="submit">套用自訂主題</button>
        </form>
      </div>
    </div>
  `;
}

async function loadNovels() {
  loadReaderSettings();
  try {
    const response = await fetch("/data/novels.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`無法取得小說資料：${response.status}`);
    novels = await response.json();
    renderCurrentPage();
  } catch (error) {
    console.error("小說資料載入失敗：", error);
    if (novelList) {
      novelList.innerHTML = `
        <div class="section-card"><h2>小說資料載入失敗</h2><p>請稍後重新整理頁面。</p></div>
      `;
    }
  }
}

function renderCurrentPage() {
  const novel = getNovelByPath();
  const chapter = getChapterNumber();
  if (novel && chapter) renderReader(novel, chapter);
  else if (novel) renderNovelDetail(novel);
  else renderNovelList();
}

function renderNovelList() {
  if (!novelList) return;
  document.title = "小說列表 | 光風濟月";
  renderLastNovel();
  renderLatestNovel();

  novelList.innerHTML = `
    <div class="section-card">
      <div class="section-heading"><p class="section-kicker">WORKS</p><h2>小說</h2><p>這裡收錄正在連載與已完成的故事。</p></div>
      <div class="novel-grid">${novels.map(createNovelCard).join("")}</div>
    </div>
  `;
}

function createNovelCard(novel) {
  const latest = novel.latestChapter || {};
  return `
    <article class="section-card novel-card">
      <div class="novel-cover">${novel.cover ? `<img src="${novel.cover}" alt="${novel.title} 封面" loading="lazy">` : ""}</div>
      <div class="novel-info">
        <p class="novel-status">${getStatusText(novel.status)}</p>
        <h2>${novel.title}</h2>
        <p class="novel-author">${novel.author || ""}</p>
        <p class="novel-description">${novel.description || ""}</p>
        <div class="novel-meta"><span>${novel.chapterCount || 0} 章</span><span>最新：第${latest.chapter || 0}章・${latest.title || ""}</span></div>
        <a class="btn novel-button" href="${novelUrl(novel)}">閱讀小說 →</a>
      </div>
    </article>
  `;
}

function renderLastNovel() {
  if (!lastNovel) return;
  const saved = novels.map((novel) => ({ novel, progress: getSavedProgress(novel) })).filter((item) => item.progress?.chapter).sort((a,b) => new Date(b.progress.updatedAt || 0) - new Date(a.progress.updatedAt || 0))[0];

  if (!saved) {
    lastNovel.innerHTML = `<div class="section-card"><h3>歡迎回來！</h3><p>還沒有閱讀紀錄。</p></div>`;
    return;
  }

  const { novel, progress } = saved;
  lastNovel.innerHTML = `
    <div class="section-card"><div class="novel-feature"><div><p class="section-kicker">CONTINUE READING</p><h3>${novel.title}</h3><p>上次讀到第 ${progress.chapter} 章</p></div><a class="btn" href="${chapterUrl(novel, progress.chapter)}">繼續閱讀 →</a></div></div>
  `;
}

function renderLatestNovel() {
  if (!latestNovel) return;

  if (!novels.length) {
    latestNovel.innerHTML = `<div class="section-card"><h3>最新上架！</h3><p>目前還沒有小說。</p></div>`;
    return;
  }

  const latest = [...novels].sort((a,b) => new Date(b.updateTime || 0) - new Date(a.updateTime || 0))[0];
  const chapter = latest.latestChapter || {};

  latestNovel.innerHTML = `
    <div class="section-card"><div class="novel-feature"><div><p class="section-kicker">LATEST UPDATE</p><h3>${latest.title}</h3><p>第 ${chapter.chapter || 0} 章・${chapter.title || ""}</p></div><a class="btn" href="${chapterUrl(latest, chapter.chapter || 1)}">前往最新章 →</a></div></div>
  `;
}

function renderNovelDetail(novel) {
  document.title = `${novel.title} | 光風濟月`;
  const progress = getSavedProgress(novel);

  document.querySelector(".main-content").innerHTML = `
    <div class="hero-section"><div class="section-card novel-detail-card">
      <div class="novel-detail-cover">${novel.cover ? `<img src="${novel.cover}" alt="${novel.title} 封面">` : ""}</div>
      <div class="novel-detail-info">
        <p class="novel-status">${getStatusText(novel.status)}</p><h1>${novel.title}</h1><p class="novel-author">${novel.author || ""}</p><p class="novel-description">${novel.description || ""}</p>
        <div class="novel-meta"><span>${novel.chapterCount || 0} 章</span><span>更新：${formatDate(novel.updateTime)}</span></div>
        <div class="novel-actions"><a class="btn" href="${chapterUrl(novel, progress?.chapter || 1)}">${progress?.chapter ? `繼續閱讀 第${progress.chapter}章 →` : "開始閱讀 →"}</a><a class="btn secondary-button" href="/novels/">返回小說列表</a></div>
      </div>
    </div></div>
    <div class="hero-section"><div class="section-card"><div class="section-heading"><p class="section-kicker">CHAPTERS</p><h2>章節</h2></div><div class="chapter-list">${createChapterList(novel)}</div></div></div>
  `;
}

function createChapterList(novel) {
  const chapters = Array.isArray(novel.chapters) ? novel.chapters : [];
  const count = Number(novel.chapterCount || chapters.length || 0);
  if (!count) return "<p>目前還沒有章節。</p>";

  return Array.from({ length: count }, (_, index) => {
    const chapter = index + 1;
    const data = chapters.find((item) => Number(item.chapter) === chapter) || {};
    return `
      <a class="chapter-item" href="${chapterUrl(novel, chapter)}"><span>第 ${chapter} 章</span><span>${data.title || (chapter === Number(novel.latestChapter?.chapter) ? novel.latestChapter?.title || "" : "")}</span></a>
    `;
  }).join("");
}

async function renderReader(novel, chapter) {
  readerState.novel = novel;
  readerState.chapter = chapter;
  document.title = `第${chapter}章｜${novel.title} | 光風濟月`;

  const main = document.querySelector(".main-content");
  const data = Array.isArray(novel.chapters) ? novel.chapters.find((item) => Number(item.chapter) === chapter) : null;
  const chapterTitle = data?.title || (chapter === Number(novel.latestChapter?.chapter) ? novel.latestChapter.title : `第${chapter}章`);

  main.innerHTML = `
    <div class="hero-section reader-page">
      <article class="section-card reader">
        <div class="reader-toolbar">
          <a class="reader-toolbar-back" href="${novelUrl(novel)}">← 返回總覽</a>
          <span>第 ${chapter} 章</span>
          <button class="reader-settings-button" id="reader-settings-open" type="button">⚙ 閱讀設定</button>
        </div>
        <div class="reader-header"><p>${novel.title}</p><h1>${chapterTitle}</h1></div>
        <div class="reader-content" id="reader-content"><p class="reader-loading">正在讀取章節……</p></div>
        <nav class="reader-navigation">
          ${chapter > 1 ? `<a class="btn secondary-button" href="${chapterUrl(novel, chapter - 1)}">← 上一章</a>` : "<span></span>"}
          ${chapter < Number(novel.chapterCount || 0) ? `<a class="btn" href="${chapterUrl(novel, chapter + 1)}">下一章 →</a>` : "<span></span>"}
        </nav>
        ${readerSettingsMarkup()}
      </article>
    </div>
  `;

  bindReaderSettings();
  applyReaderSettings();
  await loadChapter(novel, chapter);
}

async function loadChapter(novel, chapter) {
  const content = document.querySelector("#reader-content");
  if (!content) return;

  const path = `/data/${encodeURIComponent(novel.title)}/${chapter}.md`;

  try {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const markdown = await response.text();
    if (typeof marked === "undefined") throw new Error("Markdown parser 尚未載入");

    content.innerHTML = marked.parse(markdown, { gfm:true, breaks:true, headerIds:false, mangle:false });
    restoreReaderProgress(novel, chapter);
    setupReaderProgress(novel, chapter);
  } catch (error) {
    console.error("章節載入失敗：", path, error);
    content.innerHTML = `<div class="reader-empty"><h2>章節內容尚未上架</h2><p>第 ${chapter} 章的文字檔目前還沒有放進 GitHub。</p></div>`;
  }
}

function setupReaderProgress(novel, chapter) {
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { saveProgress(novel, chapter, window.scrollY); ticking = false; });
  }, { passive:true });
}

function restoreReaderProgress(novel, chapter) {
  const progress = getSavedProgress(novel);
  if (!progress || Number(progress.chapter) !== chapter) { window.scrollTo(0,0); return; }
  requestAnimationFrame(() => window.scrollTo(0, Number(progress.scroll) || 0));
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("zh-TW", {year:"numeric",month:"2-digit",day:"2-digit"});
}

loadNovels();
