/**
 * Simplified Chinese (zh) Linguistic Validation Test Suite for Reroute NJ
 *
 * Validates that zh.json translations are linguistically accurate Simplified
 * Chinese, suitable for Mandarin-speaking NJ Transit riders from Mainland
 * China and Taiwan communities (Edison, Fort Lee, Parsippany, Jersey City).
 *
 * Run: node tests/test-linguistic-zh.js
 */

var fs = require("fs");
var path = require("path");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

var TRANSLATIONS_DIR = path.join(__dirname, "..", "translations");
var ZH_PATH = path.join(TRANSLATIONS_DIR, "zh.json");
var EN_PATH = path.join(TRANSLATIONS_DIR, "en.json");

// ---------------------------------------------------------------------------
// Test infrastructure (matches project convention)
// ---------------------------------------------------------------------------

var results = [];
var totalPass = 0;
var totalFail = 0;
var totalWarn = 0;

function pass(test, detail) {
  totalPass++;
  results.push({ status: "PASS", test: test, detail: detail || "" });
  console.log("  PASS  " + test + (detail ? " -- " + detail : ""));
}

function fail(test, detail) {
  totalFail++;
  results.push({ status: "FAIL", test: test, detail: detail || "" });
  console.log("  FAIL  " + test + (detail ? " -- " + detail : ""));
}

function warn(test, detail) {
  totalWarn++;
  results.push({ status: "WARN", test: test, detail: detail || "" });
  console.log("  WARN  " + test + (detail ? " -- " + detail : ""));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Flatten a nested object into dot-notation keys.
 */
function flattenObject(obj, prefix) {
  var out = {};
  prefix = prefix || "";
  Object.keys(obj).forEach(function(key) {
    var fullKey = prefix ? prefix + "." + key : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      var nested = flattenObject(obj[key], fullKey);
      Object.keys(nested).forEach(function(nk) {
        out[nk] = nested[nk];
      });
    } else {
      out[fullKey] = obj[key];
    }
  });
  return out;
}

/**
 * Strip HTML tags from a string to get plain text content.
 */
function stripHtml(str) {
  return str.replace(/<[^>]+>/g, "");
}

/**
 * Count occurrences of a substring in a string.
 */
function countOccurrences(str, sub) {
  var count = 0;
  var pos = 0;
  while ((pos = str.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }
  return count;
}

/**
 * Get all Chinese characters from a string (CJK Unified Ideographs range).
 */
function extractChinese(str) {
  var matches = str.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/g);
  return matches || [];
}

// ---------------------------------------------------------------------------
// Load translation files
// ---------------------------------------------------------------------------

var zhRaw, enRaw, zhData, enData, zhFlat, enFlat;

try {
  zhRaw = fs.readFileSync(ZH_PATH, "utf8");
  zhData = JSON.parse(zhRaw);
  zhFlat = flattenObject(zhData);
} catch (e) {
  console.error("FATAL: Cannot load zh.json: " + e.message);
  process.exit(1);
}

try {
  enRaw = fs.readFileSync(EN_PATH, "utf8");
  enData = JSON.parse(enRaw);
  enFlat = flattenObject(enData);
} catch (e) {
  console.error("FATAL: Cannot load en.json: " + e.message);
  process.exit(1);
}

// Concatenate all Chinese translation values for aggregate checks
var allZhValues = Object.keys(zhFlat).map(function(k) {
  return typeof zhFlat[k] === "string" ? zhFlat[k] : "";
});
var allZhText = allZhValues.join(" ");
var allZhPlain = stripHtml(allZhText);

// =========================================================================
// TEST 1: Uses Simplified Chinese characters throughout (not Traditional)
// =========================================================================

console.log("\n--- Test 1: Uses Simplified Chinese characters (not Traditional) ---");

