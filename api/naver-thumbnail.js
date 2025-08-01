const fetch = require("node-fetch");
const cheerio = require("cheerio");

module.exports = async (req, res) => {
  // ✅ CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ OPTIONS 요청 사전 처리 (CORS 프리플라이트 대응)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  try {
    // 1차 요청: 블로그 메인 페이지
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const iframeSrc = $("#mainFrame").attr("src");

    if (!iframeSrc) {
      return res.json({ thumbnail: "https://placehold.co/100x70?text=No+Iframe" });
    }

    const iframeUrl = `https://blog.naver.com${iframeSrc}`;

    // 2차 요청: 실제 본문이 들어있는 iframe 내부
    const iframeResponse = await fetch(iframeUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const iframeHtml = await iframeResponse.text();
    const $$ = cheerio.load(iframeHtml);

    const ogImage =
      $$('meta[property="og:image"]').attr("content") ||
      $$('meta[name="og:image"]').attr("content");

    if (ogImage) {
      return res.json({ thumbnail: ogImage });
    }

    // og:image 없으면 첫 번째 이미지 추출
    const imgSrcRaw = $$("img").first().attr("src");
    let imgSrc = "";

    if (imgSrcRaw) {
      const parsedIframeUrl = new URL(iframeUrl);
      imgSrc = imgSrcRaw.startsWith("http")
        ? imgSrcRaw
        : `${parsedIframeUrl.origin}${imgSrcRaw.startsWith("/") ? "" : "/"}${imgSrcRaw}`;
    }

    if (imgSrc) {
      return res.json({ thumbnail: imgSrc });
    } else {
      return res.json({ thumbnail: "https://placehold.co/100x70?text=No+Image" });
    }
  } catch (err) {
    console.error(err.message);
    return res.json({ thumbnail: "https://placehold.co/100x70?text=Error" });
  }
};
