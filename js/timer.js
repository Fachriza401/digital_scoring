(function (global) {
  "use strict";

  var TICK_MS = 200;

  function getDisplayRemaining(state) {
    var t = state.timer;
    if (!t.running) return t.remaining;
    if (!t.startedAt) return t.remaining;
    var elapsed = Math.floor((Date.now() - t.startedAt) / 1000);
    return Math.max(0, t.remaining - elapsed);
  }

  function getDisplayRemainingPrecise(state) {
    var t = state.timer;
    if (!t.running) return t.remaining;
    if (!t.startedAt) return t.remaining;
    var elapsed = (Date.now() - t.startedAt) / 1000;
    return Math.max(0, t.remaining - elapsed);
  }

  function formatClock(seconds, showTenths) {
    var safe = Math.max(0, seconds);
    if (showTenths && safe > 0 && safe < 10) {
      return "00:0" + safe.toFixed(1);
    }
    return formatMMSS(safe);
  }

  function formatMMSS(seconds) {
    var s = Math.max(0, Math.floor(seconds));
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  }

  function start() {
    var state = global.IPSI.State.getState();
    if (state.timer.running || state.timer.status === "FINISHED") return;
    var remaining = getDisplayRemaining(state);
    if (remaining <= 0) {
      global.IPSI.State.updateState(function (s) {
        s.timer.remaining = s.timer.duration;
      });
      state = global.IPSI.State.getState();
      remaining = state.timer.duration;
    }
    global.IPSI.State.updateState(function (s) {
      s.timer.remaining = remaining;
      s.timer.running = true;
      s.timer.startedAt = Date.now();
      s.timer.status = "RUNNING";
      s.timer.emergency = false;
    });
  }

  function pause() {
    var state = global.IPSI.State.getState();
    if (!state.timer.running) return;
    var remaining = getDisplayRemaining(state);
    global.IPSI.State.updateState(function (s) {
      s.timer.remaining = remaining;
      s.timer.running = false;
      s.timer.startedAt = null;
      s.timer.status = remaining <= 0 ? "FINISHED" : "PAUSED";
    });
  }

  function reset() {
    global.IPSI.State.updateState(function (s) {
      s.timer.remaining = s.timer.duration;
      s.timer.running = false;
      s.timer.startedAt = null;
      s.timer.status = "READY";
      s.timer.emergency = false;
    });
  }

  function setDuration(seconds) {
    var secs = Math.min(5940, Math.max(1, Math.floor(seconds)));
    global.IPSI.State.updateState(function (s) {
      s.event.roundDuration = secs;
      s.timer.duration = secs;
      s.timer.remaining = secs;
      s.timer.running = false;
      s.timer.startedAt = null;
      s.timer.status = "READY";
      s.timer.emergency = false;
    });
  }

  function adjust(deltaSeconds) {
    var delta = Math.floor(Number(deltaSeconds) || 0);
    if (!delta) return;
    var state = global.IPSI.State.getState();
    var current = getDisplayRemainingPrecise(state);
    var next = Math.min(state.timer.duration, Math.max(1, current + delta));
    global.IPSI.State.updateState(function (s) {
      s.timer.remaining = Math.round(next);
      if (s.timer.running) s.timer.startedAt = Date.now();
      if (s.timer.status === "FINISHED" && next > 0) s.timer.status = s.timer.running ? "RUNNING" : "PAUSED";
    });
  }

  function emergencyPause() {
    global.IPSI.State.actions.setEmergency(true);
  }

  function clearEmergency() {
    global.IPSI.State.actions.setEmergency(false);
  }

  function isEmergency() {
    return global.IPSI.State.getState().timer.emergency === true;
  }

  function toggle() {
    var state = global.IPSI.State.getState();
    if (state.timer.running) {
      pause();
    } else {
      start();
    }
  }

  var tickerId = null;

  function startTicker(onTick) {
    if (tickerId !== null) return tickerId;
    tickerId = global.setInterval(function () {
      var state = global.IPSI.State.getState();
      if (state.timer.running) {
        var remaining = getDisplayRemaining(state);
        if (remaining <= 0) {
          global.IPSI.State.updateState(function (s) {
            s.timer.remaining = 0;
            s.timer.running = false;
            s.timer.startedAt = null;
            s.timer.status = "FINISHED";
            s.timer.emergency = false;
          });
        } else if (typeof onTick === "function") {
          onTick(remaining);
        }
      }
    }, TICK_MS);
    return tickerId;
  }

  global.IPSI = global.IPSI || {};
  global.IPSI.Timer = {
    start: start,
    pause: pause,
    reset: reset,
    toggle: toggle,
    setDuration: setDuration,
    adjust: adjust,
    emergencyPause: emergencyPause,
    clearEmergency: clearEmergency,
    isEmergency: isEmergency,
    formatMMSS: formatMMSS,
    formatClock: formatClock,
    getDisplayRemaining: getDisplayRemaining,
    getDisplayRemainingPrecise: getDisplayRemainingPrecise,
    startTicker: startTicker
  };
})(window);