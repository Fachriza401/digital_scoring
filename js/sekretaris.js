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
      "headEventName", "headStatus", "headTimer", "ctrlTimer",
      "fEventName", "fMatch", "fSchedule", "fCategory",
      "fBlueName", "fRedName", "fBlueContingent", "fRedContingent",
      "fBlueLogo", "fRedLogo", "fBlueContingentLogo", "fRedContingentLogo",
      "pvBlueLogo", "pvRedLogo", "pvBlueContingentLogo", "pvRedContingentLogo",
      "fDurMin", "fDurSec", "fRounds",
      "btnSave", "btnStart", "btnExport", "importFile",
      "btnCsvTemplate", "csvFile", "btnBlueWinner", "btnRedWinner", "btnDrawWinner",
      "finalBlueScore", "finalRedScore", "matchHistory",
      "btnPlay", "btnPause", "btnResetTimer", "roundChips",
      "btnDurMinus", "btnDurPlus", "btnApplyDuration",
      "btnResetAll", "btnResetAllCancel", "btnResetAllConfirm", "resetAllModal",
      "resetModal", "resetStep1", "resetStep2", "btnResetMatch",
      "btnResetCancel", "btnResetContinue", "btnResetBack", "btnResetConfirm", "resetConfirmText",
      "clsName", "clsGender", "clsMin", "clsMax", "btnAddClass", "classList", "classSuggestions"
    ]);

    fillForm();
    bindControls();
    State.subscribe(render);
    render(State.getState());

    Timer.startTicker(function (remaining) {
      renderTimerDisplay(remaining);
    });
  }

  function fillForm() {
    var ev = State.getState().event;
    el.fEventName.value = ev.name;
    el.fMatch.value = ev.match;
    el.fSchedule.value = ev.schedule;
    el.fCategory.value = ev.category;
    el.fBlueName.value = ev.blueName;
    el.fRedName.value = ev.redName;
    el.fBlueContingent.value = ev.blueContingent;
    el.fRedContingent.value = ev.redContingent;
    el.fDurMin.value = Math.floor(ev.roundDuration / 60);
    el.fDurSec.value = ev.roundDuration % 60;
    el.fRounds.value = ev.rounds;
    renderLogoPreviews(State.getState());
  }

  function readForm() {
    var mins = Math.floor(Number(el.fDurMin.value) || 0);
    var secs = Math.floor(Number(el.fDurSec.value) || 0);
    return {
      name: el.fEventName.value,
      match: el.fMatch.value,
      schedule: el.fSchedule.value,
      category: el.fCategory.value,
      blueName: el.fBlueName.value,
      redName: el.fRedName.value,
      blueContingent: el.fBlueContingent.value,
      redContingent: el.fRedContingent.value,
      roundDuration: Math.max(1, mins * 60 + secs),
      rounds: Math.max(1, Math.min(9, Math.floor(Number(el.fRounds.value) || 1)))
    };
  }

  function formDuration() {
    var mins = Math.floor(Number(el.fDurMin.value) || 0);
    var secs = Math.floor(Number(el.fDurSec.value) || 0);
    return Math.max(1, mins * 60 + secs);
  }

  function writeDuration(total) {
    var safe = Math.max(1, Math.min(5940, total));
    el.fDurMin.value = Math.floor(safe / 60);
    el.fDurSec.value = safe % 60;
  }

  function bindControls() {
    if (el.btnSave) el.btnSave.addEventListener("click", function () {
      State.actions.saveEvent(readForm());
      U.toast("DATA PERTANDINGAN DISIMPAN", "success");
    });

    if (el.btnStart) el.btnStart.addEventListener("click", function () {
      State.actions.saveEvent(readForm());
      State.actions.startMatch();
      U.toast("PERTANDINGAN DIMULAI", "success");
    });

    if (el.btnPlay) el.btnPlay.addEventListener("click", function () { Timer.start(); });
    if (el.btnPause) el.btnPause.addEventListener("click", function () { Timer.pause(); });
    if (el.btnResetTimer) el.btnResetTimer.addEventListener("click", function () { Timer.reset(); U.toast("TIMER DI-RESET", "info"); });

    if (el.btnDurMinus) el.btnDurMinus.addEventListener("click", function () { writeDuration(formDuration() - 10); });
    if (el.btnDurPlus) el.btnDurPlus.addEventListener("click", function () { writeDuration(formDuration() + 10); });
    if (el.btnApplyDuration) el.btnApplyDuration.addEventListener("click", function () {
      var secs = formDuration();
      Timer.setDuration(secs);
      U.toast("DURASI DITERAPKAN: " + Timer.formatMMSS(secs), "success");
    });

    global.IPSI.Utils.qsa("[data-timer-adjust]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        Timer.adjust(Number(btn.getAttribute("data-timer-adjust")) || 0);
      });
    });

    bindLogoInput("fBlueLogo", "blueLogo");
    bindLogoInput("fRedLogo", "redLogo");
    bindLogoInput("fBlueContingentLogo", "blueContingentLogo");
    bindLogoInput("fRedContingentLogo", "redContingentLogo");

    global.IPSI.Utils.qsa("[data-clear-logo]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var field = btn.getAttribute("data-clear-logo");
        var payload = {};
        payload[field] = "";
        State.actions.saveEvent(payload);
        renderLogoPreviews(State.getState());
        U.toast("LOGO DIHAPUS", "info");
      });
    });

    if (el.btnAddClass) el.btnAddClass.addEventListener("click", addClassFromForm);

    if (el.btnExport) el.btnExport.addEventListener("click", exportJSON);
    if (el.btnCsvTemplate) el.btnCsvTemplate.addEventListener("click", downloadCsvTemplate);
    if (el.csvFile) el.csvFile.addEventListener("change", onCsvImport);
    if (el.btnBlueWinner) el.btnBlueWinner.addEventListener("click", function () { finishMatch("blue"); });
    if (el.btnRedWinner) el.btnRedWinner.addEventListener("click", function () { finishMatch("red"); });
    if (el.btnDrawWinner) el.btnDrawWinner.addEventListener("click", function () { finishMatch("draw"); });

    if (el.btnResetMatch) el.btnResetMatch.addEventListener("click", openResetModal);
    if (el.btnResetCancel) el.btnResetCancel.addEventListener("click", closeResetModal);
    if (el.btnResetContinue) el.btnResetContinue.addEventListener("click", showResetStep2);
    if (el.btnResetBack) el.btnResetBack.addEventListener("click", function () {
      if (el.resetStep2) el.resetStep2.hidden = true;
      if (el.resetStep1) el.resetStep1.hidden = false;
    });
    if (el.resetConfirmText) el.resetConfirmText.addEventListener("input", function () {
      if (el.btnResetConfirm) el.btnResetConfirm.disabled = el.resetConfirmText.value.trim().toUpperCase() !== "RESET";
    });
    if (el.btnResetConfirm) el.btnResetConfirm.addEventListener("click", function () {
      if (!el.resetConfirmText || el.resetConfirmText.value.trim().toUpperCase() !== "RESET") return;
      State.actions.resetMatch();
      closeResetModal();
      U.toast("PERTANDINGAN DI-RESET", "info");
    });

    if (el.btnResetAll) el.btnResetAll.addEventListener("click", function () { el.resetAllModal.hidden = false; });
    if (el.btnResetAllCancel) el.btnResetAllCancel.addEventListener("click", function () { el.resetAllModal.hidden = true; });
    if (el.btnResetAllConfirm) el.btnResetAllConfirm.addEventListener("click", function () {
      State.resetAllData();
      fillForm();
      el.resetAllModal.hidden = true;
      U.toast("SEMUA DATA DI-RESET", "info");
    });

    if (el.importFile) el.importFile.addEventListener("change", onImport);
  }

  function bindLogoInput(inputId, field) {
    var input = el[inputId];
    if (!input) return;
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      U.readImageFile(file, 256).then(function (dataUrl) {
        var payload = {};
        payload[field] = dataUrl;
        State.actions.saveEvent(payload);
        renderLogoPreviews(State.getState());
        U.toast("LOGO BERHASIL DIMUAT", "success");
      }).catch(function (err) {
        U.toast(err && err.message ? err.message : "LOGO GAGAL DIMUAT", "error");
      }).then(function () {
        input.value = "";
      });
    });
  }

  function renderLogoPreviews(state) {
    var ev = state.event;
    setImage(el.pvBlueLogo, ev.blueLogo);
    setImage(el.pvRedLogo, ev.redLogo);
    setImage(el.pvBlueContingentLogo, ev.blueContingentLogo);
    setImage(el.pvRedContingentLogo, ev.redContingentLogo);
  }

  function setImage(node, src) {
    if (!node) return;
    if (src) {
      node.src = src;
      node.classList.add("has-image");
    } else {
      node.removeAttribute("src");
      node.classList.remove("has-image");
    }
  }

  function addClassFromForm() {
    var name = (el.clsName && el.clsName.value || "").trim();
    if (!name) {
      U.toast("NAMA KELAS WAJIB DIISI", "error");
      return;
    }
    var ok = State.actions.addClass({
      name: name,
      category: "TANDING",
      gender: el.clsGender ? el.clsGender.value : "PUTRA",
      minWeight: el.clsMin ? el.clsMin.value : 0,
      maxWeight: el.clsMax ? el.clsMax.value : 0
    });
    if (!ok) return;
    if (el.clsName) el.clsName.value = "";
    if (el.clsMin) el.clsMin.value = "";
    if (el.clsMax) el.clsMax.value = "";
    U.toast("KELAS DITAMBAHKAN", "success");
  }

  function openResetModal() {
    if (!el.resetModal) return;
    el.resetModal.hidden = false;
    if (el.resetStep1) el.resetStep1.hidden = false;
    if (el.resetStep2) el.resetStep2.hidden = true;
    if (el.resetConfirmText) el.resetConfirmText.value = "";
    if (el.btnResetConfirm) el.btnResetConfirm.disabled = true;
  }

  function closeResetModal() {
    if (el.resetModal) el.resetModal.hidden = true;
  }

  function showResetStep2() {
    if (el.resetStep1) el.resetStep1.hidden = true;
    if (el.resetStep2) el.resetStep2.hidden = false;
    if (el.resetConfirmText) el.resetConfirmText.focus();
  }

  function exportJSON() {
    var blob = new Blob([State.exportJSON()], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "ipsi-scoring-match.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    U.toast("DATA DI-EXPORT", "success");
  }

  function onImport() {
    var file = el.importFile.files && el.importFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var text = String(reader.result || "");
        if (!text.trim()) throw new Error("File kosong");
        State.importJSON(text);
        fillForm();
        U.toast("DATA DI-IMPORT", "success");
      } catch (err) {
        U.toast("IMPORT GAGAL: FILE TIDAK VALID", "error");
      } finally {
        if (el.importFile) el.importFile.value = "";
      }
    };
    reader.onerror = function () {
      U.toast("IMPORT GAGAL MEMBACA FILE", "error");
      if (el.importFile) el.importFile.value = "";
    };
    reader.readAsText(file);
  }

  function finishMatch(winner) {
    State.actions.finishMatch(winner);
    U.toast(winner === "draw" ? "HASIL SERI DISIMPAN" : "PEMENANG " + (winner === "blue" ? "BIRU" : "MERAH") + " DISIMPAN", "success");
  }

  function downloadCsvTemplate() {
    var csv = "match,schedule,category,blueName,blueContingent,redName,redContingent\n" +
      "PARTAI 01,08:30 WIB,TANDING PUTRA - KELAS A,PESILAT BIRU,KONTINGEN BIRU,PESILAT MERAH,KONTINGEN MERAH\n";
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "ipsi-partai-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function onCsvImport() {
    var file = el.csvFile.files && el.csvFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var rows = parseCsv(String(reader.result || ""));
        if (!rows.length) throw new Error("CSV kosong");
        var row = rows[0];
        State.actions.saveEvent({
          match: row.match,
          schedule: row.schedule,
          category: row.category,
          blueName: row.blueName,
          blueContingent: row.blueContingent,
          redName: row.redName,
          redContingent: row.redContingent
        });
        fillForm();
        U.toast("DATA CSV DIMUAT: " + rows.length + " PARTAI", "success");
      } catch (err) {
        U.toast("IMPORT CSV GAGAL", "error");
      } finally {
        el.csvFile.value = "";
      }
    };
    reader.readAsText(file);
  }

  function parseCsv(text) {
    var lines = text.split(/\r?\n/).filter(function (line) { return line.trim(); });
    if (lines.length < 2) return [];
    var headers = splitCsvLine(lines[0]).map(function (item) { return item.trim(); });
    return lines.slice(1).map(function (line) {
      var values = splitCsvLine(line);
      var row = {};
      headers.forEach(function (header, index) { row[header] = (values[index] || "").trim(); });
      return row;
    });
  }

  function splitCsvLine(line) {
    var values = [];
    var value = "";
    var quoted = false;
    for (var i = 0; i < line.length; i++) {
      var char = line[i];
      if (char === '"' && line[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { values.push(value); value = ""; }
      else value += char;
    }
    values.push(value);
    return values;
  }

  function render(state) {
    var ev = state.event;
    if (el.headEventName) el.headEventName.textContent = ev.name;
    if (el.headStatus) {
      el.headStatus.className = "status-pill status-" + global.IPSI.Utils.statusClass(state.timer.emergency ? "PAUSED" : state.timer.status);
      el.headStatus.textContent = state.timer.emergency ? "MEDIS" : state.timer.status;
    }
    renderRoundChips(state);
    renderClasses(state);
    if (el.finalBlueScore) el.finalBlueScore.textContent = state.teamBlue.score;
    if (el.finalRedScore) el.finalRedScore.textContent = state.teamRed.score;
    renderHistory(state);
    renderTimerDisplay(Timer.getDisplayRemaining(state));
  }

  function renderClasses(state) {
    if (el.classSuggestions) {
      el.classSuggestions.innerHTML = "";
      (state.classes || []).forEach(function (cls) {
        var opt = document.createElement("option");
        opt.value = cls.name;
        opt.label = cls.gender + (cls.maxWeight ? " - " + cls.maxWeight + " KG" : "");
        el.classSuggestions.appendChild(opt);
      });
    }
    if (!el.classList) return;
    el.classList.innerHTML = "";
    var classes = state.classes || [];
    if (!classes.length) {
      var empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "Belum ada kelas tanding. Tambahkan kelas untuk mulai mengelola partai.";
      el.classList.appendChild(empty);
      return;
    }
    classes.forEach(function (cls) {
      var row = document.createElement("div");
      row.className = "class-item" + (state.activeClassId === cls.id ? " is-active" : "");
      var info = document.createElement("div");
      info.className = "class-item-info";
      var title = document.createElement("strong");
      title.textContent = cls.name;
      var meta = document.createElement("span");
      var weight = cls.minWeight || cls.maxWeight ? " • " + (cls.minWeight || 0) + "-" + (cls.maxWeight || 0) + " KG" : "";
      meta.textContent = cls.gender + weight;
      info.appendChild(title);
      info.appendChild(meta);
      var actions = document.createElement("div");
      actions.className = "class-item-actions";
      var use = document.createElement("button");
      use.type = "button";
      use.className = "btn btn-primary btn-sm";
      use.textContent = state.activeClassId === cls.id ? "AKTIF" : "PAKAI";
      use.addEventListener("click", function () {
        State.actions.applyClass(cls.id);
        if (el.fCategory) el.fCategory.value = cls.name;
        U.toast("KELAS DIPAKAI: " + cls.name, "success");
      });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-ghost btn-sm";
      del.textContent = "HAPUS";
      del.addEventListener("click", function () {
        State.actions.removeClass(cls.id);
        U.toast("KELAS DIHAPUS", "info");
      });
      actions.appendChild(use);
      actions.appendChild(del);
      row.appendChild(info);
      row.appendChild(actions);
      el.classList.appendChild(row);
    });
  }

  function renderHistory(state) {
    if (!el.matchHistory) return;
    var history = (state.history || []).slice().reverse();
    el.matchHistory.innerHTML = "";
    if (!history.length) {
      el.matchHistory.innerHTML = '<p class="history-empty">Belum ada rekor partai yang diselesaikan.</p>';
      return;
    }
    history.slice(0, 8).forEach(function (item) {
      var row = document.createElement("div");
      row.className = "history-item history-item--" + item.winner;
      var title = document.createElement("strong");
      title.textContent = item.match + " - " + item.category;
      var detail = document.createElement("span");
      detail.textContent = item.blueName + " " + item.blueScore + " : " + item.redScore + " " + item.redName;
      var result = document.createElement("b");
      result.textContent = item.winner === "draw" ? "SERI" : "MENANG " + (item.winner === "blue" ? "BIRU" : "MERAH");
      row.appendChild(title);
      row.appendChild(detail);
      row.appendChild(result);
      el.matchHistory.appendChild(row);
    });
  }

  function renderRoundChips(state) {
    if (!el.roundChips) return;
    var total = state.event.rounds;
    if (el.roundChips.children.length !== total) {
      el.roundChips.innerHTML = "";
      for (var i = 1; i <= total; i++) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = "BABAK " + i;
        (function (n) {
          chip.addEventListener("click", function () {
            State.actions.setRound(n);
          });
        })(i);
        el.roundChips.appendChild(chip);
      }
    }
    for (var j = 0; j < el.roundChips.children.length; j++) {
      el.roundChips.children[j].classList.toggle("is-active", (j + 1) === state.round);
    }
  }

  function renderTimerDisplay(remaining) {
    var s = State.getState();
    var fmt = Timer.formatMMSS(remaining);
    if (el.headTimer) {
      el.headTimer.textContent = fmt;
      el.headTimer.classList.toggle("is-finished", s.timer.status === "FINISHED");
    }
    if (el.ctrlTimer) el.ctrlTimer.textContent = fmt;
  }

  global.IPSI = global.IPSI || {};
  global.IPSI.Sekretaris = { init: init };
})(window);
