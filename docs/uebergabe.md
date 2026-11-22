# Übergabe: Erziehungsratgeber-App

Stand: 22.11.2026. Dieses Dokument fasst alles zusammen, damit du lokal auf dem Mac in einem Ordner weitermachen kannst, zum Beispiel mit Claude Code oder Claude Desktop.

## 1. Die Idee

- Ein **Erziehungsratgeber als Lexikon** für Kinder von 0 bis 10 Jahren.
- Die App selbst nutzt **keine KI und generiert nichts**. Die Inhalte entstehen einmalig beim Bauen aus Podcast-Transkripten.
- Eine **HTML/JavaScript-App**, die top aussieht, offline läuft und eine starke Suche hat. Du kannst nach Schlagworten oder Alltagsfragen suchen, zum Beispiel „Kind ist müde, was tun?“ oder „Kita-Eingewöhnung“.
- Bei jedem Thema gibt es einen **Link zur passenden Podcast-Folge** und, wenn möglich, die Minute, in der das Thema vorkommt.

## 2. Die Quellen

Alle vier Podcasts haben einen öffentlichen RSS-Feed. Darüber kannst du die Folgen legal herunterladen, du musst also nichts von Spotify rippen.

| Kürzel | Podcast | Hosts | Folgen | Laufzeit | RSS-Feed |
|---|---|---|---|---|---|
| `mutti` | Mutti ist die Beste | Marlies & Martin Heckner | 67 | ca. 63 h | https://podcast91eca5.podigee.io/feed/mp3 |
| `artgerecht` | artgerecht – der andere Elternpodcast | Nicola Schmidt | 65 | ca. 8 h | https://anchor.fm/s/e6d7a140/podcast/rss |
| `gfk` | Familie Verstehen: GFK für Eltern | Kathy Weber | 228 | ca. 134 h | https://feeds.megaphone.fm/MMG7453093230 |
| `wunschkind` | Das gewünschteste Wunschkind | Danielle Graf & Katja Seide | 262 | ca. 179 h | https://cdn.audiorella.com/podcasts/1755-das-gewunschteste-wunschkind/feed.rss |

Zusammen sind das **622 Folgen und rund 385 Stunden Audio**.

Die Spotify-Seiten der Shows:
- mutti: https://open.spotify.com/show/6AK0h6L3NLiZXkEWCTWyZm
- artgerecht: https://open.spotify.com/show/24WaEPRGUV2lnldgXrx5e8
- gfk: https://open.spotify.com/show/3axnit0JY0G2CKMTGrqML4
- wunschkind: https://open.spotify.com/show/5JGtseedumnUHh7Ack1g47

## 3. Schritt 1: Laden und transkribieren (lokal, offline)

Das Skript `podcast_download.py` erledigt alles in einem Durchgang:
- Es lädt die Folgen über die RSS-Feeds.
- Es legt pro Podcast eine Liste `folgen.csv` an, mit Nummer, Datum, Titel, Dauer, Beschreibung und Links.
- Mit dem Zusatz `--transkribieren` wandelt es jede Folge **lokal auf dem Mac** in Text um. Dafür nutzt es Whisper, eine Spracherkennung, die offline läuft und nichts kostet.

**Einrichtung (einmalig).** Lege das Skript in den Ordner `~/Erziehungsratgeber/` und gib im Terminal ein:
```
brew install python@3.12
python3.12 -m venv ~/Erziehungsratgeber/venv
~/Erziehungsratgeber/venv/bin/pip install mlx-whisper av
```
Wir nehmen Python 3.12, weil es die Whisper-Pakete für das brandneue Python 3.15 vermutlich noch nicht gibt. `mlx-whisper` ist für Macs mit M-Chip gedacht. Auf einem Intel-Mac installierst du stattdessen `faster-whisper av`.

**Testlauf mit 2 Folgen:**
```
cd ~/Erziehungsratgeber
venv/bin/python podcast_download.py --podcast mutti --anzahl 2 --transkribieren
```

**Alles laden und transkribieren** (am besten über Nacht; `caffeinate` hält den Mac wach):
```
cd ~/Erziehungsratgeber
caffeinate -i venv/bin/python podcast_download.py --transkribieren --mp3-loeschen
```
- Du kannst jederzeit mit `Ctrl + C` abbrechen. Beim nächsten Start macht das Skript dort weiter, wo es aufgehört hat.
- `--mp3-loeschen` löscht jede MP3, sobald ihr Transkript fertig ist. Das spart viel Speicherplatz.
- Ohne dieses Löschen brauchst du grob 10 bis 25 GB (Schätzung).
- Die Reihenfolge ist mutti, artgerecht, gfk, wunschkind, und innerhalb jedes Podcasts kommen die neuesten Folgen zuerst.

