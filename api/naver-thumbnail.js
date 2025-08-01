const fetch = require("node-fetch");
const cheerio = require("cheerio");

module.exports = async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const iframeSrc = $("#mainFrame").attr("src");
    if (!iframeSrc) {
      return res.redirect("https://placehold.co/100x70?text=No+Iframe");
    }

    const iframeUrl = `https://blog.naver.com${iframeSrc}`;
    const iframeResponse = await fetch(iframeUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
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

    if (!imageUrl.startsWith("http")) {
      const parsedIframeUrl = new URL(iframeUrl);
      imageUrl = `${parsedIframeUrl.origin}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
    }

    // 이미지 다운로드 후 버퍼로 읽어서 전송
    const imageResponse = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!imageResponse.ok) throw new Error("Image fetch failed");

    const buffer = await imageResponse.buffer();
    res.setHeader("Content-Type", imageResponse.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400"); // 하루 캐싱
    res.send(buffer);
  } catch (err) {
    console.error(err.message);
    res.redirect("https://placehold.co/100x70?text=Error");
  }
};

