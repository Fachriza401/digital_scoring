(function (global) {
  "use strict";

  var STORAGE_KEY = "ipsi_scoring_state";
  var STATE_VERSION = 3;
  var MAX_LOGS = 240;
  var MAX_HISTORY = 80;
  var MAX_TIMELINE = 300;
  var MAX_TEXT = 80;
  var MAX_IMAGE_LENGTH = 400000;

  function defaultState() {
    return {
      meta: { version: STATE_VERSION, updatedAt: Date.now() },
      event: {
        name: "KEJUARAAN NASIONAL PENCAK SILAT 2026",
        match: "PARTAI 01",
        category: "TANDING PUTRA - KELAS A",
        blueName: "PESILAT BIRU",
        blueContingent: "KONTINGEN BIRU",
        redName: "PESILAT MERAH",
        redContingent: "KONTINGEN MERAH",
        blueLogo: "",
        redLogo: "",
        blueContingentLogo: "",
        redContingentLogo: "",
        roundDuration: 120,
        rounds: 3,
        schedule: ""
      },
      round: 1,
      judgeActive: "judge1",
      teamBlue: makeTeam("PESILAT BIRU", "KONTINGEN BIRU"),
      teamRed: makeTeam("PESILAT MERAH", "KONTINGEN MERAH"),
      judges: makeJudges(),
      timer: { duration: 120, remaining: 120, running: false, startedAt: null, status: "READY", emergency: false },
      logs: [],
      timeline: [],
      history: [],
      classes: [],
      activeClassId: null,
      bracket: emptyBracket()
    };
  }

  function emptyBracket() {
    return {
      title: "BAGAN PERTANDINGAN",
      category: "",
      participants: [],
      rounds: [],
      activeMatchId: null,
      updatedAt: null
    };
  }

  function makeTeam(name, contingent) {
    return {
      name: name,
      contingent: contingent,
      score: 0,
      punches: 0,
      kicks: 0,
      warnings: 0,
      penalties: 0,
      falls: 0,
      disqualified: false,
      binaan1: 0,
      binaan2: 0,
      teguran1: 0,
      teguran2: 0,
      teguran3: 0,
      peringatan1: 0,
      peringatan2: 0,
      peringatan3: 0,
      pendingFalls: 0,
      pendingPenalties: 0
    };
  }

  function makeJudges() {
    return {
      judge1: { bluePunch: 0, blueKick: 0, redPunch: 0, redKick: 0 },
      judge2: { bluePunch: 0, blueKick: 0, redPunch: 0, redKick: 0 },
      judge3: { bluePunch: 0, blueKick: 0, redPunch: 0, redKick: 0 }
    };
  }

  function newId(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }

  function clone(value) {
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (e) {}
    }
    return JSON.parse(JSON.stringify(value));
  }

  function isStorageAvailable() {
    try {
      var k = "__ipsi_test__";
      global.localStorage.setItem(k, "1");
      global.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function toInt(value, fallback) {
    var n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  function toIntAtSign(value, fallback) {
    var n = Math.floor(Number(value));
    return Number.isFinite(n) ? n : fallback;
  }

  function sanitizeText(value, fallback) {
    if (typeof value !== "string") return fallback;
    var t = value.trim().replace(/\s+/g, " ");
    return t.length ? t.slice(0, MAX_TEXT) : fallback;
  }

  function sanitizeOptionalText(value, fallback) {
    if (typeof value !== "string") return fallback;
    return value.trim().replace(/\s+/g, " ").slice(0, MAX_TEXT);
  }

  function sanitizeId(value) {
    if (typeof value !== "string") return "";
    return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
  }

  function sanitizeImage(value) {
    if (typeof value !== "string") return "";
    var t = value.trim();
    if (!t || t.length > MAX_IMAGE_LENGTH) return "";
    if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);/i.test(t)) return t;
    if (/^https?:\/\//i.test(t)) return t;
    return "";
  }

  function sanitizeTeam(raw, fallbackName, fallbackContingent) {
    var src = raw && typeof raw === "object" ? raw : {};
    var team = makeTeam(fallbackName, fallbackContingent);
    team.name = sanitizeText(src.name, fallbackName);
    team.contingent = sanitizeText(src.contingent, fallbackContingent);
    team.score = toInt(src.score, 0);
    team.punches = toInt(src.punches, 0);
    team.kicks = toInt(src.kicks, 0);
    team.warnings = toInt(src.warnings, 0);
    team.penalties = toInt(src.penalties, 0);
    team.falls = toInt(src.falls, 0);
    team.disqualified = src.disqualified === true;
    team.binaan1 = toInt(src.binaan1, 0);
    team.binaan2 = toInt(src.binaan2, 0);
    team.teguran1 = toInt(src.teguran1, 0);
    team.teguran2 = toInt(src.teguran2, 0);
    team.teguran3 = toInt(src.teguran3, 0);
    team.peringatan1 = toInt(src.peringatan1, 0);
    team.peringatan2 = toInt(src.peringatan2, 0);
    team.peringatan3 = toInt(src.peringatan3, 0);
    team.pendingFalls = toInt(src.pendingFalls, 0);
    team.pendingPenalties = toInt(src.pendingPenalties, 0);
    return team;
  }

  function sanitizeJudge(raw) {
    var src = raw && typeof raw === "object" ? raw : {};
    return {
      bluePunch: toInt(src.bluePunch, 0),
      blueKick: toInt(src.blueKick, 0),
      redPunch: toInt(src.redPunch, 0),
      redKick: toInt(src.redKick, 0)
    };
  }

  function sanitizeLogs(arr) {
    if (!Array.isArray(arr)) return [];
    var out = [];
    arr.forEach(function (item) {
      if (!item || typeof item !== "object") return;
      if (typeof item.label !== "string") return;
      out.push({
        team: item.team === "red" ? "red" : "blue",
        round: toInt(item.round, 1),
        label: sanitizeText(item.label, "-"),
        value: toIntAtSign(item.value, 0),
        source: item.source === "juri" ? "juri" : "dewan",
        at: toInt(item.at, Date.now())
      });
    });
    return out.slice(-MAX_LOGS);
  }

  function sanitizeTimeline(arr) {
    if (!Array.isArray(arr)) return [];
    var valid = ["blue", "red", "system", "match"];
    var out = [];
    arr.forEach(function (item) {
      if (!item || typeof item !== "object") return;
      out.push({
        id: sanitizeId(item.id) || newId("tl"),
        team: valid.indexOf(item.team) !== -1 ? item.team : "match",
        kind: sanitizeId(item.kind) || "info",
        label: sanitizeText(item.label, "AKTIVITAS"),
        detail: sanitizeOptionalText(item.detail, ""),
        value: toIntAtSign(item.value, 0),
        round: toInt(item.round, 1),
        at: toInt(item.at, Date.now())
      });
    });
    return out.slice(-MAX_TIMELINE);
  }

  function sanitizeHistory(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(function (item) {
      return item && typeof item === "object" && (item.winner === "blue" || item.winner === "red" || item.winner === "draw");
    }).slice(-MAX_HISTORY).map(function (item) {
      return {
        event: sanitizeText(item.event, "PERTANDINGAN"),
        match: sanitizeText(item.match, "PARTAI 01"),
        category: sanitizeText(item.category, "TANDING PUTRA - KELAS A"),
        blueName: sanitizeText(item.blueName, "PESILAT BIRU"),
        redName: sanitizeText(item.redName, "PESILAT MERAH"),
        blueScore: toIntAtSign(item.blueScore, 0),
        redScore: toIntAtSign(item.redScore, 0),
        winner: item.winner,
        bracketMatchId: sanitizeId(item.bracketMatchId),
        at: toIntAtSign(item.at, Date.now())
      };
    });
  }

  function sanitizeClass(raw) {
    var src = raw && typeof raw === "object" ? raw : {};
    return {
      id: sanitizeId(src.id) || newId("cls"),
      name: sanitizeText(src.name, "KELAS BARU"),
      category: sanitizeText(src.category, "TANDING"),
      gender: src.gender === "PUTRI" ? "PUTRI" : "PUTRA",
      minWeight: toIntAtSign(src.minWeight, 0),
      maxWeight: toIntAtSign(src.maxWeight, 0),
      at: toInt(src.at, Date.now())
    };
  }

  function sanitizeClasses(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(function (item) {
      return item && typeof item === "object";
    }).map(sanitizeClass).slice(0, 100);
  }

  function sanitizeParticipant(raw) {
    var src = raw && typeof raw === "object" ? raw : {};
    return {
      id: sanitizeId(src.id) || newId("p"),
      name: sanitizeText(src.name, "PESILAT"),
      contingent: sanitizeText(src.contingent, "KONTINGEN"),
      logo: sanitizeImage(src.logo),
      contingentLogo: sanitizeImage(src.contingentLogo),
      seed: toInt(src.seed, 0),
      at: toInt(src.at, Date.now())
    };
  }

  function sanitizeParticipants(arr) {
    if (!Array.isArray(arr)) return [];
    var seen = {};
    var out = [];
    arr.forEach(function (item) {
      if (!item || typeof item !== "object") return;
      var p = sanitizeParticipant(item);
      if (seen[p.id]) p.id = newId("p");
      seen[p.id] = true;
      out.push(p);
    });
    return out.slice(0, 128);
  }

  function sanitizeMatch(raw, index, roundIndex) {
    var src = raw && typeof raw === "object" ? raw : {};
    return {
      id: sanitizeId(src.id) || ("R" + (roundIndex + 1) + "M" + (index + 1)),
      blueId: sanitizeId(src.blueId),
      redId: sanitizeId(src.redId),
      winnerId: sanitizeId(src.winnerId),
      scoreBlue: toIntAtSign(src.scoreBlue, 0),
      scoreRed: toIntAtSign(src.scoreRed, 0),
      status: ["empty", "ready", "bye", "live", "done", "draw"].indexOf(src.status) !== -1 ? src.status : "empty",
      at: toInt(src.at, 0)
    };
  }

  function sanitizeBracket(raw, participants) {
    var src = raw && typeof raw === "object" ? raw : {};
    var rounds = [];
    if (Array.isArray(src.rounds)) {
      src.rounds.forEach(function (round, r) {
        var matches = [];
        if (round && Array.isArray(round.matches)) {
          round.matches.forEach(function (m, i) {
            matches.push(sanitizeMatch(m, i, r));
          });
        }
        rounds.push({
          name: sanitizeText(round && round.name, roundName(r, src.rounds.length)),
          matches: matches
        });
      });
    }
    var bracket = {
      title: sanitizeText(src.title, "BAGAN PERTANDINGAN"),
      category: sanitizeOptionalText(src.category, ""),
      participants: participants || sanitizeParticipants(src.participants),
      rounds: rounds,
      activeMatchId: sanitizeId(src.activeMatchId),
      updatedAt: toInt(src.updatedAt, 0)
    };
    var ids = {};
    bracket.participants.forEach(function (p) { ids[p.id] = true; });
    bracket.rounds.forEach(function (round) {
      round.matches.forEach(function (m) {
        if (!ids[m.blueId]) m.blueId = "";
        if (!ids[m.redId]) m.redId = "";
        if (!ids[m.winnerId]) m.winnerId = "";
      });
    });
    recomputeBracket(bracket);
    return bracket;
  }

  function sanitizeState(raw, fallbackOnly) {
    var base = fallbackOnly ? defaultState() : {};
    var r = raw && typeof raw === "object" ? raw : base;
    var ev = r.event && typeof r.event === "object" ? r.event : {};
    var tm = r.timer && typeof r.timer === "object" ? r.timer : {};
    var participants = sanitizeParticipants(r.bracket && r.bracket.participants);

    var state = {
      meta: { version: STATE_VERSION, updatedAt: toInt(r.meta && r.meta.updatedAt, Date.now()) },
      event: {
        name: sanitizeText(ev.name, defaultState().event.name),
        match: sanitizeText(ev.match, "PARTAI 01"),
        category: sanitizeText(ev.category, "TANDING PUTRA - KELAS A"),
        blueName: sanitizeText(ev.blueName, "PESILAT BIRU"),
        blueContingent: sanitizeText(ev.blueContingent, "KONTINGEN BIRU"),
        redName: sanitizeText(ev.redName, "PESILAT MERAH"),
        redContingent: sanitizeText(ev.redContingent, "KONTINGEN MERAH"),
        blueLogo: sanitizeImage(ev.blueLogo),
        redLogo: sanitizeImage(ev.redLogo),
        blueContingentLogo: sanitizeImage(ev.blueContingentLogo),
        redContingentLogo: sanitizeImage(ev.redContingentLogo),
        roundDuration: Math.min(5940, Math.max(1, toInt(ev.roundDuration, 120))),
        rounds: Math.min(9, Math.max(1, toInt(ev.rounds, 3))),
        schedule: sanitizeOptionalText(ev.schedule, "")
      },
      round: Math.min(9, Math.max(1, toInt(r.round, 1))),
      judgeActive: ["judge1", "judge2", "judge3"].indexOf(r.judgeActive) !== -1 ? r.judgeActive : "judge1",
      teamBlue: sanitizeTeam(r.teamBlue, "PESILAT BIRU", "KONTINGEN BIRU"),
      teamRed: sanitizeTeam(r.teamRed, "PESILAT MERAH", "KONTINGEN MERAH"),
      judges: {
        judge1: sanitizeJudge(r.judges && r.judges.judge1),
        judge2: sanitizeJudge(r.judges && r.judges.judge2),
        judge3: sanitizeJudge(r.judges && r.judges.judge3)
      },
      timer: {
        duration: Math.min(5940, Math.max(1, toInt(tm.duration, 120))),
        remaining: toInt(tm.remaining, 0),
        running: tm.running === true,
        startedAt: Number.isFinite(tm.startedAt) && tm.startedAt > 0 ? tm.startedAt : null,
        status: ["READY", "RUNNING", "PAUSED", "FINISHED"].indexOf(tm.status) !== -1 ? tm.status : "READY",
        emergency: tm.emergency === true
      },
      logs: sanitizeLogs(r.logs),
      timeline: sanitizeTimeline(r.timeline),
      history: sanitizeHistory(r.history),
      classes: sanitizeClasses(r.classes),
      activeClassId: sanitizeId(r.activeClassId),
      bracket: sanitizeBracket(r.bracket, participants)
    };

    if (state.round > state.event.rounds) state.round = state.event.rounds;
    if (state.timer.remaining > state.timer.duration) state.timer.remaining = state.timer.duration;

    if (state.timer.running && state.timer.remaining <= 0) {
      state.timer.running = false;
      state.timer.startedAt = null;
      if (state.timer.status !== "FINISHED") state.timer.status = "READY";
    } else if (state.timer.running) {
      state.timer.status = "RUNNING";
      state.timer.emergency = false;
    } else if (state.timer.status === "RUNNING") {
      state.timer.status = "PAUSED";
    }

    if (state.timer.status !== "PAUSED") state.timer.emergency = false;
    if (state.activeClassId && !state.classes.some(function (c) { return c.id === state.activeClassId; })) {
      state.activeClassId = "";
    }

    return state;
  }

  function deriveScore(team) {
    var pos =
      (team.binaan1 || 0) * 1 +
      (team.binaan2 || 0) * 2 +
      (team.falls || 0) * 3 +
      (team.punches || 0) * 1 +
      (team.kicks || 0) * 2;
    var neg =
      (team.teguran1 || 0) * 1 +
      (team.teguran2 || 0) * 2 +
      (team.teguran3 || 0) * 3 +
      (team.peringatan1 || 0) * 5 +
      (team.peringatan2 || 0) * 10 +
      (team.peringatan3 || 0) * 15;
    return Math.max(0, pos - neg);
  }

  function recomputeScores(state) {
    if (state.teamBlue) state.teamBlue.score = deriveScore(state.teamBlue);
    if (state.teamRed) state.teamRed.score = deriveScore(state.teamRed);
    return state;
  }

  function roundName(index, total) {
    var remaining = total - index;
    if (remaining <= 1) return "FINAL";
    if (remaining === 2) return "SEMIFINAL";
    if (remaining === 3) return "PEREMPAT FINAL";
    return "BABAK " + Math.pow(2, remaining);
  }

  function recomputeBracket(bracket) {
    if (!bracket || !Array.isArray(bracket.rounds)) return bracket;
    bracket.rounds.forEach(function (round, r) {
      var matches = Array.isArray(round.matches) ? round.matches : [];
      if (r > 0) {
        var prev = bracket.rounds[r - 1].matches || [];
        matches.forEach(function (m, i) {
          var left = prev[i * 2] ? prev[i * 2].winnerId : "";
          var right = prev[i * 2 + 1] ? prev[i * 2 + 1].winnerId : "";
          if (m.blueId !== left) {
            m.blueId = left || "";
            m.scoreBlue = 0;
          }
          if (m.redId !== right) {
            m.redId = right || "";
            m.scoreRed = 0;
          }
        });
      }
      matches.forEach(function (m) {
        if (!m.blueId && !m.redId) {
          m.winnerId = "";
          m.status = "empty";
          m.scoreBlue = 0;
          m.scoreRed = 0;
          return;
        }
        if (m.blueId && !m.redId) {
          m.winnerId = m.blueId;
          m.status = "bye";
          m.scoreBlue = 0;
          m.scoreRed = 0;
          return;
        }
        if (!m.blueId && m.redId) {
          m.winnerId = m.redId;
          m.status = "bye";
          m.scoreBlue = 0;
          m.scoreRed = 0;
          return;
        }
        if (m.winnerId !== m.blueId && m.winnerId !== m.redId) {
          m.winnerId = "";
          m.status = "ready";
          m.scoreBlue = 0;
          m.scoreRed = 0;
        } else if (m.winnerId) {
          m.status = m.status === "draw" ? "draw" : "done";
        } else {
          m.status = "ready";
        }
      });
    });
    return bracket;
  }

  function findBracketMatch(bracket, matchId) {
    if (!bracket || !matchId) return null;
    for (var r = 0; r < bracket.rounds.length; r++) {
      var matches = bracket.rounds[r].matches || [];
      for (var i = 0; i < matches.length; i++) {
        if (matches[i].id === matchId) {
          return { roundIndex: r, matchIndex: i, match: matches[i], round: bracket.rounds[r] };
        }
      }
    }
    return null;
  }

  function participantById(bracket, id) {
    if (!bracket || !id) return null;
    for (var i = 0; i < bracket.participants.length; i++) {
      if (bracket.participants[i].id === id) return bracket.participants[i];
    }
    return null;
  }

  function buildBracketRounds(participants) {
    var n = participants.length;
    if (!n) return [];
    var size = 1;
    while (size < n) size *= 2;
    var roundCount = Math.round(Math.log(size) / Math.log(2));
    var rounds = [];
    for (var r = 0; r < roundCount; r++) {
      var matches = [];
      var count = size / Math.pow(2, r + 1);
      for (var i = 0; i < count; i++) {
        matches.push({
          id: "R" + (r + 1) + "M" + (i + 1),
          blueId: "",
          redId: "",
          winnerId: "",
          scoreBlue: 0,
          scoreRed: 0,
          status: "empty",
          at: 0
        });
      }
      rounds.push({ name: roundName(r, roundCount), matches: matches });
    }
    participants.forEach(function (p, i) {
      var match = rounds[0].matches[Math.floor(i / 2)];
      if (i % 2 === 0) match.blueId = p.id;
      else match.redId = p.id;
    });
    return rounds;
  }

  var gameState = null;
  var subscribers = [];
  var storageOk = isStorageAvailable();

  function getState() {
    if (!gameState) loadState();
    return gameState;
  }

  function loadState() {
    if (storageOk) {
      try {
        var raw = global.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          gameState = recomputeScores(sanitizeState(JSON.parse(raw), false));
          return;
        }
      } catch (e) {}
    }
    gameState = defaultState();
  }

  function saveState() {
    if (!storageOk) return false;
    try {
      gameState.meta = gameState.meta || {};
      gameState.meta.version = STATE_VERSION;
      gameState.meta.updatedAt = Date.now();
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
      return true;
    } catch (e) {
      return false;
    }
  }

  function notify(opts) {
    var snapshot = gameState;
    subscribers.forEach(function (fn) {
      try {
        fn(snapshot, opts || {});
      } catch (e) {
        if (global.console) global.console.error(e);
      }
    });
  }

  function subscribe(fn) {
    subscribers.push(fn);
    return function () {
      var i = subscribers.indexOf(fn);
      if (i !== -1) subscribers.splice(i, 1);
    };
  }

  function updateState(mutatorFn, opts) {
    opts = opts || {};
    if (!gameState) loadState();
    var next = clone(gameState);
    if (typeof mutatorFn === "function") mutatorFn(next);
    gameState = recomputeScores(sanitizeState(next, false));
    if (opts.save !== false) saveState();
    if (opts.sync !== false && global.IPSI && global.IPSI.Sync) global.IPSI.Sync.broadcast();
    notify({ source: opts.source || "local" });
    return gameState;
  }

  function applyRemote(incoming, opts) {
    opts = opts || {};
    var before = gameState ? JSON.stringify(gameState) : "";
    gameState = recomputeScores(sanitizeState(incoming, false));
    var after = JSON.stringify(gameState);
    if (before === after) return;
    notify({ source: opts.source || "remote" });
  }

  function pushLog(state, entry) {
    state.logs = state.logs || [];
    state.logs.push(entry);
    if (state.logs.length > MAX_LOGS) state.logs = state.logs.slice(-MAX_LOGS);
  }

  function pushTimeline(state, entry) {
    state.timeline = state.timeline || [];
    state.timeline.push({
      id: newId("tl"),
      team: entry.team || "match",
      kind: entry.kind || "info",
      label: entry.label || "AKTIVITAS",
      detail: entry.detail || "",
      value: Number(entry.value) || 0,
      round: entry.round || state.round || 1,
      at: entry.at || Date.now()
    });
    if (state.timeline.length > MAX_TIMELINE) state.timeline = state.timeline.slice(-MAX_TIMELINE);
  }

  function teamBy(s, teamKey) {
    return teamKey === "red" ? s.teamRed : s.teamBlue;
  }

  function judgeNumber(key) {
    return parseInt(key.replace("judge", ""), 10) || 1;
  }

  function addPunch(teamKey) {
    updateState(function (s) {
      var team = teamBy(s, teamKey);
      team.punches += 1;
      var j = s.judges[s.judgeActive] || s.judges.judge1;
      j[teamKey + "Punch"] += 1;
      pushLog(s, {
        team: teamKey,
        round: s.round,
        label: "PUNCH (JURI " + judgeNumber(s.judgeActive) + ")",
        value: 1,
        source: "juri",
        at: Date.now()
      });
    });
  }

  function addKick(teamKey) {
    updateState(function (s) {
      var team = teamBy(s, teamKey);
      team.kicks += 1;
      var j = s.judges[s.judgeActive] || s.judges.judge1;
      j[teamKey + "Kick"] += 1;
      pushLog(s, {
        team: teamKey,
        round: s.round,
        label: "KICK (JURI " + judgeNumber(s.judgeActive) + ")",
        value: 2,
        source: "juri",
        at: Date.now()
      });
    });
  }

  function applyBonus(teamKey, type) {
    var mapping = {
      binaan1: { counter: "binaan1", value: 1, label: "BINAAN 1", kind: "binaan1" },
      binaan2: { counter: "binaan2", value: 2, label: "BINAAN 2", kind: "binaan2" },
      jatuhan: { counter: "falls", value: 3, label: "JATUHAN", kind: "jatuhan" }
    };
    var m = mapping[type];
    if (!m) return;
    updateState(function (s) {
      var team = teamBy(s, teamKey);
      team[m.counter] += 1;
      if (type === "jatuhan") team.pendingFalls += 1;
      pushLog(s, {
        team: teamKey,
        round: s.round,
        label: m.label,
        value: m.value,
        source: "dewan",
        at: Date.now()
      });
      pushTimeline(s, {
        team: teamKey,
        kind: m.kind,
        label: m.label,
        detail: (teamKey === "blue" ? "Sudut Biru" : "Sudut Merah") + " +" + m.value,
        value: m.value,
        round: s.round
      });
    });
  }

  function applyDeduction(teamKey, type) {
    var mapping = {
      teguran1: { counter: "warnings", sub: "teguran1", value: -1, label: "TEGURAN I", kind: "teguran1" },
      teguran2: { counter: "warnings", sub: "teguran2", value: -2, label: "TEGURAN II", kind: "teguran2" },
      teguran3: { counter: "warnings", sub: "teguran3", value: -3, label: "TEGURAN III", kind: "teguran3" },
      peringatan1: { counter: "penalties", sub: "peringatan1", value: -5, label: "PERINGATAN I", kind: "peringatan1" },
      peringatan2: { counter: "penalties", sub: "peringatan2", value: -10, label: "PERINGATAN II", kind: "peringatan2" },
      peringatan3: { counter: "penalties", sub: "peringatan3", value: -15, label: "PERINGATAN III", kind: "peringatan3" }
    };
    var m = mapping[type];
    if (!m) return;
    updateState(function (s) {
      var team = teamBy(s, teamKey);
      team[m.counter] += 1;
      team[m.sub] += 1;
      team.pendingPenalties += 1;
      pushLog(s, {
        team: teamKey,
        round: s.round,
        label: m.label,
        value: m.value,
        source: "dewan",
        at: Date.now()
      });
      pushTimeline(s, {
        team: teamKey,
        kind: m.kind,
        label: m.label,
        detail: (teamKey === "blue" ? "Sudut Biru" : "Sudut Merah") + " " + m.value,
        value: m.value,
        round: s.round
      });
    });
  }

  function setDisqualified(teamKey) {
    updateState(function (s) {
      var team = teamBy(s, teamKey);
      team.disqualified = !team.disqualified;
      pushLog(s, {
        team: teamKey,
        round: s.round,
        label: team.disqualified ? "DISKUALIFIKASI" : "DISKUALIFIKASI DIBATALKAN",
        value: team.disqualified ? -Math.abs(team.score) : 0,
        source: "dewan",
        at: Date.now()
      });
      pushTimeline(s, {
        team: teamKey,
        kind: "disk",
        label: team.disqualified ? "DISKUALIFIKASI" : "DISKUALIFIKASI DIBATALKAN",
        detail: teamKey === "blue" ? "Sudut Biru" : "Sudut Merah",
        value: 0,
        round: s.round
      });
    });
  }

  function resetTeam(teamKey) {
    updateState(function (s) {
      var team = teamBy(s, teamKey);
      var fresh = makeTeam(team.name, team.contingent);
      s[teamKey === "red" ? "teamRed" : "teamBlue"] = fresh;
      var judges = s.judges;
      for (var k in judges) {
        if (judges.hasOwnProperty(k)) {
          judges[k][teamKey + "Punch"] = 0;
          judges[k][teamKey + "Kick"] = 0;
        }
      }
      pushLog(s, {
        team: teamKey,
        round: s.round,
        label: "RESET SUDUT",
        value: 0,
        source: "dewan",
        at: Date.now()
      });
      pushTimeline(s, {
        team: teamKey,
        kind: "reset",
        label: "RESET SUDUT",
        detail: teamKey === "blue" ? "Sudut Biru" : "Sudut Merah",
        value: 0,
        round: s.round
      });
    });
  }

  function verifyFall() {
    updateState(function (s) {
      var any = s.teamBlue.pendingFalls + s.teamRed.pendingFalls;
      s.teamBlue.pendingFalls = 0;
      s.teamRed.pendingFalls = 0;
      pushLog(s, {
        team: "blue",
        round: s.round,
        label: "VERIFIKASI JATUHAN DISETUJUI" + (any ? "" : " (TANPA TINDAKAN)"),
        value: 0,
        source: "dewan",
        at: Date.now()
      });
      pushTimeline(s, {
        team: "match",
        kind: "verify",
        label: "VERIFIKASI JATUHAN",
        detail: any ? "Disetujui dewan" : "Tidak ada jatuhan tertunda",
        value: 0,
        round: s.round
      });
    });
  }

  function verifyPenalty() {
    updateState(function (s) {
      var any = s.teamBlue.pendingPenalties + s.teamRed.pendingPenalties;
      s.teamBlue.pendingPenalties = 0;
      s.teamRed.pendingPenalties = 0;
      pushLog(s, {
        team: "blue",
        round: s.round,
        label: "VERIFIKASI PELANGGARAN DISETUJUI",
        value: 0,
        source: "dewan",
        at: Date.now()
      });
      pushTimeline(s, {
        team: "match",
        kind: "verify",
        label: "VERIFIKASI PELANGGARAN",
        detail: any ? "Disetujui dewan" : "Tidak ada pelanggaran tertunda",
        value: 0,
        round: s.round
      });
    });
  }

  function setRound(n) {
    updateState(function (s) {
      var r = Math.min(9, Math.max(1, n));
      if (r > s.event.rounds) r = s.event.rounds;
      var previous = s.round;
      s.round = r;
      s.timer.duration = s.event.roundDuration;
      s.timer.remaining = s.event.roundDuration;
      s.timer.running = false;
      s.timer.startedAt = null;
      s.timer.status = "READY";
      s.timer.emergency = false;
      pushTimeline(s, {
        team: "match",
        kind: "round",
        label: "BABAK " + r + " DIMULAI",
        detail: previous !== r ? "Perpindahan dari babak " + previous : "Babak diatur ulang",
        value: 0,
        round: r
      });
    });
  }

  function setJudge(key) {
    if (["judge1", "judge2", "judge3"].indexOf(key) === -1) return;
    updateState(function (s) {
      s.judgeActive = key;
    });
  }

  function saveEvent(payload) {
    updateState(function (s) {
      var ev = s.event;
      if (payload.name !== undefined) ev.name = sanitizeText(payload.name, ev.name);
      if (payload.match !== undefined) ev.match = sanitizeText(payload.match, ev.match);
      if (payload.category !== undefined) ev.category = sanitizeText(payload.category, ev.category);
      if (payload.blueName !== undefined) ev.blueName = sanitizeText(payload.blueName, ev.blueName);
      if (payload.blueContingent !== undefined) ev.blueContingent = sanitizeText(payload.blueContingent, ev.blueContingent);
      if (payload.redName !== undefined) ev.redName = sanitizeText(payload.redName, ev.redName);
      if (payload.redContingent !== undefined) ev.redContingent = sanitizeText(payload.redContingent, ev.redContingent);
      if (payload.blueLogo !== undefined) ev.blueLogo = sanitizeImage(payload.blueLogo);
      if (payload.redLogo !== undefined) ev.redLogo = sanitizeImage(payload.redLogo);
      if (payload.blueContingentLogo !== undefined) ev.blueContingentLogo = sanitizeImage(payload.blueContingentLogo);
      if (payload.redContingentLogo !== undefined) ev.redContingentLogo = sanitizeImage(payload.redContingentLogo);
      if (payload.roundDuration !== undefined) {
        var d = Math.min(5940, Math.max(1, toInt(payload.roundDuration, ev.roundDuration)));
        ev.roundDuration = d;
        s.timer.duration = d;
        s.timer.remaining = d;
        s.timer.running = false;
        s.timer.startedAt = null;
        s.timer.status = "READY";
        s.timer.emergency = false;
      }
      if (payload.rounds !== undefined) ev.rounds = Math.min(9, Math.max(1, toInt(payload.rounds, ev.rounds)));
      if (payload.schedule !== undefined) ev.schedule = sanitizeOptionalText(payload.schedule, ev.schedule);
      s.teamBlue.name = ev.blueName;
      s.teamBlue.contingent = ev.blueContingent;
      s.teamRed.name = ev.redName;
      s.teamRed.contingent = ev.redContingent;
      if (s.round > ev.rounds) s.round = ev.rounds;
      pushLog(s, {
        team: "blue",
        round: s.round,
        label: "DATA PERTANDINGAN DISIMPAN",
        value: 0,
        source: "dewan",
        at: Date.now()
      });
      pushTimeline(s, {
        team: "match",
        kind: "config",
        label: "DATA PERTANDINGAN DISIMPAN",
        detail: ev.match + " - " + ev.category,
        value: 0,
        round: s.round
      });
    });
  }

  function startMatch() {
    updateState(function (s) {
      s.round = 1;
      s.teamBlue = makeTeam(s.event.blueName, s.event.blueContingent);
      s.teamRed = makeTeam(s.event.redName, s.event.redContingent);
      s.judges = makeJudges();
      s.timer.duration = s.event.roundDuration;
      s.timer.remaining = s.event.roundDuration;
      s.timer.running = false;
      s.timer.startedAt = null;
      s.timer.status = "READY";
      s.timer.emergency = false;
      s.logs = [];
      s.timeline = [];
      pushLog(s, {
        team: "blue",
        round: 1,
        label: "PERTANDINGAN MULAI",
        value: 0,
        source: "dewan",
        at: Date.now()
      });
      pushTimeline(s, {
        team: "match",
        kind: "start",
        label: "PERTANDINGAN MULAI",
        detail: s.event.match + " - " + s.event.category,
        value: 0,
        round: 1
      });
    });
  }

  function resetMatch() {
    var evt = getState().event;
    updateState(function (s) {
      s.round = 1;
      s.teamBlue = makeTeam(evt.blueName, evt.blueContingent);
      s.teamRed = makeTeam(evt.redName, evt.redContingent);
      s.judges = makeJudges();
      s.timer.duration = evt.roundDuration;
      s.timer.remaining = evt.roundDuration;
      s.timer.running = false;
      s.timer.startedAt = null;
      s.timer.status = "READY";
      s.timer.emergency = false;
      s.logs = [];
      s.timeline = [];
      pushLog(s, {
        team: "blue",
        round: 1,
        label: "PERTANDINGAN DI-RESET",
        value: 0,
        source: "dewan",
        at: Date.now()
      });
      pushTimeline(s, {
        team: "match",
        kind: "reset",
        label: "PERTANDINGAN DI-RESET",
        detail: "Skor, timer, log, dan timeline dibersihkan",
        value: 0,
        round: 1
      });
    });
  }

  function resetAllData() {
    gameState = defaultState();
    saveState();
    if (global.IPSI && global.IPSI.Sync) global.IPSI.Sync.broadcast();
    notify({ source: "local" });
  }

  function finishMatch(winner) {
    if (["blue", "red", "draw"].indexOf(winner) === -1) return;
    updateState(function (s) {
      s.timer.running = false;
      s.timer.startedAt = null;
      s.timer.status = "FINISHED";
      s.timer.emergency = false;
      var activeId = s.bracket && s.bracket.activeMatchId;
      s.history = s.history || [];
      s.history.push({
        event: s.event.name,
        match: s.event.match,
        category: s.event.category,
        blueName: s.teamBlue.name,
        redName: s.teamRed.name,
        blueScore: s.teamBlue.score,
        redScore: s.teamRed.score,
        winner: winner,
        bracketMatchId: activeId || "",
        at: Date.now()
      });
      s.history = s.history.slice(-MAX_HISTORY);
      pushLog(s, {
        team: winner === "red" ? "red" : "blue",
        round: s.round,
        label: winner === "draw" ? "HASIL SERI" : "PEMENANG " + (winner === "blue" ? "BIRU" : "MERAH"),
        value: 0,
        source: "dewan",
        at: Date.now()
      });
      pushTimeline(s, {
        team: winner === "draw" ? "match" : winner,
        kind: "finish",
        label: winner === "draw" ? "HASIL SERI" : "PEMENANG " + (winner === "blue" ? "BIRU" : "MERAH"),
        detail: s.teamBlue.name + " " + s.teamBlue.score + " - " + s.teamRed.score + " " + s.teamRed.name,
        value: 0,
        round: s.round
      });

      if (s.bracket && activeId) {
        var found = findBracketMatch(s.bracket, activeId);
        if (found && winner !== "draw") {
          found.match.winnerId = winner === "blue" ? found.match.blueId : found.match.redId;
          found.match.scoreBlue = s.teamBlue.score;
          found.match.scoreRed = s.teamRed.score;
          found.match.status = "done";
          found.match.at = Date.now();
          recomputeBracket(s.bracket);
        } else if (found) {
          found.match.status = "draw";
          found.match.scoreBlue = s.teamBlue.score;
          found.match.scoreRed = s.teamRed.score;
          found.match.at = Date.now();
        }
        s.bracket.activeMatchId = "";
        s.bracket.updatedAt = Date.now();
      }
    });
  }

  function addParticipant(payload) {
    var name = sanitizeText(payload && payload.name, "");
    if (!name) return false;
    updateState(function (s) {
      s.bracket = s.bracket || emptyBracket();
      s.bracket.participants.push({
        id: newId("p"),
        name: name,
        contingent: sanitizeText(payload.contingent, "KONTINGEN"),
        logo: sanitizeImage(payload.logo),
        contingentLogo: sanitizeImage(payload.contingentLogo),
        seed: s.bracket.participants.length + 1,
        at: Date.now()
      });
      s.bracket.updatedAt = Date.now();
    });
    return true;
  }

  function removeParticipant(id) {
    updateState(function (s) {
      if (!s.bracket) return;
      s.bracket.participants = s.bracket.participants.filter(function (p) { return p.id !== id; });
      s.bracket.participants.forEach(function (p, i) { p.seed = i + 1; });
      s.bracket.rounds = [];
      s.bracket.activeMatchId = "";
      s.bracket.updatedAt = Date.now();
    });
  }

  function updateParticipant(id, payload) {
    updateState(function (s) {
      if (!s.bracket) return;
      var p = participantById(s.bracket, id);
      if (!p) return;
      if (payload.name !== undefined) p.name = sanitizeText(payload.name, p.name);
      if (payload.contingent !== undefined) p.contingent = sanitizeText(payload.contingent, p.contingent);
      if (payload.logo !== undefined) p.logo = sanitizeImage(payload.logo);
      if (payload.contingentLogo !== undefined) p.contingentLogo = sanitizeImage(payload.contingentLogo);
      s.bracket.updatedAt = Date.now();
    });
  }

  function generateBracket(payload) {
    updateState(function (s) {
      s.bracket = s.bracket || emptyBracket();
      if (payload) {
        if (payload.title !== undefined) s.bracket.title = sanitizeText(payload.title, s.bracket.title);
        if (payload.category !== undefined) s.bracket.category = sanitizeOptionalText(payload.category, "");
      }
      s.bracket.participants.forEach(function (p, i) { p.seed = i + 1; });
      s.bracket.rounds = buildBracketRounds(s.bracket.participants);
      s.bracket.activeMatchId = "";
      s.bracket.updatedAt = Date.now();
      recomputeBracket(s.bracket);
    });
  }

  function shuffleParticipants() {
    updateState(function (s) {
      if (!s.bracket) return;
      var list = s.bracket.participants.slice();
      for (var i = list.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = list[i];
        list[i] = list[j];
        list[j] = tmp;
      }
      list.forEach(function (p, idx) { p.seed = idx + 1; });
      s.bracket.participants = list;
      s.bracket.rounds = buildBracketRounds(list);
      s.bracket.activeMatchId = "";
      s.bracket.updatedAt = Date.now();
      recomputeBracket(s.bracket);
    });
  }

  function resetBracket() {
    updateState(function (s) {
      s.bracket = emptyBracket();
    });
  }

  function loadBracketMatch(matchId) {
    updateState(function (s) {
      var found = findBracketMatch(s.bracket, matchId);
      if (!found) return;
      var m = found.match;
      var blue = participantById(s.bracket, m.blueId);
      var red = participantById(s.bracket, m.redId);
      if (!blue || !red) return;
      var ev = s.event;
      ev.blueName = blue.name;
      ev.blueContingent = blue.contingent;
      ev.blueLogo = blue.logo || "";
      ev.blueContingentLogo = blue.contingentLogo || "";
      ev.redName = red.name;
      ev.redContingent = red.contingent;
      ev.redLogo = red.logo || "";
      ev.redContingentLogo = red.contingentLogo || "";
      ev.match = found.round.name + " - " + (found.matchIndex + 1);
      if (s.bracket.category) ev.category = s.bracket.category;
      s.bracket.activeMatchId = matchId;
      s.bracket.updatedAt = Date.now();
      s.round = 1;
      s.teamBlue = makeTeam(blue.name, blue.contingent);
      s.teamRed = makeTeam(red.name, red.contingent);
      s.judges = makeJudges();
      s.timer.duration = ev.roundDuration;
      s.timer.remaining = ev.roundDuration;
      s.timer.running = false;
      s.timer.startedAt = null;
      s.timer.status = "READY";
      s.timer.emergency = false;
      s.logs = [];
      s.timeline = [];
      pushTimeline(s, {
        team: "match",
        kind: "bracket",
        label: "PARTAI DIMUAT DARI BAGAN",
        detail: found.round.name + ": " + blue.name + " vs " + red.name,
        value: 0,
        round: 1
      });
    });
  }

  function clearActiveBracketMatch() {
    updateState(function (s) {
      if (s.bracket) {
        s.bracket.activeMatchId = "";
        s.bracket.updatedAt = Date.now();
      }
    });
  }

  function addClass(payload) {
    var name = sanitizeText(payload && payload.name, "");
    if (!name) return false;
    updateState(function (s) {
      s.classes = s.classes || [];
      s.classes.push({
        id: newId("cls"),
        name: name,
        category: sanitizeText(payload.category, "TANDING"),
        gender: payload.gender === "PUTRI" ? "PUTRI" : "PUTRA",
        minWeight: toIntAtSign(payload.minWeight, 0),
        maxWeight: toIntAtSign(payload.maxWeight, 0),
        at: Date.now()
      });
      s.activeClassId = s.classes[s.classes.length - 1].id;
    });
    return true;
  }

  function removeClass(id) {
    updateState(function (s) {
      s.classes = (s.classes || []).filter(function (c) { return c.id !== id; });
      if (s.activeClassId === id) s.activeClassId = s.classes.length ? s.classes[0].id : "";
    });
  }

  function applyClass(id) {
    updateState(function (s) {
      var cls = (s.classes || []).filter(function (c) { return c.id === id; })[0];
      if (!cls) return;
      s.activeClassId = cls.id;
      s.event.category = sanitizeText(cls.name, s.event.category);
      s.event.rounds = Math.min(9, Math.max(1, toInt(s.event.rounds, 3)));
    });
  }

  function addTimelineEntry(entry) {
    updateState(function (s) {
      pushTimeline(s, entry || {});
    });
  }

  function clearTimeline() {
    updateState(function (s) {
      s.timeline = [];
    });
  }

  function setEmergency(active) {
    var pauseRemaining = getDisplayRemainingSafe();
    updateState(function (s) {
      if (active) {
        s.timer.remaining = pauseRemaining;
        s.timer.running = false;
        s.timer.startedAt = null;
        s.timer.status = "PAUSED";
        s.timer.emergency = true;
        pushTimeline(s, {
          team: "match",
          kind: "emergency",
          label: "EMERGENCY PAUSE",
          detail: "Timer dihentikan untuk penanganan medis",
          value: 0,
          round: s.round
        });
      } else {
        s.timer.emergency = false;
        if (s.timer.status === "PAUSED") s.timer.status = "PAUSED";
        pushTimeline(s, {
          team: "match",
          kind: "emergency",
          label: "EMERGENCY PAUSE DICABUT",
          detail: "Pertandingan siap dilanjutkan",
          value: 0,
          round: s.round
        });
      }
    });
  }

  function getDisplayRemainingSafe() {
    var s = gameState || getState();
    var t = s.timer;
    if (!t.running || !t.startedAt) return t.remaining;
    return Math.max(0, t.remaining - Math.floor((Date.now() - t.startedAt) / 1000));
  }

  function getRoundTotals(state) {
    var totals = {};
    (state.logs || []).forEach(function (log) {
      var r = String(log.round || 1);
      if (!totals[r]) totals[r] = { blue: 0, red: 0 };
      if (log.team === "blue" || log.team === "red") {
        totals[r][log.team] += Number(log.value) || 0;
      }
    });
    return totals;
  }

  function exportJSON() {
    return JSON.stringify(getState(), null, 2);
  }

  function importJSON(text) {
    var parsed = JSON.parse(text);
    var s = sanitizeState(parsed, false);
    gameState = recomputeScores(s);
    saveState();
    if (global.IPSI && global.IPSI.Sync) global.IPSI.Sync.broadcast();
    notify({ source: "import" });
    return true;
  }

  global.IPSI = global.IPSI || {};
  global.IPSI.State = {
    STORAGE_KEY: STORAGE_KEY,
    STATE_VERSION: STATE_VERSION,
    getState: getState,
    updateState: updateState,
    applyRemote: applyRemote,
    saveState: saveState,
    loadState: loadState,
    subscribe: subscribe,
    defaultState: defaultState,
    sanitizeState: sanitizeState,
    recomputeScores: recomputeScores,
    recomputeBracket: recomputeBracket,
    deriveScore: deriveScore,
    exportJSON: exportJSON,
    importJSON: importJSON,
    resetAllData: resetAllData,
    getRoundTotals: getRoundTotals,
    findBracketMatch: findBracketMatch,
    participantById: participantById,
    actions: {
      addPunch: addPunch,
      addKick: addKick,
      applyBonus: applyBonus,
      applyDeduction: applyDeduction,
      setDisqualified: setDisqualified,
      resetTeam: resetTeam,
      verifyFall: verifyFall,
      verifyPenalty: verifyPenalty,
      setRound: setRound,
      setJudge: setJudge,
      saveEvent: saveEvent,
      startMatch: startMatch,
      resetMatch: resetMatch,
      finishMatch: finishMatch,
      addParticipant: addParticipant,
      removeParticipant: removeParticipant,
      updateParticipant: updateParticipant,
      generateBracket: generateBracket,
      shuffleParticipants: shuffleParticipants,
      resetBracket: resetBracket,
      loadBracketMatch: loadBracketMatch,
      clearActiveBracketMatch: clearActiveBracketMatch,
      addClass: addClass,
      removeClass: removeClass,
      applyClass: applyClass,
      addTimelineEntry: addTimelineEntry,
      clearTimeline: clearTimeline,
      setEmergency: setEmergency,
      addScore: function (teamKey, amount) {
        updateState(function (s) {
          var team = teamBy(s, teamKey);
          team[amount >= 0 ? "binaan1" : "teguran1"] = team[amount >= 0 ? "binaan1" : "teguran1"] + 1;
          pushLog(s, {
            team: teamKey,
            round: s.round,
            label: "NILAI " + (amount >= 0 ? "+" : "") + amount,
            value: amount,
            source: "dewan",
            at: Date.now()
          });
          pushTimeline(s, {
            team: teamKey,
            kind: "score",
            label: "NILAI " + (amount >= 0 ? "+" : "") + amount,
            value: amount,
            round: s.round
          });
        });
      }
    }
  };
})(window);
