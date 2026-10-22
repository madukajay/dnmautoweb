#!/usr/bin/env node
/**
 * DNM Auto — Node server. Same API as server.py.
 * Run: node server.mjs
 * Python stays on 4173; this listens on 4174.
 */

import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ROOT, "public");
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 4174);
const PAGE = "https://beforward.aleado.com/stats/?p=project/findlots&s&ld";
const PAGE_SIZE = 100;
const cache = new Map();

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function sessionCookie() {
  let raw = (process.env.BEFORWARD_COOKIE || process.env.COOKIE || "").trim();
  if (!raw) {
    try {
      raw = readFileSync(join(ROOT, ".env"), "utf8").trim();
    } catch {
      raw = "";
    }
  }
  if (raw.toLowerCase().startsWith("cookie:")) raw = raw.split(":").slice(1).join(":").trim();
  return raw;
}

function memberWall(body) {
  return body.toLowerCase().includes("only to members");
}

async function aleado(url, body) {
  try {
    const response = await fetch(url, {
      method: body == null ? "GET" : "POST",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Cookie: sessionCookie(),
        Referer: PAGE,
        Accept: "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(60000),
    });
    return [response.status, await response.text()];
  } catch (error) {
    return [502, String(error.cause || error.message)];
  }
}

async function sajax(func, args) {
  const parts = [
    "p=project/findlots",
    "s",
    "ld",
    `rs=${encodeURIComponent(func)}`,
    "rst=",
    `rsrnd=${Date.now()}`,
    ...args.map((arg) => `rsargs[]=${encodeURIComponent(String(arg))}`),
  ];
  const [status, body] = await aleado(`https://beforward.aleado.com/stats/?${parts.join("&")}`);
  if (status !== 200) return [status, body];
  if (memberWall(body)) return [401, body];
  if (body.startsWith("-")) return [502, body.slice(2)];
  return [200, body];
}

function splitName(text) {
  const clean = text.replace(/\\\//g, "/").trim();
  const match = /^(.*?)\s*\((\d+)\)\s*$/.exec(clean);
  if (!match) return [clean, null];
  return [match[1].trim(), Number(match[2])];
}

function parseOptions(body) {
  const pattern = /value=\\"(-?\d+)\\"[^>]*>\s*([^<\\]*)/g;
  let pairs = [...body.matchAll(pattern)];
  if (pairs.length === 0) pairs = [...body.matchAll(/value="(-?\d+)"[^>]*>\s*([^<]*)/g)];
  const options = [];
  for (const [, value, label] of pairs) {
    const [name, count] = splitName(label);
    if (!name || name.startsWith("---")) continue;
    options.push({ id: value, name, count });
  }
  options.sort((a, b) => a.name.localeCompare(b.name));
  return options;
}

function parseTypes(body) {
  let values = [...body.matchAll(/value=\\"([^"\\]+)\\"/g)].map((match) => match[1]);
  if (values.length === 0) values = [...body.matchAll(/value="([^"]+)"/g)].map((match) => match[1]);
  const types = [];
  const seen = new Set();
  for (const value of values) {
    if (value.includes(".") || seen.has(value)) continue;
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{1,24}$/.test(value)) continue;
    seen.add(value);
    types.push(value);
  }
  return types;
}

async function cached(key, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 600000) return [200, hit.data];
  const [status, data] = await loader();
  if (status === 200) cache.set(key, { at: Date.now(), data });
  return [status, data];
}

function makers() {
  return cached("makers", async () => {
    const [status, body] = await sajax("loadCompanys", ["-1"]);
    if (status !== 200) return [status, { detail: "BeForward session expired. Replace the cookie in .env." }];
    return [200, { makers: parseOptions(body) }];
  });
}

function models(makerId) {
  return cached(`models:${makerId}`, async () => {
    const [status, body] = await sajax("loadModels", [makerId, "-1"]);
    if (status !== 200) return [status, { detail: "Could not load models. The session may have expired." }];
    return [200, { models: parseOptions(body) }];
  });
}

function types(makerId, modelId) {
  return cached(`types:${makerId}:${modelId}`, async () => {
    const [status, body] = await sajax("loadModelsType", [makerId, modelId]);
    if (status !== 200) return [status, { detail: "Could not load model types." }];
    return [200, { types: parseTypes(body) }];
  });
}