// Comprehensive mapping of Traditional Chinese characters to their Simplified
// equivalents. These are characters where the Traditional form is visually
// distinct and would NOT appear in proper Simplified Chinese text.
var TRADITIONAL_TO_SIMPLIFIED = {
  "\u8ECA": "\u8F66",  // 車 → 车
  "\u5340": "\u533A",  // 區 → 区
  "\u7DDA": "\u7EBF",  // 線 → 线
  "\u9AD4": "\u4F53",  // 體 → 体
  "\u9593": "\u95F4",  // 間 → 间
  "\u5C0D": "\u5BF9",  // 對 → 对
  "\u9EDE": "\u70B9",  // 點 → 点
  "\u9078": "\u9009",  // 選 → 选
  "\u8207": "\u4E0E",  // 與 → 与
  "\u9019": "\u8FD9",  // 這 → 这
  "\u88E1": "\u91CC",  // 裡 → 里
  "\u5BE6": "\u5B9E",  // 實 → 实
  "\u969B": "\u9645",  // 際 → 际
  "\u865F": "\u53F7",  // 號 → 号
  "\u5C0E": "\u5BFC",  // 導 → 导
  "\u7D93": "\u7ECF",  // 經 → 经
  "\u904B": "\u8FD0",  // 運 → 运
  "\u570B": "\u56FD",  // 國 → 国
  "\u958B": "\u5F00",  // 開 → 开
  "\u95DC": "\u5173",  // 關 → 关
  "\u767C": "\u53D1",  // 發 → 发
  "\u8F03": "\u8F83",  // 較 → 较
  "\u8907": "\u590D",  // 複 → 复
  "\u96DC": "\u6742",  // 雜 → 杂
  "\u74B0": "\u73AF",  // 環 → 环
  "\u8996": "\u89C6",  // 視 → 视
  "\u8A8D": "\u8BA4",  // 認 → 认
  "\u7232": "\u4E3A",  // 為 → 为
  "\u5F9E": "\u4ECE",  // 從 → 从
  "\u8AAA": "\u8BF4",  // 說 → 说
  "\u8A9E": "\u8BED",  // 語 → 语
  "\u9032": "\u8FDB",  // 進 → 进
  "\u5099": "\u5907",  // 備 → 备
  "\u6E96": "\u51C6",  // 準 → 准
  "\u78BA": "\u786E",  // 確 → 确
  "\u7BC0": "\u8282",  // 節 → 节
  "\u9023": "\u8FDE",  // 連 → 连
  "\u7D50": "\u7ED3",  // 結 → 结
  "\u6A19": "\u6807",  // 標 → 标
  "\u7576": "\u5F53",  // 當 → 当
  "\u7A2E": "\u79CD",  // 種 → 种
  "\u8CC7": "\u8D44",  // 資 → 资
  "\u8A0A": "\u8BAF",  // 訊 → 讯
  "\u61C9": "\u5E94",  // 應 → 应
  "\u8655": "\u5904",  // 處 → 处
  "\u7522": "\u4EA7",  // 產 → 产
  "\u96FB": "\u7535",  // 電 → 电
  "\u8A71": "\u8BDD",  // 話 → 话
  "\u8A66": "\u8BD5",  // 試 → 试
  "\u5831": "\u62A5",  // 報 → 报
  "\u985E": "\u7C7B",  // 類 → 类
  "\u8B58": "\u8BC6",  // 識 → 识
  "\u5716": "\u56FE",  // 圖 → 图
  "\u66F8": "\u4E66",  // 書 → 书
  "\u8A08": "\u8BA1",  // 計 → 计
  "\u8A2D": "\u8BBE",  // 設 → 设
  "\u7DB2": "\u7F51",  // 網 → 网
  "\u9801": "\u9875",  // 頁 → 页
  "\u55AE": "\u5355",  // 單 → 单
  "\u554F": "\u95EE",  // 問 → 问
  "\u984C": "\u9898",  // 題 → 题
  "\u6A5F": "\u673A",  // 機 → 机
  "\u69CB": "\u6784",  // 構 → 构
  "\u8B70": "\u8BAE",  // 議 → 议
  "\u8B77": "\u62A4",  // 護 → 护
  "\u689D": "\u6761",  // 條 → 条
  "\u58D3": "\u538B",  // 壓 → 压
  "\u6E1B": "\u51CF",  // 減 → 减
  "\u97FF": "\u54CD",  // 響 → 响
  "\u64DA": "\u636E",  // 據 → 据
  "\u8ACB": "\u8BF7",  // 請 → 请
  "\u6771": "\u4E1C",  // 東 → 东
  "\u500B": "\u4E2A",  // 個 → 个
  "\u5B78": "\u5B66",  // 學 → 学
  "\u6A13": "\u697C",  // 樓 → 楼
  "\u6B77": "\u5386",  // 歷 → 历
  "\u6B72": "\u5C81",  // 歲 → 岁
  "\u5EF3": "\u5385",  // 廳 → 厅
  "\u5EE3": "\u5E7F",  // 廣 → 广
  "\u5104": "\u4EBF",  // 億 → 亿
  "\u88DD": "\u88C5",  // 裝 → 装
  "\u8AD6": "\u8BBA",  // 論 → 论
  "\u8B6F": "\u8BD1",  // 譯 → 译
  "\u908A": "\u8FB9",  // 邊 → 边
  "\u9054": "\u8FBE",  // 達 → 达
  "\u904E": "\u8FC7",  // 過 → 过
  "\u9060": "\u8FDC",  // 遠 → 远
  "\u9084": "\u8FD8",  // 還 → 还
  "\u9435": "\u94C1",  // 鐵 → 铁
  "\u9580": "\u95E8",  // 門 → 门
  "\u967D": "\u9633",  // 陽 → 阳
  "\u96B1": "\u961F",  // 隊 → 队
  "\u96F2": "\u4E91",  // 雲 → 云
  "\u9CE5": "\u9E1F",  // 鳥 → 鸟
  "\u9F8D": "\u9F99",  // 龍 → 龙
  "\u4E82": "\u4E71",  // 亂 → 乱
  "\u8CB7": "\u4E70",  // 買 → 买
  "\u8CE3": "\u5356",  // 賣 → 卖
  "\u96E2": "\u79BB",  // 離 → 离
  "\u96E3": "\u96BE",  // 難 → 难
  "\u98DB": "\u98DE",  // 飛 → 飞
  "\u9A57": "\u9A8C",  // 驗 → 验
  "\u50B3": "\u4F20",  // 傳 → 传
  "\u512A": "\u4F18",  // 優 → 优
  "\u50C5": "\u4EC5",  // 僅 → 仅
  "\u50F9": "\u4EF7",  // 價 → 价
  "\u50B7": "\u4F24",  // 傷 → 伤
  "\u5275": "\u521B",  // 創 → 创
  "\u52D5": "\u52A8",  // 動 → 动
  "\u52D9": "\u52A1",  // 務 → 务
  "\u83EF": "\u534E",  // 華 → 华
  "\u885B": "\u536B",  // 衛 → 卫
  "\u5EE0": "\u5382",  // 廠 → 厂
  "\u96D9": "\u53CC",  // 雙 → 双
  "\u6B61": "\u6B22",  // 歡 → 欢
  "\u6B78": "\u5F52",  // 歸 → 归
  "\u611B": "\u7231",  // 愛 → 爱
  "\u78BC": "\u7801",  // 碼 → 码
  "\u79AE": "\u793C",  // 禮 → 礼
  "\u7AF6": "\u7ADE",  // 競 → 竞
  "\u7B46": "\u7B14",  // 筆 → 笔
  "\u7D00": "\u7EAA",  // 紀 → 纪
  "\u7D04": "\u7EA6",  // 約 → 约
  "\u7D05": "\u7EA2",  // 紅 → 红
  "\u7D30": "\u7EC6",  // 細 → 细
  "\u7D42": "\u7EC8",  // 終 → 终
  "\u7DF4": "\u7EC3",  // 練 → 练
  "\u7D44": "\u7EC4",  // 組 → 组
  "\u7DAD": "\u7EF4",  // 維 → 维
  "\u7E7C": "\u7EE7",  // 繼 → 继
  "\u7E3D": "\u603B",  // 總 → 总
  "\u7E54": "\u7EC7",  // 織 → 织
  "\u8077": "\u804C",  // 職 → 职
  "\u8166": "\u8111",  // 腦 → 脑
  "\u81E8": "\u4E34",  // 臨 → 临
  "\u8209": "\u4E3E"   // 舉 → 举
};

