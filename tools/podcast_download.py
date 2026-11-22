#!/usr/bin/env python3
"""
Podcast-Downloader für den Erziehungsratgeber.

Lädt alle Folgen der vier Podcasts über ihre öffentlichen RSS-Feeds,
benennt sie sauber (Datum_Titel.mp3) und legt pro Podcast eine
Folgenliste (folgen.csv) mit Titel, Datum, Dauer und Beschreibung an.

Nur Python-Standardbibliothek, keine Installation nötig.

Beispiele:
  python3 podcast_download.py                      # alles laden
  python3 podcast_download.py --nur-liste          # nur Folgenlisten, keine MP3s
  python3 podcast_download.py --podcast mutti      # nur ein Podcast
  python3 podcast_download.py --podcast mutti --anzahl 3   # nur die 3 neuesten Folgen
  python3 podcast_download.py --ziel ~/Desktop/Podcasts
"""

import argparse
import csv
import email.utils
import html
import os
import re
import ssl
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

PODCASTS = {
    "artgerecht": {
        "name": "artgerecht - der andere Elternpodcast",
        "feed": "https://anchor.fm/s/e6d7a140/podcast/rss",
        "spotify": "https://open.spotify.com/show/24WaEPRGUV2lnldgXrx5e8",
    },
    "mutti": {
        "name": "Mutti ist die Beste",
        "feed": "https://podcast91eca5.podigee.io/feed/mp3",
        "spotify": "https://open.spotify.com/show/6AK0h6L3NLiZXkEWCTWyZm",
    },
    "wunschkind": {
        "name": "Das gewünschteste Wunschkind",
        "feed": "https://cdn.audiorella.com/podcasts/1755-das-gewunschteste-wunschkind/feed.rss",
        "spotify": "https://open.spotify.com/show/5JGtseedumnUHh7Ack1g47",
    },
    "gfk": {
        "name": "Familie Verstehen: Gewaltfreie Kommunikation für Eltern",
        "feed": "https://feeds.megaphone.fm/MMG7453093230",
        "spotify": "https://open.spotify.com/show/3axnit0JY0G2CKMTGrqML4",
    },
}

ITUNES_NS = "{http://www.itunes.com/dtds/podcast-1.0.dtd}"
USER_AGENT = "Mozilla/5.0 (Macintosh; Erziehungsratgeber-Downloader)"
CSV_FELDER = ["nr", "datum", "titel", "dauer", "datei", "beschreibung", "webseite", "mp3_url", "guid"]


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
            teile = [int(float(t)) for t in roh.split(":")]
            sek = 0
            for t in teile:
                sek = sek * 60 + t
        else:
            sek = int(float(roh))
    except ValueError:
        return roh
    return f"{sek // 3600}:{sek % 3600 // 60:02d}:{sek % 60:02d}"


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
                        print(f"\r    {geladen * 100 // gesamt:3d} %  ({geladen // 1_000_000} MB)", end="", flush=True)
            if gesamt and geladen < gesamt:
                raise IOError("Download unvollständig")
            os.replace(teil, ziel)
            print("\r    fertig" + " " * 30)
            return True
        except (urllib.error.URLError, IOError, TimeoutError) as e:
            print(f"\r    Fehler (Versuch {versuch}/{versuche}): {e}")
            time.sleep(2 ** versuch)
    if os.path.exists(teil):
        os.remove(teil)
    return False


def verarbeite(schluessel, info, ziel_basis, nur_liste, anzahl):
    print(f"\n=== {info['name']} ===")
    try:
        folgen = lies_feed(info["feed"])
    except Exception as e:
        print(f"  Feed konnte nicht gelesen werden: {e}")
        return 0, 1

    ordner = os.path.join(ziel_basis, schluessel)
    os.makedirs(ordner, exist_ok=True)

    for f in folgen:
        f["datei"] = f"{f['datum']}_{f['nr']:03d}_{slug(f['titel'])}.mp3"

    # Folgenliste immer komplett schreiben
    csv_pfad = os.path.join(ordner, "folgen.csv")
    with open(csv_pfad, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=CSV_FELDER, delimiter=";")
        w.writeheader()
        for f in folgen:
            w.writerow({k: f.get(k, "") for k in CSV_FELDER})
    print(f"  {len(folgen)} Folgen gefunden -> {csv_pfad}")

    if nur_liste:
        return 0, 0

    auswahl = folgen[-anzahl:] if anzahl else folgen
    ok = fehler = 0
    for f in auswahl:
        pfad = os.path.join(ordner, f["datei"])
        if os.path.exists(pfad):
            continue
        print(f"  [{f['nr']}/{len(folgen)}] {f['titel']}")
        if lade_datei(f["mp3_url"], pfad):
            ok += 1
        else:
            fehler += 1
    print(f"  Neu geladen: {ok}, Fehler: {fehler}")
    return ok, fehler


def main():
    p = argparse.ArgumentParser(description="Lädt die Podcast-Folgen für den Erziehungsratgeber.")
    p.add_argument("--podcast", choices=list(PODCASTS), help="nur diesen Podcast laden")
    p.add_argument("--ziel", default="~/Erziehungsratgeber/podcasts", help="Zielordner")
    p.add_argument("--nur-liste", action="store_true", help="nur Folgenlisten anlegen, keine MP3s")
    p.add_argument("--anzahl", type=int, default=0, help="nur die N neuesten Folgen laden")
    a = p.parse_args()

    ziel = os.path.abspath(os.path.expanduser(a.ziel))
    print(f"Zielordner: {ziel}")
    auswahl = {a.podcast: PODCASTS[a.podcast]} if a.podcast else PODCASTS

    fehler_gesamt = 0
    for k, info in auswahl.items():
        _, fehler = verarbeite(k, info, ziel, a.nur_liste, a.anzahl)
        fehler_gesamt += fehler

    print("\nFertig." + (f" {fehler_gesamt} Fehler – einfach nochmal starten, fertige Folgen werden übersprungen."
                         if fehler_gesamt else ""))
    return 1 if fehler_gesamt else 0


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
