#!/usr/bin/env python3
"""
Podcast-Downloader und Transkription für den Erziehungsratgeber.

1. Lädt alle Folgen der vier Podcasts über ihre öffentlichen RSS-Feeds.
2. Legt pro Podcast eine Folgenliste (folgen.csv) an.
3. Mit --transkribieren: wandelt jede Folge lokal auf dem Mac in Text um
   (Whisper, läuft komplett offline auf dem Gerät, kostenlos).

Für das Laden reicht die Python-Standardbibliothek.
Für --transkribieren einmalig:  pip install mlx-whisper av   (Mac mit M-Chip)
                         oder:  pip install faster-whisper av (Intel-Mac / andere)

Beispiele:
  python3 podcast_download.py --nur-liste
  python3 podcast_download.py --podcast mutti --anzahl 2 --transkribieren
  python3 podcast_download.py --transkribieren --mp3-loeschen
"""

import argparse
import csv
import email.utils
import html
import os
import platform
import re
import ssl
import sys
import time
import unicodedata
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

# Reihenfolge = Bearbeitungsreihenfolge (kleine Podcasts zuerst)
PODCASTS = {
    "mutti": {
        "name": "Mutti ist die Beste",
        "feed": "https://podcast91eca5.podigee.io/feed/mp3",
        "spotify": "https://open.spotify.com/show/6AK0h6L3NLiZXkEWCTWyZm",
    },
    "artgerecht": {
        "name": "artgerecht - der andere Elternpodcast",
        "feed": "https://anchor.fm/s/e6d7a140/podcast/rss",
        "spotify": "https://open.spotify.com/show/24WaEPRGUV2lnldgXrx5e8",
    },
    "gfk": {
        "name": "Familie Verstehen: Gewaltfreie Kommunikation für Eltern",
        "feed": "https://feeds.megaphone.fm/MMG7453093230",
        "spotify": "https://open.spotify.com/show/3axnit0JY0G2CKMTGrqML4",
    },
    "wunschkind": {
        "name": "Das gewünschteste Wunschkind",
        "feed": "https://cdn.audiorella.com/podcasts/1755-das-gewunschteste-wunschkind/feed.rss",
        "spotify": "https://open.spotify.com/show/5JGtseedumnUHh7Ack1g47",
    },
}

ITUNES_NS = "{http://www.itunes.com/dtds/podcast-1.0.dtd}"
USER_AGENT = "Mozilla/5.0 (Macintosh; Erziehungsratgeber-Downloader)"
CSV_FELDER = ["nr", "datum", "titel", "dauer", "datei", "beschreibung", "webseite", "mp3_url", "guid"]
BLOCK_SEKUNDEN = 30  # Transkript-Absatz etwa alle 30 Sekunden mit Zeitstempel


# ---------- Hilfsfunktionen ----------

def ssl_kontext():
    """Nutzt certifi, falls vorhanden (python.org-Installation auf dem Mac)."""
    try:
        import certifi  # type: ignore
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


SSL = ssl_kontext()


