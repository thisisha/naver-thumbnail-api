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
    const imgSrc = $("img").first().attr("src");

    if (imgSrc && imgSrc.startsWith("http")) {
      res.redirect(imgSrc);
    } else {
      res.redirect("https://via.placeholder.com/100x70?text=No+Image");
    }
  } catch (err) {
    console.error(err.message);
    res.redirect("https://via.placeholder.com/100x70?text=Error");
  }
};
