(function (global) {
  "use strict";

  var State = global.IPSI.State;
  var Timer = global.IPSI.Timer;
  var U = null;

  var el = {};
  var timelineFilter = "all";

  var SCORE_CONFIG = [
    { label: "BINAAN 1", v: "+1", action: "bonus", type: "binaan1", cls: "sb--gold" },
    { label: "BINAAN 2", v: "+2", action: "bonus", type: "binaan2", cls: "sb--gold" },
    { label: "JATUHAN", v: "+3", action: "bonus", type: "jatuhan", cls: "sb--gold" },
    { label: "TEGURAN I", v: "-1", action: "deduct", type: "teguran1", cls: "sb--warning" },
    { label: "TEGURAN II", v: "-2", action: "deduct", type: "teguran2", cls: "sb--warning" },
    { label: "TEGURAN III", v: "-3", action: "deduct", type: "teguran3", cls: "sb--warning" },
    { label: "PERINGATAN I", v: "-5", action: "deduct", type: "peringatan1", cls: "sb--penalty" },
    { label: "PERINGATAN II", v: "-10", action: "deduct", type: "peringatan2", cls: "sb--penalty" },
    { label: "PERINGATAN III", v: "-15", action: "deduct", type: "peringatan3", cls: "sb--penalty" },
    { label: "DISKUALIFIKASI", v: "DQ", action: "disk", type: "", cls: "sb--danger" }
  ];

  function grab(ids) {
    ids.forEach(function (id) {
      el[id] = document.getElementById(id);
    });
  }

  function init() {
    U = global.IPSI.Utils;
    grab([
      "miEventName", "miMatchLine", "miRoundLabel", "miStatus", "miTimer", "miCategory",
      "btnPlay", "btnPause", "btnResetTimer", "btnSetDuration", "btnEmergency", "roundChips",
      "timerBar", "blueScore", "redScore", "blueName", "redName",
      "blueContingent", "redContingent", "blueDq", "redDq",
      "blueClubLogo", "redClubLogo", "blueContingentLogo", "redContingentLogo",
      "blueFalls", "redFalls", "blueWarnings", "redWarnings",
      "bluePenalties", "redPenalties", "blueButtons", "redButtons",
      "judgePanels", "blueLog", "redLog",
      "btnVerifyFall", "btnVerifyPenalty", "pendingFallBadge", "pendingPenaltyBadge",
      "resetModal", "resetStep1", "resetStep2", "btnResetCancel", "btnResetContinue",
      "btnResetBack", "btnResetConfirm", "resetConfirmText",
      "durationModal", "durationForm", "durMin", "durSec", "btnDurationCancel",
      "btnResetMatchShort", "btnSettingsClose", "settingsModal",
      "decisionTimeline", "btnClearTimeline"
    ]);

    buildScoreButtons(el.blueButtons, "blue");
    buildScoreButtons(el.redButtons, "red");

    bindControls();
    State.subscribe(render);
    render(State.getState());

    Timer.startTicker(function (remaining) {
      renderTimerDisplay(remaining);
    });
  }

  function buildScoreButtons(root, teamKey) {
    if (!root) return;
    SCORE_CONFIG.forEach(function (cfg) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sb " + cfg.cls;
      btn.setAttribute("data-team", teamKey);
      btn.setAttribute("data-action", cfg.action);
      btn.setAttribute("data-type", cfg.type);
      if (cfg.action === "disk") btn.setAttribute("aria-label", "Diskualifikasi sudut " + teamKey);
      else if (cfg.action === "bonus") btn.setAttribute("aria-label", cfg.label + " " + cfg.v + " " + teamKey);
      else btn.setAttribute("aria-label", cfg.label + " " + cfg.v + " " + teamKey);
      var label = document.createElement("span");
      label.className = "sb-label";
      label.textContent = cfg.label;
      var value = document.createElement("span");
      value.className = "v";
      value.textContent = cfg.v;
      btn.appendChild(label);
      btn.appendChild(value);
      btn.addEventListener("click", function () {
        onScore(teamKey, cfg.action, cfg.type, cfg.label);
      });
      root.appendChild(btn);
    });

    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "sb sb--reset";
    resetBtn.textContent = "RESET SUDUT";
    resetBtn.setAttribute("aria-label", "Reset sudut " + teamKey);
    resetBtn.addEventListener("click", function () {
      State.actions.resetTeam(teamKey);
      U.toast("SUDUT " + (teamKey === "blue" ? "BIRU" : "MERAH") + " DI-RESET", "info");
    });
    root.appendChild(resetBtn);
  }

  function onScore(teamKey, action, type) {
    var state = State.getState();
    var team = teamKey === "blue" ? state.teamBlue : state.teamRed;
    if (team.disqualified) {
      U.toast("SUDUT " + (teamKey === "blue" ? "BIRU" : "MERAH") + " TERDISKUALIFIKASI", "error");
      return;
    }
    if (action === "bonus") {
      State.actions.applyBonus(teamKey, type);
    } else if (action === "deduct") {
      State.actions.applyDeduction(teamKey, type);
    } else if (action === "disk") {
      State.actions.setDisqualified(teamKey);
    }
    popScore(teamKey);
  }

  function popScore(teamKey) {
    var node = teamKey === "blue" ? el.blueScore : el.redScore;
    if (!node) return;
    node.classList.remove("pop");
    void node.offsetWidth;
    node.classList.add("pop");
  }

  function bindControls() {
    if (el.btnPlay) el.btnPlay.addEventListener("click", function () { Timer.start(); });
    if (el.btnPause) el.btnPause.addEventListener("click", function () { Timer.pause(); });
    if (el.btnResetTimer) el.btnResetTimer.addEventListener("click", function () { Timer.reset(); U.toast("TIMER DI-RESET", "info"); });
    if (el.btnSetDuration) el.btnSetDuration.addEventListener("click", openDurationModal);

    if (el.btnEmergency) el.btnEmergency.addEventListener("click", function () {
      var state = State.getState();
      if (state.timer.emergency) {
        Timer.clearEmergency();
        U.toast("EMERGENCY PAUSE DICABUT - TEKAN PLAY UNTUK LANJUT", "info");
      } else {
        Timer.emergencyPause();
        U.toast("EMERGENCY PAUSE AKTIF - TIMER DIHENTIKAN", "error");
      }
    });

    if (el.btnClearTimeline) el.btnClearTimeline.addEventListener("click", function () {
      State.actions.clearTimeline();
      U.toast("TIMELINE DIBERSIHKAN", "info");
    });

    U.qsa("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        timelineFilter = btn.getAttribute("data-filter") || "all";
        U.qsa("[data-filter]").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
        });
        renderTimeline(State.getState());
      });
    });

    if (el.btnVerifyFall) el.btnVerifyFall.addEventListener("click", function () {
      State.actions.verifyFall();
      U.toast("VERIFIKASI JATUHAN DISETUJUI", "success");
    });
    if (el.btnVerifyPenalty) el.btnVerifyPenalty.addEventListener("click", function () {
      State.actions.verifyPenalty();
      U.toast("VERIFIKASI PELANGGARAN DISETUJUI", "success");
    });

    if (el.settingsModal) {
      if (el.btnSettingsClose) el.btnSettingsClose.addEventListener("click", function () { el.settingsModal.hidden = true; });
      if (el.btnResetMatchShort) el.btnResetMatchShort.addEventListener("click", function () {
        el.settingsModal.hidden = true;
        openResetModal();
      });
    }

    if (el.resetModal) {
      if (el.btnResetCancel) el.btnResetCancel.addEventListener("click", closeResetModal);
      if (el.btnResetContinue) el.btnResetContinue.addEventListener("click", function () {
        if (el.resetStep1) el.resetStep1.hidden = true;
        if (el.resetStep2) el.resetStep2.hidden = false;
        if (el.resetConfirmText) el.resetConfirmText.focus();
      });
      if (el.btnResetBack) el.btnResetBack.addEventListener("click", function () {
        if (el.resetStep1) el.resetStep1.hidden = false;
        if (el.resetStep2) el.resetStep2.hidden = true;
      });
      if (el.resetConfirmText) el.resetConfirmText.addEventListener("input", function () {
        if (el.btnResetConfirm) el.btnResetConfirm.disabled = el.resetConfirmText.value.trim().toUpperCase() !== "RESET";
      });
      if (el.btnResetConfirm) {
        el.btnResetConfirm.addEventListener("click", function () {
          if (!el.resetConfirmText || el.resetConfirmText.value.trim().toUpperCase() !== "RESET") return;
          State.actions.resetMatch();
          closeResetModal();
          U.toast("PERTANDINGAN DI-RESET", "info");
        });
      }
    }

    if (el.durationModal) {
      if (el.btnDurationCancel) el.btnDurationCancel.addEventListener("click", closeDurationModal);
      if (el.durationForm) el.durationForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var mins = Math.floor(Number(el.durMin.value) || 0);
        var secs = Math.floor(Number(el.durSec.value) || 0);
        if (mins === 0 && secs === 0) { U.toast("DURASI TIDAK VALID", "error"); return; }
        Timer.setDuration(mins * 60 + secs);
        closeDurationModal();
        U.toast("DURASI DIATUR: " + Timer.formatMMSS(mins * 60 + secs), "success");
      });
    }

    bindKeyboard();
  }

  function openResetModal() {
    if (!el.resetModal) return;
    el.resetModal.hidden = false;
    if (el.resetStep1) el.resetStep1.hidden = false;
    if (el.resetStep2) el.resetStep2.hidden = true;
    if (el.resetConfirmText) el.resetConfirmText.value = "";
    if (el.btnResetConfirm) el.btnResetConfirm.disabled = true;
  }
  function closeResetModal() {
    if (el.resetModal) el.resetModal.hidden = true;
  }
  function openDurationModal() {
    if (!el.durationModal) return;
    var state = State.getState();
    var rem = Math.round(state.timer.remaining);
    el.durMin.value = Math.floor(rem / 60);
    el.durSec.value = rem % 60;
    el.durationModal.hidden = false;
  }
  function closeDurationModal() {
    if (el.durationModal) el.durationModal.hidden = true;
  }

  function bindKeyboard() {
    document.addEventListener("keydown", function (e) {
      if (e.repeat) return;
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      var k = e.key.toLowerCase();
      if (k === " ") {
        e.preventDefault();
        Timer.toggle();
      } else if (k === "r") {
        Timer.reset();
      } else if (k === "a") {
        keyboardJuryScore("blue", "punch");
      } else if (k === "s") {
        keyboardJuryScore("blue", "kick");
      } else if (k === "k") {
        keyboardJuryScore("red", "punch");
      } else if (k === "l") {
        keyboardJuryScore("red", "kick");
      }
    });
  }

  function keyboardJuryScore(teamKey, type) {
    var state = State.getState();
    var team = teamKey === "blue" ? state.teamBlue : state.teamRed;
    if (team.disqualified) {
      U.toast("SUDUT TERDISKUALIFIKASI", "error");
      return;
    }
    if (type === "punch") State.actions.addPunch(teamKey);
    else State.actions.addKick(teamKey);
    popScore(teamKey);
  }

  function render(state) {
    renderHeader(state);
    renderRoundChips(state);
    renderTeams(state);
    renderJudges(state);
    renderLogs(state);
    renderPending(state);
    renderTimeline(state);
    renderEmergency(state);
    renderTimerDisplay(Timer.getDisplayRemaining(state));
  }

  function renderEmergency(state) {
    if (!el.btnEmergency) return;
    var active = state.timer.emergency === true;
    el.btnEmergency.textContent = active ? "LANJUTKAN (MEDIS)" : "EMERGENCY PAUSE";
    el.btnEmergency.classList.toggle("is-emergency", active);
    el.btnEmergency.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function setLogo(node, src) {
    if (!node) return;
    if (src) {
      node.src = src;
      node.classList.add("has-image");
    } else {
      node.removeAttribute("src");
      node.classList.remove("has-image");
    }
  }

  function renderHeader(state) {
    var ev = state.event;
    if (el.miEventName) el.miEventName.textContent = ev.name;
    if (el.miMatchLine) el.miMatchLine.textContent = ev.match + " - " + ev.category.split(" - ")[0];
    if (el.miRoundLabel) el.miRoundLabel.textContent = "BABAK " + state.round + " - " + (state.timer.status === "RUNNING" ? "AKTIF" : "SIAGA");
    if (el.miCategory) el.miCategory.textContent = ev.category;
    if (el.miStatus) {
      el.miStatus.className = "status-pill status-" + global.IPSI.Utils.statusClass(state.timer.emergency ? "PAUSED" : state.timer.status);
      el.miStatus.textContent = state.timer.emergency ? "MEDIS" : state.timer.status;
    }
  }

  function renderRoundChips(state) {
    if (!el.roundChips) return;
    var total = state.event.rounds;
    var existing = el.roundChips.children.length;
    if (existing !== total) {
      el.roundChips.innerHTML = "";
      for (var i = 1; i <= total; i++) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = "BABAK " + i;
        (function (n) {
          chip.addEventListener("click", function () {
            State.actions.setRound(n);
          });
        })(i);
        el.roundChips.appendChild(chip);
      }
    }
    for (var j = 0; j < el.roundChips.children.length; j++) {
      el.roundChips.children[j].classList.toggle("is-active", (j + 1) === state.round);
    }
  }

  function renderTeams(state) {
    renderTeam(state.teamBlue, "blue");
    renderTeam(state.teamRed, "red");
  }

  function renderTeam(team, teamKey) {
    var panel = document.querySelector(".team-panel--" + teamKey);
    if (panel) panel.classList.toggle("is-disqualified", team.disqualified);
    var state = State.getState();
    if (teamKey === "blue") {
      if (el.blueName) {
        el.blueName.textContent = team.name;
        U.fitText(el.blueName, { min: 12, max: 22 });
      }
      if (el.blueContingent) el.blueContingent.textContent = team.contingent;
      if (el.blueScore) el.blueScore.textContent = team.score;
      if (el.blueDq) el.blueDq.hidden = !team.disqualified;
      if (el.blueFalls) el.blueFalls.textContent = team.falls;
      if (el.blueWarnings) el.blueWarnings.textContent = Number(team.teguran1 || 0) + Number(team.teguran2 || 0) + Number(team.teguran3 || 0);
      if (el.bluePenalties) el.bluePenalties.textContent = Number(team.peringatan1 || 0) + Number(team.peringatan2 || 0) + Number(team.peringatan3 || 0);
      setLogo(el.blueClubLogo, state.event.blueLogo);
      setLogo(el.blueContingentLogo, state.event.blueContingentLogo);
      setDisabled(el.blueButtons, team.disqualified);
    } else {
      if (el.redName) {
        el.redName.textContent = team.name;
        U.fitText(el.redName, { min: 12, max: 22 });
      }
      if (el.redContingent) el.redContingent.textContent = team.contingent;
      if (el.redScore) el.redScore.textContent = team.score;
      if (el.redDq) el.redDq.hidden = !team.disqualified;
      if (el.redFalls) el.redFalls.textContent = team.falls;
      if (el.redWarnings) el.redWarnings.textContent = Number(team.teguran1 || 0) + Number(team.teguran2 || 0) + Number(team.teguran3 || 0);
      if (el.redPenalties) el.redPenalties.textContent = Number(team.peringatan1 || 0) + Number(team.peringatan2 || 0) + Number(team.peringatan3 || 0);
      setLogo(el.redClubLogo, state.event.redLogo);
      setLogo(el.redContingentLogo, state.event.redContingentLogo);
      setDisabled(el.redButtons, team.disqualified);
    }
  }

  function setDisabled(root, flag) {
    if (!root) return;
    var children = root.children;
    for (var i = 0; i < children.length; i++) {
      children[i].classList.toggle("is-disabled", flag);
      children[i].disabled = flag;
    }
  }

  function renderJudges(state) {
    if (!el.judgePanels) return;
    el.judgePanels.innerHTML = "";
    ["judge1", "judge2", "judge3"].forEach(function (key) {
      var j = state.judges[key] || { bluePunch: 0, blueKick: 0, redPunch: 0, redKick: 0 };
      var card = document.createElement("div");
      card.className = "judge-card";
      card.setAttribute("role", "region");
      card.setAttribute("aria-label", "Panel juri " + key);

      var head = document.createElement("div");
      head.className = "judge-card-head";
      var id = document.createElement("span");
      id.className = "judge-id";
      id.textContent = "JURI " + key.replace("judge", "");
      var active = document.createElement("span");
      active.className = "status-pill status-" + (state.judgeActive === key ? "running" : "ready");
      active.textContent = state.judgeActive === key ? "AKTIF" : "PASIF";
      head.appendChild(id);
      head.appendChild(active);
      card.appendChild(head);

      var row = document.createElement("div");
      row.className = "judge-row";

      var blueCell = document.createElement("div");
      blueCell.className = "judge-cell judge-cell--blue";
      blueCell.innerHTML = '<span class="corner">BIRU</span><br>P: <b>' + j.bluePunch + '</b> &nbsp; K: <b>' + j.blueKick + "</b>";

      var redCell = document.createElement("div");
      redCell.className = "judge-cell judge-cell--red";
      redCell.innerHTML = '<span class="corner">MERAH</span><br>P: <b>' + j.redPunch + '</b> &nbsp; K: <b>' + j.redKick + "</b>";

      row.appendChild(blueCell);
      row.appendChild(redCell);
      card.appendChild(row);
      el.judgePanels.appendChild(card);
    });
  }

  function renderLogs(state) {
    renderLogList(state.logs, "blue", el.blueLog);
    renderLogList(state.logs, "red", el.redLog);
  }

  function renderLogList(incoming, teamKey, root) {
    if (!root) return;
    var list = incoming.filter(function (item) { return item.team === teamKey; }).slice(-40).reverse();
    root.innerHTML = "";
    list.forEach(function (item, idx) {
      var row = document.createElement("div");
      row.className = "log-item log-item--" + teamKey + (idx === 0 ? " log-item--flash" : "");
      var label = document.createElement("span");
      label.className = "log-label";
      label.textContent = "B" + item.round + " - " + item.label;
      var value = document.createElement("span");
      value.className = "log-value";
      value.textContent = formatLogValue(item.value, item.label);
      row.appendChild(label);
      row.appendChild(value);
      root.appendChild(row);
    });
    if (!list.length) {
      var empty = document.createElement("div");
      empty.className = "log-item log-item--muted";
      var emptyLabel = document.createElement("span");
      emptyLabel.textContent = "Belum ada nilai masuk";
      empty.appendChild(emptyLabel);
      root.appendChild(empty);
    }
  }

  function formatLogValue(value, label) {
    if (/DISKUALIFIKASI/.test(label)) return "DQ";
    if (typeof value === "number") {
      if (value === 0) return "0";
      if (value > 0) return "+" + value;
      return String(value);
    }
    return String(value === "" ? 0 : value);
  }

  function renderTimeline(state) {
    if (!el.decisionTimeline) return;
    var all = (state.timeline || []).slice().reverse();
    var list = all.filter(function (item) {
      if (timelineFilter === "all") return true;
      return item.team === timelineFilter;
    }).slice(0, 120);
    el.decisionTimeline.innerHTML = "";
    if (!list.length) {
      var empty = document.createElement("p");
      empty.className = "timeline-empty";
      empty.textContent = "Belum ada keputusan dewan pada pertandingan ini.";
      el.decisionTimeline.appendChild(empty);
      return;
    }
    list.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "timeline-item timeline-item--" + item.team + (item.kind === "emergency" ? " timeline-item--emergency" : "");
      var marker = document.createElement("span");
      marker.className = "timeline-marker";
      marker.textContent = item.team === "blue" ? "B" : item.team === "red" ? "M" : "•";
      var body = document.createElement("div");
      body.className = "timeline-body";
      var line = document.createElement("div");
      line.className = "timeline-line";
      var label = document.createElement("strong");
      label.textContent = item.label;
      var time = document.createElement("time");
      time.textContent = formatTime(item.at);
      line.appendChild(label);
      line.appendChild(time);
      body.appendChild(line);
      if (item.detail) {
        var detail = document.createElement("span");
        detail.className = "timeline-detail";
        detail.textContent = "B" + item.round + " • " + item.detail;
        body.appendChild(detail);
      } else {
        var round = document.createElement("span");
        round.className = "timeline-detail";
        round.textContent = "BABAK " + item.round;
        body.appendChild(round);
      }
      if (item.value) {
        var value = document.createElement("b");
        value.className = "timeline-value";
        value.textContent = (item.value > 0 ? "+" : "") + item.value;
        row.appendChild(marker);
        row.appendChild(body);
        row.appendChild(value);
      } else {
        row.appendChild(marker);
        row.appendChild(body);
      }
      el.decisionTimeline.appendChild(row);
    });
  }

  function formatTime(ts) {
    var d = new Date(ts || Date.now());
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0");
  }

  function renderPending(state) {
    var falls = (state.teamBlue.pendingFalls || 0) + (state.teamRed.pendingFalls || 0);
    var pens = (state.teamBlue.pendingPenalties || 0) + (state.teamRed.pendingPenalties || 0);
    setBadge(el.pendingFallBadge, falls);
    setBadge(el.pendingPenaltyBadge, pens);
  }

  function setBadge(node, n) {
    if (!node) return;
    node.textContent = n;
    node.classList.toggle("is-zero", n === 0);
  }

  function renderTimerDisplay(remaining) {
    var s = State.getState();
    var fmt = Timer.formatMMSS(remaining);
    if (el.miTimer) {
      el.miTimer.textContent = fmt;
      el.miTimer.classList.toggle("is-warning", s.timer.status === "PAUSED");
      el.miTimer.classList.toggle("is-finished", s.timer.status === "FINISHED");
    }
    if (el.timerBar) {
      var pct = s.timer.duration > 0 ? Math.max(0, remaining / s.timer.duration) * 100 : 0;
      el.timerBar.style.width = pct.toFixed(1) + "%";
    }
  }

  global.IPSI = global.IPSI || {};
  global.IPSI.Dewan = { init: init };
})(window);