**Ergebnis:**
```
~/Erziehungsratgeber/
  podcast_download.py
  podcasts/<kürzel>/folgen.csv  (+ MP3s, falls nicht gelöscht)
  transkripte/<kürzel>/folgen.csv
  transkripte/<kürzel>/2024-11-19_001_Was-bedeutet-Gefuehle-begleiten.txt
```

**So sieht ein Transkript aus:**
```
=== FOLGE ===
Podcast: Mutti ist die Beste
Nr: 1
Titel: Was bedeutet Gefühle begleiten?
Datum: 2024-11-19
Dauer: 0:51:57
Spotify-Show: https://open.spotify.com/show/6AK0h6L3NLiZXkEWCTWyZm
Webseite: ...

[00:00] Hallo und herzlich willkommen ...
[00:31] ...
```

## 4. Schritt 2: Wissensdatenbank aufbauen

Aus den Transkripten entstehen **Lexikon-Artikel**. Das passiert einmalig mit Claude, lokal im Ordner. Jeder Artikel enthält:
- **Thema und Synonyme**, zum Beispiel: Wutanfall = Trotzanfall = Autonomiephase
- **Altersgruppe**: 0–1, 1–3, 3–6 oder 6–10 Jahre
- **Bereich**: Schlaf, Essen, Gefühle, Geschwister, Kita/Schule, Medien, Sauberkeit, Grenzen, Eltern-Selbstfürsorge …
- **Kurzantwort** in 2–3 Sätzen
- **Konkrete Tipps** zum Umsetzen
- **Sichtweise pro Podcast**: Bei Widersprüchen stehen die Ansichten nebeneinander, nichts wird glattgebügelt
- **Quellen**: Podcast, Folge, Datum, Minute und Link

Regeln für das Aufbereiten:
- Es kommt **nur** hinein, was in den Transkripten steht. Kein Wissen von außen, nichts Erfundenes.
- Alles steht in **eigenen Worten**, dazu höchstens kurze Zitate. Die Transkripte sind urheberrechtlich geschützt und werden nie mitveröffentlicht.
- Whisper verhört sich manchmal. Offensichtliche Hörfehler werden beim Zusammenfassen korrigiert.

## 5. Schritt 3: Die App

- **Technik:** HTML, CSS und JavaScript, ohne Server. Eine Datei `wissen.json` oder `wissen.js` enthält alle Artikel.
- **Suche:** Sie verzeiht Tippfehler (unscharfe Suche), kennt Synonyme und versteht ganze Fragen wie „Kind will nicht schlafen“.
- **Filter:** nach Alter, Bereich und Podcast.
- **Extras:**
  - läuft offline und lässt sich als App aufs Handy legen (PWA)
  - Favoriten, „Zuletzt angesehen“ und Dunkelmodus
  - kein Tracking
- **Spotify-Links pro Folge:** Ein kleines Skript ordnet die Links über Titel und Datum automatisch zu. Dafür nutzt es die Spotify-API (kostenloser Entwicklerzugang) oder alternativ Apple Podcasts. Wenn das nicht klappt, verlinkt die App die Show und nennt Folge und Minute.
- **Hinweis in der App:** Sie ersetzt keine ärztliche oder therapeutische Beratung. Bei Fieber, Entwicklungsfragen oder in Krisen verweist sie an Kinderarzt oder Beratungsstellen.

## 6. Rechtliches (wichtig)

- Veröffentliche die Transkripte und MP3s nicht. Sie bleiben in deinem lokalen Ordner.
- In einer veröffentlichten App stehen nur eigene Zusammenfassungen mit Quellenangabe.
- Wenn du die App öffentlich oder kommerziell nutzen willst, lass das vorher kurz rechtlich prüfen.

## 7. Nächste Schritte

1. Skript in `~/Erziehungsratgeber/` legen und den Testlauf mit 2 Folgen machen.
2. Das „x Echtzeit“ in der Ausgabe ansehen. Daraus kannst du abschätzen, wie lange alles dauert.
3. Den kompletten Lauf über Nacht starten. Am besten fängst du mit `mutti` an.
4. Danach Claude lokal im Ordner `~/Erziehungsratgeber/` starten und diese Datei als Auftrag geben:
   > „Lies uebergabe.md. Die Transkripte liegen in transkripte/. Bau daraus die Wissensdatenbank und die App, wie in Abschnitt 4 und 5 beschrieben. Du hast freie Hand beim Design.“
