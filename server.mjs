#!/usr/bin/env node
/**
 * DNM Auto — Node server. Same API as server.py.
 * Run: node server.mjs
 * Python stays on 4173; this listens on 4174.
 */

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { catalog, quote, variantPreset } from "./cost-calc.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ROOT, "public");
const USERS_PATH = join(ROOT, "users.json");
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

const LOGIN_URL = "https://beforward.aleado.com/auth/login.php?cur_url=c3RhdHM/cD1wcm9qZWN0L2ZpbmRsb3RzJnMmbGQ=";
const fileEnv = readDotEnv();
let liveCookie = "";
let refreshTask = null;

function readDotEnv() {
  const values = {};
  let raw = "";
  try {
    raw = readFileSync(join(ROOT, ".env"), "utf8");
  } catch {
    return values;
  }
  for (const line of raw.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      if (!values.BEFORWARD_COOKIE) values.BEFORWARD_COOKIE = trimmed.replace(/^cookie:\s*/i, "");
      continue;
    }
    values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return values;
}

function envValue(name) {
  return (process.env[name] || fileEnv[name] || "").trim();
}

function sessionCookie() {
  if (liveCookie) return liveCookie;
  let raw = (process.env.BEFORWARD_COOKIE || process.env.COOKIE || fileEnv.BEFORWARD_COOKIE || "").trim();
  if (raw.toLowerCase().startsWith("cookie:")) raw = raw.split(":").slice(1).join(":").trim();
  return raw;
}

function persistCookie(cookie) {
  liveCookie = cookie;
  const path = join(ROOT, ".env");
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\n/);
  let found = false;
  const next = lines.map((line) => {
    if (!/^\s*BEFORWARD_COOKIE\s*=/.test(line)) return line;
    found = true;
    return `BEFORWARD_COOKIE=${cookie}`;
  });
  if (!found) next.unshift(`BEFORWARD_COOKIE=${cookie}`);
  writeFileSync(path, `${next.join("\n").replace(/\n+$/, "")}\n`);
}

async function beforwardFetch(url, options) {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(60000) });
  } catch {
    throw new Error("Could not reach BeForward to refresh the session.");
  }
}

