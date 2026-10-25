(function (global) {
  "use strict";

  var State = global.IPSI.State;
  var Timer = global.IPSI.Timer;
  var U = null;
  var el = {};
  var recapKey = "";
  var recapHideTimer = null;

  function grab(ids) {
    ids.forEach(function (id) {
      el[id] = document.getElementById(id);
    });
  }

  function init() {
    U = global.IPSI.Utils;
    grab([
      "miEventName", "miStatus", "miBlueName", "miBlueContingent", "miBlueScore", "miBlueDq",
      "miBlueBinaan", "miBlueTeguran", "miBluePeringatan",
      "miRedName", "miRedContingent", "miRedScore", "miRedDq",
      "miRedBinaan", "miRedTeguran", "miRedPeringatan",
      "miBlueClubLogo", "miRedClubLogo", "miBlueContingentLogo", "miRedContingentLogo",
      "miRoundLabel", "miTimer", "miMatchLine", "miClock", "miDate",
      "miBlueJudges", "miRedJudges",
      "emergencyOverlay", "roundRecap", "recapKicker", "recapTitle",
      "recapBlueName", "recapBlueScore", "recapRedName", "recapRedScore",
      "recapRoundScore", "recapWinner", "btnCloseRecap"
    ]);

    if (el.btnCloseRecap) el.btnCloseRecap.addEventListener("click", hideRecap);

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
      el.miStatus.className = "status-pill status-" + global.IPSI.Utils.statusClass(state.timer.emergency ? "PAUSED" : state.timer.status);
      el.miStatus.textContent = state.timer.emergency ? "MEDIS" : state.timer.status;
    }

    renderBoard("blue", state.teamBlue);
    renderBoard("red", state.teamRed);
    renderJudgeRecap(state, "blue");
    renderJudgeRecap(state, "red");
    renderEmergency(state);
    renderRecap(state);

    renderTimerDisplay(Timer.getDisplayRemaining(state));
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

  function renderEmergency(state) {
    if (!el.emergencyOverlay) return;
    el.emergencyOverlay.hidden = state.timer.emergency !== true;
  }

  function showRecap(state) {
    if (!el.roundRecap) return;
    var totals = State.getRoundTotals(state);
    var current = totals[String(state.round)] || { blue: 0, red: 0 };
    if (el.recapKicker) el.recapKicker.textContent = "REKAP BABAK " + state.round;
    if (el.recapTitle) el.recapTitle.textContent = "AKHIR BABAK";
    if (el.recapBlueName) el.recapBlueName.textContent = state.teamBlue.name;
    if (el.recapRedName) el.recapRedName.textContent = state.teamRed.name;
    if (el.recapBlueScore) el.recapBlueScore.textContent = state.teamBlue.score;
    if (el.recapRedScore) el.recapRedScore.textContent = state.teamRed.score;
    if (el.recapRoundScore) el.recapRoundScore.textContent = fmtScore(current.blue) + " - " + fmtScore(current.red);
    if (el.recapWinner) {
      el.recapWinner.textContent =
        state.teamBlue.score === state.teamRed.score ? "SKOR SERI"
          : state.teamBlue.score > state.teamRed.score ? "BIRU UNGGUL" : "MERAH UNGGUL";
    }
    el.roundRecap.hidden = false;
    if (recapHideTimer) clearTimeout(recapHideTimer);
    recapHideTimer = setTimeout(hideRecap, 10000);
  }

  function hideRecap() {
    if (el.roundRecap) el.roundRecap.hidden = true;
    if (recapHideTimer) {
      clearTimeout(recapHideTimer);
      recapHideTimer = null;
    }
  }

  function renderRecap(state) {
    if (!el.roundRecap) return;
    if (state.timer.status === "FINISHED") {
      var key = state.round + ":" + state.timer.duration + ":" + (state.history || []).length;
      if (key !== recapKey) {
        recapKey = key;
        showRecap(state);
      }
    } else if (!state.timer.emergency) {
      hideRecap();
    }
  }

  function fmtScore(value) {
    var n = Math.round(Number(value) || 0);
    return n > 0 ? "+" + n : String(n);
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
    var state = State.getState();
    if (teamKey === "blue") {
      if (el.miBlueName) {
        el.miBlueName.textContent = team.name;
        U.fitText(el.miBlueName, { min: 18, max: 34 });
      }
      if (el.miBlueContingent) {
        el.miBlueContingent.textContent = team.contingent;
        U.fitText(el.miBlueContingent, { min: 10, max: 15 });
      }
      if (el.miBlueBinaan) el.miBlueBinaan.textContent = Number(team.binaan1 || 0) + Number(team.binaan2 || 0);
      if (el.miBlueTeguran) el.miBlueTeguran.textContent = Number(team.teguran1 || 0) + Number(team.teguran2 || 0) + Number(team.teguran3 || 0);
      if (el.miBluePeringatan) el.miBluePeringatan.textContent = Number(team.peringatan1 || 0) + Number(team.peringatan2 || 0) + Number(team.peringatan3 || 0);
      if (el.miBlueDq) el.miBlueDq.hidden = !team.disqualified;
      setLogo(el.miBlueClubLogo, state.event.blueLogo);
      setLogo(el.miBlueContingentLogo, state.event.blueContingentLogo);
      if (el.miBlueScore && el.miBlueScore.textContent !== String(team.score)) {
        el.miBlueScore.textContent = team.score;
        pop(el.miBlueScore);
      }
    } else {
      if (el.miRedName) {
        el.miRedName.textContent = team.name;
        U.fitText(el.miRedName, { min: 18, max: 34 });
      }
      if (el.miRedContingent) {
        el.miRedContingent.textContent = team.contingent;
        U.fitText(el.miRedContingent, { min: 10, max: 15 });
      }
      if (el.miRedBinaan) el.miRedBinaan.textContent = Number(team.binaan1 || 0) + Number(team.binaan2 || 0);
      if (el.miRedTeguran) el.miRedTeguran.textContent = Number(team.teguran1 || 0) + Number(team.teguran2 || 0) + Number(team.teguran3 || 0);
      if (el.miRedPeringatan) el.miRedPeringatan.textContent = Number(team.peringatan1 || 0) + Number(team.peringatan2 || 0) + Number(team.peringatan3 || 0);
      if (el.miRedDq) el.miRedDq.hidden = !team.disqualified;
      setLogo(el.miRedClubLogo, state.event.redLogo);
      setLogo(el.miRedContingentLogo, state.event.redContingentLogo);
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
    var precise = Timer.getDisplayRemainingPrecise(s);
    var fmt = Timer.formatClock(precise, true);
    if (el.miTimer.textContent !== fmt) el.miTimer.textContent = fmt;
    el.miTimer.classList.toggle("is-warning", s.timer.status === "PAUSED");
    el.miTimer.classList.toggle("is-finished", s.timer.status === "FINISHED");
    el.miTimer.classList.toggle("is-emergency", s.timer.emergency === true);
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