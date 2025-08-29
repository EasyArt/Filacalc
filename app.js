// app.js — robuste Events + deutliche Fehleranzeige + persistente Sprache/Währung (localStorage)
document.addEventListener('DOMContentLoaded', () => {

  let fmt = new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' });
  const $  = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  const state = {
    items: [],
    selected: new Set(),
    editing: null,

    // Settings in localStorage
    lang: localStorage.getItem('lang') || 'de',
    currency: localStorage.getItem('currency') || 'EUR',
    usdPerEur: parseFloat(localStorage.getItem('usdPerEur') || '1.10')
  };

  const dict = {
    de: {
      no_results:"Keine Treffer. Füge ein Filament hinzu.",
      edit:"Bearbeiten", del:"✕",
      alert_fill:'Bitte alle Felder korrekt ausfüllen. Tipp: Verwende "." als Dezimaltrennzeichen (z. B. 24.90).',
      saving:"Speichere…",
      total:"Gesamtkosten", pricekg:"Preis/kg", cost:"Kosten", grams:"Gramm",
      calc_hint:"Wähle mehrere Filamente und gib das benötigte Gewicht in Gramm ein. Alle Preise beziehen sich auf 1 kg-Rollen.",
      modal_new:"Neues Filament", modal_edit:"Filament bearbeiten",
      brand:"Marke", type:"Typ", color:"Farbe", price:"Preis pro 1 kg"
    },
    en: {
      no_results:"No results. Add a filament.",
      edit:"Edit", del:"✕",
      alert_fill:'Please fill all fields correctly. Tip: use "." as decimal separator (e.g., 24.90).',
      saving:"Saving…",
      total:"Total", pricekg:"Price/kg", cost:"Cost", grams:"Grams",
      calc_hint:"Select multiple filaments and enter required grams. Prices refer to 1 kg spools.",
      modal_new:"New filament", modal_edit:"Edit filament",
      brand:"Brand", type:"Type", color:"Color", price:"Price per 1 kg"
    }
  };
  const t = (k)=> (dict[state.lang]||dict.de)[k]||k;

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

  async function loadAll(){
    const data = await api('filaments');
    state.items = data.items;
    state.selected.clear();
    renderTable(); updateBulkButton(); refreshDatalist(); calcRecompute();
    // UI Texte einsetzen
    $('#view-rechner .card .muted').textContent = t('calc_hint');
    $('#total').previousElementSibling.textContent = t('total');
  }

  function renderTable(){
    const q = ($('#search')?.value||'').trim().toLowerCase();
    const tb = $('#tbody-filaments'); if (!tb) return;
    tb.innerHTML = '';
    const list = state.items.filter(f => [f.brand,f.type,f.color].some(v=> (v||'').toLowerCase().includes(q)));
    if (list.length===0){ tb.innerHTML = `<tr><td colspan="6" class="muted">${t('no_results')}</td></tr>`; return; }
    for (const f of list){
      const tr = document.createElement('tr');
      const checked = state.selected.has(f.id);
      const priceDisp = fmt.format(convertPriceEURtoActive(f.price||0));
      tr.innerHTML = `
        <td class="right"><input type="checkbox" data-id="${f.id}" ${checked?'checked':''}></td>
        <td>${escapeHtml(f.brand)}</td>
        <td>${escapeHtml(f.type)}</td>
        <td>${escapeHtml(f.color)}</td>
        <td class="right">${priceDisp}</td>
        <td class="right actions">
          <button class="btn" data-edit="${f.id}" type="button">${t('edit')}</button>
          <button class="btn" data-del="${f.id}"  type="button">${t('del')}</button>
        </td>`;
      tb.appendChild(tr);
    }
  }

  function updateBulkButton(){
    const btn = $('#btn-bulk-delete'); if (!btn) return;
    btn.disabled = state.selected.size===0;
    btn.textContent = `Ausgewählte löschen (${state.selected.size})`;
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
  }
  function closeModal(){ $('#modal').classList.remove('open'); state.editing = null; }

  async function saveModal(){
    try {
      const priceVal = Number(String($('#m-price').value).replace(',', '.'));
      const payload = { brand: $('#m-brand').value.trim(), type: $('#m-type').value.trim(), color: $('#m-color').value.trim(), price: priceVal };
      if (state.editing) payload.id = state.editing;
      if (!payload.brand || !payload.type || !payload.color || !(payload.price > 0)) { alert(t('alert_fill')); return; }

      const method = state.editing ? 'PUT' : 'POST';
      const path   = state.editing ? `filaments/${encodeURIComponent(state.editing)}` : 'filaments';
      const btn = $('#modal-save'); btn.disabled = true; btn.textContent = t('saving');

      const res = await api(path, { method, body: JSON.stringify(payload) });
      console.debug('save ok:', res);
      closeModal(); await loadAll();
    } catch (e) {
      console.error('Save error:', e);
      alert('Speichern fehlgeschlagen: ' + (e?.message || e || 'Unbekannter Fehler'));
    } finally {
      const btn = $('#modal-save'); btn.disabled = false; btn.textContent = 'Speichern';
    }
  }

  // -------- Datalist / Rechner --------
  function refreshDatalist(){
    const dl = $('#filament-options');
    dl.innerHTML = state.items.map(f=>{
      const priceDisp = fmt.format(convertPriceEURtoActive(f.price||0));
      const label = `${escapeHtml(f.brand)} • ${escapeHtml(f.type)} • ${escapeHtml(f.color)} (${priceDisp}/kg)`;
      return `<option value="${label}" data-id="${f.id}"></option>`;
    }).join('');
  }
  function addCalcRow(){
    const wrap = document.createElement('div');
    wrap.className = 'row';
    wrap.innerHTML = `
      <div class="grid grid-12" style="align-items:end;">
        <div style="grid-column: span 7;">
          <label><span>Filament</span>
            <input type="text" list="filament-options" placeholder="Marke • Typ • Farbe (Preis/kg)" class="select" />
          </label>
        </div>
        <div style="grid-column: span 3;">
          <label><span>${t('grams')}</span>
            <input type="number" min="0" step="1" placeholder="20" />
          </label>
        </div>
        <div style="grid-column: span 1;">
          <div class="muted">${t('pricekg')}</div>
          <div class="pricekg">€ 0,00</div>
        </div>
        <div style="grid-column: span 1; text-align:right;">
          <button class="btn" data-remove type="button">✕</button>
        </div>
      </div>
      <div style="margin-top:8px;">
        <div class="muted">${t('cost')}</div>
        <div class="linecost" style="font-weight:600;">€ 0,00</div>
      </div>`;
    $('#calc-rows').appendChild(wrap);
    calcRecompute();
  }
  function getIdFromDatalistInput(inputEl){
    const listId = inputEl.getAttribute('list'); if (!listId) return '';
    const list = document.getElementById(listId); if (!list) return '';
    const val = inputEl.value;
    const opt = Array.from(list.options).find(o => o.value === val);
    if (opt && opt.getAttribute('data-id')) return opt.getAttribute('data-id');
    const lower = val.toLowerCase();
    const found = state.items.find(f=>`${f.brand} • ${f.type} • ${f.color}`.toLowerCase().includes(lower));
    return found ? found.id : '';
  }
  function gramsToCost(pricePerKgEUR, grams){
    const priceActive = convertPriceEURtoActive(pricePerKgEUR);
    return (Number(priceActive||0)/1000) * (Number(grams||0));
  }
  function calcRecompute(){
    let sum = 0; const ul = $('#breakdown'); ul.innerHTML = '';
    for (const row of $$('#calc-rows .row')){
      const inp = row.querySelector('input[list="filament-options"]');
      const grams = Number(row.querySelector('input[type="number"]').value || 0);
      const id = getIdFromDatalistInput(inp);
      const f = state.items.find(x=>x.id===id);
      const priceEur = f? Number(f.price) : 0;
      row.querySelector('.pricekg').textContent = fmt.format(convertPriceEURtoActive(priceEur));
      const cost = gramsToCost(priceEur, grams); sum += cost;
      row.querySelector('.linecost').textContent = fmt.format(cost);
      const label = f ? `${grams}g ${f.color} ${f.brand} ${f.type}` : `${grams}g (unbekannt)`;
      const li = document.createElement('li'); li.textContent = `${label} — ${fmt.format(cost)}`; ul.appendChild(li);
    }
    $('#total').textContent = fmt.format(sum);
  }

  function escapeHtml(s){ return (s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }

  // -------- Event Delegation (stabil) --------
  document.addEventListener('input', (e)=>{
    if (e.target && e.target.id === 'search') renderTable();
    if (e.target && e.target.matches('#calc-rows input[list], #calc-rows input[type="number"]')) calcRecompute();
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

  document.addEventListener('click', async (e)=>{
    // Tabs
    if (e.target && e.target.id === 'tab-filamente'){
      e.target.classList.add('active'); $('#tab-rechner').classList.remove('active');
      $('#view-filamente').style.display=''; $('#view-rechner').style.display='none';
    }
    if (e.target && e.target.id === 'tab-rechner'){
      e.target.classList.add('active'); $('#tab-filamente').classList.remove('active');
      $('#view-rechner').style.display=''; $('#view-filamente').style.display='none';
    }

    // CRUD
    if (e.target && e.target.id === 'btn-new') openModal();
    if (e.target && e.target.id === 'btn-bulk-delete'){
      if (state.selected.size===0) return;
      if (!confirm(`${state.selected.size} Filament(e) löschen?`)) return;
      for (const id of Array.from(state.selected)) { await api(`filaments/${encodeURIComponent(id)}`, { method:'DELETE' }); }
      await loadAll();
    }
    if (e.target && e.target.closest('button[data-edit]')) {
      openModal(e.target.closest('button[data-edit]').getAttribute('data-edit'));
    }
    if (e.target && e.target.closest('button[data-del]')) {
      const id = e.target.closest('button[data-del]').getAttribute('data-del');
      const f = state.items.find(x=>x.id===id);
      if (f && confirm(`${f.brand} ${f.type} ${f.color} löschen?`)) {
        await api(`filaments/${encodeURIComponent(id)}`, { method:'DELETE' });
        await loadAll();
      }
    }

    // Modal
    if (e.target && e.target.id === 'modal-close') closeModal();
    if (e.target && e.target.id === 'modal') closeModal();
    if (e.target && e.target.id === 'modal-reset') { $('#m-brand').value=''; $('#m-type').value=''; $('#m-color').value=''; $('#m-price').value=''; }
    if (e.target && e.target.id === 'modal-save') saveModal();

    // Rechner
    if (e.target && e.target.id === 'btn-add-row') addCalcRow();
    if (e.target && e.target.closest('[data-remove]')) { e.target.closest('.row').remove(); calcRecompute(); }

    // Language / Currency (Segmented)
    if (e.target && e.target.classList.contains('flag')) {
      state.lang = e.target.dataset.lang || 'de';
      localStorage.setItem('lang', state.lang);
      updateFormatter(); renderTable(); refreshDatalist(); calcRecompute();
      // visual state
      $$('#lang-switch .flag').forEach(b=> b.setAttribute('aria-pressed', b.dataset.lang===state.lang ? 'true':'false'));
    }
    if (e.target && e.target.classList.contains('curr')) {
      state.currency = e.target.dataset.curr || 'EUR';
      localStorage.setItem('currency', state.currency);
      updateFormatter(); renderTable(); refreshDatalist(); calcRecompute();
      $$('#curr-switch .curr').forEach(b=> b.setAttribute('aria-pressed', b.dataset.curr===state.currency ? 'true':'false'));
    }
  });

  // -------- Bootstrap --------
  (async function boot(){
    updateFormatter();
    // Active State initial
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
      console.debug('Boot ok. Lang:', state.lang, 'Curr:', state.currency);
    } catch (e) {
      console.error('Boot failed:', e);
      alert('Fehler beim Laden: ' + (e?.message || e));
    }
  })();

});