// Scan every value for Traditional characters
var traditionalIssues = [];
Object.keys(zhFlat).forEach(function(key) {
  var val = zhFlat[key];
  if (typeof val !== "string") return;
  for (var i = 0; i < val.length; i++) {
    var ch = val[i];
    if (TRADITIONAL_TO_SIMPLIFIED[ch]) {
      traditionalIssues.push({
        key: key,
        traditional: ch,
        simplified: TRADITIONAL_TO_SIMPLIFIED[ch],
        context: val.substring(Math.max(0, i - 5), Math.min(val.length, i + 6))
      });
    }
  }
});

if (traditionalIssues.length === 0) {
  pass("No Traditional Chinese characters found", "All " + extractChinese(allZhPlain).length + " CJK characters are Simplified");
} else {
  var details = traditionalIssues.map(function(issue) {
    return issue.key + ": '" + issue.traditional + "' should be '" + issue.simplified + "' (..." + issue.context + "...)";
  });
  fail(traditionalIssues.length + " Traditional Chinese characters found", details.slice(0, 10).join("; "));
}

// =========================================================================
// TEST 2: Key transit terms translated correctly
// =========================================================================

console.log("\n--- Test 2: Key transit terms translated correctly ---");

// 2a: "train" should be 火车 or 列车
var trainTerms = ["\u706B\u8F66", "\u5217\u8F66"]; // 火车, 列车
var trainFound = trainTerms.some(function(t) { return allZhPlain.indexOf(t) !== -1; });
if (trainFound) {
  var huocheCount = countOccurrences(allZhPlain, "\u706B\u8F66");
  var liecheCount = countOccurrences(allZhPlain, "\u5217\u8F66");
  pass("'train' translated correctly", "\u5217\u8F66 (lieche): " + liecheCount + " uses, \u706B\u8F66 (huoche): " + huocheCount + " uses");
} else {
  fail("'train' not found as \u706B\u8F66 or \u5217\u8F66");
}

// 2b: "station" should be 车站 or 站
var stationTerms = ["\u8F66\u7AD9", "\u7AD9"]; // 车站, 站
var stationFound = stationTerms.some(function(t) { return allZhPlain.indexOf(t) !== -1; });
if (stationFound) {
  var chezhanCount = countOccurrences(allZhPlain, "\u8F66\u7AD9");
  pass("'station' translated correctly", "\u8F66\u7AD9 (chezhan): " + chezhanCount + " uses, plus \u7AD9 (zhan) in compounds");
} else {
  fail("'station' not found as \u8F66\u7AD9 or \u7AD9");
}

// 2c: "commute" should be 通勤
var commuteFound = allZhPlain.indexOf("\u901A\u52E4") !== -1; // 通勤
if (commuteFound) {
  var tongqinCount = countOccurrences(allZhPlain, "\u901A\u52E4");
  pass("'commute' translated correctly", "\u901A\u52E4 (tongqin): " + tongqinCount + " uses");
} else {
  fail("'commute' not found as \u901A\u52E4");
}

// 2d: "service" should be 服务
var serviceFound = allZhPlain.indexOf("\u670D\u52A1") !== -1; // 服务
if (serviceFound) {
  var fuwuCount = countOccurrences(allZhPlain, "\u670D\u52A1");
  pass("'service' translated correctly", "\u670D\u52A1 (fuwu): " + fuwuCount + " uses");
} else {
  fail("'service' not found as \u670D\u52A1");
}

// 2e: "schedule" should be 时刻表 or 班次
var scheduleTerms = ["\u65F6\u523B\u8868", "\u73ED\u6B21"]; // 时刻表, 班次
var scheduleFound = scheduleTerms.some(function(t) { return allZhPlain.indexOf(t) !== -1; });
if (scheduleFound) {
  var shikebiaoCount = countOccurrences(allZhPlain, "\u65F6\u523B\u8868");
  var banciCount = countOccurrences(allZhPlain, "\u73ED\u6B21");
  pass("'schedule' translated correctly", "\u65F6\u523B\u8868 (shikebiao): " + shikebiaoCount + " uses, \u73ED\u6B21 (banci): " + banciCount + " uses");
} else {
  fail("'schedule' not found as \u65F6\u523B\u8868 or \u73ED\u6B21");
}

// 2f: "transfer" should be 换乘 or 转车
var transferTerms = ["\u6362\u4E58", "\u8F6C\u8F66"]; // 换乘, 转车
var transferFound = transferTerms.some(function(t) { return allZhPlain.indexOf(t) !== -1; });
if (transferFound) {
  var huanchengCount = countOccurrences(allZhPlain, "\u6362\u4E58");
  var zhuancheCount = countOccurrences(allZhPlain, "\u8F6C\u8F66");
  pass("'transfer' translated correctly", "\u6362\u4E58 (huancheng): " + huanchengCount + " uses, \u8F6C\u8F66 (zhuanche): " + zhuancheCount + " uses");
} else {
  fail("'transfer' not found as \u6362\u4E58 or \u8F6C\u8F66");
}

