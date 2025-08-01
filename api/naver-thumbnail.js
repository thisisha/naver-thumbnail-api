// naver-thumbnail.js
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
