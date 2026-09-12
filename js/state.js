(function (global) {
  "use strict";

  var STORAGE_KEY = "ipsi_scoring_state";
  var MAX_LOGS = 200;
  var MAX_HISTORY = 50;
  var MAX_TEXT = 40;

  function defaultState() {
    return {
      event: {
        name: "KEJUARAAN NASIONAL PENCAK SILAT 2026",
        match: "PARTAI 01",
        category: "TANDING PUTRA - KELAS A",
        blueName: "PESILAT BIRU",
        blueContingent: "KONTINGEN BIRU",
        redName: "PESILAT MERAH",
        redContingent: "KONTINGEN MERAH",
        roundDuration: 120,
        rounds: 3,
        schedule: ""
      },
      round: 1,
      judgeActive: "judge1",
      teamBlue: makeTeam("PESILAT BIRU", "KONTINGEN BIRU"),
      teamRed: makeTeam("PESILAT MERAH", "KONTINGEN MERAH"),
      judges: makeJudges(),
      timer: { duration: 120, remaining: 120, running: false, startedAt: null, status: "READY" },
      logs: [],
      history: []
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
      peringatan1: 0,
      peringatan2: 0,
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

  function sanitizeText(value, fallback) {
    if (typeof value !== "string") return fallback;
    var t = value.trim().replace(/\s+/g, " ");
    return t.length ? t.slice(0, MAX_TEXT) : fallback;
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
    team.peringatan1 = toInt(src.peringatan1, 0);
    team.peringatan2 = toInt(src.peringatan2, 0);
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
        at: toIntAtSign(item.at, Date.now())
      };
    });
  }

  function toIntAtSign(value, fallback) {
    var n = Math.floor(Number(value));
    return Number.isFinite(n) ? n : fallback;
  }

  function sanitizeState(raw, fallbackOnly) {
    var base = fallbackOnly ? defaultState() : {};
    var r = raw && typeof raw === "object" ? raw : base;
    var ev = r.event && typeof r.event === "object" ? r.event : {};
    var tm = r.timer && typeof r.timer === "object" ? r.timer : {};

    var state = {
      event: {
        name: sanitizeText(ev.name, defaultState().event.name),
        match: sanitizeText(ev.match, "PARTAI 01"),
        category: sanitizeText(ev.category, "TANDING PUTRA - KELAS A"),
        blueName: sanitizeText(ev.blueName, "PESILAT BIRU"),
        blueContingent: sanitizeText(ev.blueContingent, "KONTINGEN BIRU"),
        redName: sanitizeText(ev.redName, "PESILAT MERAH"),
        redContingent: sanitizeText(ev.redContingent, "KONTINGEN MERAH"),
        roundDuration: Math.min(5940, Math.max(1, toInt(ev.roundDuration, 120))),
        rounds: Math.min(9, Math.max(1, toInt(ev.rounds, 3))),
        schedule: sanitizeText(ev.schedule, "")
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
        status: ["READY", "RUNNING", "PAUSED", "FINISHED"].indexOf(tm.status) !== -1 ? tm.status : "READY"
      },
      logs: sanitizeLogs(r.logs),
      history: sanitizeHistory(r.history)
    };

    if (state.round > state.event.rounds) state.round = state.event.rounds;
    if (state.timer.remaining > state.timer.duration) state.timer.remaining = state.timer.duration;

    if (state.timer.running && state.timer.remaining <= 0) {
      state.timer.running = false;
      state.timer.startedAt = null;
      if (state.timer.status !== "FINISHED") state.timer.status = "READY";
    } else if (state.timer.running) {
      state.timer.status = "RUNNING";
    } else if (state.timer.status === "RUNNING") {
      state.timer.status = "PAUSED";
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
      (team.peringatan1 || 0) * 5 +
      (team.peringatan2 || 0) * 10;
    return Math.max(0, pos - neg);
  }

  function recomputeScores(state) {
    if (state.teamBlue) state.teamBlue.score = deriveScore(state.teamBlue);
    if (state.teamRed) state.teamRed.score = deriveScore(state.teamRed);
    return state;
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

  function roundPrefix(state) {
    return "B" + state.round;
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

  function judgeNumber(key) {
    return parseInt(key.replace("judge", ""), 10) || 1;
  }

  function teamBy(s, teamKey) {
    return teamKey === "red" ? s.teamRed : s.teamBlue;
  }

  function applyBonus(teamKey, type) {
    var mapping = {
      binaan1: { counter: "binaan1", value: 1, label: "BINAAN 1", round: 1 },
      binaan2: { counter: "binaan2", value: 2, label: "BINAAN 2", round: 2 },
      jatuhan: { counter: "falls", value: 3, label: "JATUHAN", round: 3 }
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
    });
  }

  function applyDeduction(teamKey, type) {
    var mapping = {
      teguran1: { counter: "warnings", sub: "teguran1", value: -1, label: "TEGURAN 1", penalty: true },
      teguran2: { counter: "warnings", sub: "teguran2", value: -2, label: "TEGURAN 2", penalty: true },
      peringatan1: { counter: "penalties", sub: "peringatan1", value: -5, label: "PERINGATAN 1", penalty: true },
      peringatan2: { counter: "penalties", sub: "peringatan2", value: -10, label: "PERINGATAN 2", penalty: true }
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
    });
  }

  function verifyPenalty() {
    updateState(function (s) {
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
    });
  }

  function setRound(n) {
    updateState(function (s) {
      var r = Math.min(9, Math.max(1, n));
      if (r > s.event.rounds) r = s.event.rounds;
      s.round = r;
      s.timer.duration = s.event.roundDuration;
      s.timer.remaining = s.event.roundDuration;
      s.timer.running = false;
      s.timer.startedAt = null;
      s.timer.status = "READY";
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
      if (payload.roundDuration !== undefined) {
        var d = Math.min(5940, Math.max(1, toInt(payload.roundDuration, ev.roundDuration)));
        ev.roundDuration = d;
        s.timer.duration = d;
        s.timer.remaining = d;
        s.timer.running = false;
        s.timer.startedAt = null;
        s.timer.status = "READY";
      }
      if (payload.rounds !== undefined) ev.rounds = Math.min(9, Math.max(1, toInt(payload.rounds, ev.rounds)));
      if (payload.schedule !== undefined) ev.schedule = sanitizeText(payload.schedule, ev.schedule);
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
      s.logs = [];
      pushLog(s, {
        team: "blue",
        round: 1,
        label: "PERTANDINGAN MULAI",
        value: 0,
        source: "dewan",
        at: Date.now()
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
      s.logs = [];
      pushLog(s, {
        team: "blue",
        round: 1,
        label: "PERTANDINGAN DI-RESET",
        value: 0,
        source: "dewan",
        at: Date.now()
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
    });
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
    getState: getState,
    updateState: updateState,
    applyRemote: applyRemote,
    saveState: saveState,
    loadState: loadState,
    subscribe: subscribe,
    defaultState: defaultState,
    sanitizeState: sanitizeState,
    recomputeScores: recomputeScores,
    deriveScore: deriveScore,
    exportJSON: exportJSON,
    importJSON: importJSON,
    resetAllData: resetAllData,
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
        });
      }
    }
  };
})(window);