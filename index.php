<?php ?><!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SpoolCalc</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="icon" href="/favicon.ico" sizes="any">
</head>
<body>
  <div class="container">
    <div class="header">
      <!-- Links: Sprach- & Währungsregler -->
      <div class="controls-left">
        <div class="segmented" id="lang-switch" aria-label="Language">
          <button class="seg-btn flag" data-lang="de" type="button" title="Deutsch" aria-pressed="false">🇩🇪</button>
          <button class="seg-btn flag" data-lang="en" type="button" title="English" aria-pressed="false">🇬🇧</button>
        </div>
        <div class="segmented" id="curr-switch" aria-label="Currency">
          <button class="seg-btn curr" data-curr="EUR" type="button" title="Euro" aria-pressed="false">€</button>
          <button class="seg-btn curr" data-curr="USD" type="button" title="US Dollar" aria-pressed="false">$</button>
        </div>
      </div>

      <h1 id="app-title">SpoolCalc</h1>

      <div class="tabs">
        <button class="tab" id="tab-filamente" type="button">Filamente</button>
        <button class="tab active" id="tab-rechner" type="button">Filamentrechner</button>
      </div>
    </div>

    <!-- Filamente -->
    <section id="view-filamente" style="display:none;">
      <div class="toolbar">
        <div class="search">
          <input id="search" type="text" placeholder="Suche nach Marke, Typ oder Farbe…" />
        </div>
        <div class="flex">
          <button class="btn primary" id="btn-new" type="button">＋ Neu</button>
          <button class="btn" id="btn-bulk-delete" disabled type="button">Ausgewählte löschen (0)</button>
        </div>
      </div>

      <div class="card" style="margin-top:12px; overflow:auto;">
        <table id="table-filaments">
          <thead>
            <tr>
              <th style="width:36px;"><input type="checkbox" id="check-all" /></th>
              <th>Hersteller</th>
              <th>Typ</th>
              <th>Farbe</th>
              <th class="right">Preis / kg</th>
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
      <div class="card"><p class="muted">Wähle mehrere Filamente und gib das benötigte Gewicht in Gramm ein. Alle Preise beziehen sich auf 1 kg-Rollen.</p></div>
      <div id="calc-rows" class="grid" style="margin-top:12px;"></div>
      <div class="toolbar" style="margin-top:12px;">
        <button class="btn" id="btn-add-row" type="button">Weitere Position</button>
        <div class="right">
          <div class="muted">Gesamtkosten</div>
          <div id="total" style="font-weight:700; font-size:22px;">€ 0,00</div>
        </div>
      </div>
      <div class="card" style="margin-top:12px;">
        <h3>Aufschlüsselung</h3>
        <ul id="breakdown"></ul>
      </div>
    </section>
  </div>

  <!-- Datalist für Suche im Rechner -->
  <datalist id="filament-options"></datalist>

  <!-- Modal -->
  <div class="modal-backdrop" id="modal">
    <div class="modal clickable" id="modal-box">
      <div class="flex" style="justify-content:space-between;">
        <h3 id="modal-title" style="margin:0;">Neues Filament</h3>
        <button class="btn" id="modal-close" type="button">Schließen</button>
      </div>
      <div style="margin-top:12px;" class="grid grid-2">
        <label><span>Marke</span><input id="m-brand" type="text" placeholder="z. B. Bambu" required></label>
        <label><span>Typ</span><input id="m-type" type="text" placeholder="z. B. PLA, PETG" required></label>
        <label><span>Farbe</span><input id="m-color" type="text" placeholder="z. B. Schwarz" required></label>
        <label><span>Preis pro 1 kg</span><input id="m-price" type="number" step="0.01" min="0" placeholder="z. B. 24.90" required></label>
      </div>
      <div class="right" style="margin-top:12px;">
        <button class="btn" id="modal-reset" type="button">Zurücksetzen</button>
        <button class="btn primary" id="modal-save" type="button">Speichern</button>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
