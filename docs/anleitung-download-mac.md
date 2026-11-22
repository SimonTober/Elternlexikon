# Anleitung: Podcast-Folgen auf dem Mac laden

Das Skript `tools/podcast_download.py` lädt alle Folgen der vier Podcasts über die offiziellen RSS-Feeds und kann sie mit `--transkribieren` direkt auf dem Mac in Text umwandeln (Whisper, offline, kostenlos).

## Umfang (Stand 22.11.2026)

| Podcast | Kürzel | Folgen | Laufzeit |
|---|---|---|---|
| artgerecht | `artgerecht` | 65 | ca. 8 h |
| Mutti ist die Beste | `mutti` | 67 | ca. 63 h |
| Das gewünschteste Wunschkind | `wunschkind` | 262 | ca. 179 h |
| Familie Verstehen (GFK) | `gfk` | 228 | ca. 134 h |
| **Gesamt** | | **622** | **ca. 385 h** |

Speicherplatz: grob 10–25 GB (Schätzung, je nach MP3-Qualität).

## Einmalig vorbereiten

1. Skript herunterladen: Auf GitHub `tools/podcast_download.py` öffnen, oben rechts auf „Download raw file“ klicken. Es landet in `Downloads`.
2. **Terminal** öffnen: `Cmd + Leertaste`, „Terminal“ eintippen, Enter.
3. Prüfen, ob Python da ist:
   ```
   python3 --version
   ```
   Fragt der Mac, ob er die „Befehlszeilen-Entwicklerwerkzeuge“ installieren soll: auf **Installieren** klicken, warten, dann den Befehl wiederholen.

## Laden

Erst ein kleiner Test (2 neueste Folgen von „Mutti ist die Beste“):
```
python3 ~/Downloads/podcast_download.py --podcast mutti --anzahl 2
```

Klappt das, alles laden:
```
python3 ~/Downloads/podcast_download.py
```

Die Dateien landen in `~/Erziehungsratgeber/podcasts/<kürzel>/`:
- `2024-11-19_001_Was-bedeutet-Gefuehle-begleiten.mp3` (Datum_Nummer_Titel)
- `folgen.csv` mit Nummer, Datum, Titel, Dauer, Beschreibung und Links (öffnet sich in Numbers oder Excel)

## Gut zu wissen

- **Abbrechen ist kein Problem** (`Ctrl + C`). Beim nächsten Start werden fertige Folgen übersprungen.
- Neue Folgen später nachladen: einfach das Skript erneut starten.
- Nur die Liste ohne MP3s: `--nur-liste`
- Anderer Zielordner: `--ziel ~/Desktop/Podcasts`
- SSL-Fehler: Im Programme-Ordner unter „Python 3.x“ einmal `Install Certificates.command` doppelklicken.

## Transkribieren direkt auf dem Mac

Einmalig eine eigene Python-Umgebung anlegen (Python 3.12, weil die Whisper-Pakete für ganz neue Python-Versionen oft noch fehlen):
```
brew install python@3.12
python3.12 -m venv ~/Erziehungsratgeber/venv
~/Erziehungsratgeber/venv/bin/pip install mlx-whisper av
```

Test mit 2 Folgen:
```
~/Erziehungsratgeber/venv/bin/python ~/Downloads/podcast_download.py --podcast mutti --anzahl 2 --transkribieren
```

Alles (Mac bleibt dank `caffeinate` wach, MP3s werden nach dem Transkribieren gelöscht):
```
caffeinate -i ~/Erziehungsratgeber/venv/bin/python ~/Downloads/podcast_download.py --transkribieren --mp3-loeschen
```

Transkripte landen in `~/Erziehungsratgeber/transkripte/<kürzel>/` mit Kopfblock (Podcast, Nr., Titel, Datum) und Zeitstempeln etwa alle 30 Sekunden.
Beim ersten Start lädt Whisper das Modell (ca. 1,5 GB).

## Eigene Transkripte (falls du doch deine App nutzt)

**Benenne jedes Transkript genau wie die MP3**, nur mit `.txt` statt `.mp3`, z. B.
`2024-11-19_001_Was-bedeutet-Gefuehle-begleiten.txt`.
Einen Kopfblock musst du dann nicht von Hand schreiben: Titel, Datum und Spotify-Link holt sich der nächste Arbeitsschritt automatisch aus `folgen.csv`.
Zeitstempel im Transkript (`[12:34]`) sind sehr wertvoll, wenn deine App sie kann.