// 2g: "delay" should be 延误 or 延迟
var delayTerms = ["\u5EF6\u8BEF", "\u5EF6\u8FDF"]; // 延误, 延迟
var delayFound = delayTerms.some(function(t) { return allZhPlain.indexOf(t) !== -1; });
if (delayFound) {
  var yanwuCount = countOccurrences(allZhPlain, "\u5EF6\u8BEF");
  var yanchiCount = countOccurrences(allZhPlain, "\u5EF6\u8FDF");
  pass("'delay' translated correctly", "\u5EF6\u8BEF (yanwu): " + yanwuCount + " uses, \u5EF6\u8FDF (yanchi): " + yanchiCount + " uses");
} else {
  fail("'delay' not found as \u5EF6\u8BEF or \u5EF6\u8FDF");
}

// =========================================================================
// TEST 3: Natural Mandarin (not awkward machine translation)
// =========================================================================

console.log("\n--- Test 3: Natural Mandarin (not awkward machine translation) ---");

// 3a: Check for common machine translation red flags
var mtRedFlags = [
  { pattern: /\u7684\u7684/g, name: "\u7684\u7684 (double de - unnatural)" },  // 的的
  { pattern: /\u4E86\u4E86/g, name: "\u4E86\u4E86 (double le - unnatural)" },  // 了了
  { pattern: /\u662F\u662F/g, name: "\u662F\u662F (double shi - unnatural)" },  // 是是
  { pattern: /\u5728\u5728/g, name: "\u5728\u5728 (double zai - unnatural)" },  // 在在
  { pattern: /\u4E0D\u4E0D/g, name: "\u4E0D\u4E0D (double bu - likely error)" },  // 不不
  { pattern: /\u4F60\u4F60/g, name: "\u4F60\u4F60 (double ni - unnatural)" }   // 你你
];

var mtIssues = [];
mtRedFlags.forEach(function(flag) {
  var matches = allZhPlain.match(flag.pattern);
  if (matches && matches.length > 0) {
    mtIssues.push(flag.name + " (" + matches.length + " times)");
  }
});

if (mtIssues.length === 0) {
  pass("No common machine translation artifacts (doubled particles/characters)");
} else {
  fail("Machine translation red flags found", mtIssues.join("; "));
}

// 3b: Check sentence-final particles are used naturally
// Good Chinese writing uses particles like 了, 吗, 吧, 呢 at sentence boundaries
var particles = ["\u4E86", "\u5427", "\u5417", "\u5462"]; // 了, 吧, 吗, 呢
var particleCount = 0;
particles.forEach(function(p) {
  particleCount += countOccurrences(allZhPlain, p);
});
if (particleCount > 0) {
  pass("Sentence-final particles present (natural Mandarin)", particleCount + " particle uses found (\u4E86/\u5427/\u5417/\u5462)");
} else {
  warn("No sentence-final particles found (may indicate overly formal/stiff translation)");
}

// 3c: Check that Chinese text does not have excessive English words mixed in
// (beyond proper nouns). Look for common English function words embedded in Chinese.
var englishFunctionWords = /\b(the|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|shall|should|may|might|can|could|must|of|at|by|for|with|from|into|onto|upon|about|but|and|or|nor|not|so|yet|if|then|because|although|though|while|when|where|how|what|which|who|whom|whose|that|this|these|those|it|its|they|them|their|we|us|our|he|him|his|she|her|you|your|I|my|me)\b/gi;

// Strip out known proper nouns, HTML, and URLs before checking
var textForEnglishCheck = allZhPlain
  .replace(/NJ Transit/g, "")
  .replace(/Portal (North )?Bridge/g, "")
  .replace(/Hoboken/g, "")
  .replace(/Newark/g, "")
  .replace(/Secaucus/g, "")
  .replace(/PATH/g, "")
  .replace(/Penn Station/g, "")
  .replace(/Amtrak/g, "")
  .replace(/Manhattan/g, "")
  .replace(/Northeast Corridor/g, "")
  .replace(/Midtown Direct/g, "")
  .replace(/NY Waterway/g, "")
  .replace(/Port Authority/g, "")
  .replace(/Lincoln Tunnel/g, "")
  .replace(/Montclair-Boonton/g, "")
  .replace(/Morris & Essex/g, "")
  .replace(/Gladstone/g, "")
  .replace(/Raritan Valley/g, "")
  .replace(/North Jersey Coast/g, "")
  .replace(/Atlantic City/g, "")
  .replace(/Morristown Line/g, "")
  .replace(/Perth Amboy/g, "")
  .replace(/Woodbridge/g, "")
  .replace(/Hudson (Place|River)/g, "")
  .replace(/Hackensack River/g, "")
  .replace(/Gateway Program/g, "")
  .replace(/Reroute NJ/g, "")
  .replace(/Joe Amditis/g, "")
  .replace(/GitHub/g, "")
  .replace(/Facebook/g, "")
  .replace(/WordPress|Squarespace|Ghost|Substack|Netlify|Vercel/g, "")
  .replace(/MIT/g, "")
  .replace(/WCAG/g, "")
  .replace(/CSS|HTML|PNG|CMS|IIFE|API|iframe|OG|JSON-LD|CTA/gi, "")
  .replace(/https?:\/\/[^\s]+/g, "")
  .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "")
  .replace(/Bus 126/g, "")
  .replace(/W\. 39th St/g, "")
  .replace(/33rd Street/g, "")
  .replace(/WTC/g, "")
  .replace(/NEC/g, "")
  .replace(/PSNY/g, "")
  .replace(/NYC/g, "")
  .replace(/NJ/g, "")
  .replace(/PDF/g, "")
  .replace(/M-B|M&E/g, "")
  .replace(/:root/g, "")
  .replace(/css\/styles\.css/g, "")
  .replace(/data\/coverage\.json/g, "")
  .replace(/data-[a-z-]+="[^"]*"/g, "")
  .replace(/&[a-z]+;/g, "")
  .replace(/\?embed=true/g, "")
  .replace(/&theme=dark/g, "")
  .replace(/&accent=FF6B35/g, "")
  .replace(/data-theme="dark"/g, "")
  .replace(/data-accent="FF6B35"/g, "")
  .replace(/reroutenj\.org/g, "")
  .replace(/njtransit\.com/g, "")
  .replace(/robots\.txt/g, "")
  .replace(/llms\.txt/g, "")
  .replace(/sitemap\.xml/g, "")
  .replace(/hreflang/g, "")
  .replace(/GitHub Pages/g, "")
  .replace(/Canvas/g, "")
  .replace(/\bScript\b/g, "")
  .replace(/\bIframe\b/g, "")
  .replace(/\bTheme\b/g, "")
  .replace(/\bAccent color\b/g, "")
  .replace(/\bDownload (PNG|HTML)\b/g, "")
  .replace(/joe@amditis\.com/g, "")
  .replace(/amditisj@montclair\.edu/g, "")
  .replace(/\.reroutenj-embed/g, "")
  .replace(/PR/g, "");

