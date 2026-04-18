const fs = require("fs");
const path = require("path");

// Tentativa de usar puppeteer-extra + stealth se disponível, senão fallback para puppeteer-core / puppeteer
let puppeteerPkg = null;
let useExtra = false;
try {
  // prefer puppeteer-extra (stealth plugin) quando disponível
  const puppeteerExtra = require("puppeteer-extra");
  const StealthPlugin = require("puppeteer-extra-plugin-stealth");
  puppeteerExtra.use(StealthPlugin());
  puppeteerPkg = puppeteerExtra;
  useExtra = true;
} catch (e) {
  try {
    puppeteerPkg = require("puppeteer-core");
  } catch (e2) {
    try {
      puppeteerPkg = require("puppeteer");
    } catch (e3) {
      throw new Error(
        "Instale puppeteer-core (ou puppeteer) e opcionalmente puppeteer-extra + puppeteer-extra-plugin-stealth",
      );
    }
  }
}

const DEFAULT_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-accelerated-2d-canvas",
  "--disable-gpu",
  "--no-zygote",
  "--single-process",
  "--disable-extensions",
  "--disable-infobars",
];

function findChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ];
  for (const p of candidates) {
    if (!p) continue;
    try {
      if (fs.existsSync(p)) return p;
    } catch (e) {
      // ignore
    }
  }
  return null;
}

async function launchBrowser({ headless = true, extraArgs = [] } = {}) {
  const chromePath = findChromePath();
  if (!chromePath) {
    throw new Error(
      "Chrome/Chromium não encontrado. Instale google-chrome-stable e/ou defina a variável CHROME_PATH.",
    );
  }

  const launchOpts = {
    executablePath: chromePath,
    headless: headless,
    args: DEFAULT_ARGS.concat(extraArgs),
    ignoreHTTPSErrors: true,
    defaultViewport: { width: 1280, height: 800 },
  };

  // Se estiver usando puppeteer-extra, ele expõe .launch()
  const browser = await puppeteerPkg.launch(launchOpts);
  return browser;
}

async function captureWhatsAppQRCode({ saveTo = null, timeout = 60000 } = {}) {
  const browser = await launchBrowser({ headless: true });
  const page = await browser.newPage();

  // User agent comum para reduzir detecção
  await page.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  );

  await page.goto("https://web.whatsapp.com", {
    waitUntil: "networkidle2",
    timeout: 0,
  });

  // Aguarda até encontrar canvas (QR) ou imagem
  let dataUrl = null;
  try {
    await page.waitForSelector("canvas, img", { timeout });
    dataUrl = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (canvas && typeof canvas.toDataURL === "function")
        return canvas.toDataURL();
      const img = document.querySelector("img");
      if (img && img.src) return img.src;
      return null;
    });
  } catch (e) {
    await browser.close();
    throw new Error(
      "QR code não encontrado no WhatsApp Web: " + (e && e.message),
    );
  }

  if (!dataUrl) {
    await browser.close();
    throw new Error("Falha ao extrair dataURL do QR code");
  }

  if (saveTo) {
    const parts = dataUrl.split(",");
    if (parts.length === 2) {
      const buffer = Buffer.from(parts[1], "base64");
      fs.writeFileSync(saveTo, buffer);
    } else {
      // se for URL remota
      try {
        const res = await page.evaluate(
          (s) =>
            fetch(s)
              .then((r) => r.arrayBuffer())
              .then((b) => Array.from(new Uint8Array(b))),
          dataUrl,
        );
        const buf = Buffer.from(res);
        fs.writeFileSync(saveTo, buf);
      } catch (err) {
        // ignore
      }
    }
  }

  await browser.close();
  return dataUrl;
}

module.exports = { findChromePath, launchBrowser, captureWhatsAppQRCode };