def oeffne(url, timeout=60):
    if not url.lower().startswith(("http://", "https://")):
        raise ValueError(f"Ungültige Adresse: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    return urllib.request.urlopen(req, timeout=timeout, context=SSL)


def slug(text, max_len=80):
    """Macht aus einem Titel einen sicheren Dateinamen-Teil."""
    ersatz = {"ä": "ae", "ö": "oe", "ü": "ue", "Ä": "Ae", "Ö": "Oe", "Ü": "Ue", "ß": "ss"}
    for k, v in ersatz.items():
        text = text.replace(k, v)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-")
    return (text[:max_len].rstrip("-")) or "ohne-titel"


def ohne_html(text):
    text = re.sub(r"<br\s*/?>|</p>", "\n", text or "", flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def datum_iso(pubdate):
    try:
        return email.utils.parsedate_to_datetime(pubdate).date().isoformat()
    except Exception:
        return "0000-00-00"


def dauer_text(roh):
    """itunes:duration kann '1234' oder '01:02:03' sein -> 'H:MM:SS'."""
    roh = (roh or "").strip()
    if not roh:
        return ""
    try:
        if ":" in roh:
            sek = 0
            for t in roh.split(":"):
                sek = sek * 60 + int(float(t))
        else:
            sek = int(float(roh))
    except ValueError:
        return roh
    return f"{sek // 3600}:{sek % 3600 // 60:02d}:{sek % 60:02d}"


def zeitstempel(sek, mit_stunden):
    sek = int(sek)
    if mit_stunden:
        return f"{sek // 3600}:{sek % 3600 // 60:02d}:{sek % 60:02d}"
    return f"{sek // 60:02d}:{sek % 60:02d}"


def dauer_kurz(sek):
    sek = int(sek)
    return f"{sek // 3600} h {sek % 3600 // 60:02d} min" if sek >= 3600 else f"{sek // 60} min {sek % 60:02d} s"


def text_von(el, tag):
    x = el.find(tag)
    return (x.text or "").strip() if x is not None and x.text else ""


# ---------- Feed lesen ----------

def lies_feed(url):
    with oeffne(url) as r:
        daten = r.read()
    root = ET.fromstring(daten)
    kanal = root.find("channel")
    if kanal is None:
        raise ValueError("Kein <channel> im Feed gefunden")

    folgen = []
    for item in kanal.findall("item"):
        enc = item.find("enclosure")
        mp3 = enc.get("url", "").strip() if enc is not None else ""
        if not mp3:
            continue
        beschr = text_von(item, ITUNES_NS + "summary") or text_von(item, "description")
        folgen.append({
            "titel": html.unescape(text_von(item, "title")),
            "datum": datum_iso(text_von(item, "pubDate")),
            "dauer": dauer_text(text_von(item, ITUNES_NS + "duration")),
            "beschreibung": ohne_html(beschr),
            "webseite": text_von(item, "link"),
            "mp3_url": mp3,
            "guid": text_von(item, "guid"),
        })

    # Älteste Folge = Nr. 1
    folgen.sort(key=lambda f: (f["datum"], f["titel"]))
    for i, f in enumerate(folgen, 1):
        f["nr"] = i
        f["datei"] = f"{f['datum']}_{i:03d}_{slug(f['titel'])}.mp3"
    return folgen


# ---------- Download ----------

def lade_datei(url, ziel, versuche=4):
    teil = ziel + ".part"
    for versuch in range(1, versuche + 1):
        try:
            with oeffne(url, timeout=120) as r, open(teil, "wb") as out:
                gesamt = int(r.headers.get("Content-Length") or 0)
                geladen = 0
                while True:
                    block = r.read(1024 * 256)
                    if not block:
                        break
                    out.write(block)
                    geladen += len(block)
                    if gesamt:
                        print(f"\r    Download {geladen * 100 // gesamt:3d} %  ({geladen // 1_000_000} MB)",
                              end="", flush=True)
            if gesamt and geladen < gesamt:
                raise IOError("Download unvollständig")
            os.replace(teil, ziel)
            print("\r    Download fertig" + " " * 30)
            return True
        except (urllib.error.URLError, IOError, TimeoutError) as e:
            print(f"\r    Download-Fehler (Versuch {versuch}/{versuche}): {e}")
            time.sleep(2 ** versuch)
    if os.path.exists(teil):
        os.remove(teil)
    return False


# ---------- Transkription ----------

def lade_audio(pfad):
    """MP3 -> 16 kHz Mono float32 (über PyAV, kein extra ffmpeg nötig)."""
    import av  # type: ignore
    import numpy as np  # type: ignore

    teile = []
    with av.open(pfad) as container:
        stream = container.streams.audio[0]
        resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
        for frame in container.decode(stream):
            for f in resampler.resample(frame):
                teile.append(f.to_ndarray().reshape(-1))
        for f in resampler.resample(None):
            teile.append(f.to_ndarray().reshape(-1))
    if not teile:
        raise ValueError("Keine Audiodaten gefunden")
    return np.concatenate(teile).astype(np.float32) / 32768.0


class Transkribierer:
    """Wählt automatisch: mlx-whisper (Mac M-Chip, schnell) oder faster-whisper (sonst)."""

    def __init__(self, modell=None):
        self.modell = modell
        self.art = None
        self._fw = None
        apple_silicon = platform.system() == "Darwin" and platform.machine() == "arm64"
        if apple_silicon:
            try:
                import mlx_whisper  # noqa: F401  # type: ignore
                self.art = "mlx"
                self.modell = modell or "mlx-community/whisper-large-v3-turbo"
            except ImportError:
                pass
        if self.art is None:
            try:
                from faster_whisper import WhisperModel  # type: ignore
                self.art = "faster"
                self.modell = modell or "large-v3-turbo"
                print(f"Lade Modell {self.modell} (beim ersten Mal ca. 1,5 GB Download) ...")
                self._fw = WhisperModel(self.modell, device="auto", compute_type="int8")
            except ImportError:
                hinweis = "mlx-whisper av" if apple_silicon else "faster-whisper av"
                sys.exit(f"\nFür --transkribieren fehlt ein Paket. Bitte einmal installieren:\n"
                         f"  python3 -m pip install {hinweis}\n")
        print(f"Transkription mit: {self.art}-whisper, Modell {self.modell}")

    def segmente(self, audio):
        if self.art == "mlx":
            import mlx_whisper  # type: ignore
            erg = mlx_whisper.transcribe(
                audio, path_or_hf_repo=self.modell, language="de",
                condition_on_previous_text=False, verbose=None)
            return [(s["start"], s["end"], s["text"]) for s in erg["segments"]]
        segs, _ = self._fw.transcribe(audio, language="de", vad_filter=True,
                                      condition_on_previous_text=False)
        return [(s.start, s.end, s.text) for s in segs]


def baue_transkript(info, folge, segmente, audio_sek):
    mit_stunden = audio_sek >= 3600
    zeilen = [
        "=== FOLGE ===",
        f"Podcast: {info['name']}",
        f"Nr: {folge['nr']}",
        f"Titel: {folge['titel']}",
        f"Datum: {folge['datum']}",
        f"Dauer: {folge['dauer'] or zeitstempel(audio_sek, True)}",
        f"Spotify-Show: {info['spotify']}",
        f"Webseite: {folge['webseite']}",
        "",
    ]
    block_start, block_text = None, []
    for start, _ende, text in segmente:
        text = text.strip()
        if not text:
            continue
        if block_start is None:
            block_start = start
        block_text.append(text)
        if start - block_start >= BLOCK_SEKUNDEN and text[-1:] in ".?!":
            zeilen.append(f"[{zeitstempel(block_start, mit_stunden)}] {' '.join(block_text)}")
            block_start, block_text = None, []
    if block_text:
        zeilen.append(f"[{zeitstempel(block_start, mit_stunden)}] {' '.join(block_text)}")
    return "\n".join(zeilen) + "\n"


def transkribiere(tr, mp3_pfad, txt_pfad, info, folge):
    t0 = time.time()
    audio = lade_audio(mp3_pfad)
    audio_sek = len(audio) / 16000
    segmente = tr.segmente(audio)
    text = baue_transkript(info, folge, segmente, audio_sek)
    tmp = txt_pfad + ".part"
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write(text)
    os.replace(tmp, txt_pfad)
    dauer = time.time() - t0
    print(f"    Transkript fertig: {dauer_kurz(audio_sek)} Audio in {dauer_kurz(dauer)} "
          f"({audio_sek / max(dauer, 1):.0f}x Echtzeit)")


# ---------- Ablauf pro Podcast ----------

def verarbeite(schluessel, info, basis, args, tr):
    print(f"\n=== {info['name']} ===")
    try:
        folgen = lies_feed(info["feed"])
    except Exception as e:
        print(f"  Feed konnte nicht gelesen werden: {e}")
        return 1

    mp3_ordner = os.path.join(basis, "podcasts", schluessel)
    txt_ordner = os.path.join(basis, "transkripte", schluessel)
    os.makedirs(mp3_ordner, exist_ok=True)

    csv_pfad = os.path.join(mp3_ordner, "folgen.csv")
    with open(csv_pfad, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=CSV_FELDER, delimiter=";")
        w.writeheader()
        for f in folgen:
            w.writerow({k: f.get(k, "") for k in CSV_FELDER})
    print(f"  {len(folgen)} Folgen gefunden -> {csv_pfad}")
    if args.transkribieren:
        os.makedirs(txt_ordner, exist_ok=True)
        with open(os.path.join(txt_ordner, "folgen.csv"), "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=CSV_FELDER, delimiter=";")
            w.writeheader()
            for f in folgen:
                w.writerow({k: f.get(k, "") for k in CSV_FELDER})

    if args.nur_liste:
        return 0

    # Neueste zuerst, damit aktuelle Themen früh verfügbar sind
    auswahl = list(reversed(folgen))
    if args.anzahl:
        auswahl = auswahl[:args.anzahl]

    fehler = 0
    for i, f in enumerate(auswahl, 1):
        mp3 = os.path.join(mp3_ordner, f["datei"])
        txt = os.path.join(txt_ordner, f["datei"][:-4] + ".txt")
        if args.transkribieren and os.path.exists(txt):
            continue
        if not args.transkribieren and os.path.exists(mp3):
            continue
        print(f"  [{i}/{len(auswahl)}] Nr. {f['nr']}: {f['titel']}")
        if not os.path.exists(mp3) and not lade_datei(f["mp3_url"], mp3):
            fehler += 1
            continue
        if args.transkribieren:
            try:
                transkribiere(tr, mp3, txt, info, f)
                if args.mp3_loeschen:
                    os.remove(mp3)
            except Exception as e:
                print(f"    Transkriptions-Fehler: {e}")
                fehler += 1
    print(f"  Fehler: {fehler}")
    return fehler


def main():
    p = argparse.ArgumentParser(description="Lädt und transkribiert die Podcast-Folgen für den Erziehungsratgeber.")
    p.add_argument("--podcast", choices=list(PODCASTS), help="nur diesen Podcast bearbeiten")
    p.add_argument("--ziel", default="~/Erziehungsratgeber", help="Basisordner (Standard: ~/Erziehungsratgeber)")
    p.add_argument("--nur-liste", action="store_true", help="nur Folgenlisten anlegen")
    p.add_argument("--anzahl", type=int, default=0, help="nur die N neuesten Folgen")
    p.add_argument("--transkribieren", action="store_true", help="Folgen in Text umwandeln (Whisper, lokal)")
    p.add_argument("--mp3-loeschen", action="store_true", help="MP3 nach erfolgreicher Transkription löschen")
    p.add_argument("--modell", help="anderes Whisper-Modell (nur für Experten)")
    a = p.parse_args()

    basis = os.path.abspath(os.path.expanduser(a.ziel))
    print(f"Arbeitsordner: {basis}")
    tr = Transkribierer(a.modell) if a.transkribieren and not a.nur_liste else None
    auswahl = {a.podcast: PODCASTS[a.podcast]} if a.podcast else PODCASTS

    start = time.time()
    fehler = sum(verarbeite(k, info, basis, a, tr) for k, info in auswahl.items())
    print(f"\nFertig nach {dauer_kurz(time.time() - start)}."
          + (f" {fehler} Fehler – einfach nochmal starten, Fertiges wird übersprungen." if fehler else ""))
    if a.transkribieren:
        print(f"Transkripte liegen in: {os.path.join(basis, 'transkripte')}")
    return 1 if fehler else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nAbgebrochen. Beim nächsten Start geht es da weiter, wo du aufgehört hast.")
        sys.exit(130)
    except ssl.SSLError as e:
        print(f"\nSSL-Fehler: {e}\nTipp (Mac): Im Ordner /Programme/Python 3.x einmal "
              "'Install Certificates.command' doppelklicken und erneut starten.")
        sys.exit(1)
