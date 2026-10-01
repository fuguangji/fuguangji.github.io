const novelList = document.querySelector("#novel-list");
const latestNovel = document.querySelector("#latest-novel");
const lastNovel = document.querySelector("#last-novel");

let novels = [];

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

  return novels.find(
    (novel) => novel.title === novelName || novel.id === novelName
  ) || null;
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

async function loadNovels() {
  try {
    const response = await fetch("/data/novels.json", { cache: "no-cache" });

    if (!response.ok) {
      throw new Error(`無法取得小說資料：${response.status}`);
    }

    novels = await response.json();
    renderCurrentPage();
  } catch (error) {
    console.error("小說資料載入失敗：", error);

    if (novelList) {
      novelList.innerHTML = `
        <div class="section-card">
          <h2>小說資料載入失敗</h2>
          <p>請稍後重新整理頁面。</p>
        </div>
      `;
    }
  }
}

function renderCurrentPage() {
  const novel = getNovelByPath();
  const chapter = getChapterNumber();

  if (novel && chapter) {
    renderReader(novel, chapter);
    return;
  }

  if (novel) {
    renderNovelDetail(novel);
    return;
  }

  renderNovelList();
}

function renderNovelList() {
  if (!novelList) return;

  document.title = "小說列表 | 光風濟月";

  renderLastNovel();
  renderLatestNovel();

  novelList.innerHTML = `
    <div class="section-card">
      <div class="section-heading">
        <p class="section-kicker">WORKS</p>
        <h2>小說</h2>
        <p>這裡收錄正在連載與已完成的故事。</p>
      </div>

      <div class="novel-grid">
        ${novels.map(createNovelCard).join("")}
      </div>
    </div>
  `;
}

function createNovelCard(novel) {
  const latest = novel.latestChapter || {};
  const cover = novel.cover || "";

  return `
    <article class="section-card novel-card">
      <div class="novel-cover">
        ${cover ? `<img src="${cover}" alt="${novel.title} 封面" loading="lazy">` : ""}
      </div>

      <div class="novel-info">
        <p class="novel-status">${getStatusText(novel.status)}</p>
        <h2>${novel.title}</h2>
        <p class="novel-author">${novel.author || ""}</p>
        <p class="novel-description">${novel.description || ""}</p>

        <div class="novel-meta">
          <span>${novel.chapterCount || 0} 章</span>
          <span>最新：第${latest.chapter || 0}章・${latest.title || ""}</span>
        </div>

        <a class="btn novel-button" href="${novelUrl(novel)}">閱讀小說 →</a>
      </div>
    </article>
  `;
}

function renderLastNovel() {
  if (!lastNovel) return;

  const saved = novels
    .map((novel) => ({ novel, progress: getSavedProgress(novel) }))
    .filter((item) => item.progress && item.progress.chapter)
    .sort(
      (a, b) =>
        new Date(b.progress.updatedAt || 0) -
        new Date(a.progress.updatedAt || 0)
    )[0];

  if (!saved) {
    lastNovel.innerHTML = `
      <div class="section-card">
        <h3>歡迎回來！</h3>
        <p>還沒有閱讀紀錄。</p>
      </div>
    `;
    return;
  }

  const { novel, progress } = saved;

  lastNovel.innerHTML = `
    <div class="section-card">
      <div class="novel-feature">
        <div>
          <p class="section-kicker">CONTINUE READING</p>
          <h3>${novel.title}</h3>
          <p>上次讀到第 ${progress.chapter} 章</p>
        </div>

        <a class="btn" href="${chapterUrl(novel, progress.chapter)}">繼續閱讀 →</a>
      </div>
    </div>
  `;
}

function renderLatestNovel() {
  if (!latestNovel) return;

  if (novels.length === 0) {
    latestNovel.innerHTML = `
      <div class="section-card">
        <h3>最新上架！</h3>
        <p>目前還沒有小說。</p>
      </div>
    `;
    return;
  }

  const latest = [...novels].sort(
    (a, b) => new Date(b.updateTime || 0) - new Date(a.updateTime || 0)
  )[0];

  const chapter = latest.latestChapter || {};

  latestNovel.innerHTML = `
    <div class="section-card">
      <div class="novel-feature">
        <div>
          <p class="section-kicker">LATEST UPDATE</p>
          <h3>${latest.title}</h3>
          <p>第 ${chapter.chapter || 0} 章・${chapter.title || ""}</p>
        </div>

        <a class="btn" href="${chapterUrl(latest, chapter.chapter || 1)}">前往最新章 →</a>
      </div>
    </div>
  `;
}

