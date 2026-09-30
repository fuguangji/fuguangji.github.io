const novelList = document.querySelector("#novel-list");
const latestNovel = document.querySelector("#latest-novel");
const lastNovel = document.querySelector("#last-novel");

async function loadNovels() {
  try {
    const response = await fetch("../data/novels.json");

    if (!response.ok) {
      throw new Error(`無法取得小說資料：${response.status}`);
    }

    const novels = await response.json();

    renderNovels(novels);
  } catch (error) {
    console.error(error);

    novelList.innerHTML = `
            <p class="load-error">
                小說資料載入失敗。
            </p>
        `;
  }
}

function renderNovels(novels) {
  novelList.innerHTML = "";

  novels.forEach((novel) => {
    const card = document.createElement("article");

    card.className = "section-card";

    card.innerHTML = `
            <div class="novel-cover">
                <img
                    src="${novel.cover}"
                    alt="${novel.title} 封面"
                >
            </div>

            <div class="novel-info">

                <p class="novel-status">
                    ${getStatusText(novel.status)}
                </p>

                <h2>${novel.title}</h2>

                <p class="novel-author">
                    ${novel.author}
                </p>

                <p class="novel-description">
                    ${novel.description}
                </p>

                <div class="novel-meta">

                    <span>
                        ${novel.chapterCount} 章
                    </span>

                    <span>
                        第二季・第${novel.latestChapter.chapter}章
                    </span>

                </div>

                <a
                    class="button"
                    href="novel.html?id=${encodeURIComponent(novel.id)}"
                >
                    閱讀小說 →
                </a>

            </div>
        `;

    novelList.appendChild(card);
  });
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

loadNovels();