function textOf(fragment) {
  return fragment.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cell(row, key) {
  const match = new RegExp(`id="${key}"[^>]*>([\\s\\S]*?)</td>`).exec(row);
  return match ? textOf(match[1]) : "";
}

function hiddenValue(row, key) {
  const match = new RegExp(`id="${key}"[^>]*>([^<]*)`).exec(row);
  return match ? match[1].trim() : "";
}

function parseLots(html) {
  if (memberWall(html)) return [401, { detail: "BeForward session expired. Replace the cookie in .env." }];
  const totalMatch = /Found total lots:\s*(?:<[^>]+>\s*)*(\d+)/i.exec(html);
  const total = totalMatch ? Number(totalMatch[1]) : 0;
  const lots = [];
  for (const row of html.matchAll(/<tr class="ColorGreed[12]" id="cell_\d+"[\s\S]*?<\/tr>/g)) {
    const number = /id="cell_(\d+)"/.exec(row[0])[1];
    const photo = /load_src="([^"]+)"/.exec(row[0]);
    const lotId = /[?&]id=(\d+)/.exec(row[0]);
    const end = hiddenValue(row[0], `jpyE${number}`);
    lots.push({
      date: cell(row[0], `date_${number}`),
      lot: cell(row[0], `bid_number_${number}`),
      lot_id: lotId ? lotId[1] : "",
      auction: cell(row[0], `auction_${number}`),
      photo: photo ? photo[1] : "",
      maker: cell(row[0], `company_${number}`),
      model: cell(row[0], `model_${number}`),
      grade: cell(row[0], `grade_${number}`),
      year: cell(row[0], `year_${number}`),
      mileage: cell(row[0], `mileage_${number}`),
      displacement: cell(row[0], `displacement_${number}`),
      transmission: cell(row[0], `transmission_${number}`),
      color: cell(row[0], `color_${number}`),
      model_type: cell(row[0], `model_type_${number}`),
      end_thousand_jpy: /^\d+$/.test(end) ? Number(end) : null,
      result: cell(row[0], `result_${number}`),
      score: cell(row[0], `scores_${number}`),
    });
  }
  return [200, { count: total || lots.length, lots }];
}

function formValue(data, key) {
  const value = data[key] ?? "";
  return String(Array.isArray(value) ? value.at(-1) ?? "" : value).trim();
}

function datePart(raw) {
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  return [match[3], match[2], match[1]];
}

function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - 3);
  return [isoDate(start), isoDate(end)];
}