function renderNovelDetail(novel) {
  document.title = `${novel.title} | 光風濟月`;

  const progress = getSavedProgress(novel);

  document.querySelector(".main-content").innerHTML = `
    <div class="hero-section">
      <div class="section-card novel-detail-card">
        <div class="novel-detail-cover">
          ${novel.cover ? `<img src="${novel.cover}" alt="${novel.title} 封面">` : ""}
        </div>

        <div class="novel-detail-info">
          <p class="novel-status">${getStatusText(novel.status)}</p>
          <h1>${novel.title}</h1>
          <p class="novel-author">${novel.author || ""}</p>
          <p class="novel-description">${novel.description || ""}</p>

          <div class="novel-meta">
            <span>${novel.chapterCount || 0} 章</span>
            <span>更新：${formatDate(novel.updateTime)}</span>
          </div>

          <div class="novel-actions">
            <a class="btn" href="${chapterUrl(novel, progress?.chapter || 1)}">
              ${progress?.chapter ? `繼續閱讀 第${progress.chapter}章 →` : "開始閱讀 →"}
            </a>
            <a class="btn secondary-button" href="/novels/">返回小說列表</a>
          </div>
        </div>
      </div>
    </div>

    <div class="hero-section">
      <div class="section-card">
        <div class="section-heading">
          <p class="section-kicker">CHAPTERS</p>
          <h2>章節</h2>
        </div>

        <div class="chapter-list">
          ${createChapterList(novel)}
        </div>
      </div>
    </div>
  `;
}

function createChapterList(novel) {
  const count = Number(novel.chapterCount || 0);

  if (!count) return "<p>目前還沒有章節。</p>";

  return Array.from({ length: count }, (_, index) => {
    const chapter = index + 1;
    const title =
      chapter === Number(novel.latestChapter?.chapter)
        ? novel.latestChapter?.title || ""
        : "";

    return `
      <a class="chapter-item" href="${chapterUrl(novel, chapter)}">
        <span>第 ${chapter} 章</span>
        <span>${title}</span>
      </a>
    `;
  }).join("");
}

async function renderReader(novel, chapter) {
  document.title = `第${chapter}章｜${novel.title} | 光風濟月`;

  const main = document.querySelector(".main-content");

  main.innerHTML = `
    <div class="hero-section">
      <article class="section-card reader">
        <div class="reader-header">
          <a href="${novelUrl(novel)}">← ${novel.title}</a>
          <p>第 ${chapter} 章</p>
          <h1>${chapter === Number(novel.latestChapter?.chapter) ? novel.latestChapter.title : `第${chapter}章`}</h1>
        </div>

        <div class="reader-content" id="reader-content">
          <p class="reader-loading">正在讀取章節……</p>
        </div>

        <nav class="reader-navigation">
          ${chapter > 1
            ? `<a class="btn secondary-button" href="${chapterUrl(novel, chapter - 1)}">← 上一章</a>`
            : "<span></span>"}

          ${chapter < Number(novel.chapterCount || 0)
            ? `<a class="btn" href="${chapterUrl(novel, chapter + 1)}">下一章 →</a>`
            : "<span></span>"}
        </nav>
      </article>
    </div>
  `;

  await loadChapter(novel, chapter);
}

async function loadChapter(novel, chapter) {
  const content = document.querySelector("#reader-content");
  if (!content) return;

  const path = `/data/${encodeURIComponent(novel.title)}/${chapter}.md`;

  try {
    const response = await fetch(path, { cache: "no-cache" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const markdown = await response.text();

    if (typeof marked === "undefined") {
      throw new Error("Markdown parser 尚未載入");
    }

    content.innerHTML = marked.parse(markdown, {
      gfm: true,
      breaks: true,
      headerIds: false,
      mangle: false
    });

    restoreReaderProgress(novel, chapter);
    setupReaderProgress(novel, chapter);
  } catch (error) {
    console.error("章節載入失敗：", path, error);

    content.innerHTML = `
      <div class="reader-empty">
        <h2>章節內容尚未上架</h2>
        <p>第 ${chapter} 章的文字檔目前還沒有放進 GitHub。</p>
      </div>
    `;
  }
}

function setupReaderProgress(novel, chapter) {
  let ticking = false;

  window.addEventListener("scroll", () => {
    if (ticking) return;

    ticking = true;

    requestAnimationFrame(() => {
      saveProgress(novel, chapter, window.scrollY);
      ticking = false;
    });
  });
}

function restoreReaderProgress(novel, chapter) {
  const progress = getSavedProgress(novel);

  if (!progress || Number(progress.chapter) !== chapter) {
    window.scrollTo(0, 0);
    return;
  }

  requestAnimationFrame(() => {
    window.scrollTo(0, Number(progress.scroll) || 0);
  });
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

loadNovels();
