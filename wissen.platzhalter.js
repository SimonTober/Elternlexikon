/*
 * Wissensdatenbank des Erziehungsratgebers.
 *
 * ACHTUNG: Diese Datei enthält zurzeit nur PLATZHALTER-Artikel, damit die App
 * getestet werden kann. Die echten Inhalte werden später aus den Transkripten
 * erzeugt (siehe uebergabe.md, Abschnitt 4) und ersetzen diese Datei komplett.
 *
 * Format eines Artikels:
 * {
 *   id:          "wutanfaelle",                 // eindeutig, nur a-z, 0-9, -
 *   titel:       "Wutanfälle",
 *   synonyme:    ["Trotzanfall", ...],           // fließen stark in die Suche ein
 *   fragen:      ["Kind schreit und wirft sich auf den Boden"], // typische Alltagsfragen
 *   alter:       ["1-3", "3-6"],                 // Schlüssel aus WISSEN.alter
 *   bereiche:    ["gefuehle", "grenzen"],        // Schlüssel aus WISSEN.bereiche
 *   kurz:        "2–3 Sätze Kurzantwort.",
 *   tipps:       ["Konkreter Tipp", ...],
 *   sichtweisen: [{ podcast: "gfk", text: "..." }],  // pro Podcast, Widersprüche bleiben stehen
 *   quellen:     [{ podcast: "mutti", nr: 67, titel: "...", datum: "2026-11-18",
 *                   minute: "12:34", link: "https://..." }],
 *   verwandt:    ["einschlafen"]                 // IDs anderer Artikel
 * }
 */
