(function (global) {
  "use strict";

  function init() {
    var State = global.IPSI.State;
    State.loadState();
    var buttons = document.querySelectorAll("[data-judge]");
    var status = document.getElementById("loginStatus");
    var modal = document.getElementById("passwordModal");
    var form = document.getElementById("passwordForm");
    var input = document.getElementById("judgePassword");
    var error = document.getElementById("passwordError");
    var label = document.getElementById("passwordJudgeLabel");
    var close = document.getElementById("passwordClose");
    var toggle = document.getElementById("togglePassword");
    var selectedJudge = null;
    var passwords = {
      judge1: "JURI1-2026",
      judge2: "JURI2-2026",
      judge3: "JURI3-2026"
    };

    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", function () {
        selectedJudge = button.getAttribute("data-judge");
        if (label) label.textContent = "PETUGAS JURI " + selectedJudge.replace("judge", "");
        if (error) error.textContent = "";
        if (input) input.value = "";
        if (modal) modal.hidden = false;
        if (input) input.focus();
      });
    });

    if (close) close.addEventListener("click", closeModal);
    if (toggle) toggle.addEventListener("click", function () {
      if (!input) return;
      var visible = input.type === "text";
      input.type = visible ? "password" : "text";
      toggle.textContent = visible ? "LIHAT" : "SEMBUNYIKAN";
      toggle.setAttribute("aria-label", visible ? "Tampilkan password" : "Sembunyikan password");
    });
    if (modal) modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal();
    });
    if (form) form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!selectedJudge || !input) return;
      if (input.value !== passwords[selectedJudge]) {
        if (error) error.textContent = "PASSWORD SALAH. SILAKAN COBA LAGI.";
        input.select();
        return;
      }
      State.actions.setJudge(selectedJudge);
      try { sessionStorage.setItem("ipsi_judge_session", selectedJudge); } catch (e) {}
      var activeButton = document.querySelector('[data-judge="' + selectedJudge + '"]');
      if (activeButton) activeButton.classList.add("is-entering");
      if (status) status.textContent = "IDENTITAS DIKONFIRMASI - MEMBUKA PANEL...";
      if (modal) modal.hidden = true;
      setTimeout(function () { window.location.href = "juri.html"; }, 260);
    });

    function closeModal() {
      if (modal) modal.hidden = true;
      if (error) error.textContent = "";
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
