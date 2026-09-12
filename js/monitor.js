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
      "miEventName", "miStatus", "miBlueName", "miBlueContingent", "miBlueScore", "miBlueDq",
      "miRedName", "miRedContingent", "miRedScore", "miRedDq",
      "miRoundLabel", "miTimer", "miMatchLine", "miClock", "miDate"
       , "miBlueJudges", "miRedJudges"
    ]);

    State.subscribe(render);
    render(State.getState());

    Timer.startTicker(function (remaining) {
      renderTimerDisplay(remaining);
    });

    updateClock();
    setInterval(updateClock, 1000);

    wireAutoHide();
  }

  function render(state) {
    var ev = state.event;
    if (el.miEventName) el.miEventName.textContent = ev.name;
    if (el.miMatchLine) el.miMatchLine.textContent = ev.match + "  |  " + ev.category;
    if (el.miRoundLabel) el.miRoundLabel.textContent = "BABAK " + state.round;
    if (el.miStatus) {
      el.miStatus.className = "status-pill status-" + global.IPSI.Utils.statusClass(state.timer.status);
      el.miStatus.textContent = state.timer.status;
    }

    renderBoard("blue", state.teamBlue);
    renderBoard("red", state.teamRed);
    renderJudgeRecap(state, "blue");
    renderJudgeRecap(state, "red");

    renderTimerDisplay(Timer.getDisplayRemaining(state));
  }

   function renderJudgeRecap(state, teamKey) {
     var root = teamKey === "blue" ? el.miBlueJudges : el.miRedJudges;
     if (!root) return;
     root.innerHTML = "";
     var title = document.createElement("span");
     title.className = "board-judges-title";
    title.textContent = "REKAP PANEL UTAMA JURI INDIVIDUAL (" + teamKey.toUpperCase() + ")";
     root.appendChild(title);
    var header = document.createElement("div");
    header.className = "board-judge-row board-judge-header";
    header.innerHTML = "<span>JURI</span><span>PUNCH</span><span>KICK</span>";
    root.appendChild(header);
     ["judge1", "judge2", "judge3"].forEach(function (key) {
       var judge = state.judges[key] || {};
       var row = document.createElement("span");
       row.className = "board-judge-row";
      row.innerHTML = "<span>JURI " + key.replace("judge", "") + "</span><span>" + (judge[teamKey + "Punch"] || 0) + "</span><span>" + (judge[teamKey + "Kick"] || 0) + "</span>";
       root.appendChild(row);
     });
   }
  function renderBoard(teamKey, team) {
    if (teamKey === "blue") {
      if (el.miBlueName) el.miBlueName.textContent = team.name;
      if (el.miBlueContingent) el.miBlueContingent.textContent = team.contingent;
      if (el.miBlueDq) el.miBlueDq.hidden = !team.disqualified;
      if (el.miBlueScore && el.miBlueScore.textContent !== String(team.score)) {
        el.miBlueScore.textContent = team.score;
        pop(el.miBlueScore);
      }
    } else {
      if (el.miRedName) el.miRedName.textContent = team.name;
      if (el.miRedContingent) el.miRedContingent.textContent = team.contingent;
      if (el.miRedDq) el.miRedDq.hidden = !team.disqualified;
      if (el.miRedScore && el.miRedScore.textContent !== String(team.score)) {
        el.miRedScore.textContent = team.score;
        pop(el.miRedScore);
      }
    }
    var board = document.querySelector(".board--" + teamKey);
    if (board) board.classList.toggle("is-disqualified", team.disqualified);
  }

  function pop(node) {
    node.classList.remove("pop");
    void node.offsetWidth;
    node.classList.add("pop");
  }

  function renderTimerDisplay(remaining) {
    var s = State.getState();
    if (!el.miTimer) return;
    var fmt = Timer.formatMMSS(remaining);
    if (el.miTimer.textContent !== fmt) el.miTimer.textContent = fmt;
    el.miTimer.classList.toggle("is-warning", s.timer.status === "PAUSED");
    el.miTimer.classList.toggle("is-finished", s.timer.status === "FINISHED");
  }

  function updateClock() {
    var now = new Date();
    if (el.miClock) {
      el.miClock.textContent =
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0") + ":" +
        String(now.getSeconds()).padStart(2, "0");
    }
    if (el.miDate) {
      var days = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
      var months = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
      el.miDate.textContent =
        days[now.getDay()] + ", " + String(now.getDate()).padStart(2, "0") + " " +
        months[now.getMonth()] + " " + now.getFullYear();
    }
  }

  function wireAutoHide() {
    var body = document.body;
    var idleTimer = null;
    function showUi() {
      body.classList.remove("ui-idle");
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        if (document.fullscreenElement) body.classList.add("ui-idle");
      }, 3200);
    }
    document.addEventListener("mousemove", showUi);
    document.addEventListener("keydown", showUi);
    document.addEventListener("fullscreenchange", function () {
      if (!document.fullscreenElement) body.classList.remove("ui-idle");
      else showUi();
    });
    showUi();
  }

  global.IPSI = global.IPSI || {};
  global.IPSI.Monitor = { init: init };
})(window);