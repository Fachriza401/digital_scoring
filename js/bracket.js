(function (global) {
  "use strict";

  var U = null;
  var el = {};
  var draft = { logo: "", contingentLogo: "" };

  function grab(ids) {
    ids.forEach(function (id) { el[id] = document.getElementById(id); });
  }

  function init() {
    U = global.IPSI.Utils;
    grab([
      "bracketTitle", "bracketSubtitle", "bracketCount", "bracketStatus",
      "bracketTitleInput", "bracketCategoryInput",
      "btnGenerate", "btnShuffle", "btnResetBracket",
      "participantForm", "pName", "pContingent", "pLogo", "pContingentLogo",
      "pvParticipantLogo", "pvParticipantContingentLogo",
      "participantList", "bracketBoard"
    ]);
    bind();
    try { bindZoom(); } catch (e) {}
    var st = global.IPSI.State.getState();
    try { if (global.IPSI.State.actions && global.IPSI.State.actions.ensureBracketsState) global.IPSI.State.actions.ensureBracketsState(st); } catch (e) {}
    render(st);
    global.IPSI.State.subscribe(render);
  }

  function bind() {
    if (el.participantForm) {
      el.participantForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var name = el.pName.value.trim();
        if (!name) {
          U.toast("NAMA ATLET WAJIB DIISI", "error");
          el.pName.focus();
          return;
        }
        global.IPSI.State.actions.addParticipant({
          name: name,
          contingent: el.pContingent.value.trim(),
          logo: draft.logo,
          contingentLogo: draft.contingentLogo
        });
        el.pName.value = "";
        el.pContingent.value = "";
        resetDraft();
        el.pName.focus();
        U.toast("PESERTA DITAMBAHKAN");
      });
    }

    bindLogo(el.pLogo, "logo", el.pvParticipantLogo);
    bindLogo(el.pContingentLogo, "contingentLogo", el.pvParticipantContingentLogo);

    bindClassTabs();
    try { bindZoom(); } catch (e) {}

    if (el.btnGenerate) {
      el.btnGenerate.addEventListener("click", function () {
        var state = global.IPSI.State.getState();
        var bracket = (global.IPSI && global.IPSI.Bracket && global.IPSI.Bracket._getActiveBracket) ? global.IPSI.Bracket._getActiveBracket(state) : (state.brackets && state.brackets[state.activeBracketClass]) || state.bracket;
        if (!bracket || bracket.participants.length < 2) {
          U.toast("MINIMAL 2 PESERTA UNTUK MEMBUAT BAGAN", "error");
          return;
        }
        global.IPSI.State.actions.generateBracket({
          title: el.bracketTitleInput.value.trim() || ("BAGAN PERTANDINGAN - KELAS " + (state.activeBracketClass||"A")),
          category: el.bracketCategoryInput.value.trim() || ("KELAS " + (state.activeBracketClass||"A"))
        });
        U.toast("BAGAN DIPERBARUI");
      });
    }

    if (el.btnShuffle) {
      el.btnShuffle.addEventListener("click", function () {
        var state = global.IPSI.State.getState();
        var bracket = (state.brackets && state.brackets[state.activeBracketClass]) || state.bracket;
        if (!bracket || bracket.participants.length < 2) {
          U.toast("MINIMAL 2 PESERTA UNTUK MENGACAK", "error");
          return;
        }
        if (!global.confirm("Acak urutan peserta dan susun ulang bagan? Hasil pertandingan pada bagan akan dihapus.")) return;
        global.IPSI.State.actions.shuffleParticipants();
        U.toast("URUTAN PESERTA DIACAK");
      });
    }

    if (el.btnResetBracket) {
      el.btnResetBracket.addEventListener("click", function () {
        var answer = global.prompt("Reset bagan akan menghapus seluruh peserta dan hasil. Ketik RESET untuk melanjutkan.");
        if (answer !== "RESET") return;
        global.IPSI.State.actions.resetBracket();
        U.toast("BAGAN DIRESET");
      });
    }

    if (el.participantList) {
      el.participantList.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-remove-participant]");
        if (!btn) return;
        if (!global.confirm("Hapus peserta ini dari bagan?")) return;
        global.IPSI.State.actions.removeParticipant(btn.getAttribute("data-remove-participant"));
        U.toast("PESERTA DIHAPUS");
      });
    }

    if (el.bracketBoard) {
      el.bracketBoard.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-load-match]");
        if (!btn) return;
        var matchId = btn.getAttribute("data-load-match");
        var state = global.IPSI.State.getState();
        if (global.IPSI && global.IPSI.State && global.IPSI.State.actions && global.IPSI.State.actions.ensureBracketsState) {
          try { global.IPSI.State.actions.ensureBracketsState(state); } catch (e) {}
        }
        var cls = state.activeBracketClass || "A";
        var bracketCur = (state.brackets && state.brackets[cls]) || state.bracket;
        var found = global.IPSI.State.findBracketMatch(bracketCur, matchId);
        if (!found || !found.match.blueId || !found.match.redId) {
          U.toast("PARTAI BELUM LENGKAP", "error");
          return;
        }
        if (global.IPSI && global.IPSI.State && global.IPSI.State.actions && global.IPSI.State.actions.setActiveBracketClass) {
          global.IPSI.State.actions.setActiveBracketClass(cls);
        }
        global.IPSI.State.actions.loadBracketMatch(matchId);
        if (document.body.dataset.mode === "sekretaris") {
          var arena = document.getElementById("arena");
          if (arena) arena.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          global.location.href = "sekretaris.html#arena";
        }
      });
    }
  }

  function bindLogo(input, key, preview) {
    if (!input) return;
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      U.readImageFile(file, 256).then(function (dataUrl) {
        draft[key] = dataUrl;
        setPreview(preview, dataUrl);
      }).catch(function (error) {
        U.toast(error.message || "GAGAL MEMUAT GAMBAR", "error");
      });
      input.value = "";
    });
  }

  function resetDraft() {
    draft.logo = "";
    draft.contingentLogo = "";
    setPreview(el.pvParticipantLogo, "");
    setPreview(el.pvParticipantContingentLogo, "");
  }

  function setPreview(node, src) {
    if (!node) return;
    if (src) {
      node.src = src;
      node.classList.add("has-image");
    } else {
      node.removeAttribute("src");
      node.classList.remove("has-image");
    }
  }

  function render(state) {
    if (!state || !state.bracket) return;
    var bracket = state.bracket;
    if (el.bracketTitle) el.bracketTitle.textContent = bracket.title || "BAGAN PERTANDINGAN";
    if (el.bracketSubtitle) {
      el.bracketSubtitle.textContent = bracket.category
        ? bracket.category + " • " + bracket.participants.length + " peserta"
        : "Kelola peserta, susun bagan, dan muat partai ke arena pertandingan.";
    }
    if (el.bracketCount) {
      el.bracketCount.textContent = bracket.participants.length + " PESERTA";
      el.bracketCount.className = "status-pill " + (bracket.participants.length >= 2 ? "status-ready" : "status-paused");
    }
    if (el.bracketTitleInput && document.activeElement !== el.bracketTitleInput) {
      el.bracketTitleInput.value = bracket.title || "";
    }
    if (el.bracketCategoryInput && document.activeElement !== el.bracketCategoryInput) {
      el.bracketCategoryInput.value = bracket.category || "";
    }
    try { bindZoom(); } catch (e) {}
    renderParticipants(bracket);
    renderBoard(state, bracket);
  }

  function renderParticipants(bracket) {
    if (!el.participantList) return;
    el.participantList.innerHTML = "";
    if (!bracket.participants || !bracket.participants.length) {
      var empty = document.createElement("p");
      empty.className = "participant-empty";
      empty.textContent = "Belum ada peserta. Tambahkan minimal 2 atlet untuk membuat bagan.";
      el.participantList.appendChild(empty);
      return;
    }
    bracket.participants.forEach(function (p, index) {
      var row = document.createElement("div");
      row.className = "participant-row";
      var seed = document.createElement("span");
      seed.className = "participant-seed";
      seed.textContent = String(index + 1).padStart(2, "0");
      var logo = document.createElement("div");
      logo.className = "participant-logo";
      if (p.logo) {
        var img = document.createElement("img");
        img.src = p.logo;
        img.alt = "Logo " + p.name;
        logo.appendChild(img);
      } else {
        logo.textContent = initial(p.name);
      }
      var info = document.createElement("div");
      info.className = "participant-info";
      var name = document.createElement("strong");
      name.textContent = p.name;
      var contingent = document.createElement("span");
      contingent.textContent = p.contingent || "KONTINGEN";
      info.appendChild(name);
      info.appendChild(contingent);
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn-icon btn-icon--danger";
      remove.setAttribute("data-remove-participant", p.id);
      remove.setAttribute("aria-label", "Hapus " + p.name);
      remove.textContent = "×";
      row.appendChild(seed);
      row.appendChild(logo);
      row.appendChild(info);
      row.appendChild(remove);
      el.participantList.appendChild(row);
    });
  }

  function renderBoard(state, bracket) {
    if (!el.bracketBoard) return;
    el.bracketBoard.innerHTML = "";
    var stale = isStale(bracket);
    updateStatus(state, bracket, stale);

    if (!bracket.rounds || !bracket.rounds.length) {
      var empty = document.createElement("div");
      empty.className = "bracket-empty";
      empty.innerHTML = "<strong>BAGAN BELUM DIBUAT</strong><span>Tambahkan minimal 2 peserta lalu klik BUAT / PERBARUI BAGAN.</span>";
      el.bracketBoard.appendChild(empty);
      return;
    }

    bracket.rounds.forEach(function (round, roundIndex) {
      var column = document.createElement("section");
      column.className = "bracket-round bracket-round--" + roundIndex;
      var header = document.createElement("header");
      header.className = "bracket-round-head";
      var title = document.createElement("h3");
      title.textContent = round.name;
      var meta = document.createElement("span");
      meta.textContent = round.matches.length + " PARTAI";
      header.appendChild(title);
      header.appendChild(meta);
      column.appendChild(header);

      var list = document.createElement("div");
      list.className = "bracket-round-matches";
      round.matches.forEach(function (match, matchIndex) {
        list.appendChild(renderMatch(state, bracket, match, round, matchIndex));
      });
      column.appendChild(list);
      el.bracketBoard.appendChild(column);
    });
  }

  function updateStatus(state, bracket, stale) {
    if (!el.bracketStatus) return;
    var text = "BELUM ADA BAGAN";
    var cls = "bracket-status bracket-status--empty";
    if (bracket.rounds.length) {
      if (stale) {
        text = "PESERTA BERUBAH • PERBARUI BAGAN";
        cls = "bracket-status bracket-status--stale";
      } else if (bracket.activeMatchId) {
        text = "PARTAI AKTIF DI ARENA";
        cls = "bracket-status bracket-status--live";
      } else {
        text = "BAGAN SIAP DIGUNAKAN";
        cls = "bracket-status bracket-status--ready";
      }
    }
    el.bracketStatus.textContent = text;
    el.bracketStatus.className = cls;
  }

  function isStale(bracket) {
    if (!bracket || !bracket.rounds || !bracket.rounds.length) return false;
    if (!bracket.rounds[0] || !bracket.rounds[0].matches) return false;
    var ids = {};
    var count = 0;
    bracket.rounds[0].matches.forEach(function (m) {
      if (m.blueId) { ids[m.blueId] = true; count++; }
      if (m.redId) { ids[m.redId] = true; count++; }
    });
    if (bracket.participants && count !== bracket.participants.length) return true;
    if (!bracket.participants) return false;
    return bracket.participants.some(function (p) { return !ids[p.id]; });
  }

  function renderMatch(state, bracket, match, round, matchIndex) {
    var wrap = document.createElement("article");
    wrap.className = "bracket-match bracket-match--" + match.status;
    if (bracket.activeMatchId === match.id) wrap.classList.add("is-active");

    var blue = global.IPSI.State.participantById(bracket, match.blueId);
    var red = global.IPSI.State.participantById(bracket, match.redId);

    var top = document.createElement("div");
    top.className = "bracket-match-top";
    var label = document.createElement("span");
    label.className = "bracket-match-id";
    label.textContent = round.name + " / " + (matchIndex + 1);
    var status = document.createElement("span");
    status.className = "bracket-match-state state-" + match.status;
    status.textContent = stateLabel(match.status);
    top.appendChild(label);
    top.appendChild(status);
    wrap.appendChild(top);

    wrap.appendChild(renderSlot(blue, match.blueId, match.winnerId, match.scoreBlue, match.status));
    wrap.appendChild(renderSlot(red, match.redId, match.winnerId, match.scoreRed, match.status));

    var footer = document.createElement("div");
    footer.className = "bracket-match-footer";
    if (bracket.activeMatchId === match.id) {
      var activeBadge = document.createElement("span");
      activeBadge.className = "bracket-active-badge";
      activeBadge.textContent = "DI ARENA";
      footer.appendChild(activeBadge);
    }
    if (match.blueId && match.redId && match.status !== "done") {
      var load = document.createElement("button");
      load.type = "button";
      load.className = "btn btn-primary btn-sm";
      load.setAttribute("data-load-match", match.id);
      load.textContent = bracket.activeMatchId === match.id ? "BUKA ARENA" : "MUAT PARTAI";
      footer.appendChild(load);
    } else if (match.status === "done") {
      var done = document.createElement("span");
      done.className = "bracket-result";
      done.textContent = "SELESAI";
      footer.appendChild(done);
    } else if (match.status === "bye") {
      var bye = document.createElement("span");
      bye.className = "bracket-result bracket-result--bye";
      bye.textContent = "BYE — LOLOS OTOMATIS";
      footer.appendChild(bye);
    }
    wrap.appendChild(footer);
    return wrap;
  }

  function renderSlot(participant, id, winnerId, score, matchStatus) {
    var slot = document.createElement("div");
    slot.className = "bracket-slot";
    if (!id) {
      slot.classList.add("is-empty");
      var placeholder = document.createElement("span");
      placeholder.className = "bracket-slot-name";
      placeholder.textContent = "MENUNGGU PEMENANG";
      slot.appendChild(placeholder);
      return slot;
    }
    if (winnerId === id) slot.classList.add("is-winner");
    if (matchStatus === "bye" && winnerId === id) slot.classList.add("is-bye");

    var logo = document.createElement("span");
    logo.className = "bracket-slot-logo";
    if (participant && participant.logo) {
      var img = document.createElement("img");
      img.src = participant.logo;
      img.alt = "";
      logo.appendChild(img);
    } else {
      logo.textContent = initial(participant ? participant.name : "?");
    }

    var info = document.createElement("span");
    info.className = "bracket-slot-info";
    var name = document.createElement("strong");
    name.className = "bracket-slot-name";
    name.textContent = participant ? participant.name : "PESERTA";
    var contingent = document.createElement("small");
    contingent.textContent = participant && participant.contingent ? participant.contingent : "";
    info.appendChild(name);
    if (contingent.textContent) info.appendChild(contingent);

    var value = document.createElement("b");
    value.className = "bracket-slot-score";
    value.textContent = matchStatus === "done" || matchStatus === "live" ? fmtScore(score) : "";
    slot.appendChild(logo);
    slot.appendChild(info);
    slot.appendChild(value);
    return slot;
  }

  function fmtScore(value) {
    var n = Math.round(Number(value) || 0);
    return n > 0 ? "+" + n : String(n);
  }

  function stateLabel(status) {
    if (status === "ready") return "SIAP";
    if (status === "live") return "BERJALAN";
    if (status === "done") return "SELESAI";
    if (status === "bye") return "BYE";
    if (status === "draw") return "SERI";
    return "KOSONG";
  }

  function initial(name) {
    return String(name || "?").trim().charAt(0).toUpperCase() || "?";
  }

  global.IPSI = global.IPSI || {};
  global.IPSI.Bracket = { init: init, _getActiveBracket: getActiveBracket, bindClassTabs: bindClassTabs, render: render };
})(window);
