(function (global) {
  "use strict";

  var State = global.IPSI.State;
  var Timer = global.IPSI.Timer;
  var U = null;
  var el = {};
  var lastHit = {};
  var DEBOUNCE_MS = 280;

  function grab(ids) {
    ids.forEach(function (id) {
      el[id] = document.getElementById(id);
    });
  }

  function init() {
    U = global.IPSI.Utils;
    var authenticatedJudge = null;
    try { authenticatedJudge = sessionStorage.getItem("ipsi_judge_session"); } catch (e) {}
    if (["judge1", "judge2", "judge3"].indexOf(authenticatedJudge) === -1) {
      window.location.replace("juri-login.html");
      return;
    }
    if (State.getState().judgeActive !== authenticatedJudge) State.actions.setJudge(authenticatedJudge);
    grab([
      "miEventName", "miMatchLine", "miRoundLabel", "miStatus", "miTimer", "miCategory",
      "activeJudgeLabel", "judgeAthleteLabel",
      "blueName", "redName", "blueContingent", "redContingent", "blueDq", "redDq",
      "blueClubLogo", "redClubLogo", "blueContingentLogo", "redContingentLogo",
      "blueCounters", "redCounters", "blueButtons", "redButtons",
      "btnBluePunch", "btnBlueKick", "btnRedPunch", "btnRedKick",
      "btnExit",
      "exitModal", "btnExitCancel", "btnExitConfirm"
    ]);

    bindControls();
    State.subscribe(render);
    render(State.getState());

    Timer.startTicker(function (remaining) {
      renderTimerDisplay(remaining);
    });

    updateMobileFullscreenMode();
    document.addEventListener("fullscreenchange", updateMobileFullscreenMode);
  }

  function updateMobileFullscreenMode() {
    var fullscreen = !!document.fullscreenElement;
    document.body.classList.toggle("fullscreen-focus", fullscreen);
    document.body.classList.toggle("mobile-focus", window.innerWidth <= 600 && fullscreen);
  }

  function bindControls() {
    if (el.btnBluePunch) el.btnBluePunch.addEventListener("click", function () { score("blue", "punch"); });
    if (el.btnBlueKick) el.btnBlueKick.addEventListener("click", function () { score("blue", "kick"); });
    if (el.btnRedPunch) el.btnRedPunch.addEventListener("click", function () { score("red", "punch"); });
    if (el.btnRedKick) el.btnRedKick.addEventListener("click", function () { score("red", "kick"); });

    if (el.btnExit) el.btnExit.addEventListener("click", function () { if (el.exitModal) el.exitModal.hidden = false; });
    if (el.btnExitCancel) el.btnExitCancel.addEventListener("click", function () { if (el.exitModal) el.exitModal.hidden = true; });
    if (el.btnExitConfirm) el.btnExitConfirm.addEventListener("click", function () {
      try { sessionStorage.removeItem("ipsi_judge_session"); } catch (e) {}
      location.href = "index.html";
    });
  }

  function score(teamKey, type) {
    var node = teamKey === "blue"
      ? (type === "kick" ? el.btnBlueKick : el.btnBluePunch)
      : (type === "kick" ? el.btnRedKick : el.btnRedPunch);
    var key = teamKey + ":" + type;
    var now = Date.now();
    if (lastHit[key] && now - lastHit[key] < DEBOUNCE_MS) return;
    lastHit[key] = now;

    var state = State.getState();
    var team = teamKey === "blue" ? state.teamBlue : state.teamRed;
    if (!state.timer.running) {
      U.toast("TIMER BELUM AKTIF", "error");
      pulse(node, false);
      return;
    }
    if (team.disqualified) {
      U.toast("SUDUT TERDISKUALIFIKASI", "error");
      pulse(node, false);
      return;
    }
    if (type === "punch") State.actions.addPunch(teamKey);
    else State.actions.addKick(teamKey);
    pop(node);
    pulse(node, true);
    if (global.navigator && typeof global.navigator.vibrate === "function") {
      try { global.navigator.vibrate(18); } catch (e) {}
    }
  }

  function pop(node) {
    if (!node) return;
    node.classList.remove("pop");
    void node.offsetWidth;
    node.classList.add("pop");
  }

  function pulse(node, accepted) {
    if (!node) return;
    node.classList.remove("is-hit", "is-rejected");
    void node.offsetWidth;
    node.classList.add(accepted ? "is-hit" : "is-rejected");
    var value = document.createElement("span");
    value.className = "hit-pop" + (accepted ? "" : " hit-pop--rejected");
    value.textContent = accepted ? node.querySelector(".sb-value").textContent : "!";
    node.appendChild(value);
    setTimeout(function () {
      if (value.parentNode) value.parentNode.removeChild(value);
      node.classList.remove("is-hit", "is-rejected");
    }, 520);
  }

  function render(state) {
    renderHeader(state);
    renderTeams(state);
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
      el.miStatus.className = "status-pill status-" + global.IPSI.Utils.statusClass(state.timer.emergency ? "PAUSED" : state.timer.status);
      el.miStatus.textContent = state.timer.emergency ? "MEDIS" : state.timer.status;
    }
  }

  function renderTeams(state) {
    renderTeam(state.teamBlue, "blue");
    renderTeam(state.teamRed, "red");
    setCornerLock("blue", state.teamBlue.disqualified, el.btnBluePunch, el.btnBlueKick);
    setCornerLock("red", state.teamRed.disqualified, el.btnRedPunch, el.btnRedKick);
  }

  function renderTeam(team, teamKey) {
    var state = State.getState();
    if (teamKey === "blue") {
      if (el.blueName) {
        el.blueName.textContent = team.name;
        U.fitText(el.blueName, { min: 13, max: 22 });
      }
      if (el.blueContingent) el.blueContingent.textContent = team.contingent;
      if (el.blueDq) el.blueDq.hidden = !team.disqualified;
      setLogo(el.blueClubLogo, state.event.blueLogo);
      setLogo(el.blueContingentLogo, state.event.blueContingentLogo);
      renderCounters(el.blueCounters, team);
    } else {
      if (el.redName) {
        el.redName.textContent = team.name;
        U.fitText(el.redName, { min: 13, max: 22 });
      }
      if (el.redContingent) el.redContingent.textContent = team.contingent;
      if (el.redDq) el.redDq.hidden = !team.disqualified;
      setLogo(el.redClubLogo, state.event.redLogo);
      setLogo(el.redContingentLogo, state.event.redContingentLogo);
      renderCounters(el.redCounters, team);
    }
    var panel = document.querySelector(".corner--" + teamKey);
    if (panel) panel.classList.toggle("is-disqualified", team.disqualified);
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