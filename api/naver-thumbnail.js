const fetch = require("node-fetch");
const cheerio = require("cheerio");

module.exports = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const imgSrcRaw = $("img").first().attr("src");
let imgSrc = "";

if (imgSrcRaw) {
  const parsedUrl = new URL(url); // 요청한 페이지 기준 origin 추출
  imgSrc = imgSrcRaw.startsWith("http")
    ? imgSrcRaw
    : `${parsedUrl.origin}${imgSrcRaw.startsWith("/") ? "" : "/"}${imgSrcRaw}`;
}

if (imgSrc) {
  res.redirect(imgSrc);
} else {
  res.redirect("https://placehold.co/100x70?text=No+Image");
}
  } catch (err) {
    console.error(err.message);
    res.redirect("https://placehold.co/100x70?text=Error");
  }
};