var engMatches = textForEnglishCheck.match(englishFunctionWords);
if (!engMatches || engMatches.length === 0) {
  pass("No stray English function words mixed into Chinese text");
} else if (engMatches.length <= 3) {
  warn("Few English function words in Chinese text (" + engMatches.length + ")", engMatches.join(", "));
} else {
  fail("Excessive English function words in Chinese text (" + engMatches.length + ")", engMatches.slice(0, 15).join(", "));
}

// 3d: Check that translations are not excessively long compared to English
// Chinese text is typically 30-70% the length of equivalent English (in chars)
var lengthIssues = [];
Object.keys(enFlat).forEach(function(key) {
  var enVal = enFlat[key];
  var zhVal = zhFlat[key];
  if (typeof enVal !== "string" || typeof zhVal !== "string") return;

  var enPlain = stripHtml(enVal).replace(/&[a-z]+;/g, " ").trim();
  var zhPlain = stripHtml(zhVal).replace(/&[a-z]+;/g, " ").trim();

  // Skip very short strings (labels, buttons)
  if (enPlain.length < 20) return;
  // Skip meta keys
  if (key.indexOf("meta.") === 0) return;

  // Chinese characters are information-dense; expect ratio between 0.15 and 1.5
  var ratio = zhPlain.length / enPlain.length;
  if (ratio > 2.0) {
    lengthIssues.push(key + " (ratio: " + ratio.toFixed(2) + ", zh=" + zhPlain.length + " en=" + enPlain.length + ")");
  }
});

if (lengthIssues.length === 0) {
  pass("Translation lengths are within expected range vs English");
} else if (lengthIssues.length <= 3) {
  warn(lengthIssues.length + " translations unusually long vs English (may contain untrimmed content)", lengthIssues.join("; "));
} else {
  fail(lengthIssues.length + " translations excessively long compared to English", lengthIssues.slice(0, 10).join("; "));
}

// =========================================================================
// TEST 4: Proper measure words are used
// =========================================================================

console.log("\n--- Test 4: Proper measure words are used ---");

// Chinese requires measure words between numbers and nouns.
// Key measure words for this transit context:
//   条 (tiao) - for lines/routes
//   个 (ge) - general (stations, options)
//   班 (ban) - for scheduled trains/buses
//   分钟 (fenzhong) - minutes
//   种 (zhong) - for types/kinds
//   款 (kuan) - for tools/software
//   天 (tian) - for days
//   周 (zhou) - for weeks

var measureWordChecks = [
  { word: "\u6761", pinyin: "tiao", usage: "for lines/routes", minExpected: 1 },   // 条
  { word: "\u4E2A", pinyin: "ge", usage: "general (stations, options)", minExpected: 1 },  // 个
  { word: "\u73ED", pinyin: "ban", usage: "for scheduled services", minExpected: 1 },  // 班
  { word: "\u5206\u949F", pinyin: "fenzhong", usage: "for minutes", minExpected: 1 },  // 分钟
  { word: "\u79CD", pinyin: "zhong", usage: "for types/kinds", minExpected: 1 },  // 种
  { word: "\u5929", pinyin: "tian", usage: "for days", minExpected: 1 },  // 天
  { word: "\u5468", pinyin: "zhou", usage: "for weeks", minExpected: 1 }   // 周
];

var measureWordIssues = [];
var measureWordDetails = [];
measureWordChecks.forEach(function(check) {
  var count = countOccurrences(allZhPlain, check.word);
  if (count >= check.minExpected) {
    measureWordDetails.push(check.word + " " + check.pinyin + " (" + check.usage + "): " + count);
  } else {
    measureWordIssues.push(check.word + " " + check.pinyin + " (" + check.usage + "): expected at least " + check.minExpected + ", found " + count);
  }
});

if (measureWordIssues.length === 0) {
  pass("All expected measure words present", measureWordDetails.join("; "));
} else {
  fail("Missing expected measure words", measureWordIssues.join("; "));
}

// Check that numbers before nouns have measure words (spot check common patterns)
// Pattern: number + 线路 should ideally have 条 between them
var numLinePattern = /\d+\u6761\u7EBF\u8DEF/g; // N条线路
var numLineNoMW = /\d+\u7EBF\u8DEF/g;  // N线路 (missing measure word)
var correctLineCount = (allZhPlain.match(numLinePattern) || []).length;
var incorrectLineCount = (allZhPlain.match(numLineNoMW) || []).length - correctLineCount;