window.WISSEN = {
  meta: {
    stand: "2026-11-22",
    platzhalter: true
  },

  podcasts: {
    mutti: {
      name: "Mutti ist die Beste",
      hosts: "Marlies & Martin Heckner",
      spotify: "https://open.spotify.com/show/6AK0h6L3NLiZXkEWCTWyZm"
    },
    artgerecht: {
      name: "artgerecht – der andere Elternpodcast",
      hosts: "Nicola Schmidt",
      spotify: "https://open.spotify.com/show/24WaEPRGUV2lnldgXrx5e8"
    },
    gfk: {
      name: "Familie Verstehen: GFK für Eltern",
      hosts: "Kathy Weber",
      spotify: "https://open.spotify.com/show/3axnit0JY0G2CKMTGrqML4"
    },
    wunschkind: {
      name: "Das gewünschteste Wunschkind",
      hosts: "Danielle Graf & Katja Seide",
      spotify: "https://open.spotify.com/show/5JGtseedumnUHh7Ack1g47"
    }
  },

  alter: {
    "0-1": "0–1 Jahre",
    "1-3": "1–3 Jahre",
    "3-6": "3–6 Jahre",
    "6-10": "6–10 Jahre"
  },

  bereiche: {
    schlaf: "Schlaf",
    essen: "Essen",
    gefuehle: "Gefühle",
    geschwister: "Geschwister",
    kita: "Kita & Schule",
    medien: "Medien",
    sauberkeit: "Sauberkeit",
    grenzen: "Grenzen",
    eltern: "Eltern-Selbstfürsorge"
  },

  // Begriffe, die in der Suche als gleichwertig gelten (zusätzlich zu den Synonymen der Artikel)
  synonymgruppen: [
    ["müde", "schlafen", "einschlafen", "durchschlafen", "nickerchen", "mittagsschlaf"],
    ["wut", "wütend", "wutanfall", "trotz", "trotzanfall", "ausraster", "autonomiephase"],
    ["handy", "tablet", "fernsehen", "bildschirm", "bildschirmzeit", "medien", "youtube"],
    ["kita", "krippe", "kindergarten", "tagesmutter", "eingewöhnung"],
    ["schule", "hausaufgaben", "grundschule", "lehrerin", "lehrer"],
    ["streit", "streiten", "zanken", "hauen", "schlagen", "beißen"],
    ["essen", "mäkelig", "wählerisch", "gemüse", "isst"],
    ["windel", "töpfchen", "klo", "toilette", "trocken"],
    ["erschöpft", "überfordert", "elternburnout", "burnout", "auszeit", "selbstfürsorge"]
  ],

  artikel: [
    {
      id: "wutanfaelle",
      titel: "Wutanfälle",
      synonyme: ["Trotzanfall", "Trotzphase", "Autonomiephase", "Ausraster"],
      fragen: ["Kind wirft sich schreiend auf den Boden", "Was tun bei Wut im Supermarkt?"],
      alter: ["1-3", "3-6"],
      bereiche: ["gefuehle", "grenzen"],
      kurz: "Platzhalter: Hier steht später eine Kurzantwort in zwei bis drei Sätzen, zusammengefasst aus den Podcast-Folgen.",
      tipps: [
        "Platzhalter-Tipp: wird aus den Transkripten befüllt.",
        "Platzhalter-Tipp: wird aus den Transkripten befüllt."
      ],
      sichtweisen: [
        { podcast: "mutti", text: "Platzhalter: Sichtweise dieses Podcasts." },
        { podcast: "wunschkind", text: "Platzhalter: Sichtweise dieses Podcasts." }
      ],
      quellen: [
        { podcast: "mutti", nr: 67, titel: "Beispielquelle", datum: "2026-11-18", minute: "00:00", link: "" }
      ],
      verwandt: ["geschwisterstreit", "erschoepfte-eltern"]
    },
    {
      id: "einschlafen",
      titel: "Einschlafen",
      synonyme: ["Einschlafbegleitung", "Schlafprobleme", "Zubettgehen", "Abendroutine"],
      fragen: ["Kind will nicht schlafen", "Kind ist müde, schläft aber nicht ein"],
      alter: ["0-1", "1-3", "3-6"],
      bereiche: ["schlaf"],
      kurz: "Platzhalter: Hier steht später eine Kurzantwort in zwei bis drei Sätzen, zusammengefasst aus den Podcast-Folgen.",
      tipps: ["Platzhalter-Tipp: wird aus den Transkripten befüllt."],
      sichtweisen: [{ podcast: "artgerecht", text: "Platzhalter: Sichtweise dieses Podcasts." }],
      quellen: [
        { podcast: "artgerecht", nr: 1, titel: "Beispielquelle", datum: "2025-01-01", minute: "00:00", link: "" }
      ],
      verwandt: ["durchschlafen"]
    },
    {
      id: "durchschlafen",
      titel: "Durchschlafen",
      synonyme: ["nächtliches Aufwachen", "Schlafen im Familienbett", "Nachtschlaf"],
      fragen: ["Baby wacht nachts ständig auf", "Ab wann schlafen Kinder durch?"],
      alter: ["0-1", "1-3"],
      bereiche: ["schlaf", "eltern"],
      kurz: "Platzhalter: Hier steht später eine Kurzantwort in zwei bis drei Sätzen, zusammengefasst aus den Podcast-Folgen.",
      tipps: ["Platzhalter-Tipp: wird aus den Transkripten befüllt."],
      sichtweisen: [{ podcast: "wunschkind", text: "Platzhalter: Sichtweise dieses Podcasts." }],
      quellen: [
        { podcast: "wunschkind", nr: 1, titel: "Beispielquelle", datum: "2025-01-01", minute: "00:00", link: "" }
      ],
      verwandt: ["einschlafen", "erschoepfte-eltern"]
    },
    {
      id: "kita-eingewoehnung",
      titel: "Kita-Eingewöhnung",
      synonyme: ["Eingewöhnung", "Krippenstart", "Trennungsschmerz", "Abschied an der Kita-Tür"],
      fragen: ["Kind weint beim Abgeben in der Kita", "Wie lange dauert die Eingewöhnung?"],
      alter: ["0-1", "1-3", "3-6"],
      bereiche: ["kita", "gefuehle"],
      kurz: "Platzhalter: Hier steht später eine Kurzantwort in zwei bis drei Sätzen, zusammengefasst aus den Podcast-Folgen.",
      tipps: ["Platzhalter-Tipp: wird aus den Transkripten befüllt."],
      sichtweisen: [{ podcast: "gfk", text: "Platzhalter: Sichtweise dieses Podcasts." }],
      quellen: [
        { podcast: "gfk", nr: 1, titel: "Beispielquelle", datum: "2025-01-01", minute: "00:00", link: "" }
      ],
      verwandt: ["wutanfaelle"]
    },
    {
      id: "geschwisterstreit",
      titel: "Geschwisterstreit",
      synonyme: ["Geschwisterrivalität", "Eifersucht auf das Baby", "Geschwister hauen sich"],
      fragen: ["Kinder streiten ständig", "Großes Kind ist eifersüchtig aufs Baby"],
      alter: ["1-3", "3-6", "6-10"],
      bereiche: ["geschwister", "grenzen"],
      kurz: "Platzhalter: Hier steht später eine Kurzantwort in zwei bis drei Sätzen, zusammengefasst aus den Podcast-Folgen.",
      tipps: ["Platzhalter-Tipp: wird aus den Transkripten befüllt."],
      sichtweisen: [
        { podcast: "mutti", text: "Platzhalter: Sichtweise dieses Podcasts." },
        { podcast: "gfk", text: "Platzhalter: Sichtweise dieses Podcasts." }
      ],
      quellen: [
        { podcast: "mutti", nr: 2, titel: "Beispielquelle", datum: "2024-11-28", minute: "00:00", link: "" }
      ],
      verwandt: ["wutanfaelle"]
    },
    {
      id: "bildschirmzeit",
      titel: "Bildschirmzeit",
      synonyme: ["Medienzeit", "Handy", "Tablet", "Fernsehen", "YouTube"],
      fragen: ["Wie viel Fernsehen ist okay?", "Kind will nur noch aufs Tablet"],
      alter: ["3-6", "6-10"],
      bereiche: ["medien", "grenzen"],
      kurz: "Platzhalter: Hier steht später eine Kurzantwort in zwei bis drei Sätzen, zusammengefasst aus den Podcast-Folgen.",
      tipps: ["Platzhalter-Tipp: wird aus den Transkripten befüllt."],
      sichtweisen: [{ podcast: "artgerecht", text: "Platzhalter: Sichtweise dieses Podcasts." }],
      quellen: [
        { podcast: "artgerecht", nr: 2, titel: "Beispielquelle", datum: "2025-01-01", minute: "00:00", link: "" }
      ],
      verwandt: []
    },
    {
      id: "trocken-werden",
      titel: "Trocken werden",
      synonyme: ["Sauberkeitserziehung", "Töpfchen", "Windelfrei", "Klo gehen"],
      fragen: ["Wann kommt die Windel weg?", "Kind macht wieder in die Hose"],
      alter: ["1-3", "3-6"],
      bereiche: ["sauberkeit"],
      kurz: "Platzhalter: Hier steht später eine Kurzantwort in zwei bis drei Sätzen, zusammengefasst aus den Podcast-Folgen.",
      tipps: ["Platzhalter-Tipp: wird aus den Transkripten befüllt."],
      sichtweisen: [{ podcast: "wunschkind", text: "Platzhalter: Sichtweise dieses Podcasts." }],
      quellen: [
        { podcast: "wunschkind", nr: 2, titel: "Beispielquelle", datum: "2025-01-01", minute: "00:00", link: "" }
      ],
      verwandt: []
    },
    {
      id: "waehlerisches-essen",
      titel: "Wählerisches Essen",
      synonyme: ["Mäkeliges Essen", "Kind isst kein Gemüse", "Essensverweigerung"],
      fragen: ["Kind isst nur Nudeln", "Muss mein Kind probieren?"],
      alter: ["1-3", "3-6", "6-10"],
      bereiche: ["essen"],
      kurz: "Platzhalter: Hier steht später eine Kurzantwort in zwei bis drei Sätzen, zusammengefasst aus den Podcast-Folgen.",
      tipps: ["Platzhalter-Tipp: wird aus den Transkripten befüllt."],
      sichtweisen: [{ podcast: "mutti", text: "Platzhalter: Sichtweise dieses Podcasts." }],
      quellen: [
        { podcast: "mutti", nr: 1, titel: "Beispielquelle", datum: "2024-11-19", minute: "00:00", link: "" }
      ],
      verwandt: []
    },
    {
      id: "erschoepfte-eltern",
      titel: "Erschöpfte Eltern",
      synonyme: ["Selbstfürsorge", "Elternburnout", "Überforderung", "Mental Load"],
      fragen: ["Ich bin nur noch erschöpft", "Ich schreie mein Kind an und bereue es"],
      alter: ["0-1", "1-3", "3-6", "6-10"],
      bereiche: ["eltern"],
      kurz: "Platzhalter: Hier steht später eine Kurzantwort in zwei bis drei Sätzen, zusammengefasst aus den Podcast-Folgen.",
      tipps: ["Platzhalter-Tipp: wird aus den Transkripten befüllt."],
      sichtweisen: [
        { podcast: "gfk", text: "Platzhalter: Sichtweise dieses Podcasts." },
        { podcast: "artgerecht", text: "Platzhalter: Sichtweise dieses Podcasts." }
      ],
      quellen: [
        { podcast: "gfk", nr: 2, titel: "Beispielquelle", datum: "2025-01-01", minute: "00:00", link: "" }
      ],
      verwandt: ["wutanfaelle", "durchschlafen"]
    }
  ]
};