async function search(data) {
  const page = formValue(data, "page") || "1";
  if (!/^\d+$/.test(page) || Number(page) < 1) return [400, { detail: "page must be a positive number." }];
  let dateFrom = formValue(data, "date_from");
  let dateTo = formValue(data, "date_to");
  if (!dateFrom || !dateTo) {
    [dateFrom, dateTo] = defaultDateRange();
  }
  const start = datePart(dateFrom);
  const finish = datePart(dateTo);
  if (!start || !finish) return [400, { detail: "Dates must be YYYY-MM-DD." }];
  const fields = {
    p: "project/findlots",
    s: "",
    ld: "",
    rudder: "",
    sday: start[0],
    smonth: start[1],
    syear: start[2],
    fday: finish[0],
    fmonth: finish[1],
    fyear: finish[2],
    o: "d",
    vs: String(PAGE_SIZE),
    pg: page,
    rows: "0",
    model_type_count: "",
    date_check: "1",
    auction_check: "1",
    bid_number_check: "1",
    photo_check: "1",
    company_check: "1",
    model_check: "1",
    grade_check: "1",
    year_check: "1",
    awd_check: "1",
    transmission_check: "1",
    displacement_check: "1",
    mileage_check: "1",
    inspection_check: "0",
    color_check: "1",
    model_type_check: "1",
    equipment_check: "0",
    start_price_check: "0",
    end_price_check: "1",
    result_check: "1",
    scores_check: "1",
    mrk: formValue(data, "maker") || "-1",
    mdl_id: "-1",
    mdl: formValue(data, "model") || "-1",
    year1: formValue(data, "year_from"),
    year2: formValue(data, "year_to"),
    v1: formValue(data, "cc_from"),
    v2: formValue(data, "cc_to"),
    mileage1: formValue(data, "mileage_from"),
    mileage2: formValue(data, "mileage_to"),
    lot_pos: "none",
    lot: formValue(data, "lot"),
    chassis_no_pos: "none",
    chassis_no: formValue(data, "chassis"),
    result_pos: "",
    result: formValue(data, "result"),
    end_price_pos: "none",
    end1: formValue(data, "price_from"),
    end2: formValue(data, "price_to"),
    scores_pos: "none",
    type_pos: "",
    type: formValue(data, "model_type"),
    transmission_pos: "none",
    transmission: formValue(data, "transmission"),
    awd_pos: "none",
    awd: formValue(data, "shift"),
    word_pos: "",
    word: formValue(data, "grade"),
    color_pos: "none",
    lsfc_pos: "none",
    exch: "jpy",
  };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) params.append(key, value);
  if (formValue(data, "score")) params.append("score[]", formValue(data, "score"));
  if (formValue(data, "color")) params.append("color[]", formValue(data, "color"));
  const [status, body] = await aleado(PAGE, params.toString());
  if (status !== 200) return [status, { detail: "BeForward did not return the results page." }];
  const [code, payload] = parseLots(body);
  if (code === 200) {
    payload.page = Number(page);
    payload.page_size = PAGE_SIZE;
    payload.pages = Math.max(1, Math.ceil(payload.count / PAGE_SIZE));
  }
  return [code, payload];
}

function corsHeaders() {
  const origin = process.env.CORS_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...corsHeaders(),
  });
  response.end(body);
}

function sendFile(root, relative, response) {
  const target = resolve(root, relative);
  const base = resolve(root);
  if (target !== base && !target.startsWith(base + sep)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const body = readFileSync(target);
  response.writeHead(200, {
    "Content-Type": TYPES[extname(target).toLowerCase()] || "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": "no-cache",
  });
  response.end(body);
}

function serveStatic(requestPath, response) {
  const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  sendFile(PUBLIC, relative, response);
}

function readBody(request) {
  return new Promise((done, fail) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => done(Buffer.concat(chunks).toString("utf8")));
    request.on("error", fail);
  });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${HOST}:${PORT}`);
  const path = url.pathname.replace(/\/$/, "") || "/";
  try {
    if (request.method === "OPTIONS" && path.startsWith("/api/")) {
      response.writeHead(204, corsHeaders());
      response.end();
      return;
    }
    if (request.method === "GET" && path === "/api/makers") {
      const [status, data] = await makers();
      sendJson(response, status, data);
      return;
    }
    if (request.method === "GET" && path === "/api/models") {
      const makerId = url.searchParams.get("maker") || "";
      if (!/^-?\d+$/.test(makerId)) return sendJson(response, 400, { detail: "maker id is required." });
      const [status, data] = await models(makerId);
      sendJson(response, status, data);
      return;
    }
    if (request.method === "GET" && path === "/api/types") {
      const makerId = url.searchParams.get("maker") || "";
      const modelId = url.searchParams.get("model") || "";
      if (!/^-?\d+$/.test(makerId) || !/^-?\d+$/.test(modelId)) {
        return sendJson(response, 400, { detail: "maker and model ids are required." });
      }
      const [status, data] = await types(makerId, modelId);
      sendJson(response, status, data);
      return;
    }
    if (request.method === "POST" && path === "/api/lots") {
      let data;
      try {
        data = JSON.parse((await readBody(request)) || "{}");
      } catch {
        return sendJson(response, 400, { detail: "Expected JSON." });
      }
      const [status, payload] = await search(data);
      sendJson(response, status, payload);
      return;
    }
    if (request.method === "GET") {
      serveStatic(path, response);
      return;
    }
    response.writeHead(404);
    response.end("Not found");
  } catch (error) {
    sendJson(response, 500, { detail: error.message });
  }
});

if (!sessionCookie()) {
  console.error("Put the BeForward cookie in .env");
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  const shown = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`DNM Auto (Node) running at http://${shown}:${PORT}`);
});