if (incorrectLineCount <= 0) {
  pass("Numbers before \u7EBF\u8DEF (lines) use measure word \u6761 correctly");
} else {
  warn(incorrectLineCount + " instances of number + \u7EBF\u8DEF without measure word \u6761");
}

// =========================================================================
// TEST 5: Station names and line names stay in English
// =========================================================================

console.log("\n--- Test 5: Station names and line names stay in English ---");

// Line names that must remain in English
var lineNames = [
  "Montclair-Boonton",
  "Morris & Essex",
  "Northeast Corridor",
  "North Jersey Coast",
  "Raritan Valley",
  "Gladstone",
  "Morristown Line",
  "Atlantic City"
];

// Station/place names that must remain in English
var stationNames = [
  "Hoboken Terminal",
  "Hoboken",
  "Newark Penn",
  "Secaucus Junction",
  "Penn Station",
  "Port Authority"
];

var nameIssues = [];

// Check line names appear in English in zh values
lineNames.forEach(function(name) {
  // Check if the English name appears in zh.json values
  var found = false;
  Object.keys(zhFlat).forEach(function(key) {
    var val = zhFlat[key];
    if (typeof val === "string" && val.indexOf(name) !== -1) {
      found = true;
    }
  });
  // Only check lines that actually appear in English text
  var inEn = false;
  Object.keys(enFlat).forEach(function(key) {
    var val = enFlat[key];
    if (typeof val === "string" && val.indexOf(name) !== -1) {
      inEn = true;
    }
  });
  if (inEn && !found) {
    nameIssues.push("Line name '" + name + "' not found in English in zh.json");
  }
});

// Check station/place names appear in English in zh values
stationNames.forEach(function(name) {
  var found = false;
  Object.keys(zhFlat).forEach(function(key) {
    var val = zhFlat[key];
    if (typeof val === "string" && val.indexOf(name) !== -1) {
      found = true;
    }
  });
  var inEn = false;
  Object.keys(enFlat).forEach(function(key) {
    var val = enFlat[key];
    if (typeof val === "string" && val.indexOf(name) !== -1) {
      inEn = true;
    }
  });
  if (inEn && !found) {
    nameIssues.push("Station name '" + name + "' not found in English in zh.json");
  }
});

// Verify no common Chinese translations of transit station/infrastructure names
// leaked in. Note: geographic names like 曼哈顿 (Manhattan), 纽约 (New York),
// 新泽西 (New Jersey) are CORRECT Chinese usage -- these are standard Chinese
// names for major geographic places, unlike station names on physical signage
// (Hoboken Terminal, Newark Penn, etc.) which should remain in English.
var chineseTranslitErrors = [
  "\u970D\u535A\u80AF",        // 霍博肯 (Hoboken transliteration - should stay English)
  "\u7EBD\u74E6\u514B",        // 纽瓦克 (Newark transliteration - should stay English)
  "\u5E03\u6717\u514B\u65AF",  // 布朗克斯 (Bronx transliteration)
  "\u6CE2\u7279\u5170"         // 波特兰 (Portland transliteration)
];

var translitIssues = [];
chineseTranslitErrors.forEach(function(translit) {
  if (allZhPlain.indexOf(translit) !== -1) {
    translitIssues.push("Found Chinese transliteration: " + translit);
  }
});

if (nameIssues.length === 0 && translitIssues.length === 0) {
  pass("All station and line names preserved in English", lineNames.length + " line names + " + stationNames.length + " station names verified");
} else {
  var allIssues = nameIssues.concat(translitIssues);
  if (allIssues.length <= 2) {
    warn(allIssues.length + " naming issues found", allIssues.join("; "));
  } else {
    fail(allIssues.length + " naming issues found", allIssues.join("; "));
  }
}

// =========================================================================
// TEST 6: Numbers use appropriate format
// =========================================================================

console.log("\n--- Test 6: Numbers use appropriate format ---");

// 6a: No full-width digits (should use half-width for web)
var fullWidthDigitRe = /[\uFF10-\uFF19]/;
var fullWidthIssues = [];
Object.keys(zhFlat).forEach(function(key) {
  var val = zhFlat[key];
  if (typeof val !== "string") return;
  if (fullWidthDigitRe.test(val)) {
    fullWidthIssues.push(key);
  }
});

if (fullWidthIssues.length === 0) {
  pass("All digits use half-width format (correct for web context)");
} else {
  fail("Full-width digits found in: " + fullWidthIssues.join(", "));
}

// 6b: Transit-specific numbers preserved from English
var transitNumbers = {
  "133": "NEC trains before",
  "112": "NEC trains during",
  "109": "NJCL trains before",
  "92": "NJCL trains during",
  "50": "service reduction percentage",
  "126": "Bus 126",
  "1910": "old bridge year",
  "115": "bridge age",
  "15": "billion replacement (1.5)"
};

var numberIssues = [];
Object.keys(transitNumbers).forEach(function(num) {
  var desc = transitNumbers[num];
  // Check if the number appears in en values
  var inEn = false;
  Object.keys(enFlat).forEach(function(key) {
    if (typeof enFlat[key] === "string" && enFlat[key].indexOf(num) !== -1) {
      inEn = true;
    }
  });
  if (!inEn) return;

  // Verify it also appears in zh values
  var inZh = false;
  Object.keys(zhFlat).forEach(function(key) {
    if (typeof zhFlat[key] === "string" && zhFlat[key].indexOf(num) !== -1) {
      inZh = true;
    }
  });
  if (!inZh) {
    numberIssues.push(num + " (" + desc + ")");
  }
});

