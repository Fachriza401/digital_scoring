(function (global) {
  "use strict";

  var Utils = {
    $: function (id) {
      return document.getElementById(id);
    },
    qs: function (sel, root) {
      return (root || document).querySelector(sel);
    },
    qsa: function (sel, root) {
      return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    },
    formatMMSS: function (s) {
      return global.IPSI.Timer.formatMMSS(s);
    },
    statusClass: function (status) {
      return String(status || "READY").toLowerCase();
    },
    toast: function (message, kind) {
      var area = document.getElementById("toastArea");
      if (!area) return;
      var el = document.createElement("div");
      el.className = "toast toast-" + (kind || "info");
      el.textContent = message;
      area.appendChild(el);
      setTimeout(function () {
        el.classList.add("toast-out");
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 320);
      }, 2600);
    },
    esc: function (text) {
      var d = document.createElement("div");
      d.textContent = text == null ? "" : String(text);
      return d.innerHTML;
    }
  };

  function setSyncIndicator() {
    var nodes = Utils.qsa("[data-sync-indicator]");
    var fallback = !global.IPSI.Sync.isAvailable();
    nodes.forEach(function (node) {
      node.classList.toggle("is-fallback", fallback);
      node.textContent = fallback ? "LOCAL FALLBACK" : "SYSTEM ONLINE";
      node.classList.toggle("sync-ok", !fallback);
      node.classList.toggle("sync-fallback", fallback);
      node.setAttribute("aria-label", fallback ? "Sinkronisasi lokal (BroadcastChannel tidak tersedia)" : "Sinkronisasi sistem aktif");
    });
  }

  function wireFullscreenButtons() {
    Utils.qsa("[data-action='fullscreen']").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(function () {});
        } else {
          document.documentElement.requestFullscreen().catch(function () {});
        }
      });
    });
    document.addEventListener("fullscreenchange", function () {
      Utils.qsa("[data-action='fullscreen']").forEach(function (btn) {
        btn.textContent = document.fullscreenElement ? "KELUAR LAYAR" : "FULLSCREEN";
      });
    });
  }

  function init() {
    global.IPSI.State.loadState();
    global.IPSI.Sync.init();
    setSyncIndicator();
    wireFullscreenButtons();

    var mode = document.body && document.body.dataset.mode;
    if (mode === "dewan" && global.IPSI.Dewan) global.IPSI.Dewan.init();
    else if (mode === "juri" && global.IPSI.Juri) global.IPSI.Juri.init();
    else if (mode === "monitor" && global.IPSI.Monitor) global.IPSI.Monitor.init();
    else if (mode === "sekretaris" && global.IPSI.Sekretaris) global.IPSI.Sekretaris.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.IPSI = global.IPSI || {};
  global.IPSI.Utils = Utils;
})(window);