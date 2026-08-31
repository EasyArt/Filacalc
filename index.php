<?php ?><!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#4f46e5" />
  <title>Filacalc</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="alternate icon" href="favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="icon-180.png">
  <link rel="manifest" href="manifest.webmanifest">
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        <div class="brand-mark">
          <img src="favicon.svg" alt="Filacalc Logo" width="38" height="38">
        </div>
        <div>
          <h1 id="app-title">Filacalc</h1>
          <p class="brand-sub" id="app-subtitle">Filament-Verwaltung &amp; Kostenrechner</p>
        </div>
      </div>

      <div class="header-controls">
        <div class="segmented" id="lang-switch" aria-label="Language">
          <button class="seg-btn flag" data-lang="de" type="button" title="Deutsch" aria-pressed="false">🇩🇪</button>
          <button class="seg-btn flag" data-lang="en" type="button" title="English" aria-pressed="false">🇬🇧</button>
        </div>
        <div class="segmented" id="curr-switch" aria-label="Currency">
          <button class="seg-btn curr" data-curr="EUR" type="button" title="Euro" aria-pressed="false">€</button>
          <button class="seg-btn curr" data-curr="USD" type="button" title="US Dollar" aria-pressed="false">$</button>
        </div>
        <button class="icon-btn" id="theme-toggle" type="button" title="Farbmodus umschalten" aria-label="Farbmodus umschalten">
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
        </button>
        <div class="tabs">
          <button class="tab" id="tab-filamente" type="button">Filamente</button>
          <button class="tab active" id="tab-rechner" type="button">Filamentrechner</button>
        </div>
      </div>
    </div>

    <!-- Filamente -->
    <section id="view-filamente" style="display:none;">
      <div class="stats" id="stats-row"></div>

      <div class="toolbar">
        <div class="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input id="search" type="text" placeholder="Suche nach Marke, Typ oder Farbe…" />
        </div>
        <div class="flex">
          <button class="btn primary" id="btn-new" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Neu
          </button>
          <button class="btn danger" id="btn-bulk-delete" disabled type="button">Ausgewählte löschen (0)</button>
        </div>
      </div>

      <div class="card table-wrap" style="padding:0;">
        <table id="table-filaments">
          <thead>
            <tr>
              <th style="width:36px;"><input type="checkbox" id="check-all" /></th>
              <th class="sortable" data-sort="brand">Hersteller <span class="sort-arrow">↕</span></th>
              <th class="sortable" data-sort="type">Typ <span class="sort-arrow">↕</span></th>
              <th>Farbe</th>
              <th class="right sortable" data-sort="price">Preis / kg <span class="sort-arrow">↕</span></th>
              <th class="right">Aktion</th>
            </tr>
          </thead>
          <tbody id="tbody-filaments">
            <tr><td colspan="6" class="muted">Lade…</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Rechner -->
    <section id="view-rechner">
      <div class="card hint-card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <p class="muted" style="margin:0;">Wähle mehrere Filamente und gib das benötigte Gewicht in Gramm ein. Alle Preise beziehen sich auf 1 kg-Rollen.</p>
      </div>
      <div id="calc-rows" class="grid" style="margin-top:12px;"></div>
      <div class="toolbar" style="margin-top:12px; margin-bottom:0;">
        <button class="btn" id="btn-add-row" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Weitere Position
        </button>
      </div>
      <div class="card summary-bar" style="margin-top:12px;">
        <div id="total-weight">0 g gesamt</div>
        <div class="summary-total">
          <div class="muted">Gesamtkosten</div>
          <div id="total">€ 0,00</div>
        </div>
      </div>
      <div class="card" style="margin-top:12px;">
        <h3>Aufschlüsselung</h3>
        <ul id="breakdown"></ul>
      </div>
    </section>

    <div class="footer">
      <a class="footer-credit" href="https://github.com/easyart" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.67 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.06 11.06 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.8 1.19 1.83 1.19 3.08 0 4.4-2.7 5.38-5.26 5.66.42.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z"/></svg>
        <span id="footer-text">Filacalc · von Raphael Jäger</span>
      </a>
    </div>
  </div>

  <!-- Modal -->
  <div class="modal-backdrop" id="modal">
    <div class="modal clickable" id="modal-box">
      <div class="modal-head">
        <h3 id="modal-title">Neues Filament</h3>
        <button class="icon-btn" id="modal-close" type="button" aria-label="Schließen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="grid grid-2">
        <label><span>Marke</span><input id="m-brand" type="text" placeholder="z. B. Bambu" required></label>
        <label><span>Typ</span><input id="m-type" type="text" placeholder="z. B. PLA, PETG" required></label>
        <label><span>Farbe</span><input id="m-color" type="text" placeholder="z. B. Schwarz" required></label>
        <label><span>Preis pro 1 kg</span><input id="m-price" type="number" step="0.01" min="0" placeholder="z. B. 24.90" required></label>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="modal-reset" type="button">Zurücksetzen</button>
        <button class="btn primary" id="modal-save" type="button">Speichern</button>
      </div>
    </div>
  </div>

  <div id="toast-stack"></div>

  <script src="app.js"></script>
</body>
</html>
