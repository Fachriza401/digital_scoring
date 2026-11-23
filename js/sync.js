(function (global) {
  "use strict";

  var CHANNEL_NAME = "ipsi_scoring_live";
  var channel = null;
  var realtimeChannel = null;
  var realtimeAvailable = false;
  var available = false;
  var judgePresenceListeners = [];
  var requestedJudgePresence = "";
  var presenceInterval = null;

  function init() {
    try {
      if (typeof global.BroadcastChannel === "function") {
        channel = new BroadcastChannel(CHANNEL_NAME);
        available = true;
        channel.addEventListener("message", onMessage);
      }
    } catch (e) {
      available = false;
    }

    global.addEventListener("storage", onStorageEvent);
    if (!presenceInterval) presenceInterval = global.setInterval(publishJudgePresence, 4000);

    initSupabaseRealtime();
  }

  function initSupabaseRealtime() {
    var config = global.IPSI_SUPABASE_CONFIG;
    var supabaseFactory = global.supabase && global.supabase.createClient;
    if (!config || !supabaseFactory || !config.url || !config.anonKey || config.anonKey.indexOf("PASTE_") === 0) return;
    try {
      var client = supabaseFactory(config.url, config.anonKey);
      realtimeChannel = client.channel("ipsi-scoring-live-state");
      realtimeChannel.on("broadcast", { event: "state" }, function (message) {
        if (message && message.payload && message.payload.state) {
          global.IPSI.State.applyRemote(message.payload.state, { source: "supabase" });
        }
      });
      realtimeChannel.on("presence", { event: "sync" }, publishJudgePresence);
      realtimeChannel.on("presence", { event: "join" }, publishJudgePresence);
      realtimeChannel.on("presence", { event: "leave" }, publishJudgePresence);
      realtimeChannel.subscribe(function (status) {
        realtimeAvailable = status === "SUBSCRIBED";
        if (realtimeAvailable && requestedJudgePresence) trackRequestedJudgePresence();
        publishJudgePresence();
        try {
          global.dispatchEvent(new CustomEvent("ipsi-sync-status", { detail: { online: realtimeAvailable } }));
        } catch (e) {}
      });
    } catch (e) {
      realtimeAvailable = false;
    }
  }

  function onMessage(event) {
    var data = event && event.data;
    if (data && data.type === "STATE_UPDATE" && data.state) {
      global.IPSI.State.applyRemote(data.state, { source: "broadcast" });
    }
  }

  function onStorageEvent(event) {
    if (event.key && event.key.indexOf("ipsi_judge_presence_") === 0) {
      publishJudgePresence();
      return;
    }
    if (event.key !== global.IPSI.State.STORAGE_KEY || !event.newValue) return;
    try {
      global.IPSI.State.applyRemote(JSON.parse(event.newValue), { source: "storage" });
    } catch (e) {}
  }

  function broadcast() {
    var state = global.IPSI.State.getState();
    if (available && channel) {
      try { channel.postMessage({ type: "STATE_UPDATE", state: state }); } catch (e) {}
    }
    if (realtimeAvailable && realtimeChannel) {
      realtimeChannel.send({ type: "broadcast", event: "state", payload: { state: state } }).catch(function () {});
    }
  }

  function isAvailable() {
    return available || realtimeAvailable;
  }

  function getJudgePresence() {
    var presence = {};
    if (realtimeAvailable && realtimeChannel) {
      var state = realtimeChannel.presenceState();
      Object.keys(state).forEach(function (key) {
        (state[key] || []).forEach(function (metadata) {
          if (metadata && ["judge1", "judge2", "judge3"].indexOf(metadata.judge) !== -1) {
            presence[metadata.judge] = true;
          }
        });
      });
    }
    var now = Date.now();
    ["judge1", "judge2", "judge3"].forEach(function (judge) {
      try {
        var timestamp = Number(global.localStorage.getItem("ipsi_judge_presence_" + judge));
        if (timestamp > 0 && timestamp <= now && now - timestamp < 12000) presence[judge] = true;
      } catch (e) {}
    });
    return presence;
  }

  function publishJudgePresence() {
    var presence = getJudgePresence();
    judgePresenceListeners.slice().forEach(function (listener) {
      listener(presence);
    });
  }

  function trackRequestedJudgePresence() {
    if (!realtimeAvailable || !realtimeChannel || !requestedJudgePresence) return Promise.resolve(false);
    return realtimeChannel.track({ judge: requestedJudgePresence }).then(function () {
      publishJudgePresence();
      return true;
    }).catch(function (error) {
      if (global.console) global.console.error("Gagal memperbarui status koneksi juri.", error);
      return false;
    });
  }

  function setJudgePresence(judge, online) {
    if (online && ["judge1", "judge2", "judge3"].indexOf(judge) === -1) {
      return Promise.reject(new Error("Identitas juri tidak valid."));
    }
    requestedJudgePresence = online ? judge : "";
    if (online) {
      return trackRequestedJudgePresence();
    }
    if (realtimeAvailable && realtimeChannel) {
      return realtimeChannel.untrack().then(function () {
        publishJudgePresence();
        return true;
      }).catch(function (error) {
        if (global.console) global.console.error("Gagal mengakhiri status koneksi juri.", error);
        throw error;
      });
    }
    publishJudgePresence();
    return Promise.resolve(false);
  }

  function subscribeToJudgePresence(listener) {
    judgePresenceListeners.push(listener);
    listener(getJudgePresence());
    return function () {
      var index = judgePresenceListeners.indexOf(listener);
      if (index !== -1) judgePresenceListeners.splice(index, 1);
    };
  }

  global.IPSI = global.IPSI || {};
  global.IPSI.Sync = {
    init: init,
    broadcast: broadcast,
    broadcastState: broadcast,
    subscribeToState: function (fn) {
      return global.IPSI.State.subscribe(fn);
    },
    setJudgePresence: setJudgePresence,
    subscribeToJudgePresence: subscribeToJudgePresence,
    syncState: function () {
      global.IPSI.State.loadState();
      global.IPSI.State.saveState();
    },
    isAvailable: isAvailable
  };
})(window);