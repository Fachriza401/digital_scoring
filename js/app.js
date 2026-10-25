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
    },
    fitText: function (node, options) {
      if (!node) return;
      var opts = options || {};
      var min = opts.min || 12;
      var max = opts.max || parseFloat(global.getComputedStyle(node).fontSize) || 24;
      node.style.whiteSpace = "nowrap";
      node.style.overflow = "hidden";
      node.style.textOverflow = "ellipsis";
      var size = max;
      node.style.fontSize = size + "px";
      if (node.clientWidth <= 0) return;
      while (size > min && node.scrollWidth > node.clientWidth + 1) {
        size -= 1;
        node.style.fontSize = size + "px";
      }
    },
    readImageFile: function (file, maxSize) {
      return new Promise(function (resolve, reject) {
        if (!file || !/^image\//.test(file.type)) {
          reject(new Error("FILE BUKAN GAMBAR"));
          return;
        }
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error("GAGAL MEMBACA GAMBAR")); };
        reader.onload = function () {
          var img = new Image();
          img.onerror = function () { reject(new Error("GAMBAR TIDAK VALID")); };
          img.onload = function () {
            var limit = maxSize || 256;
            var scale = Math.min(1, limit / Math.max(img.width, img.height));
            var w = Math.max(1, Math.round(img.width * scale));
            var h = Math.max(1, Math.round(img.height * scale));
            var canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            var out = canvas.toDataURL("image/png");
            if (out.length > 380000) out = canvas.toDataURL("image/jpeg", 0.85);
            resolve(out);
          };
          img.src = String(reader.result || "");
        };
        reader.readAsDataURL(file);
      });
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
    global.addEventListener("ipsi-sync-status", setSyncIndicator);
    wireFullscreenButtons();

    var mode = document.body && document.body.dataset.mode;
    if (mode === "dewan" && global.IPSI.Dewan) global.IPSI.Dewan.init();
    else if (mode === "juri" && global.IPSI.Juri) global.IPSI.Juri.init();
    else if (mode === "monitor" && global.IPSI.Monitor) global.IPSI.Monitor.init();
    else if (mode === "sekretaris" && global.IPSI.Sekretaris) global.IPSI.Sekretaris.init();
    else if (mode === "bracket" && global.IPSI.Bracket) global.IPSI.Bracket.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.IPSI = global.IPSI || {};
  global.IPSI.Utils = Utils;
})(window);