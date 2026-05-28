const http = require("http");
const fs   = require("fs");
const path = require("path");
const url  = require("url");

const PORT        = 3000;
const SCORES_FILE = path.join(__dirname, "public", "scores.json");

const MIME = {
    ".html": "text/html",
    ".css":  "text/css",
    ".js":   "application/javascript",
    ".json": "application/json",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".wav":  "audio/wav",
    ".mp3":  "audio/mpeg",
    ".ico":  "image/x-icon",
};

// Ensure public/scores.json exists
try {
    fs.mkdirSync(path.dirname(SCORES_FILE), { recursive: true });
    if (!fs.existsSync(SCORES_FILE)) {
        fs.writeFileSync(SCORES_FILE, "[]");
        console.log("Created", SCORES_FILE);
    } else {
        console.log("Found existing", SCORES_FILE);
    }
} catch (e) {
    console.error("Failed to initialise scores file:", e);
}

http.createServer((req, res) => {
    const pathname = url.parse(req.url).pathname;

    // POST /api/scores — append new score, keep top 10
    if (req.method === "POST" && pathname === "/api/scores") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
            try {
                const entry  = JSON.parse(body);
                const raw    = fs.readFileSync(SCORES_FILE, "utf8").trim() || "[]";
                const scores = JSON.parse(raw);
                scores.push(entry);
                scores.sort((a, b) => b.pts - a.pts);
                const top10 = scores.slice(0, 10);
                fs.writeFileSync(SCORES_FILE, JSON.stringify(top10, null, 2));
                console.log("Saved score:", entry.name, entry.pts, "→", SCORES_FILE);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(top10));
            } catch (e) {
                console.error("POST /api/scores error:", e);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // Static file serving
    const filePath = path.join(__dirname, pathname === "/" ? "index.html" : pathname);
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end("Not found"); return; }
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
    });

}).listen(PORT, () => console.log("Blackjack running on port " + PORT));
