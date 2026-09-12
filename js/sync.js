(function (global) {
  "use strict";

  var CHANNEL_NAME = "ipsi_scoring_live";
  var channel = null;
  var realtimeChannel = null;
  var realtimeAvailable = false;
  var available = false;

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
      realtimeChannel.subscribe(function (status) {
        realtimeAvailable = status === "SUBSCRIBED";
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

  global.IPSI = global.IPSI || {};
  global.IPSI.Sync = {
    init: init,
    broadcast: broadcast,
    broadcastState: broadcast,
    subscribeToState: function (fn) {
      return global.IPSI.State.subscribe(fn);
    },
    syncState: function () {
      global.IPSI.State.loadState();
      global.IPSI.State.saveState();
    },
    isAvailable: isAvailable
  };
})(window);