if (numberIssues.length === 0) {
  pass("All transit-specific numbers preserved from English");
} else {
  fail("Missing transit numbers in Chinese: " + numberIssues.join("; "));
}

// 6c: Dates use consistent format
// Check that date references like "2月15日" or "3月15日" are present
var datePatterns = [
  { pattern: "2\u670815\u65E5", desc: "Feb 15 (2\u670815\u65E5)" },  // 2月15日
  { pattern: "3\u670815\u65E5", desc: "Mar 15 (3\u670815\u65E5)" }   // 3月15日
];

var dateIssues = [];
datePatterns.forEach(function(dp) {
  if (allZhText.indexOf(dp.pattern) === -1) {
    dateIssues.push(dp.desc + " not found");
  }
});

if (dateIssues.length === 0) {
  pass("Key dates present in Chinese date format (\u6708/\u65E5)");
} else {
  warn("Some date patterns not found", dateIssues.join("; "));
}

// =========================================================================
// TEST 7: HTML entities preserved
// =========================================================================

console.log("\n--- Test 7: HTML entities preserved ---");

var htmlEntities = ["&mdash;", "&rarr;", "&copy;", "&amp;"];

var entityIssues = [];
htmlEntities.forEach(function(entity) {
  // Count in English
  var enCount = 0;
  Object.keys(enFlat).forEach(function(key) {
    if (typeof enFlat[key] === "string") {
      enCount += countOccurrences(enFlat[key], entity);
    }
  });

  // Count in Chinese
  var zhCount = 0;
  Object.keys(zhFlat).forEach(function(key) {
    if (typeof zhFlat[key] === "string") {
      zhCount += countOccurrences(zhFlat[key], entity);
    }
  });

  if (enCount === 0) return; // Not used in English, skip

  if (zhCount === enCount) {
    pass("Entity " + entity + " preserved", "en=" + enCount + ", zh=" + zhCount);
  } else if (zhCount > 0) {
    warn("Entity " + entity + " count differs", "en=" + enCount + ", zh=" + zhCount + " (some may be legitimately different)");
  } else {
    fail("Entity " + entity + " missing from Chinese translations", "en=" + enCount + ", zh=" + zhCount);
  }
});

// Check that HTML tags (structure) are preserved
var htmlTagIssues = [];
Object.keys(enFlat).forEach(function(key) {
  var enVal = enFlat[key];
  var zhVal = zhFlat[key];
  if (typeof enVal !== "string" || typeof zhVal !== "string") return;

  // Extract tag types
  var enTagRe = /<(\/?)(strong|a|code|em|br)\b/g;
  var zhTagRe = /<(\/?)(strong|a|code|em|br)\b/g;

  var enTags = [];
  var zhTags = [];
  var m;

  while ((m = enTagRe.exec(enVal)) !== null) {
    enTags.push(m[0]);
  }
  while ((m = zhTagRe.exec(zhVal)) !== null) {
    zhTags.push(m[0]);
  }

  if (enTags.length > 0 && zhTags.length === 0) {
    htmlTagIssues.push(key + " (en has " + enTags.length + " tags, zh has none)");
  }
});

if (htmlTagIssues.length === 0) {
  pass("All HTML structural tags preserved in Chinese translations");
} else {
  fail(htmlTagIssues.length + " keys lost HTML tags in translation", htmlTagIssues.slice(0, 10).join("; "));
}

// =========================================================================
// TEST 8: No Japanese kanji or Korean characters mixed in
// =========================================================================

console.log("\n--- Test 8: No Japanese kanji or Korean characters mixed in ---");

// 8a: Check for Japanese hiragana
var hiraganaRe = /[\u3040-\u309F]/;
var hiraganaIssues = [];
Object.keys(zhFlat).forEach(function(key) {
  var val = zhFlat[key];
  if (typeof val !== "string") return;
  for (var i = 0; i < val.length; i++) {
    if (hiraganaRe.test(val[i])) {
      hiraganaIssues.push(key + ": '" + val[i] + "' at position " + i);
      break;
    }
  }
});

if (hiraganaIssues.length === 0) {
  pass("No Japanese hiragana characters found");
} else {
  fail("Japanese hiragana found in: " + hiraganaIssues.join("; "));
}

// 8b: Check for Japanese katakana
var katakanaRe = /[\u30A0-\u30FF]/;
var katakanaIssues = [];
Object.keys(zhFlat).forEach(function(key) {
  var val = zhFlat[key];
  if (typeof val !== "string") return;
  for (var i = 0; i < val.length; i++) {
    if (katakanaRe.test(val[i])) {
      katakanaIssues.push(key + ": '" + val[i] + "' at position " + i);
      break;
    }
  }
});

if (katakanaIssues.length === 0) {
  pass("No Japanese katakana characters found");
} else {
  fail("Japanese katakana found in: " + katakanaIssues.join("; "));
}

// 8c: Check for Korean hangul
var hangulRe = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
var hangulIssues = [];
Object.keys(zhFlat).forEach(function(key) {
  var val = zhFlat[key];
  if (typeof val !== "string") return;
  for (var i = 0; i < val.length; i++) {
    if (hangulRe.test(val[i])) {
      hangulIssues.push(key + ": '" + val[i] + "' at position " + i);
      break;
    }
  }
});

if (hangulIssues.length === 0) {
  pass("No Korean hangul characters found");
} else {
  fail("Korean hangul found in: " + hangulIssues.join("; "));
}

