/*
 * Suche für das Elternlexikon – ohne Server, ohne Bibliotheken.
 *
 * - verzeiht Tippfehler (Damerau-Levenshtein je nach Wortlänge)
 * - findet Wortteile in zusammengesetzten Wörtern ("schlaf" -> "Einschlafbegleitung")
 * - ignoriert Füllwörter, damit ganze Fragen funktionieren ("Mein Kind will nicht schlafen")
 * - kennt Synonyme (aus den Artikeln und aus WISSEN.synonymgruppen)
 * - behandelt ä/ae, ö/oe, ü/ue, ß/ss gleich
 */
(function () {
  "use strict";

  var STOPP = new Set((
    "ich du er sie es wir ihr man mein meine meinen meinem meiner mich mir dich dir uns euch unser unsere unseren " +
    "der die das den dem des ein eine einen einem einer und oder aber auch noch schon nur sehr so dann wenn weil dass " +
    "ist sind war bin bist hat habe haben hatte wird werden wurde will willst wollen soll sollen sollte kann konnen " +
    "muss mussen darf durfen mag mochte mochten nicht kein keine keinen nie immer oft manchmal gerade jetzt mehr viel " +
    "was wie wann warum wieso weshalb wo wer welche welcher welches tun tut mache machen macht ich's " +
    "mit bei beim zum zur im in am an auf aus fur von vom zu um uber unter nach vor bis ohne gegen " +
    "kind kinder kindes kids sohn tochter hilfe tipp tipps frage ganz einfach total richtig " +
    "standig eigentlich wirklich okay ok gut schlecht normal nich sich ihm ihn ihr ihre ihren sein seine seinen"
  ).split(/\s+/));

  function falte(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/ß/g, "ss")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u");
  }

  // Sehr leichtes Stemming fürs Deutsche – gleich auf beiden Seiten angewandt
  function stamm(w) {
    if (w.length > 6) w = w.replace(/(ungen|ung|heit|keit|lich|isch)$/, "");
    if (w.length > 5) w = w.replace(/(en|er|es|em|st)$/, "");
    if (w.length > 4) w = w.replace(/[esn]$/, "");
    return w;
  }

  function woerter(s) {
    return falte(s).split(/[^a-z0-9]+/).filter(Boolean);
  }

  function tokens(s, mitStopp) {
    var out = [];
    woerter(s).forEach(function (w) {
      if (w.length < 2) return;
      if (!mitStopp && STOPP.has(w)) return;
      out.push(stamm(w));
    });
    return out;
  }

  // Damerau-Levenshtein mit Abbruchgrenze
  function distanz(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var n = a.length, m = b.length, i, j;
    var d = [];
    for (i = 0; i <= n; i++) { d[i] = [i]; }
    for (j = 1; j <= m; j++) { d[0][j] = j; }
    for (i = 1; i <= n; i++) {
      var zeileMin = Infinity;
      for (j = 1; j <= m; j++) {
        var k = a[i - 1] === b[j - 1] ? 0 : 1;
        var v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + k);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
        d[i][j] = v;
        if (v < zeileMin) zeileMin = v;
      }
      if (zeileMin > max) return max + 1;
    }
    return d[n][m];
  }

  function erlaubteFehler(len) { return len <= 3 ? 0 : len <= 6 ? 1 : 2; }

  // Wie gut passt ein Suchwort q auf ein Indexwort t? (0 … 1)
  // streng = true: keine Tippfehler (für Begriffe, die aus Synonymgruppen ergänzt wurden)
  function passt(q, t, streng) {
    if (q === t) return 1;
    if (q.length >= 3 && t.indexOf(q) === 0) return 0.85;           // Anfang: "schlaf" -> "schlafprobl"
    if (q.length >= 4 && t.indexOf(q) > 0) return 0.65;             // Wortteil: "schlaf" -> "einschlaf"
    if (streng) return 0;
    if (t.length >= 5 && q.length > t.length && q.indexOf(t) >= 0) return 0.55; // Suchwort länger: "trotzphas" enthält "trotz"
    var max = erlaubteFehler(Math.min(q.length, Math.max(t.length, 4)));
    if (max === 0) return 0;
    // Tippfehler auch am Wortanfang eines längeren Wortes zulassen ("schlfa" -> "schlafprobl")
    var vergleich = t.length > q.length + max ? t.slice(0, q.length) : t;
    var dd = distanz(q, vergleich, max);
    if (dd <= max) return dd === 1 ? 0.6 : 0.45;
    return 0;
  }

  var GEWICHT = { titel: 10, synonyme: 8, fragen: 6, einleitung: 3, bereiche: 4, kurz: 2, tipps: 1.5, sichtweisen: 1 };

  function baueIndex(wissen) {
    var bereichsNamen = wissen.bereiche || {};
    // Synonymgruppen: gestemmtes Wort -> Menge verwandter Wörter
    var gruppen = new Map();
    (wissen.synonymgruppen || []).forEach(function (g) {
      var stems = [];
      g.forEach(function (w) { tokens(w, true).forEach(function (t) { stems.push(t); }); });
      stems.forEach(function (s) {
        if (!gruppen.has(s)) gruppen.set(s, new Set());
        stems.forEach(function (o) { if (o !== s) gruppen.get(s).add(o); });
      });
    });

    var eintraege = wissen.artikel.map(function (a) {
      var felder = {
        titel: tokens(a.titel, true),
        synonyme: tokens((a.synonyme || []).join(" "), true),
        fragen: tokens((a.fragen || []).join(" ")),
        bereiche: tokens((a.bereiche || []).map(function (b) { return bereichsNamen[b] || b; }).join(" "), true),
        einleitung: tokens(a.einleitung || ""),
        kurz: tokens(a.kurz),
        tipps: tokens((a.tipps || []).join(" ")),
        sichtweisen: tokens((a.sichtweisen || []).map(function (s) { return s.text; }).join(" "))
      };
      // doppelte Wörter pro Feld entfernen
      Object.keys(felder).forEach(function (f) { felder[f] = Array.from(new Set(felder[f])); });
      // Jede Alltagsfrage einzeln, damit bei ganzen Sätzen eine passende Frage stark zählt
      var fragenSets = (a.fragen || []).map(function (f) { return new Set(tokens(f)); });
      return { artikel: a, felder: felder, fragenSets: fragenSets };
    });

    return { eintraege: eintraege, gruppen: gruppen };
  }

  function bewerteWort(q, eintrag, streng) {
    var best = 0, feld = null;
    for (var f in GEWICHT) {
      var liste = eintrag.felder[f];
      for (var i = 0; i < liste.length; i++) {
        var p = passt(q, liste[i], streng);
        if (p > 0) {
          var s = p * GEWICHT[f];
          if (s > best) { best = s; feld = f; }
          if (p === 1 && f === "titel") return { score: best, feld: feld };
        }
      }
    }
    return { score: best, feld: feld };
  }

  function suche(index, anfrage) {
    var qs = tokens(anfrage);
    if (!qs.length) qs = tokens(anfrage, true); // nur Füllwörter getippt? dann doch nehmen
    if (!qs.length) return [];

    // Verwandte Begriffe aus den Synonymgruppen einmal pro Suchwort bestimmen
    var verwandtVon = qs.map(function (q) {
      var v = index.gruppen.get(q);
      if (!v) index.gruppen.forEach(function (g, k) { if (!v && passt(q, k) >= 0.6) v = g; }); // auch per Tippfehler
      return v || null;
    });

    var treffer = [];
    index.eintraege.forEach(function (e) {
      var summe = 0, gefunden = 0;
      qs.forEach(function (q, qi) {
        var r = bewerteWort(q, e);
        // Synonyme der Suchgruppe mitprüfen (etwas schwächer)
        var verwandte = verwandtVon[qi];
        if (verwandte) {
          verwandte.forEach(function (v) {
            var rv = bewerteWort(v, e, true);
            if (rv.score * 0.4 > r.score) r = { score: rv.score * 0.4, feld: rv.feld };
          });
        }
        if (r.score > 0) { summe += r.score; gefunden++; }
      });
      // Ganze Sätze (ab 3 Wörtern): passt eine Alltagsfrage des Artikels fast vollständig, gibt es einen Bonus
      var bonus = 0;
      if (anfrage.trim().split(/\s+/).length >= 3) {
        e.fragenSets.forEach(function (set) {
          var n = qs.filter(function (q) { return set.has(q); }).length;
          var anteil = n / qs.length;
          // Ein einzelnes Treffer-Wort ist schwach (Bonus 4), mehrere Wörter in einer Frage stark (bis 10)
          var b = anteil >= 0.5 ? (n >= 2 ? 10 : 4) * anteil : 0;
          if (b > bonus) bonus = b;
        });
      }
      if (gefunden || bonus) {
        // Artikel bevorzugen, die viele Suchwörter abdecken
        var abdeckung = Math.max(gefunden, bonus ? 1 : 0) / qs.length;
        treffer.push({ artikel: e.artikel, score: (summe + bonus) * (0.5 + Math.min(1, abdeckung)) });
      }
    });

    treffer.sort(function (a, b) { return b.score - a.score; });
    if (!treffer.length) return [];
    // schwache Ausreißer abschneiden
    var grenze = Math.max(3, treffer[0].score * 0.22);
    return treffer.filter(function (t) { return t.score >= grenze; });
  }

  window.Suche = {
    baueIndex: baueIndex,
    suche: suche,
    falte: falte,
    _tokens: tokens,
    _passt: passt
  };
})();
