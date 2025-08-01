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
    return res.status(400).send("Missing 'url' query parameter");
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
      return fetchAndProxyImage("https://placehold.co/100x70?text=No+Iframe", res);
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

    // 우선 og:image 추출
    const ogImage =
      $$('meta[property="og:image"]').attr("content") ||
      $$('meta[name="og:image"]').attr("content");

    if (ogImage) {
      return fetchAndProxyImage(ogImage, res);
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
      return fetchAndProxyImage(imgSrc, res);
    } else {
      return fetchAndProxyImage("https://placehold.co/100x70?text=No+Image", res);
    }
  } catch (err) {
    console.error(err.message);
    return fetchAndProxyImage("https://placehold.co/100x70?text=Error", res);
  }
};

// ✅ 이미지 URL을 받아서 fetch 후 바이너리로 응답
async function fetchAndProxyImage(imageUrl, res) {
  try {
    const imgRes = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://blog.naver.com", // 네이버 이미지 서버는 리퍼러 확인함
      },
    });

    const contentType = imgRes.headers.get("content-type");
    const buffer = await imgRes.buffer();

    res.setHeader("Content-Type", contentType);
    res.send(buffer);
  } catch (err) {
    console.error("이미지 프록시 에러:", err.message);
    res.status(500).send("Image fetch error");
  }
}