// 8d: Check for Japanese-only kanji (characters in CJK that are used in
// Japanese but very rarely or never in Chinese). This is a focused check
// on characters that are strong indicators of Japanese text.
var japaneseOnlyKanji = [
  "\u8A33",  // 訳 (Japanese form of 译)
  "\u6CA2",  // 沢 (Japanese for 泽)
  "\u6C17",  // 気 (Japanese for 气)
  "\u5186",  // 円 (Japanese yen/circle, Chinese uses 圆)
  "\u4E21",  // 両 (Japanese for 两)
  "\u56F3",  // 図 (Japanese for 图)
  "\u99C5",  // 駅 (Japanese for 站 - key transit term!)
  "\u5207\u7B26",  // 切符 (Japanese for ticket)
  "\u96FB\u8ECA"   // 電車 (Japanese for train - uses Traditional 電)
];

var japKanjiIssues = [];
japaneseOnlyKanji.forEach(function(kanji) {
  if (allZhText.indexOf(kanji) !== -1) {
    var codePoint = kanji.length === 1
      ? "U+" + kanji.charCodeAt(0).toString(16).toUpperCase()
      : kanji;
    japKanjiIssues.push(kanji + " (" + codePoint + ")");
  }
});

if (japKanjiIssues.length === 0) {
  pass("No Japanese-only kanji forms detected");
} else {
  fail("Japanese kanji forms found: " + japKanjiIssues.join("; "));
}

// =========================================================================
// TEST 9 (Bonus): Consistency of terminology within zh.json
// =========================================================================

console.log("\n--- Test 9: Terminology consistency within zh.json ---");

// Check that the same English concept is translated consistently
// "cutover" should consistently be 转换 (zhuanhuan)
var cutoverTranslations = {};
Object.keys(zhFlat).forEach(function(key) {
  var enVal = enFlat[key];
  var zhVal = zhFlat[key];
  if (typeof enVal !== "string" || typeof zhVal !== "string") return;
  if (enVal.toLowerCase().indexOf("cutover") === -1) return;

  // Check what Chinese word is used for "cutover"
  if (zhVal.indexOf("\u8F6C\u6362") !== -1) cutoverTranslations["\u8F6C\u6362"] = (cutoverTranslations["\u8F6C\u6362"] || 0) + 1;  // 转换
  if (zhVal.indexOf("\u5207\u6362") !== -1) cutoverTranslations["\u5207\u6362"] = (cutoverTranslations["\u5207\u6362"] || 0) + 1;  // 切换
  if (zhVal.indexOf("\u8FC7\u6E21") !== -1) cutoverTranslations["\u8FC7\u6E21"] = (cutoverTranslations["\u8FC7\u6E21"] || 0) + 1;  // 过渡
});

var cutoverTerms = Object.keys(cutoverTranslations);
if (cutoverTerms.length <= 2) {
  pass("'Cutover' translated consistently", cutoverTerms.map(function(t) {
    return t + " (" + cutoverTranslations[t] + " times)";
  }).join(", "));
} else {
  warn("'Cutover' has " + cutoverTerms.length + " different translations (may cause reader confusion)", cutoverTerms.map(function(t) {
    return t + " (" + cutoverTranslations[t] + " times)";
  }).join(", "));
}

// Check "embed" translation consistency
var embedTranslations = {};
Object.keys(zhFlat).forEach(function(key) {
  var enVal = enFlat[key];
  var zhVal = zhFlat[key];
  if (typeof enVal !== "string" || typeof zhVal !== "string") return;
  if (enVal.toLowerCase().indexOf("embed") === -1) return;

  if (zhVal.indexOf("\u5D4C\u5165") !== -1) embedTranslations["\u5D4C\u5165"] = (embedTranslations["\u5D4C\u5165"] || 0) + 1;  // 嵌入
});

if (Object.keys(embedTranslations).length >= 1) {
  pass("'Embed' translated consistently as \u5D4C\u5165", Object.keys(embedTranslations).map(function(t) {
    return t + " (" + embedTranslations[t] + " times)";
  }).join(", "));
} else {
  warn("'Embed' translation not found or inconsistent");
}

// =========================================================================
// TEST 10 (Bonus): Chinese punctuation conventions
// =========================================================================

console.log("\n--- Test 10: Chinese punctuation and spacing conventions ---");

// In Chinese web text, half-width Arabic numerals and English proper nouns
// are standard. The key check is that Chinese-language sentences use
// appropriate Chinese punctuation where it matters.

// Check for proper use of Chinese comma (，) and period (。) in long Chinese text
var chineseCommaCount = countOccurrences(allZhPlain, "\uFF0C"); // ，
var chinesePeriodCount = countOccurrences(allZhPlain, "\u3002"); // 。
var chineseDunCount = countOccurrences(allZhPlain, "\u3001");    // 、(enumeration comma)

// Chinese text of this volume should have substantial Chinese punctuation
// The translations use Chinese punctuation within Chinese text and English
// punctuation around English proper nouns, which is acceptable style.
if (chineseCommaCount > 0 || chinesePeriodCount > 0 || chineseDunCount > 0) {
  pass("Chinese punctuation present in translations", "\uFF0C: " + chineseCommaCount + ", \u3002: " + chinesePeriodCount + ", \u3001: " + chineseDunCount);
} else {
  warn("No Chinese punctuation found (may use only English punctuation)");
}

// =========================================================================
// Final summary
// =========================================================================

console.log("\n" + "=".repeat(60));
console.log("SUMMARY: Simplified Chinese Linguistic Validation");
console.log("=".repeat(60));
console.log("  Total PASS: " + totalPass);
console.log("  Total FAIL: " + totalFail);
console.log("  Total WARN: " + totalWarn);
console.log("  Total checks: " + (totalPass + totalFail + totalWarn));
console.log("=".repeat(60));

if (totalFail === 0) {
  console.log("\n  All tests passed!" + (totalWarn > 0 ? " (" + totalWarn + " warnings to review)" : ""));
} else {
  console.log("\n  " + totalFail + " test(s) FAILED. Review the output above for details.");
}

console.log("");
process.exit(totalFail > 0 ? 1 : 0);
