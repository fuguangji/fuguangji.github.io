const novelList = document.querySelector("#novel-list");
const latestNovel = document.querySelector("#latest-novel");
const lastNovel = document.querySelector("#last-novel");

let novels = [];

function normalizePath() {
  return decodeURIComponent(location.pathname)
    .replace(/^\\/+|\\/+$/g, "")
    .split("/")
    .filter(Boolean);
}

function getNovelByPath() {
  const parts = normalizePath();

  // GitHub Pages 的實際網站根路徑
  // /novels/
  if (parts.length <= 1 || parts[0] !== "novels") {
    return null;
  }

  if (parts.length === 1) {
    return null;
  }

  const novelName = parts[1];
  return novels.find((novel) => novel.title === novelName || novel.id === novelName) || null;
}

function getChapterNumber() {
  const parts = normalizePath();

  if (parts.length < 3 || parts[0] !== "novels") {
    return null;
  }

  const chapter = Number(parts[2]);
  return Number.isInteger(chapter) && chapter > 0 ? chapter : null;
}

function novelUrl(novel) {
  return `../novels/${encodeURIComponent(novel.id || novel.title)}/`;
}

function chapterUrl(novel, chapter) {
  return `../novels/${encodeURIComponent(novel.id || novel.title)}/${chapter}/`;
}

function getStatusText(status) {
  switch (status) {
    case "ongoing":
      return "連載中";
    case "completed":
      return "已完結";
    case "paused":
      return "暫停連載";
    default:
      return "作品";
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
    const response = await fetch("../data/novels.json");

    if (!response.ok) {
      throw new Error(`無法取得小說資料：${response.status}`);
    }

    novels = await response.json();

    renderCurrentPage();
  } catch (error) {
    console.error(error);

    if (novelList) {
      novelList.innerHTML = `
        <p class="load-error">小說資料載入失敗。</p>
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
    <div class="section-heading">
      <p class="section-kicker">WORKS</p>
      <h2>小說</h2>
      <p>這裡收錄正在連載與已完成的故事。</p>
    </div>

    <div class="novel-grid">
      ${novels.map(createNovelCard).join("")}
    </div>
  `;
}

function createNovelCard(novel) {
  const latest = novel.latestChapter || {};
  const cover = novel.cover || "";

  return `
    <article class="section-card novel-card">
      <div class="novel-cover">
        <img src="${cover}" alt="${novel.title} 封面" loading="lazy">
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

        <a class="button novel-button" href="${novelUrl(novel)}">
          閱讀小說 →
        </a>
      </div>
    </article>
  `;
}

function renderLastNovel() {
  if (!lastNovel) return;

  const saved = novels
    .map((novel) => ({ novel, progress: getSavedProgress(novel) }))
    .filter((item) => item.progress && item.progress.chapter)
    .sort((a, b) =>
      new Date(b.progress.updatedAt || 0) - new Date(a.progress.updatedAt || 0)
    )[0];

  if (!saved) {
    lastNovel.innerHTML = `
      <h3>歡迎回來！</h3>
      <p>還沒有閱讀紀錄。</p>
    `;
    return;
  }

  const { novel, progress } = saved;

  lastNovel.innerHTML = `
    <div class="novel-feature">
      <div>
        <p class="section-kicker">CONTINUE READING</p>
        <h3>${novel.title}</h3>
        <p>上次讀到第 ${progress.chapter} 章</p>
      </div>
      <a class="button" href="${chapterUrl(novel, progress.chapter)}">
        繼續閱讀 →
      </a>
    </div>
  `;
}

function renderLatestNovel() {
  if (!latestNovel || novels.length === 0) return;

  const latest = [...novels].sort(
    (a, b) => new Date(b.updateTime || 0) - new Date(a.updateTime || 0)
  )[0];

  const chapter = latest.latestChapter || {};

  latestNovel.innerHTML = `
    <div class="novel-feature">
      <div>
        <p class="section-kicker">LATEST UPDATE</p>
        <h3>${latest.title}</h3>
        <p>第 ${chapter.chapter || 0} 章・${chapter.title || ""}</p>
      </div>
      <a class="button" href="${chapterUrl(latest, chapter.chapter || 1)}">
        前往最新章 →
      </a>
    </div>
  `;
}

function renderNovelDetail(novel) {
  document.title = `${novel.title} | 光風濟月`;

  const latest = novel.latestChapter || {};
  const progress = getSavedProgress(novel);

  document.querySelector(".main-content").innerHTML = `
    <div class="hero-section novel-detail">
      <div class="novel-detail-card section-card">
        <div class="novel-detail-cover">
          <img src="${novel.cover || ""}" alt="${novel.title} 封面">
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
            <a class="button" href="${chapterUrl(novel, progress?.chapter || 1)}">
              ${progress?.chapter ? `繼續閱讀 第${progress.chapter}章 →` : "開始閱讀 →"}
            </a>
            <a class="button secondary-button" href="../novels/">
              返回小說列表
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="hero-section">
      <div class="section-card chapter-panel">
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

  if (!count) {
    return '<p>目前還沒有章節。</p>';
  }

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
            ? `<a class="button secondary-button" href="${chapterUrl(novel, chapter - 1)}">← 上一章</a>`
            : "<span></span>"}
          ${chapter < Number(novel.chapterCount || 0)
            ? `<a class="button" href="${chapterUrl(novel, chapter + 1)}">下一章 →</a>`
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

  const basePath = `../novels/${encodeURIComponent(novel.title)}/`;
  const candidates = [
    `${basePath}${chapter}.md`,
    `${basePath}${String(chapter).padStart(3, "0")}.md`
  ];

  for (const path of candidates) {
    try {
      const response = await fetch(path);

      if (!response.ok) continue;

      const markdown = await response.text();
      content.innerHTML = markdownToHtml(markdown);

      restoreReaderProgress(novel, chapter);
      setupReaderProgress(novel, chapter);
      return;
    } catch (error) {
      console.warn("章節載入失敗：", path, error);
    }
  }

  content.innerHTML = `
    <div class="reader-empty">
      <h2>章節內容尚未上架</h2>
      <p>第 ${chapter} 章的 Markdown 檔案目前還沒有放進 GitHub。</p>
    </div>
  `;
}

function markdownToHtml(markdown) {
  // 目前先支援小說所需的基本 Markdown。
  // 未來若格式需求增加，再擴充這裡即可。
  return markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>")
    .split(/\\n\\s*\\n/)
    .map((paragraph) => {
      if (/^<h[1-3]>/.test(paragraph.trim())) return paragraph;
      return `<p>${paragraph.replace(/\\n/g, "<br>")}</p>`;
    })
    .join("");
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
