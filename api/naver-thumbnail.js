const fetch = require("node-fetch");
const cheerio = require("cheerio");

module.exports = async (req, res) => {
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
      return res.redirect("https://placehold.co/100x70?text=No+Iframe");
    }

    const iframeUrl = `https://blog.naver.com${iframeSrc}`;

    // 2차 요청: iframe 내부 실제 본문
    const iframeResponse = await fetch(iframeUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const iframeHtml = await iframeResponse.text();
    const $$ = cheerio.load(iframeHtml);

    let imageUrl =
      $$('meta[property="og:image"]').attr("content") ||
      $$('meta[name="og:image"]').attr("content") ||
      $$("img").first().attr("src");

    if (!imageUrl) {
      return res.redirect("https://placehold.co/100x70?text=No+Image");
    }

    // 상대경로 처리
    if (!imageUrl.startsWith("http")) {
      const parsedIframeUrl = new URL(iframeUrl);
      imageUrl = `${parsedIframeUrl.origin}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
    }

    // 이미지 직접 다운로드해서 프록시 전달
    const imageResponse = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!imageResponse.ok) {
      throw new Error("Image fetch failed");
    }

    res.setHeader("Content-Type", imageResponse.headers.get("content-type") || "image/jpeg");
    imageResponse.body.pipe(res); // 이미지 스트림 전송
  } catch (err) {
    console.error(err.message);
    res.redirect("https://placehold.co/100x70?text=Error");
  }
};
