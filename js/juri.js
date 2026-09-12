(function (global) {
  "use strict";

  var State = global.IPSI.State;
  var Timer = global.IPSI.Timer;
  var U = null;
  var el = {};

  function grab(ids) {
    ids.forEach(function (id) {
      el[id] = document.getElementById(id);
    });
  }

  function init() {
    U = global.IPSI.Utils;
    grab([
      "miEventName", "miMatchLine", "miRoundLabel", "miStatus", "miTimer", "miCategory",
      "activeJudgeLabel", "judgeAthleteLabel",
      "blueName", "redName", "blueContingent", "redContingent", "blueDq", "redDq",
      "blueCounters", "redCounters", "blueButtons", "redButtons",
      "btnBluePunch", "btnBlueKick", "btnRedPunch", "btnRedKick",
      "judgeSelector", "judgeLock", "btnExit",
      "exitModal", "btnExitCancel", "btnExitConfirm"
    ]);

    bindControls();
    State.subscribe(render);
    render(State.getState());

    Timer.startTicker(function (remaining) {
      renderTimerDisplay(remaining);
    });
  }

  function bindControls() {
    if (el.btnBluePunch) el.btnBluePunch.addEventListener("click", function () { score("blue", "punch"); });
    if (el.btnBlueKick) el.btnBlueKick.addEventListener("click", function () { score("blue", "kick"); });
    if (el.btnRedPunch) el.btnRedPunch.addEventListener("click", function () { score("red", "punch"); });
    if (el.btnRedKick) el.btnRedKick.addEventListener("click", function () { score("red", "kick"); });

    if (el.btnExit) el.btnExit.addEventListener("click", function () { if (el.exitModal) el.exitModal.hidden = false; });
    if (el.btnExitCancel) el.btnExitCancel.addEventListener("click", function () { if (el.exitModal) el.exitModal.hidden = true; });
    if (el.btnExitConfirm) el.btnExitConfirm.addEventListener("click", function () {
      location.href = "index.html";
    });
  }

  function score(teamKey, type) {
    var state = State.getState();
    var team = teamKey === "blue" ? state.teamBlue : state.teamRed;
    if (!state.timer.running) {
      U.toast("TIMER BELUM AKTIF", "error");
      return;
    }
    if (team.disqualified) {
      U.toast("SUDUT TERDISKUALIFIKASI", "error");
      return;
    }
    if (type === "punch") State.actions.addPunch(teamKey);
    else State.actions.addKick(teamKey);
    pop(teamKey === "blue"
      ? (type === "kick" ? el.btnBlueKick : el.btnBluePunch)
      : (type === "kick" ? el.btnRedKick : el.btnRedPunch));
  }

  function pop(node) {
    if (!node) return;
    node.classList.remove("pop");
    void node.offsetWidth;
    node.classList.add("pop");
  }

  function render(state) {
    renderHeader(state);
    renderTeams(state);
    renderSelector(state);
    renderTimerDisplay(Timer.getDisplayRemaining(state));
  }

  function renderHeader(state) {
    var ev = state.event;
    if (el.miEventName) el.miEventName.textContent = ev.name;
    if (el.miMatchLine) el.miMatchLine.textContent = ev.match + " - " + ev.category.split(" - ")[0];
    if (el.miRoundLabel) el.miRoundLabel.textContent = "BABAK " + state.round + " - " + (state.timer.status === "RUNNING" ? "AKTIF" : "SIAGA");
    if (el.miCategory) el.miCategory.textContent = ev.category;
    if (el.activeJudgeLabel) el.activeJudgeLabel.textContent = "JURI " + String(state.judgeActive || "judge1").replace("judge", "");
    if (el.judgeAthleteLabel) el.judgeAthleteLabel.textContent = "Atlet: " + ev.category.replace(/^TANDING\s+/i, "");
    if (el.miStatus) {
      el.miStatus.className = "status-pill status-" + global.IPSI.Utils.statusClass(state.timer.status);
      el.miStatus.textContent = state.timer.status;
    }
  }

  function renderTeams(state) {
    renderTeam(state.teamBlue, "blue");
    renderTeam(state.teamRed, "red");
    setCornerLock("blue", state.teamBlue.disqualified, el.btnBluePunch, el.btnBlueKick);
    setCornerLock("red", state.teamRed.disqualified, el.btnRedPunch, el.btnRedKick);
  }

  function renderTeam(team, teamKey) {
    if (teamKey === "blue") {
      if (el.blueName) el.blueName.textContent = team.name;
      if (el.blueContingent) el.blueContingent.textContent = team.contingent;
      if (el.blueDq) el.blueDq.hidden = !team.disqualified;
      renderCounters(el.blueCounters, team);
    } else {
      if (el.redName) el.redName.textContent = team.name;
      if (el.redContingent) el.redContingent.textContent = team.contingent;
      if (el.redDq) el.redDq.hidden = !team.disqualified;
      renderCounters(el.redCounters, team);
    }
    var panel = document.querySelector(".corner--" + teamKey);
    if (panel) panel.classList.toggle("is-disqualified", team.disqualified);
  }

  function renderCounters(root, team) {
    if (!root) return;
    root.innerHTML = "";
    var items = [
      { label: "PUNCHES:", value: team.punches + " (" + team.punches + " sah)" },
      { label: "KICKS:", value: team.kicks + " (" + team.kicks + " sah)" },
      { label: "SCORE:", value: team.score }
    ];
    items.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "counter";
      var l = document.createElement("span");
      l.textContent = item.label;
      var v = document.createElement("b");
      v.textContent = item.value;
      row.appendChild(l);
      row.appendChild(v);
      root.appendChild(row);
    });
  }

  function setCornerLock(teamKey, disqualified, punchBtn, kickBtn) {
    if (punchBtn) punchBtn.disabled = disqualified;
    if (kickBtn) kickBtn.disabled = disqualified;
  }

  var JUDGE_KEYS = ["judge1", "judge2", "judge3"];
  var builtSelector = false;

  function renderSelector(state) {
    if (!el.judgeSelector) return;
    if (!builtSelector) {
      builtSelector = true;
      JUDGE_KEYS.forEach(function (key) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "judge-opt";
        btn.textContent = "JURI " + key.replace("judge", "");
        btn.setAttribute("role", "radio");
        btn.addEventListener("click", function () {
          State.actions.setJudge(key);
        });
        el.judgeSelector.appendChild(btn);
      });
    }
    var running = state.timer.running;
    var opts = Array.prototype.slice.call(el.judgeSelector.children);
    opts.forEach(function (btn, i) {
      var key = JUDGE_KEYS[i];
      btn.classList.toggle("is-active", state.judgeActive === key);
      btn.setAttribute("aria-checked", state.judgeActive === key ? "true" : "false");
      btn.disabled = running;
    });
    if (el.judgeLock) {
      el.judgeLock.hidden = !running;
      var pill = U.qs(".status-pill", el.judgeLock);
      if (pill) {
        pill.className = "status-pill status-" + (running ? "paused" : "ready");
        pill.textContent = running ? "JURI TERKUNCI" : "JURI SIAP";
      }
    }
  }

  function renderTimerDisplay(remaining) {
    var s = State.getState();
    var fmt = Timer.formatMMSS(remaining);
    if (el.miTimer) {
      el.miTimer.textContent = fmt;
      el.miTimer.classList.toggle("is-warning", s.timer.status === "PAUSED");
      el.miTimer.classList.toggle("is-finished", s.timer.status === "FINISHED");
    }
  }

  global.IPSI = global.IPSI || {};
  global.IPSI.Juri = { init: init };
})(window);