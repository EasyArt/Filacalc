// app.js — Filacalc Frontend-Logik
document.addEventListener('DOMContentLoaded', () => {

  let fmt = new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' });
  const $  = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  const state = {
    items: [],
    selected: new Set(),
    editing: null,
    sortKey: 'brand',
    sortDir: 1,

    // Settings in localStorage
    lang: localStorage.getItem('lang') || 'de',
    currency: localStorage.getItem('currency') || 'EUR',
    usdPerEur: parseFloat(localStorage.getItem('usdPerEur') || '1.10'),
    theme: localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  };

  const dict = {
    de: {
      no_results:"Keine Treffer. Füge ein Filament hinzu.",
      edit:"Bearbeiten", del:"✕",
      alert_fill:'Bitte alle Felder korrekt ausfüllen. Tipp: Verwende "." als Dezimaltrennzeichen (z. B. 24.90).',
      saving:"Speichere…", save:"Speichern",
      total:"Gesamtkosten", pricekg:"Preis/kg", cost:"Kosten", grams:"Gramm",
      calc_hint:"Wähle mehrere Filamente und gib das benötigte Gewicht in Gramm ein. Alle Preise beziehen sich auf 1 kg-Rollen.",
      modal_new:"Neues Filament", modal_edit:"Filament bearbeiten",
      brand:"Marke", type:"Typ", color:"Farbe", price:"Preis pro 1 kg",
      subtitle:"Filament-Verwaltung & Kostenrechner",
      stat_count:"Filamente", stat_avg:"Ø Preis/kg", stat_cheapest:"Günstigstes",
      total_weight:"gesamt", bulk_delete:"Ausgewählte löschen",
      confirm_bulk:"Filament(e) löschen?", confirm_single:"löschen?",
      saved_new:"Filament gespeichert", saved_edit:"Änderungen gespeichert", deleted:"Filament gelöscht",
      save_failed:"Speichern fehlgeschlagen", load_failed:"Fehler beim Laden",
      empty_calc_label:"unbekannt",
      footer_credit:"Filacalc · von Raphael Jäger",
      no_suggestions:"Keine Filamente gefunden"
    },
    en: {
      no_results:"No results. Add a filament.",
      edit:"Edit", del:"✕",
      alert_fill:'Please fill all fields correctly. Tip: use "." as decimal separator (e.g., 24.90).',
      saving:"Saving…", save:"Save",
      total:"Total", pricekg:"Price/kg", cost:"Cost", grams:"Grams",
      calc_hint:"Select multiple filaments and enter required grams. Prices refer to 1 kg spools.",
      modal_new:"New filament", modal_edit:"Edit filament",
      brand:"Brand", type:"Type", color:"Color", price:"Price per 1 kg",
      subtitle:"Filament manager & cost calculator",
      stat_count:"Filaments", stat_avg:"Avg. price/kg", stat_cheapest:"Cheapest",
      total_weight:"total", bulk_delete:"Delete selected",
      confirm_bulk:"filament(s)?", confirm_single:"?",
      saved_new:"Filament saved", saved_edit:"Changes saved", deleted:"Filament deleted",
      save_failed:"Save failed", load_failed:"Failed to load",
      empty_calc_label:"unknown",
      footer_credit:"Filacalc · by Raphael Jäger",
      no_suggestions:"No filaments found"
    }
  };
  const t = (k)=> (dict[state.lang]||dict.de)[k]||k;

  // -------- Theme --------
  function applyTheme(){
    document.documentElement.setAttribute('data-theme', state.theme);
  }
  applyTheme();

  // -------- Toasts --------
  function toast(message, kind='success'){
    const stack = $('#toast-stack');
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `<span class="dot"></span><span>${escapeHtml(message)}</span>`;
    stack.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(6px)'; el.style.transition='all .2s ease'; }, 2600);
    setTimeout(()=> el.remove(), 2900);
  }

  function updateFormatter(){
    const locale = state.lang === 'de' ? 'de-DE' : 'en-US';
    fmt = new Intl.NumberFormat(locale, { style:'currency', currency: state.currency });
  }
  function convertPriceEURtoActive(priceEur){
    return state.currency === 'USD' ? Number(priceEur)*state.usdPerEur : Number(priceEur);
  }

  async function api(path='', opts={}){
    const o = Object.assign({ headers:{'Content-Type':'application/json'} }, opts);
    if (o.method === 'PUT' || o.method === 'DELETE') {
      const bodyObj = typeof o.body==='string' && o.body ? JSON.parse(o.body) : (o.body || {});
      bodyObj._method = o.method;
      o.method = 'POST';
      o.body = JSON.stringify(bodyObj);
    }
    let res, text;
    try {
      res = await fetch(`api.php?api=${path}`, o);
      text = await res.text();
    } catch (e) {
      throw new Error(`Network error: ${e?.message || e}`);
    }
    if (!res.ok && res.status !== 204) {
      let msg = text;
      try { const j = JSON.parse(text); if (j && j.error) msg = j.error; } catch(_){}
      throw new Error(`${res.status} ${res.statusText} — ${msg || 'No response body'}`);
    }
    return res.status===204 ? null : (text ? JSON.parse(text) : null);
  }

  // -------- Color swatch guessing --------
  const colorMap = {
    schwarz:'#1a1a1a', black:'#1a1a1a', weiß:'#f2f2f2', weiss:'#f2f2f2', white:'#f2f2f2',
    rot:'#e0455b', red:'#e0455b', blau:'#3b6fe0', blue:'#3b6fe0', grün:'#2fb571', gruen:'#2fb571', green:'#2fb571',
    gelb:'#f3c531', yellow:'#f3c531', orange:'#f2883c', lila:'#9257e0', purple:'#9257e0', violett:'#9257e0',
    grau:'#8b8f9b', gray:'#8b8f9b', grey:'#8b8f9b', silber:'#c3c6cf', silver:'#c3c6cf', gold:'#d4af37',
    braun:'#8a5a3b', brown:'#8a5a3b', pink:'#ea6fb0', rosa:'#ea6fb0', klar:'#cfe8f5', transparent:'#cfe8f5',
    natur:'#e8dcc4', natural:'#e8dcc4', kupfer:'#c07a4e', copper:'#c07a4e', bronze:'#8c6b3f'
  };
  function swatchColor(colorName){
    const key = (colorName||'').toLowerCase().trim();
    for (const k in colorMap){ if (key.includes(k)) return colorMap[k]; }
    // deterministic fallback hue from string hash
    let h = 0; for (let i=0;i<key.length;i++) h = (h*31 + key.charCodeAt(i)) % 360;
    return `hsl(${h} 55% 55%)`;
  }

  async function loadAll(){
    const data = await api('filaments');
    state.items = data.items;
    state.selected.clear();
    sortItems();
    renderTable(); updateBulkButton(); calcRecompute(); renderStats();
    // UI Texte einsetzen
    $('#app-subtitle').textContent = t('subtitle');
    $('.hint-card p').textContent = t('calc_hint');
    $('#total').previousElementSibling.textContent = t('total');
    $('#footer-text').textContent = t('footer_credit');
  }

  function sortItems(){
    const key = state.sortKey, dir = state.sortDir;
    state.items.sort((a,b)=>{
      let av = a[key], bv = b[key];
      if (key === 'price'){ av = Number(av)||0; bv = Number(bv)||0; return (av-bv)*dir; }
      av = (av||'').toString().toLowerCase(); bv = (bv||'').toString().toLowerCase();
      return av.localeCompare(bv) * dir;
    });
  }

  function renderStats(){
    const row = $('#stats-row'); if (!row) return;
    const n = state.items.length;
    const prices = state.items.map(f=>convertPriceEURtoActive(f.price||0));
    const avg = n ? prices.reduce((a,b)=>a+b,0)/n : 0;
    let cheapest = '—';
    if (n){
      const c = state.items.reduce((min,f)=> (f.price < min.price ? f : min), state.items[0]);
      cheapest = `${c.brand} ${c.type}`;
    }
    row.innerHTML = `
      <div class="stat-card"><div class="stat-label">${t('stat_count')}</div><div class="stat-value">${n}</div></div>
      <div class="stat-card"><div class="stat-label">${t('stat_avg')}</div><div class="stat-value">${n?fmt.format(avg):'—'}</div></div>
      <div class="stat-card"><div class="stat-label">${t('stat_cheapest')}</div><div class="stat-value" style="font-size:15px;">${escapeHtml(cheapest)}</div></div>
    `;
  }

  function renderTable(){
    const q = ($('#search')?.value||'').trim().toLowerCase();
    const tb = $('#tbody-filaments'); if (!tb) return;
    tb.innerHTML = '';
    const list = state.items.filter(f => [f.brand,f.type,f.color].some(v=> (v||'').toLowerCase().includes(q)));
    if (list.length===0){
      tb.innerHTML = `<tr><td colspan="6"><div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8 15c1.2 1 2.6 1.5 4 1.5s2.8-.5 4-1.5"/></svg>
        <div>${t('no_results')}</div>
      </div></td></tr>`;
      return;
    }
    for (const f of list){
      const tr = document.createElement('tr');
      const checked = state.selected.has(f.id);
      const priceDisp = fmt.format(convertPriceEURtoActive(f.price||0));
      tr.innerHTML = `
        <td><input type="checkbox" data-id="${f.id}" ${checked?'checked':''}></td>
        <td>${escapeHtml(f.brand)}</td>
        <td><span class="type-badge">${escapeHtml(f.type)}</span></td>
        <td><span class="color-chip"><span class="swatch" style="background:${swatchColor(f.color)}"></span>${escapeHtml(f.color)}</span></td>
        <td class="right price-tag">${priceDisp}</td>
        <td class="right actions">
          <button class="btn icon-only" data-edit="${f.id}" type="button" title="${t('edit')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>
          </button>
          <button class="btn icon-only danger" data-del="${f.id}" type="button" title="${t('del')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
          </button>
        </td>`;
      tb.appendChild(tr);
    }
    // sort indicator
    $$('th.sortable').forEach(th=>{
      th.classList.toggle('sorted', th.dataset.sort === state.sortKey);
      const arrow = th.querySelector('.sort-arrow');
      if (th.dataset.sort === state.sortKey) arrow.textContent = state.sortDir===1 ? '↑' : '↓';
      else arrow.textContent = '↕';
    });
  }

  function updateBulkButton(){
    const btn = $('#btn-bulk-delete'); if (!btn) return;
    btn.disabled = state.selected.size===0;
    btn.textContent = `${t('bulk_delete')} (${state.selected.size})`;
    const allBoxes = $('#tbody-filaments')?.querySelectorAll('input[type="checkbox"]') || [];
    const allChecked = state.selected.size>0 && state.selected.size === allBoxes.length;
    const master = $('#check-all'); if (master) master.checked = allChecked;
  }

  // -------- Modal --------
  function openModal(editId=null){
    state.editing = editId;
    $('#modal-title').textContent = editId ? t('modal_edit') : t('modal_new');
    if (editId){
      const f = state.items.find(x=>x.id===editId);
      $('#m-brand').value = f.brand; $('#m-type').value = f.type; $('#m-color').value = f.color; $('#m-price').value = f.price;
    } else { $('#m-brand').value=''; $('#m-type').value=''; $('#m-color').value=''; $('#m-price').value=''; }
    $('#modal').classList.add('open');
    setTimeout(()=> $('#m-brand').focus(), 50);
  }
  function closeModal(){ $('#modal').classList.remove('open'); state.editing = null; }

  async function saveModal(){
    try {
      const priceVal = Number(String($('#m-price').value).replace(',', '.'));
      const payload = { brand: $('#m-brand').value.trim(), type: $('#m-type').value.trim(), color: $('#m-color').value.trim(), price: priceVal };
      if (state.editing) payload.id = state.editing;
      if (!payload.brand || !payload.type || !payload.color || !(payload.price > 0)) { toast(t('alert_fill'), 'error'); return; }

      const wasEdit = !!state.editing;
      const method = state.editing ? 'PUT' : 'POST';
      const path   = state.editing ? `filaments/${encodeURIComponent(state.editing)}` : 'filaments';
      const btn = $('#modal-save'); btn.disabled = true; btn.textContent = t('saving');

      await api(path, { method, body: JSON.stringify(payload) });
      closeModal(); await loadAll();
      toast(wasEdit ? t('saved_edit') : t('saved_new'), 'success');
    } catch (e) {
      console.error('Save error:', e);
      toast(`${t('save_failed')}: ${e?.message || e}`, 'error');
    } finally {
      const btn = $('#modal-save'); btn.disabled = false; btn.textContent = t('save');
    }
  }

  // -------- Rechner: eigenes Autocomplete --------
  function filamentLabel(f){
    return `${f.brand} • ${f.type} • ${f.color}`;
  }
  function addCalcRow(){
    const wrap = document.createElement('div');
    wrap.className = 'calc-row';
    wrap.innerHTML = `
      <div class="autocomplete">
        <label><span>Filament</span>
          <input type="text" placeholder="Marke • Typ • Farbe (Preis/kg)" class="select" autocomplete="off" />
        </label>
        <div class="autocomplete-list"></div>
      </div>
      <label><span>${t('grams')}</span>
        <input type="number" min="0" step="1" placeholder="20" />
      </label>
      <div class="metric">
        <span class="muted" style="font-size:12px;">${t('pricekg')}</span>
        <div class="val pricekg">€ 0,00</div>
      </div>
      <button class="btn icon-only" data-remove type="button" title="${t('del')}" style="align-self:end;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div class="meta" style="grid-column:1/-1;">
        <span class="muted">${t('cost')}</span>
        <span class="linecost">€ 0,00</span>
      </div>`;
    $('#calc-rows').appendChild(wrap);
    calcRecompute();
  }

  function closeAllSuggestions(except=null){
    $$('.autocomplete-list.open').forEach(list=>{
      if (list !== except) list.classList.remove('open');
    });
  }

  function renderSuggestions(inputEl){
    const listEl = inputEl.closest('.autocomplete').querySelector('.autocomplete-list');
    if (!listEl) return;
    const q = inputEl.value.trim().toLowerCase();
    const matches = state.items.filter(f => !q || [f.brand,f.type,f.color].some(v=>(v||'').toLowerCase().includes(q)));

    if (matches.length === 0){
      listEl.innerHTML = `<div class="autocomplete-empty">${t('no_suggestions')}</div>`;
    } else {
      listEl.innerHTML = matches.map(f=>{
        const priceDisp = fmt.format(convertPriceEURtoActive(f.price||0));
        return `<div class="autocomplete-item" data-id="${f.id}">
            <span class="swatch" style="background:${swatchColor(f.color)}"></span>
            <span class="ac-label">${escapeHtml(f.brand)} • ${escapeHtml(f.type)} • ${escapeHtml(f.color)}</span>
            <span class="ac-price">${priceDisp}/kg</span>
          </div>`;
      }).join('');
    }
    closeAllSuggestions(listEl);
    listEl.classList.add('open');
  }

  function selectSuggestion(inputEl, id){
    const f = state.items.find(x=>x.id===id);
    if (!f) return;
    inputEl.value = filamentLabel(f);
    inputEl.dataset.selectedId = id;
    const listEl = inputEl.closest('.autocomplete').querySelector('.autocomplete-list');
    if (listEl){ listEl.classList.remove('open'); listEl.innerHTML=''; }
    calcRecompute();
  }

  function getIdFromCalcInput(inputEl){
    if (inputEl.dataset.selectedId){
      const f = state.items.find(x=>x.id===inputEl.dataset.selectedId);
      if (f && filamentLabel(f) === inputEl.value) return inputEl.dataset.selectedId;
    }
    const lower = inputEl.value.trim().toLowerCase();
    if (!lower) return '';
    const found = state.items.find(f=>filamentLabel(f).toLowerCase() === lower);
    return found ? found.id : '';
  }
  function gramsToCost(pricePerKgEUR, grams){
    const priceActive = convertPriceEURtoActive(pricePerKgEUR);
    return (Number(priceActive||0)/1000) * (Number(grams||0));
  }
  function calcRecompute(){
    let sum = 0, totalGrams = 0; const ul = $('#breakdown'); ul.innerHTML = '';
    for (const row of $$('#calc-rows .calc-row')){
      const inp = row.querySelector('.autocomplete input');
      const grams = Number(row.querySelector('input[type="number"]').value || 0);
      const id = getIdFromCalcInput(inp);
      const f = state.items.find(x=>x.id===id);
      const priceEur = f? Number(f.price) : 0;
      row.querySelector('.pricekg').textContent = fmt.format(convertPriceEURtoActive(priceEur));
      const cost = gramsToCost(priceEur, grams); sum += cost; totalGrams += grams;
      row.querySelector('.linecost').textContent = fmt.format(cost);
      const label = f ? `${grams}g ${f.color} ${f.brand} ${f.type}` : `${grams}g (${t('empty_calc_label')})`;
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(label)}</span><span class="amount">${fmt.format(cost)}</span>`;
      ul.appendChild(li);
    }
    $('#total').textContent = fmt.format(sum);
    const weightLabel = totalGrams >= 1000 ? `${(totalGrams/1000).toFixed(2)} kg` : `${totalGrams} g`;
    $('#total-weight').textContent = `${weightLabel} ${t('total_weight')}`;
  }

  function escapeHtml(s){ return (s??'').toString().replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }

  // -------- Event Delegation --------
  document.addEventListener('input', (e)=>{
    if (e.target && e.target.id === 'search') renderTable();
    if (e.target && e.target.matches('#calc-rows .autocomplete input')) {
      delete e.target.dataset.selectedId;
      renderSuggestions(e.target);
      calcRecompute();
    }
    if (e.target && e.target.matches('#calc-rows input[type="number"]')) calcRecompute();
    if (e.target && e.target.id === 'check-all') {
      const boxes = $$('#tbody-filaments input[type="checkbox"]');
      state.selected.clear();
      if (e.target.checked){ for (const b of boxes){ b.checked=true; state.selected.add(b.dataset.id); } }
      updateBulkButton();
    }
    if (e.target && e.target.matches('#tbody-filaments input[type="checkbox"]')) {
      const id = e.target.dataset.id; if (e.target.checked) state.selected.add(id); else state.selected.delete(id); updateBulkButton();
    }
  });

  // Vorschläge sofort beim Klicken/Fokussieren anzeigen
  document.addEventListener('focusin', (e)=>{
    if (e.target && e.target.matches('#calc-rows .autocomplete input')) {
      renderSuggestions(e.target);
    }
  });

  // Vorschlagsliste schließen, wenn woanders hingeklickt wird
  document.addEventListener('mousedown', (e)=>{
    if (!e.target.closest('.autocomplete')) closeAllSuggestions();
  });

  // Tastatur: Escape schließt, Enter wählt bei eindeutigem Treffer
  document.addEventListener('keydown', (e)=>{
    if (!(e.target && e.target.matches('#calc-rows .autocomplete input'))) return;
    if (e.key === 'Escape'){ closeAllSuggestions(); e.target.blur(); }
    if (e.key === 'Enter'){
      const listEl = e.target.closest('.autocomplete').querySelector('.autocomplete-list');
      const items = listEl ? $$('.autocomplete-item', listEl) : [];
      if (items.length === 1){ e.preventDefault(); selectSuggestion(e.target, items[0].dataset.id); }
    }
  });

  document.addEventListener('click', async (e)=>{
    // Vorschlag auswählen
    const sugg = e.target.closest('.autocomplete-item');
    if (sugg) {
      const inputEl = sugg.closest('.autocomplete').querySelector('input');
      selectSuggestion(inputEl, sugg.dataset.id);
    }

    // Tabs
    if (e.target && e.target.id === 'tab-filamente'){
      e.target.classList.add('active'); $('#tab-rechner').classList.remove('active');
      $('#view-filamente').style.display=''; $('#view-rechner').style.display='none';
    }
    if (e.target && e.target.id === 'tab-rechner'){
      e.target.classList.add('active'); $('#tab-filamente').classList.remove('active');
      $('#view-rechner').style.display=''; $('#view-filamente').style.display='none';
    }

    // Theme
    if (e.target && e.target.closest('#theme-toggle')){
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', state.theme);
      applyTheme();
    }

    // Sorting
    const sortTh = e.target && e.target.closest('th.sortable');
    if (sortTh){
      const key = sortTh.dataset.sort;
      if (state.sortKey === key) state.sortDir *= -1; else { state.sortKey = key; state.sortDir = 1; }
      sortItems(); renderTable();
    }

    // CRUD
    if (e.target && e.target.closest('#btn-new')) openModal();
    if (e.target && e.target.closest('#btn-bulk-delete')){
      if (state.selected.size===0) return;
      if (!confirm(`${state.selected.size} ${t('confirm_bulk')}`)) return;
      for (const id of Array.from(state.selected)) { await api(`filaments/${encodeURIComponent(id)}`, { method:'DELETE' }); }
      await loadAll();
      toast(t('deleted'), 'success');
    }
    if (e.target && e.target.closest('button[data-edit]')) {
      openModal(e.target.closest('button[data-edit]').getAttribute('data-edit'));
    }
    if (e.target && e.target.closest('button[data-del]')) {
      const id = e.target.closest('button[data-del]').getAttribute('data-del');
      const f = state.items.find(x=>x.id===id);
      if (f && confirm(`${f.brand} ${f.type} ${f.color} ${t('confirm_single')}`)) {
        await api(`filaments/${encodeURIComponent(id)}`, { method:'DELETE' });
        await loadAll();
        toast(t('deleted'), 'success');
      }
    }

    // Modal
    if (e.target && e.target.closest('#modal-close')) closeModal();
    if (e.target && e.target.id === 'modal') closeModal();
    if (e.target && e.target.closest('#modal-reset')) { $('#m-brand').value=''; $('#m-type').value=''; $('#m-color').value=''; $('#m-price').value=''; }
    if (e.target && e.target.closest('#modal-save')) saveModal();

    // Rechner
    if (e.target && e.target.closest('#btn-add-row')) addCalcRow();
    if (e.target && e.target.closest('[data-remove]')) { e.target.closest('.calc-row').remove(); calcRecompute(); }

    // Language / Currency (Segmented)
    if (e.target && e.target.classList.contains('flag')) {
      state.lang = e.target.dataset.lang || 'de';
      localStorage.setItem('lang', state.lang);
      updateFormatter(); renderTable(); calcRecompute(); renderStats();
      $('#app-subtitle').textContent = t('subtitle');
      $('.hint-card p').textContent = t('calc_hint');
      $('#total').previousElementSibling.textContent = t('total');
      $('#footer-text').textContent = t('footer_credit');
      updateBulkButton();
      $$('#lang-switch .flag').forEach(b=> b.setAttribute('aria-pressed', b.dataset.lang===state.lang ? 'true':'false'));
    }
    if (e.target && e.target.classList.contains('curr')) {
      state.currency = e.target.dataset.curr || 'EUR';
      localStorage.setItem('currency', state.currency);
      updateFormatter(); renderTable(); calcRecompute(); renderStats();
      $$('#curr-switch .curr').forEach(b=> b.setAttribute('aria-pressed', b.dataset.curr===state.currency ? 'true':'false'));
    }
  });

  // -------- Bootstrap --------
  (async function boot(){
    updateFormatter();
    $$('#lang-switch .flag').forEach(b=> b.setAttribute('aria-pressed', b.dataset.lang===state.lang ? 'true':'false'));
    $$('#curr-switch .curr').forEach(b=> b.setAttribute('aria-pressed', b.dataset.curr===state.currency ? 'true':'false'));
    try {
      await loadAll();
      if (state.items.length===0){
        const seed = [
          { brand:'Amazon Basics', type:'PLA',        color:'Schwarz',       price:19.99 },
          { brand:'Bambu',         type:'PLA Basic',  color:'Weiß',          price:22.90 },
          { brand:'Prusament',     type:'PLA',        color:'Galaxy Black',  price:29.90 },
          { brand:'eSun',          type:'PETG',       color:'Klar',          price:21.50 }
        ];
        for (const s of seed){ try { await api('filaments', { method:'POST', body: JSON.stringify(s) }); } catch(e){ console.warn('Seed failed', e); } }
        await loadAll();
      }
      addCalcRow();
    } catch (e) {
      console.error('Boot failed:', e);
      toast(`${t('load_failed')}: ${e?.message || e}`, 'error');
    }
  })();

});
