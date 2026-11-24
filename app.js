/* Elternlexikon – Oberfläche */
(function () {
  "use strict";

  var W = window.WISSEN;
  var INDEX = Suche.baueIndex(W);
  var NACH_ID = {};
  W.artikel.forEach(function (a) { NACH_ID[a.id] = a; });

  var FRAGEN_ALLE = [
    "Ich schreie mein Kind an", "Sind Belohnungen schlecht?", "Kind haut mich", "Kind kaut Nägel", "Wie lobe ich richtig?",
    "Kind trödelt beim Aussteigen", "Kind will nicht schlafen", "Mein Kind hat Angst im Dunkeln", "Wutanfall im Supermarkt",
    "Geschwister streiten ständig", "Wie viel Handyzeit ist okay?", "Kind isst kein Gemüse", "Wann ist mein Kind schulreif?",
    "Kind lügt", "Baby schreit viel", "Kind hat Fieber", "Wie erkläre ich den Tod?", "Mein Kind wird gemobbt",
    "Ich bin am Ende meiner Kräfte", "Kita-Eingewöhnung klappt nicht"
  ];
  // Täglich wechselnde Auswahl, damit die Startseite lebendig bleibt (gleicher Tag = gleiche Fragen)
  var BEISPIELE = (function () {
    var tag = Math.floor(Date.now() / 86400000), liste = FRAGEN_ALLE.slice(), aus = [];
    for (var k = 0; k < 6 && liste.length; k++) { var i = (tag * 7 + k * 5) % liste.length; aus.push(liste.splice(i, 1)[0]); }
    return aus;
  })();

  var zustand = {
    q: "",
    filter: { alter: new Set(), bereich: new Set(), podcast: new Set() }
  };

  /* ---------- Speicher (nur auf diesem Gerät) ---------- */
  function lies(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function schreib(key, wert) {
    try { localStorage.setItem(key, JSON.stringify(wert)); } catch (e) { /* privater Modus o. Ä. */ }
  }
  var favoriten = lies("favoriten", []).filter(function (id) { return NACH_ID[id]; });
  var verlauf = lies("verlauf", []).filter(function (id) { return NACH_ID[id]; });

  function istFavorit(id) { return favoriten.indexOf(id) >= 0; }
  function toggleFavorit(id) {
    if (istFavorit(id)) favoriten = favoriten.filter(function (x) { return x !== id; });
    else favoriten.unshift(id);
    schreib("favoriten", favoriten);
    zeigeFavZahl();
  }
  function merkeBesuch(id) {
    verlauf = [id].concat(verlauf.filter(function (x) { return x !== id; })).slice(0, 8);
    schreib("verlauf", verlauf);
  }

  /* ---------- Helfer ---------- */
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function sicherUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  function datumDe(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? m[3] + "." + m[2] + "." + m[1] : esc(iso);
  }
  function podcastsVon(a) {
    var s = new Set();
    (a.sichtweisen || []).forEach(function (x) { s.add(x.podcast); });
    (a.quellen || []).forEach(function (x) { s.add(x.podcast); });
    return Array.from(s).filter(function (p) { return W.podcasts[p]; });
  }
  var MONOGRAMM = { mutti: "M", artgerecht: "a", gfk: "F", wunschkind: "W" };
  function monogramm(key) { return '<span class="pod-mark" aria-hidden="true">' + esc(MONOGRAMM[key] || "?") + "</span>"; }
  function podLabel(key, kurz) {
    var p = W.podcasts[key];
    if (!p) return "";
    return '<span class="pod pod-' + esc(key) + '">' + monogramm(key) + esc(kurz ? kurzName(key) : p.name) + "</span>";
  }
  function kurzName(key) {
    return { mutti: "Mutti ist die Beste", artgerecht: "artgerecht", gfk: "Familie Verstehen", wunschkind: "Wunschkind" }[key] || W.podcasts[key].name;
  }
  /* ---------- Plattform-Buttons ---------- */
  var LOGOS = {
    spotify: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.500" fill="currentColor"/><g class="arc" fill="none" stroke-width="2" stroke-linecap="round"><path d="M5.800 9c4.100-1.100 8.800-.8 12.300 1.300"/><path d="M6.600 12.400c3.500-.9 7-.6 10 1.200"/><path d="M7.400 15.600c2.700-.7 5.300-.4 7.600.9"/></g></svg>',
    apple: '<svg aria-hidden="true" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.900" stroke-linecap="round"><path d="M7.200 14.700a5.600 5.600 0 1 1 9.600 0"/><path d="M4.600 17.300a9.200 9.200 0 1 1 14.800 0"/></g><circle cx="12" cy="10.800" r="2.300" fill="currentColor"/><path d="M12 13.800c-1.200 0-1.900.9-1.900 1.900l.3 3.700c.1.900.7 1.400 1.600 1.400s1.500-.5 1.600-1.400l.3-3.700c0-1-.7-1.900-1.900-1.900z" fill="currentColor"/></svg>',
    web: '<svg aria-hidden="true" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></g></svg>'
  };
  function plattformBtn(art, url, text) {
    return '<a class="plat-btn plat-' + art + '" href="' + esc(url) + '" target="_blank" rel="noopener">' + LOGOS[art] + "<span>" + esc(text) + "</span></a>";
  }

  /* ---------- Folgen & Player ---------- */
  var FOLGEN = window.FOLGEN || {};
  var VORLAUF = 15; // Sekunden früher starten: Werbung wird dynamisch eingefügt, die Stelle kann sich leicht verschieben

  function folgeInfo(podcast, nr) {
    return (FOLGEN[podcast] || {})[String(nr)] || null;
  }
  function audioVon(s) {
    var f = folgeInfo(s.podcast, s.nr);
    return f ? sicherUrl(f.a) : "";
  }
  function sekunden(t) {
    var teile = String(t || "0").split(":").map(Number);
    return teile.reduce(function (acc, x) { return acc * 60 + (isNaN(x) ? 0 : x); }, 0);
  }
  function zeit(sek) {
    if (!isFinite(sek)) return "–";
    sek = Math.max(0, Math.floor(sek));
    var h = Math.floor(sek / 3600), m = Math.floor(sek % 3600 / 60), s = sek % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
  }

  var player = {
    el: null, audio: null, aktuell: null,
    init: function () {
      this.el = $("#player"); this.audio = $("#pl-audio");
      var self = this, a = this.audio;
      $("#pl-toggle").addEventListener("click", function () { a.paused ? a.play().catch(function () {}) : a.pause(); });
      $("#pl-back").addEventListener("click", function () { a.currentTime = Math.max(0, a.currentTime - 15); });
      $("#pl-fwd").addEventListener("click", function () { a.currentTime = a.currentTime + 15; });
      $("#pl-close").addEventListener("click", function () { self.schliessen(); });
      var seek = $("#pl-seek"), ziehen = false;
      seek.addEventListener("input", function () { ziehen = true; $("#pl-time").textContent = zeit(seek.value / 1000 * a.duration); });
      seek.addEventListener("change", function () { if (isFinite(a.duration)) a.currentTime = seek.value / 1000 * a.duration; ziehen = false; });
      a.addEventListener("timeupdate", function () {
        $("#pl-time").textContent = zeit(a.currentTime);
        if (!ziehen && isFinite(a.duration)) seek.value = Math.round(a.currentTime / a.duration * 1000);
      });
      a.addEventListener("durationchange", function () { $("#pl-dur").textContent = zeit(a.duration); });
      a.addEventListener("play", function () { self.el.classList.add("playing"); self.markiere(); });
      a.addEventListener("pause", function () { self.el.classList.remove("playing"); self.markiere(); });
      a.addEventListener("error", function () {
        $("#pl-title").textContent = "Folge konnte nicht geladen werden (offline?)";
      });
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.setActionHandler("seekbackward", function () { a.currentTime = Math.max(0, a.currentTime - 15); });
          navigator.mediaSession.setActionHandler("seekforward", function () { a.currentTime = a.currentTime + 15; });
        } catch (e) {}
      }
    },
    spiele: function (podcast, nr, minute) {
      var f = folgeInfo(podcast, nr);
      if (!f || !sicherUrl(f.a)) return;
      var a = this.audio, start = Math.max(0, sekunden(minute) - VORLAUF);
      var key = podcast + "|" + nr + "|" + minute;
      // Gleicher Knopf nochmal: Pause/Weiter
      if (this.aktuell === key && a.src) { a.paused ? a.play().catch(function () {}) : a.pause(); return; }
      var gleicheFolge = this.aktuell && this.aktuell.split("|").slice(0, 2).join("|") === podcast + "|" + nr;
      this.aktuell = key;
      $("#pl-title").textContent = f.t;
      $("#pl-pod").textContent = kurzName(podcast) + " · Folge " + nr;
      $("#pl-dur").textContent = f.l ? f.l.replace(/^0:/, "") : "–";
      this.el.hidden = false;
      document.body.classList.add("has-player");
      if (gleicheFolge && isFinite(a.duration)) {
        a.currentTime = start;
      } else {
        a.src = f.a;
        a.preload = "auto";
        var setze = function () { try { a.currentTime = start; } catch (e) {} a.removeEventListener("loadedmetadata", setze); };
        a.addEventListener("loadedmetadata", setze);
      }
      a.play().catch(function () {});
      if ("mediaSession" in navigator && window.MediaMetadata) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: f.t, artist: W.podcasts[podcast].name, album: "Elternlexikon" });
      }
    },
    schliessen: function () {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      this.aktuell = null;
      this.el.hidden = true;
      document.body.classList.remove("has-player");
      this.markiere();
    },
    markiere: function () {
      var self = this;
      document.querySelectorAll("[data-play]").forEach(function (b) {
        b.classList.toggle("playing", b.dataset.play === self.aktuell && !self.audio.paused);
      });
    }
  };

  var HERZ = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.3C1.1 8.4 3.2 4.8 6.8 4.8c2 0 3.5 1.1 4.2 2.4.7-1.3 2.2-2.4 4.2-2.4 3.6 0 5.7 3.6 4.3 6.9C19.5 16.4 12 21 12 21z"/></svg>';

  /* ---------- Filter ---------- */
  var GRUPPEN = {
    alter: function () { return Object.keys(W.alter).map(function (k) { return [k, W.alter[k].replace(" Jahre", " J.")]; }); },
    bereich: function () { return Object.keys(W.bereiche).map(function (k) { return [k, W.bereiche[k]]; }); },
    // Nur Podcasts anbieten, zu denen es auch Artikel gibt
    podcast: function () {
      var vorhanden = new Set();
      W.artikel.forEach(function (a) { podcastsVon(a).forEach(function (p) { vorhanden.add(p); }); });
      return Object.keys(W.podcasts).filter(function (k) { return vorhanden.has(k); }).map(function (k) { return [k, kurzName(k)]; });
    }
  };

  function baueFilter() {
    Object.keys(GRUPPEN).forEach(function (g) {
      var box = $('.filter-row[data-group="' + g + '"] .chips');
      box.innerHTML = GRUPPEN[g]().map(function (e) {
        var dot = g === "podcast" ? '<span class="dot"></span>' : "";
        var cls = g === "podcast" ? " pod-" + esc(e[0]) : "";
        return '<button type="button" class="chip' + cls + '" data-group="' + g + '" data-key="' + esc(e[0]) + '" aria-pressed="false">' + dot + esc(e[1]) + "</button>";
      }).join("");
    });
    $("#filters").addEventListener("click", function (ev) {
      var b = ev.target.closest(".chip");
      if (b) {
        var set = zustand.filter[b.dataset.group];
        if (set.has(b.dataset.key)) set.delete(b.dataset.key); else set.add(b.dataset.key);
        aktualisiereChips();
        geheZurListe();
      }
      if (ev.target.closest(".filter-reset")) {
        Object.keys(zustand.filter).forEach(function (g) { zustand.filter[g].clear(); });
        aktualisiereChips();
        geheZurListe();
      }
    });
  }
  function podcastFilterSetzen(k) {
    zustand.q = ""; input.value = ""; $("#q-clear").hidden = true;
    zustand.filter.alter.clear(); zustand.filter.bereich.clear(); zustand.filter.podcast.clear();
    zustand.filter.podcast.add(k);
    aktualisiereChips(); geheZurListe();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function filterAktiv() {
    return Object.keys(zustand.filter).some(function (g) { return zustand.filter[g].size > 0; });
  }
  function aktualisiereChips() {
    document.querySelectorAll(".chip").forEach(function (b) {
      b.setAttribute("aria-pressed", zustand.filter[b.dataset.group].has(b.dataset.key) ? "true" : "false");
    });
    podLeisteAktualisieren();
    var reset = $(".filter-reset");
    var mehr = $(".filter-more");
    if (mehr && zustand.filter.bereich.size && window.innerWidth > 700) mehr.open = true;
    if (filterAktiv() && !reset) {
      $("#filters").insertAdjacentHTML("beforeend", '<button type="button" class="filter-reset">Filter zurücksetzen</button>');
    } else if (!filterAktiv() && reset) {
      reset.remove();
    }
  }
  function passtZuFilter(a) {
    var f = zustand.filter;
    function schnitt(set, liste) {
      if (!set.size) return true;
      return liste.some(function (x) { return set.has(x); });
    }
    return schnitt(f.alter, a.alter || []) && schnitt(f.bereich, a.bereiche || []) && schnitt(f.podcast, podcastsVon(a));
  }

  /* ---------- Bausteine ---------- */
  function karte(a) {
    var alter = (a.alter || []).map(function (k) { return '<span class="tag age">' + esc(W.alter[k] || k) + "</span>"; }).join("");
    var bereiche = (a.bereiche || []).map(function (k) { return '<span class="tag">' + esc(W.bereiche[k] || k) + "</span>"; }).join("");
    var also = (a.synonyme || []).slice(0, 3).join(" · ");
    return '<li><a class="card" href="#/artikel/' + encodeURIComponent(a.id) + '">' +
      "<h3>" + esc(a.titel) + "</h3>" +
      (also ? '<p class="also">auch: ' + esc(also) + "</p>" : "") +
      '<p class="snippet">' + esc(a.kurz) + "</p>" +
      '<div class="tags">' + alter + bereiche + "</div>" +
      "</a></li>";
  }
  function kartenListe(liste) { return '<ul class="cards">' + liste.map(karte).join("") + "</ul>"; }

  /* ---------- Ansichten ---------- */
  var view = $("#view");

  function zeigeListe() {
    document.body.classList.remove("compact");
    $("#search-area").hidden = false;
    setzeNav("");
    var q = zustand.q.trim();

    document.body.classList.toggle("start", !q && !filterAktiv());
    if (!q && !filterAktiv()) return zeigeStart();

    var liste = q
      ? Suche.suche(INDEX, q).map(function (t) { return t.artikel; })
      : W.artikel.slice().sort(function (a, b) { return a.titel.localeCompare(b.titel, "de"); });
    liste = liste.filter(passtZuFilter);
    if (q && kindalter && liste.length > 2 && !zustand.filter.alter.size) {
      // Bester Treffer bleibt vorn, danach kommen Themen zuerst, die zum Alter des Kindes passen (Reihenfolge sonst unverändert)
      var rest = liste.slice(1).map(function (a, i) { return { a: a, i: i, p: (a.alter || []).indexOf(kindalter) >= 0 ? 0 : 1 }; });
      rest.sort(function (x, y) { return x.p - y.p || x.i - y.i; });
      liste = [liste[0]].concat(rest.map(function (r) { return r.a; }));
    }

    if (!liste.length) {
      view.innerHTML = '<div class="empty"><strong>Dazu haben wir noch nichts gefunden.</strong>' +
        "Versucht ein anderes Wort, zum Beispiel „Schlaf“ statt „Nickerchen“" +
        (filterAktiv() ? ", oder setzt die Filter zurück." : ".") + "</div>";
      return;
    }
    var nurBereich = !q && zustand.filter.bereich.size === 1 && !zustand.filter.alter.size && !zustand.filter.podcast.size ? Array.from(zustand.filter.bereich)[0] : "";
    if (nurBereich && liste.length > 8) {
      var kern = BEREICH_KERN[nurBereich] || [];
      var top = liste.slice().sort(function (x, y) {
        var kx = kern.indexOf(x.id), ky = kern.indexOf(y.id);
        if (kx >= 0 || ky >= 0) return (kx < 0 ? 999 : kx) - (ky < 0 ? 999 : ky);
        return (x.medizinisch ? 1 : 0) - (y.medizinisch ? 1 : 0) || relevanz(x, y);
      }).slice(0, 4);
      view.innerHTML = '<div class="bereich-kopf"><h2>' + esc(W.bereiche[nurBereich]) + "</h2><p>" + esc(BEREICH_TEXT[nurBereich] || "") + "</p></div>" +
        '<h3 class="section-title">Zuerst lesen</h3>' + kartenListe(top) +
        '<h3 class="section-title">Alle ' + liste.length + " Themen</h3>" + kartenListe(liste);
      return;
    }
    view.innerHTML = '<p class="result-meta">' + liste.length + (liste.length === 1 ? " Thema" : " Themen") +
      (q ? " zu „" + esc(q) + "“" : "") + "</p>" + kartenListe(liste);
  }
  var BEREICH_KERN = {
    schlaf: ["einschlafen", "durchschlafen", "babyschlaf", "mittagsschlaf", "familienbett"],
    essen: ["waehlerisches-essen", "beikost", "stillen", "suessigkeiten"],
    gefuehle: ["wutanfaelle", "gefuehle-begleiten", "trotz-autonomie", "angst-kind", "frustrationstoleranz"],
    geschwister: ["geschwisterstreit", "eifersucht-baby", "geschwister-vorbereiten", "gerechtigkeit-geschwister"],
    kita: ["kita-eingewoehnung", "schulstart", "kita-allgemein", "schule-lernen"],
    medien: ["bildschirmzeit", "social-media-kinder", "handy-eltern-baby"],
    sauberkeit: ["trocken-werden", "zaehne-putzen"],
    grenzen: ["grenzen-setzen", "kooperation-zuhoeren", "strafe-konsequenz", "belohnungssysteme"],
    alltag: ["morgenroutine", "routinen", "aufraeumen-haushalt", "selbststaendigkeit"],
    baby: ["babyschlaf", "stillen", "beikost", "baby-weinen", "erste-zeit-mit-baby"],
    entwicklung: ["hirnentwicklung-mythen", "adhs-kind", "kind-sozial-entwicklung", "pubertaet-teenager"],
    eltern: ["erschoepfte-eltern", "elterliche-wut", "mental-load", "zeit-fuer-sich"]
  };
  var BEREICH_TEXT = {
    schlaf: "Einschlafen, Durchschlafen, Mittagsschlaf und das Familienbett.",
    essen: "Beikost, wählerisches Essen, Süßes und Mahlzeiten ohne Streit.",
    gefuehle: "Wut, Angst, Trotz und große Gefühle begleiten, bei Kindern und bei euch.",
    geschwister: "Streit, Eifersucht und Bindung zwischen Geschwistern.",
    kita: "Eingewöhnung, Kita-Alltag, Schulstart und Hausaufgaben.",
    medien: "Bildschirmzeit, Handy und Medienerziehung.",
    sauberkeit: "Trocken werden und Töpfchen.",
    grenzen: "Regeln, Konsequenzen und Grenzen setzen, ohne zu schimpfen.",
    alltag: "Routinen, Anziehen, Aufräumen und der ganz normale Wahnsinn.",
    baby: "Schwangerschaft, Geburt, Stillen und die ersten Monate.",
    entwicklung: "Was Kinder wann können, Besonderheiten und Gesundheit.",
    eltern: "Erschöpfung, Wut, Mental Load und Zeit für euch."
  };

  var SOFORT = [
    ["wutanfaelle", "Wutanfall"], ["kind-haut", "Mein Kind haut"], ["geschwisterstreit", "Geschwister streiten"],
    ["einschlafen", "Kind schläft nicht ein"], ["elterliche-wut", "Ich werde gleich laut"], ["erschoepfte-eltern", "Ich kann nicht mehr"]
  ];
  var kindalter = lies("kindalter", "");
  if (!W.alter[kindalter]) kindalter = "";
  var installEvent = null, installZu = lies("installZu", false);
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); installEvent = e; if (!location.hash || location.hash === "#/") zeigeListe(); });
  function istApp() { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
  // Themen, nach denen Eltern im Alltag am häufigsten suchen. Sie stehen bei gleicher Quellenlage zuerst.
  var KERN = ["wutanfaelle", "einschlafen", "durchschlafen", "grenzen-setzen", "geschwisterstreit", "kooperation-zuhoeren", "bildschirmzeit",
    "waehlerisches-essen", "trotz-autonomie", "gefuehle-begleiten", "kita-eingewoehnung", "trocken-werden", "elterliche-wut", "schulstart",
    "erschoepfte-eltern", "loben", "belohnungssysteme", "angst-kind", "kind-haut", "luegen", "selbststaendigkeit", "morgenroutine", "beikost", "stillen"];
  var BABY_KERN = ["babyschlaf", "stillen", "beikost", "baby-weinen", "erste-zeit-mit-baby", "wochenbett", "bindung", "tragen", "zahnen-zaehne", "flaeschchen", "familienbett"];
  function kernRang(a) { var i = KERN.indexOf(a.id); return i < 0 ? 999 : i; }
  function relevanz(x, y) {
    return Math.min(8, (y.sichtweisen || []).length) - Math.min(8, (x.sichtweisen || []).length) ||
      kernRang(x) - kernRang(y) ||
      (y.quellen || []).length - (x.quellen || []).length || x.titel.localeCompare(y.titel, "de");
  }

  function installHinweis() {
    if (istApp() || installZu) return "";
    var text = "";
    if (installEvent) text = 'Als App aufs Handy holen: <button type="button" class="link-btn" data-install>Installieren</button>';
    else if (/iphone|ipad/i.test(navigator.userAgent)) text = "Als App aufs Handy holen: Im Browser auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen.";
    else return "";
    return '<div class="hint"><span>' + text + '</span><button type="button" class="hint-x" data-install-zu aria-label="Hinweis schließen">×</button></div>';
  }

  function podLeiste() {
    var slot = $("#pod-slot");
    if (!slot) return;
    var html = '<div class="pod-strip-head"><span>Nur einen Podcast ansehen</span><a href="#/podcasts">Alle Podcasts</a></div><div class="pod-pills">';
    Object.keys(W.podcasts).forEach(function (k) {
      html += '<button type="button" class="pod-pill pod-' + esc(k) + '" data-podinfo="' + esc(k) + '" aria-pressed="false">' + monogramm(k) + esc(kurzName(k)) + "</button>";
    });
    slot.innerHTML = html + '</div><div class="pod-info" id="pod-info" hidden></div>';
    slot.addEventListener("click", function (e) {
      var t = e.target.closest("[data-podinfo]");
      if (t) {
        var k = t.dataset.podinfo, set = zustand.filter.podcast;
        if (set.size === 1 && set.has(k)) set.clear(); else { set.clear(); set.add(k); }
        aktualisiereChips(); geheZurListe(); return;
      }
      if (e.target.closest("[data-podalle]")) { zustand.filter.podcast.clear(); aktualisiereChips(); geheZurListe(); }
    });
  }
  function podLeisteAktualisieren() {
    var slot = $("#pod-slot");
    if (!slot) return;
    var set = zustand.filter.podcast;
    slot.querySelectorAll("[data-podinfo]").forEach(function (b) {
      b.setAttribute("aria-pressed", set.has(b.dataset.podinfo) ? "true" : "false");
    });
    var box = $("#pod-info");
    if (set.size === 1) { box.innerHTML = podInfoHtml(Array.from(set)[0]); box.hidden = false; }
    else { box.hidden = true; box.innerHTML = ""; }
  }
  function podInfoHtml(k) {
    var p = W.podcasts[k];
    var n = W.artikel.filter(function (x) { return podcastsVon(x).indexOf(k) >= 0; }).length;
    var folgen = Object.keys(FOLGEN[k] || {}).length;
    var links = [];
    if (sicherUrl(p.spotify)) links.push(plattformBtn("spotify", p.spotify, "Spotify"));
    if (sicherUrl(p.apple)) links.push(plattformBtn("apple", p.apple, "Apple Podcasts"));
    return '<div class="pod-info-in pod-' + esc(k) + '"><strong>' + esc(p.name) + '</strong><span class="muted">von ' + esc(p.hosts || "") + "</span>" +
      "<span>" + (n ? "Es werden nur die " + n + (n === 1 ? " Thema" : " Themen") + " aus diesem Podcast gezeigt" : "Wird gerade ausgewertet, folgt bald") + (folgen ? " · " + folgen + " Folgen" : "") + "</span>" +
      '<div class="s-links"><button type="button" class="link-btn" data-podalle>Alle Themen zeigen</button>' + links.join("") + "</div></div>";
  }

  var BEREICH_ICON = {
    schlaf: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    gefuehle: '<path d="M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z"/>',
    essen: '<path d="M5 8h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 9h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2"/>',
    geschwister: '<circle cx="8" cy="8" r="3"/><circle cx="16.500" cy="9" r="2.500"/><path d="M3 19c0-3 2.500-5 5-5s5 2 5 5M14 19c0-2 1.500-4 3.500-4s3.500 2 3.500 4"/>',
    kita: '<path d="M4 20V10l8-6 8 6v10zM10 20v-5h4v5"/>',
    medien: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
    sauberkeit: '<path d="M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z"/>',
    grenzen: '<path d="M12 3l8 3v6c0 4.500-3.500 7.500-8 9-4.500-1.500-8-4.500-8-9V6z"/>',
    alltag: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    baby: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9 15c1 1 2 1.500 3 1.500s2-.500 3-1.500"/>',
    entwicklung: '<path d="M5 20v-8M12 20V6M19 20V9"/>',
    eltern: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600L7 7M17 17l1.400 1.400M5.600 18.400L7 17M17 7l1.400-1.400"/>'
  };
  function bereichIcon(k) {
    return BEREICH_ICON[k] ? '<svg class="area-icon" aria-hidden="true" viewBox="0 0 24 24">' + BEREICH_ICON[k] + "</svg>" : "";
  }

  function zeigeStart() {
    var html = installHinweis();

    var sos = '<h2 class="section-title" id="soforthilfe">Gerade akut?</h2><div class="sos">' +
      SOFORT.filter(function (x) { return NACH_ID[x[0]]; }).map(function (x) {
        return '<a class="sos-btn" href="#/soforthilfe/' + x[0] + '">' + esc(x[1]) + "</a>";
      }).join("") + "</div>";

    var altersBlock = '<h2 class="section-title">' + (kindalter ? "Das ist jetzt dran" : "Wie alt ist dein Kind?") + "</h2>" +
      (kindalter ? '<p class="dran-sub">Passend für dein Kind mit ' + esc(W.alter[kindalter]) + ". Alter ändern:</p>" : "") +
      '<div class="alter-wahl" role="group" aria-label="Alter des Kindes">' +
      Object.keys(W.alter).map(function (k) {
        return '<button type="button" class="alter-chip" data-kindalter="' + k + '" aria-pressed="' + (kindalter === k) + '">' + esc(W.alter[k]) + "</button>";
      }).join("") + "</div>";
    if (kindalter) {
      var passend = W.artikel.filter(function (a) { return (a.alter || []).indexOf(kindalter) >= 0; })
        .sort(function (x, y) {
          var ax = (x.alter || []).length >= 4 ? 1 : 0, ay = (y.alter || []).length >= 4 ? 1 : 0; // für alle Altersstufen getaggte Themen später
          var bx = kindalter === "0-1" && (x.bereiche || []).indexOf("baby") >= 0 ? 0 : 1, by = kindalter === "0-1" && (y.bereiche || []).indexOf("baby") >= 0 ? 0 : 1;
          var rx = kindalter === "0-1" ? BABY_KERN.indexOf(x.id) : -1, ry = kindalter === "0-1" ? BABY_KERN.indexOf(y.id) : -1;
          if (rx >= 0 || ry >= 0) return (rx < 0 ? 999 : rx) - (ry < 0 ? 999 : ry);
          return (x.medizinisch ? 1 : 0) - (y.medizinisch ? 1 : 0) || bx - by || ax - ay || ((x.alter || []).length - (y.alter || []).length) || kernRang(x) - kernRang(y) || relevanz(x, y);
        });
      altersBlock += kartenListe(passend.slice(0, 5)) +
        '<button type="button" class="alle-btn" data-alle-alter>Alle ' + passend.length + " Themen für diese Altersgruppe</button>";
    }
    html += kindalter ? altersBlock + sos : sos + altersBlock;

    html += '<a class="check-card" href="#/check"><strong>Eltern-Check</strong><span>Was kostet euch gerade am meisten Kraft? Wählt aus, wir zeigen passende Themen.</span></a>';

    html += '<h2 class="section-title">Häufige Fragen</h2><div class="suggestions">' +
      BEISPIELE.map(function (b) { return '<button type="button" class="suggestion" data-q="' + esc(b) + '">' + esc(b) + "</button>"; }).join("") +
      "</div>";

    html += '<aside class="notfall" id="hilfe"><strong>Bei akuten Sorgen</strong> (Fieber, Entwicklung, Krise): Kinderarzt oder Kinderärztin, ' +
      'Beratungsstellen oder das Elterntelefon <a href="tel:08001110550">0800 111 0 550</a> (kostenlos, anonym). ' +
      'Im Notfall <a href="tel:112">112</a>. <a href="#/notfall"><strong>Alle Notfall-Nummern</strong></a></aside>';

    if (verlauf.length) {
      html += '<h2 class="section-title">Zuletzt angesehen</h2>' + kartenListe(verlauf.map(function (id) { return NACH_ID[id]; }).slice(0, 4));
    }

    html += '<h2 class="section-title" id="bereiche">Nach Bereich</h2><div class="swipe-wrap"><div class="grid-areas swipe-areas">' +
      Object.keys(W.bereiche).map(function (k) {
        var n = W.artikel.filter(function (a) { return (a.bereiche || []).indexOf(k) >= 0; }).length;
        return '<button type="button" class="area-tile" data-bereich="' + esc(k) + '">' + bereichIcon(k) + "<strong>" + esc(W.bereiche[k]) +
          "</strong><span>" + n + (n === 1 ? " Thema" : " Themen") + "</span></button>";
      }).join("") + '</div><div class="swipe-dots" aria-hidden="true"></div></div>';

    var az = W.artikel.slice().sort(function (a, b) { return a.titel.localeCompare(b.titel, "de"); });
    html += '<details class="alle" id="az"><summary>Alle ' + az.length + ' Themen von A bis Z</summary>' + kartenListe(az) + "</details>";

    html += '<div class="share-card"><div><strong>Kennst du Eltern, die das gebrauchen können?</strong>' +
      "<span>Schick ihnen das Elternlexikon, zum Beispiel wer gerade ein Baby bekommt.</span></div>" +
      '<button type="button" class="primary-btn" data-share-app>Weitersagen</button></div>';
    view.innerHTML = html;
    richteWischEin();
  }

  function richteWischEin() {
    var sc = view.querySelector(".swipe-areas"), dots = view.querySelector(".swipe-dots");
    if (!sc || !dots) return;
    var seiten = 0;
    function bau() {
      var n = Math.max(1, Math.round(sc.scrollWidth / Math.max(sc.clientWidth, 1)));
      if (sc.scrollWidth <= sc.clientWidth + 4) n = 1;
      if (n === seiten) return;
      seiten = n; dots.innerHTML = "";
      for (var i = 0; i < n; i++) dots.appendChild(document.createElement("span"));
      dots.hidden = n < 2; akt();
    }
    function akt() {
      var max = sc.scrollWidth - sc.clientWidth;
      var i = max > 0 ? Math.round(sc.scrollLeft / max * (seiten - 1)) : 0;
      Array.prototype.forEach.call(dots.children, function (d, j) { d.className = j === i ? "on" : ""; });
    }
    sc.addEventListener("scroll", akt, { passive: true });
    window.addEventListener("resize", bau);
    bau();
  }

  /* ---------- Eltern-Check: Was belastet euch gerade? ---------- */
  var CHECK = [
    ["schlaf", "Schlaf", ["einschlafen", "durchschlafen", "babyschlaf", "mittagsschlaf", "familienbett"]],
    ["wut", "Wutanfälle und große Gefühle", ["wutanfaelle", "trotz-autonomie", "gefuehle-begleiten", "frustrationstoleranz", "meltdown"]],
    ["grenzen", "Grenzen und „Er hört nicht“", ["grenzen-setzen", "kooperation-zuhoeren", "strafe-konsequenz", "belohnungssysteme"]],
    ["geschwister", "Streit unter Geschwistern", ["geschwisterstreit", "eifersucht-baby", "gerechtigkeit-geschwister", "geschwister-vorbereiten"]],
    ["essen", "Essen und Stillen", ["waehlerisches-essen", "beikost", "stillen", "suessigkeiten"]],
    ["medien", "Handy und Bildschirm", ["bildschirmzeit", "social-media-kinder"]],
    ["kita", "Kita und Schule", ["kita-eingewoehnung", "schulstart", "schule-lernen", "schulangst"]],
    ["ich", "Ich bin am Limit", ["erschoepfte-eltern", "elterliche-wut", "mental-load", "zeit-fuer-sich", "eltern-selbstregulation"]]
  ];
  var checkWahl = new Set();
  function checkErgebnis() {
    var html = "";
    CHECK.forEach(function (c) {
      if (!checkWahl.has(c[0])) return;
      var liste = c[2].map(function (id) { return NACH_ID[id]; }).filter(Boolean);
      var passend = kindalter ? liste.filter(function (a) { return (a.alter || []).indexOf(kindalter) >= 0; }) : liste;
      if (passend.length) liste = passend;
      html += '<h3 class="section-title">' + esc(c[1]) + "</h3>" + kartenListe(liste.slice(0, 3));
    });
    return html || '<p class="muted">Tippt oben an, was gerade am meisten Kraft kostet. Mehrere Antworten sind möglich.</p>';
  }
  function zeigeCheck() {
    document.body.classList.add("compact");
    $("#search-area").hidden = true;
    setzeNav("");
    view.innerHTML = '<article class="article check-seite"><button type="button" class="back" data-back>← Zurück</button>' +
      "<h1>Eltern-Check</h1><p class=\"muted\">Was kostet euch gerade am meisten Kraft? Wählt aus, wir zeigen euch passende Themen.</p>" +
      '<h2>Wie alt ist dein Kind?</h2><div class="alter-wahl" role="group" aria-label="Alter des Kindes">' +
      Object.keys(W.alter).map(function (k) {
        return '<button type="button" class="alter-chip" data-kindalter="' + k + '" aria-pressed="' + (kindalter === k) + '">' + esc(W.alter[k]) + "</button>";
      }).join("") + "</div>" +
      "<h2>Was belastet euch?</h2><div class=\"check-wahl\">" + CHECK.map(function (c) {
        return '<button type="button" class="chip check-chip" data-check="' + c[0] + '" aria-pressed="' + checkWahl.has(c[0]) + '">' + esc(c[1]) + "</button>";
      }).join("") + '</div><div id="check-ergebnis">' + checkErgebnis() + "</div></article>";
    window.scrollTo(0, 0);
    document.title = "Eltern-Check · Elternlexikon";
  }

  function zeigeNotfall() {
    document.body.classList.add("compact");
    $("#search-area").hidden = true;
    setzeNav("");
    var nummern = [
      ["112", "tel:112", "Notruf", "Bei Atemnot, Bewusstlosigkeit, Krampfanfall, schweren Verletzungen oder wenn ihr euch große Sorgen macht. Sofort anrufen, nicht erst nachlesen."],
      ["116 117", "tel:116117", "Ärztlicher Bereitschaftsdienst", "Wenn die Praxis geschlossen ist und es nicht lebensbedrohlich wirkt, zum Beispiel nachts oder am Wochenende."],
      ["Giftinformation", "", "Giftnotruf", "Bei Verdacht auf verschluckte Reinigungsmittel, Medikamente oder Pflanzen: Die Nummer des Giftinformationszentrums eurer Region am besten schon jetzt ins Handy speichern."],
      ["0800 111 0 550", "tel:08001110550", "Elterntelefon", "Kostenlos und anonym, wenn ihr am Ende eurer Kräfte seid oder jemanden zum Reden braucht."]
    ];
    var themen = [["erste-hilfe", "Erste Hilfe bei Kindern"], ["fieber", "Fieber beim Kind"], ["baby-hitze", "Hitze beim Baby"], ["unfaelle-vorbeugen", "Unfälle vorbeugen"], ["wassersicherheit", "Wassersicherheit"], ["kindersitz", "Kindersitz im Auto"]]
      .filter(function (t) { return NACH_ID[t[0]]; });
    view.innerHTML = '<article class="article notfall-seite"><button type="button" class="back" data-back>← Zurück</button>' +
      '<p class="sos-label">Notfall</p><h1>Wen ihr jetzt anrufen könnt</h1>' +
      '<ul class="nummern">' + nummern.map(function (n) {
        return "<li>" + (n[1] ? '<a class="nummer" href="' + n[1] + '">' + esc(n[0]) + "</a>" : '<span class="nummer ohne">' + esc(n[0]) + "</span>") +
          "<div><strong>" + esc(n[2]) + "</strong><span>" + esc(n[3]) + "</span></div></li>";
      }).join("") + "</ul>" +
      '<h2>Kurz nachgelesen</h2><p class="muted">Aussagen von Gästen und Hosts aus den Podcasts. Sie ersetzen keinen Erste-Hilfe-Kurs und keine ärztliche Beratung.</p>' +
      '<div class="karten-notfall">' + ["erste-hilfe", "fieber", "baby-hitze"].filter(function (k) { return NACH_ID[k]; }).map(function (k) {
        var a = NACH_ID[k];
        return '<details class="nkarte"><summary>' + esc(a.titel) + "</summary><p>" + esc(a.kurz) + "</p>" +
          '<ol class="tips">' + (a.tipps || []).slice(0, 4).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol>" +
          '<a class="primary-btn" href="#/artikel/' + encodeURIComponent(a.id) + '">Ganzen Artikel lesen</a></details>';
      }).join("") + "</div>" +
      '<h2>Weitere Themen</h2>' +
      '<div class="related">' + themen.map(function (t) { return '<a href="#/artikel/' + t[0] + '">' + esc(t[1]) + "</a>"; }).join("") + "</div></article>";
    window.scrollTo(0, 0);
    document.title = "Notfall · Elternlexikon";
  }

  function zeigeSoforthilfe(id) {
    var a = NACH_ID[id];
    if (!a) { location.hash = "#/"; return; }
    document.body.classList.add("compact");
    $("#search-area").hidden = true;
    setzeNav("");
    view.innerHTML = '<article class="article"><button type="button" class="back" data-back>← Zurück</button>' +
      '<p class="sos-label">Soforthilfe</p><h1>' + esc(a.titel) + "</h1>" +
      "<h2>Das hilft jetzt</h2><ol class=\"tips\">" +
      (a.tipps || []).slice(0, 3).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol>" +
      '<div class="answer"><div class="answer-label">Kurz gesagt</div>' + esc(a.kurz) + "</div>" +
      (a.medizinisch ? '<p class="med-note"><strong>Gesundheitsthema:</strong> Das ist keine medizinische Beratung, sondern allgemeine Information.</p>' : "") +
      '<p><a class="primary-btn" href="#/artikel/' + encodeURIComponent(a.id) + '">Ganzen Artikel lesen</a></p>' +
      '<aside class="notfall"><strong>Bei akuten Sorgen</strong> (Fieber, Entwicklung, Krise): Kinderarzt oder Kinderärztin, ' +
      'Elterntelefon <a href="tel:08001110550">0800 111 0 550</a> (kostenlos, anonym). Im Notfall <a href="tel:112">112</a>.</aside></article>';
    window.scrollTo(0, 0);
    document.title = "Soforthilfe: " + a.titel + " · Elternlexikon";
  }

  function zeigePodcasts() {
    document.body.classList.add("compact");
    $("#search-area").hidden = true;
    setzeNav("podcasts");
    var html = '<div class="article"><h1>Die Podcasts hinter dem Lexikon</h1>' +
      '<p class="intro">Alle Inhalte sind eigene Zusammenfassungen von Folgen dieser Podcasts. Hört gern direkt rein.</p></div><ul class="pod-list">';
    Object.keys(W.podcasts).forEach(function (k) {
      var p = W.podcasts[k];
      var n = W.artikel.filter(function (x) { return podcastsVon(x).indexOf(k) >= 0; }).length;
      var folgen = Object.keys(FOLGEN[k] || {}).length;
      var links = [];
      if (sicherUrl(p.spotify)) links.push(plattformBtn("spotify", p.spotify, "Spotify"));
      if (sicherUrl(p.apple)) links.push(plattformBtn("apple", p.apple, "Apple Podcasts"));
      html += '<li class="pod-card pod-' + esc(k) + '"><span class="pod-mark big" aria-hidden="true">' + esc(MONOGRAMM[k] || "?") + "</span>" +
        "<div><h3>" + esc(p.name) + '</h3><p class="muted">von ' + esc(p.hosts || "") + "</p>" +
        "<p>" + (n ? n + (n === 1 ? " Thema" : " Themen") + " im Lexikon" : "Wird gerade ausgewertet, folgt bald") +
        (folgen ? " · " + folgen + " Folgen" : "") + "</p>" +
        '<div class="s-links">' + links.join("") + "</div></div></li>";
    });
    view.innerHTML = html + "</ul>";
    window.scrollTo(0, 0);
    document.title = "Podcasts · Elternlexikon";
  }

  function zeigeArtikel(id) {
    var a = NACH_ID[id];
    if (!a) { location.hash = "#/"; return; }
    merkeBesuch(id);
    document.body.classList.add("compact");
    $("#search-area").hidden = true;
    setzeNav("");

    var tags = (a.alter || []).map(function (k) { return '<span class="tag age">' + esc(W.alter[k] || k) + "</span>"; }).join("") +
      (a.bereiche || []).map(function (k) { return '<span class="tag">' + esc(W.bereiche[k] || k) + "</span>"; }).join("");

    // Vertrauenszeile: wie viele Folgen und welche Podcasts stecken dahinter
    var folgenSet = new Set((a.quellen || []).map(function (q) { return q.podcast + "|" + q.nr; }));
    var pods = podcastsVon(a).map(function (k) { return W.podcasts[k].name; });
    var vertrauen = '<p class="trust">Zusammengefasst aus ' + folgenSet.size + (folgenSet.size === 1 ? " Folge" : " Folgen") +
      (pods.length ? " von " + esc(pods.join(", ")) : "") + ". Eigene Zusammenfassung mit Verweis auf die Quelle.</p>";

    var html = '<article class="article">' +
      '<button type="button" class="back" data-back>← Zurück</button>' +
      '<div class="article-head"><h1>' + esc(a.titel) + "</h1>" +
      '<button type="button" class="fav-btn" data-fav="' + esc(a.id) + '" aria-pressed="' + istFavorit(a.id) + '" aria-label="Als Favorit merken">' + HERZ + "</button></div>" +
      '<div class="tags">' + tags + "</div>" +
      '<div class="actions"><button type="button" class="act-btn" data-share-art>Teilen</button><button type="button" class="act-btn" data-print>Drucken</button></div>' +
      (a.einleitung ? '<p class="intro">' + esc(a.einleitung) + "</p>" : "") +
      '<div class="answer"><div class="answer-label">Kurz gesagt</div>' + esc(a.kurz) + "</div>" +
      (a.medizinisch
        ? '<p class="med-note"><strong>Gesundheitsthema:</strong> Das ist keine medizinische Beratung, sondern allgemeine Information. Bei Fragen zur Gesundheit deines Kindes sprich mit deiner Kinderärztin oder deinem Kinderarzt oder deiner Hebamme.</p>'
        : "");

    if ((a.tipps || []).length) {
      var erledigt = (lies("erledigt", {})[a.id]) || [];
      html += "<h2>Was ihr konkret tun könnt</h2><p class=\"tip-hint\">Tippt einen Tipp an, wenn ihr ihn ausprobiert habt.</p><ol class=\"tips\" data-art=\"" + esc(a.id) + "\">" +
        a.tipps.map(function (t, i) {
          var d = erledigt.indexOf(i) >= 0;
          return '<li role="checkbox" tabindex="0" data-tip="' + i + '" aria-checked="' + d + '"' + (d ? ' class="done"' : "") + ">" + esc(t) + "</li>";
        }).join("") + "</ol>";
    }

    // Mehr dazu: eingeklappt, damit die Antwort oben bleibt
    var mehr = "";
    var stimmen = "";
    if ((a.sichtweisen || []).length) {
      var n = a.sichtweisen.length;
      stimmen = '<section class="stimmen"><h2>Was die Podcasts dazu sagen</h2>' +
        '<p class="stimmen-sub">' + (n > 1 ? n + " Podcasts, " + n + " Blickwinkel. Wischt oder scrollt zum Vergleichen." : "Die Sicht des Podcasts auf dieses Thema.") + "</p>" +
        '<div class="stimmen-grid' + (n > 1 ? " mehrere" : "") + '">' +
        a.sichtweisen.map(function (s) {
          return '<div class="stimme pod-' + esc(s.podcast) + '"><div class="stimme-kopf">' + podLabel(s.podcast) + "</div><p>" + esc(s.text) + "</p>" +
            (s.text.length > 260 ? '<button type="button" class="stimme-mehr" data-stimme-mehr aria-expanded="false">Weiterlesen</button>' : "") + "</div>";
        }).join("") + "</div></section>";
    }
    var nachhoeren = "";
    if ((a.quellen || []).length) {
      nachhoeren += '<section class="listen"><h2 class="listen-title"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="7" rx="1.500"/><rect x="17" y="14" width="4" height="7" rx="1.500"/></svg>Genau die Stelle nachhören</h2>' +
        '<p class="listen-sub">Auf Play tippen, und der Player springt direkt zur passenden Stelle in der Folge.</p><ul class="sources">' +
        a.quellen.map(function (s) {
          var p = W.podcasts[s.podcast] || {};
          var folgeLink = sicherUrl(s.link);
          var spotify = sicherUrl(s.spotify) || sicherUrl(p.spotify);
          var links = [];
          var audio = audioVon(s);
          var abspielen = audio
            ? '<button type="button" class="play-big" data-play="' + esc(s.podcast) + "|" + esc(s.nr) + "|" + esc(s.minute || "0:00") + '" aria-label="Ab ' + esc(s.minute || "Anfang") + ' anhören">' +
              '<svg class="i-play" aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/></svg>' +
              '<svg class="i-pause" aria-hidden="true" viewBox="0 0 24 24"><path d="M7 5h3.500v14H7zM13.500 5H17v14h-3.500z" fill="currentColor" stroke="none"/></svg></button>'
            : "";
          if (!folgeLink) {
            var f = folgeInfo(s.podcast, s.nr);
            if (f) folgeLink = sicherUrl(f.w);
          }
          if (folgeLink) links.push(plattformBtn("web", folgeLink, "Zur Folge"));
          var fi = folgeInfo(s.podcast, s.nr) || {};
          var titelQ = encodeURIComponent((fi.t || s.titel || "").replace(/\s*\|.*$/, ""));
          var spExakt = fi.sp ? "https://open.spotify.com/episode/" + fi.sp : sicherUrl(s.spotify);
          if (spExakt) links.push(plattformBtn("spotify", spExakt, "Spotify"));
          else if (spotify) links.push(plattformBtn("spotify", "https://open.spotify.com/search/" + titelQ + "/episodes", "Spotify suchen"));
          var apple = sicherUrl(fi.ap) || sicherUrl(p.apple);
          if (apple) links.push(plattformBtn("apple", apple, fi.ap ? "Apple Podcasts" : "Apple (Show)"));
          return '<li class="source pod-' + esc(s.podcast) + '">' +
            '<div class="s-row">' + (abspielen || (s.minute ? '<span class="time" title="Minute in der Folge">' + esc(s.minute) + "</span>" : "")) +
            '<div class="s-body">' + (s.thema ? '<div class="s-topic">' + esc(s.thema) + "</div>" : "") +
            '<div class="s-title">' + esc(s.titel) + "</div>" +
            '<div class="s-meta">' + podLabel(s.podcast, true) + (s.nr ? " · Folge " + esc(s.nr) : "") + (s.datum ? " · " + datumDe(s.datum) : "") + "</div>" +
            (s.minute && audio ? '<div class="s-at">Ab Minute ' + esc(s.minute) + "</div>" : "") +
            "</div></div>" +
            (links.length ? '<div class="s-links">' + links.join("") + "</div>" : "") +
            "</li>";
        }).join("") + "</ul></section>";
    }
    var verwandt = (a.verwandt || []).map(function (v) { return NACH_ID[v]; }).filter(Boolean);
    var verwandtHtml = "";
    if (verwandt.length) {
      verwandtHtml = '<section class="passt-dazu"><h2>Passt auch dazu</h2><div class="related">' +
        verwandt.map(function (v) { return '<a href="#/artikel/' + encodeURIComponent(v.id) + '">' + esc(v.titel) + "</a>"; }).join("") + "</div></section>";
    }
    html += stimmen + nachhoeren + verwandtHtml;
    if (mehr) {
      html += '<details class="mehr"><summary><span>Mehr dazu<small>Weitere Hinweise</small></span></summary>' + mehr + "</details>";
    }
    html = html.replace('<div class="tags">', vertrauen + '<div class="tags">');
    html += "</article>";
    view.innerHTML = html;
    window.scrollTo(0, 0);
    document.title = a.titel + " · Elternlexikon";
  }

  function zeigeFavoriten() {
    document.body.classList.add("compact");
    $("#search-area").hidden = true;
    setzeNav("fav");
    var liste = favoriten.map(function (id) { return NACH_ID[id]; }).filter(Boolean);
    view.innerHTML = '<div class="article"><h1>Favoriten</h1></div>' + (liste.length
      ? '<p class="result-meta">' + liste.length + " gemerkt</p>" + kartenListe(liste)
      : '<div class="empty"><strong>Noch keine Favoriten</strong>Tippt in einem Artikel auf das Herz, um ihn hier zu sammeln.</div>');
    // Ausprobierte Tipps: alles, was in Artikeln abgehakt wurde, an einem Ort
    var erl = lies("erledigt", {}), zeilen = "", anzahl = 0;
    Object.keys(erl).forEach(function (id) {
      var a = NACH_ID[id];
      if (!a || !(erl[id] || []).length) return;
      var tipps = erl[id].filter(function (i) { return a.tipps && a.tipps[i]; });
      if (!tipps.length) return;
      anzahl += tipps.length;
      zeilen += '<li><a class="tipp-art" href="#/artikel/' + encodeURIComponent(id) + '">' + esc(a.titel) + "</a><ul>" +
        tipps.map(function (i) { return '<li><span>' + esc(a.tipps[i]) + '</span><button type="button" class="tipp-weg" data-tipp-weg="' + esc(id) + "|" + i + '" aria-label="Tipp aus der Liste nehmen">×</button></li>'; }).join("") + "</ul></li>";
    });
    if (anzahl) {
      view.innerHTML += '<section class="ausprobiert"><h2>Ausprobierte Tipps</h2><p class="muted">' + anzahl + (anzahl === 1 ? " Tipp" : " Tipps") +
        ' habt ihr schon ausprobiert. Mit × nehmt ihr einen Tipp wieder aus der Liste.</p><ul class="ausprobiert-liste">' + zeilen + "</ul></section>";
    }
    window.scrollTo(0, 0);
  }

  function setzeNav(aktiv) {
    document.querySelectorAll(".menu-link").forEach(function (l) { l.classList.remove("active"); });
    var ziel = aktiv === "fav" ? "#nav-fav" : aktiv === "podcasts" ? "#nav-podcasts" : '[data-ziel="start"]';
    var el = $(ziel);
    if (el) el.classList.add("active");
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); t.removeAttribute("aria-current"); });
    var tab = $(aktiv === "fav" ? "#tab-fav" : aktiv === "podcasts" ? "#tab-themen" : "#tab-start");
    if (tab) { tab.classList.add("active"); tab.setAttribute("aria-current", "page"); }
  }
  function zeigeFavZahl() {
    ["#nav-fav", "#tab-fav"].forEach(function (sel) {
      var el = $(sel), c = el.querySelector(".count");
      if (favoriten.length) {
        if (!c) { c = document.createElement("span"); c.className = "count"; el.appendChild(c); }
        c.textContent = favoriten.length;
      } else if (c) c.remove();
    });
  }

  /* ---------- Navigation ---------- */
  var kamVonListe = false;
  function route() {
    var h = location.hash || "#/";
    document.title = "Elternlexikon";
    document.body.classList.toggle("im-artikel", /^#\/(artikel|notfall)/.test(h));
    var m;
    if ((m = /^#\/artikel\/(.+)$/.exec(h))) return zeigeArtikel(decodeURIComponent(m[1]));
    if (h === "#/favoriten") return zeigeFavoriten();
    if (h === "#/podcasts") return zeigePodcasts();
    if (h === "#/notfall") return zeigeNotfall();
    if (h === "#/check") return zeigeCheck();
    if ((m = /^#\/soforthilfe\/(.+)$/.exec(h))) return zeigeSoforthilfe(decodeURIComponent(m[1]));
    kamVonListe = false;
    zeigeListe();
  }
  function geheZurListe() {
    if (location.hash && location.hash !== "#/") location.hash = "#/";
    else zeigeListe();
  }

  /* ---------- Ereignisse ---------- */
  var input = $("#q");
  var timer;
  input.addEventListener("input", function () {
    clearTimeout(timer);
    $("#q-clear").hidden = !input.value;
    timer = setTimeout(function () { zustand.q = input.value; geheZurListe(); }, 120);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { var first = view.querySelector(".card"); if (first) first.focus(); }
    if (e.key === "Escape") { input.value = ""; zustand.q = ""; $("#q-clear").hidden = true; geheZurListe(); }
  });
  $("#q-clear").addEventListener("click", function () {
    input.value = ""; zustand.q = ""; this.hidden = true; input.focus(); geheZurListe();
  });

  view.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-q]"))) {
      input.value = t.dataset.q; zustand.q = t.dataset.q; $("#q-clear").hidden = false; zeigeListe(); return;
    }
    if ((t = e.target.closest("[data-bereich]"))) {
      zustand.filter.bereich.clear(); zustand.filter.bereich.add(t.dataset.bereich); aktualisiereChips(); zeigeListe();
      $("#filters").scrollIntoView({ block: "nearest" }); return;
    }
    if ((t = e.target.closest("[data-fav]"))) {
      toggleFavorit(t.dataset.fav); t.setAttribute("aria-pressed", istFavorit(t.dataset.fav)); return;
    }
    if ((t = e.target.closest("[data-play]"))) {
      var p = t.dataset.play.split("|");
      player.spiele(p[0], p[1], p[2] || "0:00");
      return;
    }
    if ((t = e.target.closest("[data-back]"))) {
      if (kamVonListe) history.back(); else location.hash = "#/";
      return;
    }
    if ((t = e.target.closest("[data-kindalter]"))) {
      kindalter = kindalter === t.dataset.kindalter ? "" : t.dataset.kindalter;
      schreib("kindalter", kindalter);
      if (location.hash === "#/check") { var y = window.scrollY; zeigeCheck(); window.scrollTo(0, y); } else zeigeListe();
      return;
    }
    if ((t = e.target.closest("[data-check]"))) {
      var ck = t.dataset.check;
      if (checkWahl.has(ck)) checkWahl.delete(ck); else checkWahl.add(ck);
      t.setAttribute("aria-pressed", checkWahl.has(ck) ? "true" : "false");
      $("#check-ergebnis").innerHTML = checkErgebnis(); return;
    }
    if (e.target.closest("[data-alle-alter]")) {
      zustand.filter.alter.clear(); zustand.filter.alter.add(kindalter); aktualisiereChips(); zeigeListe();
      $("#filters").scrollIntoView({ block: "nearest" }); return;
    }
    if (e.target.closest("[data-install]") && installEvent) {
      installEvent.prompt(); installEvent = null; zeigeListe(); return;
    }
    if (e.target.closest("[data-install-zu]")) { installZu = true; schreib("installZu", true); zeigeListe(); return; }
    if (e.target.closest("[data-share-app]")) {
      teilen("Elternlexikon", "Antworten auf Erziehungsfragen aus Elternpodcasts, mit Soforthilfe und Tipps zum Ausprobieren.", location.href.split("#")[0]); return;
    }
    if (e.target.closest("[data-share-art]")) {
      var ar = NACH_ID[decodeURIComponent((/^#\/artikel\/(.+)$/.exec(location.hash) || [])[1] || "")];
      teilen(ar ? ar.titel : "Elternlexikon", ar ? ar.kurz : "", location.href); return;
    }
    if (e.target.closest("[data-print]")) { window.print(); return; }
    var tw = e.target.closest("[data-tipp-weg]");
    if (tw) {
      var tp = tw.dataset.tippWeg.split("|"), alle = lies("erledigt", {});
      alle[tp[0]] = (alle[tp[0]] || []).filter(function (x) { return x !== Number(tp[1]); });
      schreib("erledigt", alle); zeigeFavoriten(); return;
    }
    var sm = e.target.closest("[data-stimme-mehr]");
    if (sm) {
      var st = sm.closest(".stimme"), offen = st.classList.toggle("offen");
      sm.textContent = offen ? "Weniger" : "Weiterlesen"; sm.setAttribute("aria-expanded", offen ? "true" : "false"); return;
    }
    if ((t = e.target.closest("[data-tip]"))) { tipUmschalten(t); return; }
    if (e.target.closest(".card, .related a, .sos-btn")) kamVonListe = true;
  });

  // Menü (Seitenleiste, Tab-Leiste, Themen-Blatt): springt zu Abschnitten der Startseite
  function springeZu(ziel) {
    if (location.hash !== "#/") { location.hash = "#/"; route(); }
    zustand.q = ""; input.value = ""; $("#q-clear").hidden = true;
    zustand.filter.alter.clear(); zustand.filter.bereich.clear(); zustand.filter.podcast.clear();
    aktualisiereChips(); zeigeListe();
    if (ziel === "start") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    var el = document.getElementById(ziel);
    if (!el) return;
    if (ziel === "az") el.open = true;
    el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  ["#sheet", ".menu", ".tabbar"].forEach(function (sel) {
    document.querySelector(sel).addEventListener("click", function (e) {
      var t = e.target.closest("[data-ziel]");
      if (!t) return;
      e.preventDefault();
      schliesseBlatt(false);
      springeZu(t.dataset.ziel);
    });
  });

  // Tab „Suche“: zur Startseite und ins Suchfeld
  $("#tab-suche").addEventListener("click", function () {
    schliesseBlatt(false);
    if (location.hash !== "#/") { location.hash = "#/"; route(); }
    window.scrollTo({ top: 0 });
    input.focus();
  });

  // Tab „Themen“: Blatt mit allen Bereichen
  var blatt = $("#sheet"), blattHinter = $("#sheet-backdrop"), themenTab = $("#tab-themen");
  $("#sheet-grid").innerHTML = Object.keys(W.bereiche).map(function (k) {
    return '<button type="button" class="area-tile" data-sheet-bereich="' + esc(k) + '"><strong>' + esc(W.bereiche[k]) + "</strong></button>";
  }).join("");
  function oeffneBlatt() {
    blatt.hidden = false; blattHinter.hidden = false; themenTab.setAttribute("aria-expanded", "true");
    document.body.classList.add("sheet-open");
    $("#sheet-close").focus();
  }
  function schliesseBlatt(fokus) {
    if (blatt.hidden) return;
    blatt.hidden = true; blattHinter.hidden = true; themenTab.setAttribute("aria-expanded", "false");
    document.body.classList.remove("sheet-open");
    if (fokus) themenTab.focus();
  }
  themenTab.addEventListener("click", function () { if (blatt.hidden) oeffneBlatt(); else schliesseBlatt(true); });
  $("#sheet-close").addEventListener("click", function () { schliesseBlatt(true); });
  blattHinter.addEventListener("click", function () { schliesseBlatt(true); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") schliesseBlatt(true); });
  $("#sheet-podcasts").addEventListener("click", function () { schliesseBlatt(false); });
  $("#sheet-grid").addEventListener("click", function (e) {
    var t = e.target.closest("[data-sheet-bereich]");
    if (!t) return;
    schliesseBlatt(false);
    if (location.hash !== "#/") { location.hash = "#/"; route(); }
    zustand.q = ""; input.value = ""; $("#q-clear").hidden = true;
    zustand.filter.alter.clear(); zustand.filter.podcast.clear();
    zustand.filter.bereich.clear(); zustand.filter.bereich.add(t.dataset.sheetBereich);
    aktualisiereChips(); zeigeListe();
    $("#filters").scrollIntoView({ block: "start" });
  });

  view.addEventListener("keydown", function (e) {
    var t = e.target.closest && e.target.closest("[data-tip]");
    if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); tipUmschalten(t); }
  });
  function tipUmschalten(li) {
    var art = li.parentNode.dataset.art, i = Number(li.dataset.tip);
    var alle = lies("erledigt", {}), liste = alle[art] || [];
    var an = liste.indexOf(i) < 0;
    liste = an ? liste.concat([i]) : liste.filter(function (x) { return x !== i; });
    alle[art] = liste; schreib("erledigt", alle);
    li.classList.toggle("done", an); li.setAttribute("aria-checked", an);
  }
  function toast(text) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = text; t.setAttribute("role", "status");
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }
  function teilen(titel, text, url) {
    if (navigator.share) { navigator.share({ title: titel, text: text, url: url }).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { toast("Link kopiert"); }, function () { toast("Link konnte nicht kopiert werden"); });
    } else toast("Teilen wird von diesem Browser nicht unterstützt");
  }
  window.addEventListener("beforeprint", function () { document.querySelectorAll("details").forEach(function (d) { d.open = true; }); });

  window.addEventListener("hashchange", route);
  window.addEventListener("scroll", function () {
    $(".top").classList.toggle("scrolled", window.scrollY > 4);
  }, { passive: true });

  // Dunkelmodus: folgt dem System, bis man selbst umschaltet
  $("#theme-btn").addEventListener("click", function () {
    var root = document.documentElement;
    var dunkel = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dunkel ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  });

  /* ---------- Start ---------- */
  if (W.meta && (W.meta.hinweis || W.meta.platzhalter)) {
    var bn = $("#placeholder-banner"), bnZu = lies("bannerZu", "");
    if (W.meta.hinweis && bnZu !== W.meta.hinweis) {
      bn.innerHTML = '<span></span><button type="button" class="hint-x" aria-label="Hinweis schließen">×</button>';
      bn.firstChild.textContent = W.meta.hinweis;
      bn.querySelector("button").addEventListener("click", function () { bn.hidden = true; schreib("bannerZu", W.meta.hinweis); });
      bn.hidden = false;
    }
  }
  if (W.meta && W.meta.stand) $("#stand").textContent = "Stand: " + datumDe(W.meta.stand) + ".";
  baueFilter();
  podLeiste();
  zeigeFavZahl();
  player.init();
  route();

  // Offline-Fähigkeit (nur wenn über http/https ausgeliefert, nicht bei file://)
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

})();
