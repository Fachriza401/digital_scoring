(function (global) {
  "use strict";

  var CHANNEL_NAME = "ipsi_scoring_live";
  var channel = null;
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
    if (!available || !channel) return;
    try {
      channel.postMessage({ type: "STATE_UPDATE", state: global.IPSI.State.getState() });
    } catch (e) {}
  }

  function isAvailable() {
    return available;
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