function absorbCookies(jar, response) {
  const list = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  for (const item of list) {
    const pair = item.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar) {
  return [...jar].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function loginBeForward() {
  const username = envValue("BEFORWARD_USER");
  const password = envValue("BEFORWARD_PASSWORD");
  if (!username || !password) throw new Error("BeForward username and password are not set.");
  const jar = new Map();
  let response = await beforwardFetch(LOGIN_URL, {
    redirect: "manual",
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  absorbCookies(jar, response);
  const landed = response.headers.get("location") || LOGIN_URL;
  if (response.status >= 300 && response.status < 400) {
    response = await beforwardFetch(landed, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0", Cookie: cookieHeader(jar) },
    });
    absorbCookies(jar, response);
  }
  response = await beforwardFetch(landed, {
    method: "POST",
    redirect: "manual",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
      Referer: landed,
    },
    body: new URLSearchParams({ username, password, Submit: "Sign In" }),
  });
  absorbCookies(jar, response);
  let location = response.status >= 300 && response.status < 400 ? response.headers.get("location") : "";
  let page = "";
  for (let hop = 0; hop < 4 && location; hop += 1) {
    const next = new URL(location, "https://beforward.aleado.com").href;
    response = await beforwardFetch(next, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0", Cookie: cookieHeader(jar) },
    });
    absorbCookies(jar, response);
    location = response.status >= 300 && response.status < 400 ? response.headers.get("location") : "";
    if (!location) page = await response.text();
  }
  if (!jar.has("SU_Session") || /name="password"/i.test(page)) {
    throw new Error("BeForward login failed. Check the username and password on the server.");
  }
  persistCookie(cookieHeader(jar));
  console.log("BeForward session refreshed.");
}

function refreshSession() {
  if (!refreshTask) {
    refreshTask = loginBeForward().finally(() => {
      refreshTask = null;
    });
  }
  return refreshTask;
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

async function sajax(func, args, allowRefresh = true) {
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
  if (memberWall(body)) {
    if (allowRefresh && envValue("BEFORWARD_USER")) {
      await refreshSession();
      return sajax(func, args, false);
    }
    return [401, body];
  }
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
  let [status, body] = await aleado(PAGE, params.toString());
  if (status === 200 && memberWall(body) && envValue("BEFORWARD_USER")) {
    await refreshSession();
    [status, body] = await aleado(PAGE, params.toString());
  }
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
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

function authSecret() {
  return envValue("AUTH_SECRET") || envValue("ADMIN_PASSWORD") || envValue("BEFORWARD_PASSWORD");
}

function adminIdentity() {
  return {
    username: (envValue("ADMIN_USER") || envValue("BEFORWARD_USER")).toLowerCase(),
    password: envValue("ADMIN_PASSWORD") || envValue("BEFORWARD_PASSWORD"),
  };
}

function sameSecret(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function readUsers() {
  try {
    const data = JSON.parse(readFileSync(USERS_PATH, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  writeFileSync(USERS_PATH, `${JSON.stringify(users, null, 2)}\n`);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 32).toString("base64url");
  return `${salt}:${hash}`;
}

function checkPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "base64url");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function signToken(username, role) {
  const payload = Buffer.from(JSON.stringify({
    u: username,
    role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })).toString("base64url");
  const sig = createHmac("sha256", authSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function readSession(request) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", authSecret()).update(payload).digest("base64url");
  if (!sameSecret(sig, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.u || !data.exp || data.exp < Date.now()) return null;
    return { username: String(data.u), role: data.role === "admin" ? "admin" : "user" };
  } catch {
    return null;
  }
}

function requireUser(request, response) {
  const session = readSession(request);
  if (!session) {
    sendJson(response, 401, { detail: "Sign in to view import costs." });
    return null;
  }
  return session;
}

function authenticate(username, password) {
  const name = String(username || "").trim();
  const pass = String(password || "");
  if (!name || !pass) return null;
  const admin = adminIdentity();
  if (name.toLowerCase() === admin.username && sameSecret(pass, admin.password)) {
    return { username: name, role: "admin" };
  }
  const user = readUsers().find((item) => String(item.username || "").toLowerCase() === name.toLowerCase());
  if (user && checkPassword(pass, user.password)) return { username: user.username, role: "user" };
  return null;
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
    if (request.method === "POST" && path === "/api/auth/login") {
      let data;
      try {
        data = JSON.parse((await readBody(request)) || "{}");
      } catch {
        return sendJson(response, 400, { detail: "Expected JSON." });
      }
      const account = authenticate(data.username, data.password);
      if (!account) return sendJson(response, 401, { detail: "Those details do not match an account." });
      sendJson(response, 200, {
        token: signToken(account.username, account.role),
        username: account.username,
        role: account.role,
      });
      return;
    }
    if (request.method === "GET" && path === "/api/auth/me") {
      const session = requireUser(request, response);
      if (!session) return;
      sendJson(response, 200, session);
      return;
    }
    if (request.method === "GET" && path === "/api/auth/users") {
      const session = requireUser(request, response);
      if (!session) return;
      if (session.role !== "admin") return sendJson(response, 403, { detail: "Only the owner can manage users." });
      sendJson(response, 200, { users: readUsers().map((item) => item.username) });
      return;
    }
    if (request.method === "POST" && path === "/api/auth/users") {
      const session = requireUser(request, response);
      if (!session) return;
      if (session.role !== "admin") return sendJson(response, 403, { detail: "Only the owner can manage users." });
      let data;
      try {
        data = JSON.parse((await readBody(request)) || "{}");
      } catch {
        return sendJson(response, 400, { detail: "Expected JSON." });
      }
      const username = String(data.username || "").trim();
      const password = String(data.password || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username) && !/^[A-Za-z0-9._-]{3,64}$/.test(username)) {
        return sendJson(response, 400, { detail: "Use an email or a username of at least 3 letters." });
      }
      if (password.length < 8) return sendJson(response, 400, { detail: "Password must be at least 8 characters." });
      if (username.toLowerCase() === adminIdentity().username) {
        return sendJson(response, 400, { detail: "That account already exists." });
      }
      const users = readUsers().filter((item) => item.username.toLowerCase() !== username.toLowerCase());
      users.push({ username, password: hashPassword(password) });
      writeUsers(users);
      sendJson(response, 200, { users: users.map((item) => item.username) });
      return;
    }
    if (request.method === "DELETE" && path === "/api/auth/users") {
      const session = requireUser(request, response);
      if (!session) return;
      if (session.role !== "admin") return sendJson(response, 403, { detail: "Only the owner can manage users." });
      let data;
      try {
        data = JSON.parse((await readBody(request)) || "{}");
      } catch {
        return sendJson(response, 400, { detail: "Expected JSON." });
      }
      const username = String(data.username || "").trim().toLowerCase();
      const users = readUsers().filter((item) => item.username.toLowerCase() !== username);
      writeUsers(users);
      sendJson(response, 200, { users: users.map((item) => item.username) });
      return;
    }
    if (request.method === "GET" && path === "/api/cost/catalog") {
      if (!requireUser(request, response)) return;
      sendJson(response, 200, { vehicles: catalog() });
      return;
    }
    if (request.method === "GET" && path === "/api/cost/variant") {
      if (!requireUser(request, response)) return;
      const vehicle = url.searchParams.get("vehicle") || "";
      const index = url.searchParams.get("index") || "0";
      const preset = variantPreset(vehicle, index);
      if (!preset) return sendJson(response, 404, { detail: "Unknown vehicle." });
      sendJson(response, 200, preset);
      return;
    }
    if (request.method === "POST" && path === "/api/cost") {
      if (!requireUser(request, response)) return;
      let data;
      try {
        data = JSON.parse((await readBody(request)) || "{}");
      } catch {
        return sendJson(response, 400, { detail: "Expected JSON." });
      }
      try {
        const result = quote(data);
        if (result.error) return sendJson(response, 400, { detail: result.error });
        sendJson(response, 200, result);
      } catch (error) {
        sendJson(response, 400, { detail: error.message });
      }
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

const hasLogin = Boolean(envValue("BEFORWARD_USER") && envValue("BEFORWARD_PASSWORD"));
if (!sessionCookie() && !hasLogin) {
  console.error("Set BEFORWARD_USER and BEFORWARD_PASSWORD, or a BeForward cookie.");
  process.exit(1);
}

async function boot() {
  if (hasLogin) {
    try {
      await refreshSession();
    } catch (error) {
      console.error(error.message);
      if (!sessionCookie()) process.exit(1);
    }
  }
  server.listen(PORT, HOST, () => {
    const shown = HOST === "0.0.0.0" ? "localhost" : HOST;
    console.log(`DNM Auto (Node) running at http://${shown}:${PORT}`);
  });
}

boot();
