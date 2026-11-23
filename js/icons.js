(function (global) {
  "use strict";

  var SVG = {
    binaan: "<svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'><path d='M4 5h16v12H9l-5 4V5z' fill='none' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/><path d='M8 9h8M8 13h5' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'/></svg>",
    teguran: "<svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'><circle cx='12' cy='12' r='9' fill='none' stroke='currentColor' stroke-width='2'/><path d='M12 7v6m0 4h.01' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round'/></svg>",
    peringatan: "<svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'><path d='M12 3 2.5 20h19L12 3z' fill='none' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/><path d='M12 9v5m0 3h.01' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round'/></svg>"
  };

  function create(type, label) {
    var text = label || (String(type || "").toUpperCase());
    var span = document.createElement("span");
    span.className = "ipsi-icon ipsi-icon--" + String(type || "").toLowerCase();
    span.innerHTML = SVG[type] || "";
    span.setAttribute("title", text);
    span.setAttribute("aria-label", text);
    span.setAttribute("role", "img");
    return span;
  }

  global.IPSI = global.IPSI || {};
  global.IPSI.Icons = {
    svg: SVG,
    create: create
  };
})(window);