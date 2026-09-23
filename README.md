# Liguria & Toscana – reseguide

En statisk reseguide (HTML/CSS/JS, inget byggsteg) för GitHub Pages.

| Fil | Innehåll |
| --- | --- |
| `index.html` | Startsida med resmål och översiktskarta |
| `liguria.html` | Guide: Civezza & Ponente Liguria |
| `toscana.html` | Guide: Loro Ciuffenna & Valdarno |
| `pisa-civezza.html` | Resväg: Pisa → Civezza med bil |
| `vingardar-liguria.html` | Vingårdar i västra Ligurien |
| `vingardar-toscana.html` | Vingårdar i Valdarno |
| `florens.html` | Dagsutflykt: Florens |
| `assets/style.css` | Gemensam stil (ljust/mörkt tema) |
| `assets/guide.js` | Bilder, karta, navigering |
| `content/*.md` | Källtexterna i Markdown |

## Publicera

1. **Settings → Pages** i repot.
2. *Source*: **Deploy from a branch**, välj grenen `main` och mappen `/ (root)`, spara.
3. Efter någon minut ligger sajten på `https://<användarnamn>.github.io/italy-liguria-tuscany/`.

GitHub Pages i gratisversionen kräver att repot är publikt.

## Så fungerar det

- **Platser & karta:** varje element med `class="place"` och `data-lat`/`data-lng` blir en markör på kartan.
  `data-cat` styr färg/kategori (`bas`, `by`, `berg`, `mat`, `vin`, `natur`, `marknad`).
- **Bilder:** `<figure class="media" data-wiki="Artikelnamn">` hämtar huvudbilden från den engelska
  Wikipedia-artikeln (`data-wiki-lang="it"` för italienska). Vill du ha en specifik bild, ange i stället
  `data-img="Filnamn.jpg"` från Wikimedia Commons. Om ingen bild hittas visas en färgad bakgrund.
- **Google Maps-länkar:** `data-q="sökfråga"` på en länk.

## Integritet

- Alla sidor har `noindex, nofollow, noarchive` så att seriösa sökmotorer inte listar dem.
- `robots.txt` fungerar bara i domänens rot (t.ex. med egen domän eller en `<användarnamn>.github.io`-sajt),
  men skadar inte här.
- Sidan är inte hemlig: alla med länken kan läsa den, och ett publikt repo syns på GitHub.

## Uppdatera CSS/JS

Öka versionsnumret (`?v=5` → `?v=6`) i alla HTML-filer när `assets/style.css` eller
`assets/guide.js` ändras, så att besökarnas webbläsare hämtar den nya versionen direkt.
