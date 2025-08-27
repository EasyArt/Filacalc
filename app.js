// app.js — Frontend-Logik

const fmt = new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' });
const $  = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

const state = { items: [], backend: 'json', selected: new Set(), editing: null };

// ---- API Helper mit Method-Override (POST _method=PUT/DELETE) ----
async function api(path='', opts={}) {
  const o = Object.assign({ headers:{'Content-Type':'application/json'} }, opts);
  if (o.method === 'PUT' || o.method === 'DELETE') {
    const bodyObj = typeof o.body==='string' && o.body ? JSON.parse(o.body) : (o.body || {});
    bodyObj._method = o.method;
    o.method = 'POST';
    o.body = JSON.stringify(bodyObj);
  }
  const res = await fetch(`api.php?api=${path}`, o);
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
  return res.status===204 ? null : res.json();
}

// ---- Laden & Rendern ----
async function loadAll(){
  const data = await api('filaments');
  state.items = data.items; state.backend = data.backend; state.selected.clear();
  renderTable(); updateBulkButton(); refreshDatalist(); calcRecompute();
}

function renderTable(){
  const q = ($('#search')?.value||'').trim().toLowerCase();
  const tb = $('#tbody-filaments'); if (!tb) return;
  tb.innerHTML = '';
  const list = state.items.filter(f => [f.brand,f.type,f.color].some(v=> (v||'').toLowerCase().includes(q)));
  if (list.length===0){ tb.innerHTML = `<tr><td colspan="6" class="muted">Keine Treffer. Füge ein Filament hinzu.</td></tr>`; return; }
  for (const f of list){
    const tr = document.createElement('tr');
    const checked = state.selected.has(f.id);
    tr.innerHTML = `
      <td class="right"><input type="checkbox" data-id="${f.id}" ${checked?'checked':''}></td>
      <td>${escapeHtml(f.brand)}</td>
      <td>${escapeHtml(f.type)}</td>
      <td>${escapeHtml(f.color)}</td>
      <td class="right">${fmt.format(Number(f.price||0))}</td>
      <td class="right actions">
        <button class="btn" data-edit="${f.id}" type="button">Bearbeiten</button>
        <button class="btn" data-del="${f.id}"  type="button">✕</button>
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

// ---- Modal ----
function openModal(editId=null){
  state.editing = editId;
  $('#modal-title').textContent = editId ? 'Filament bearbeiten' : 'Neues Filament';
  if (editId){
    const f = state.items.find(x=>x.id===editId);
    $('#m-brand').value = f.brand; $('#m-type').value = f.type; $('#m-color').value = f.color; $('#m-price').value = f.price;
  } else { $('#m-brand').value=''; $('#m-type').value=''; $('#m-color').value=''; $('#m-price').value=''; }
  $('#modal').classList.add('open');
}
function closeModal(){
  $('#modal').classList.remove('open');
  state.editing = null;
}
function modalEscCloser(e){ if (e.key === 'Escape') closeModal(); }

async function saveModal(){
  try {
    const priceVal = Number(String($('#m-price').value).replace(',', '.'));
    const payload = {
      id: state.editing,
      brand: $('#m-brand').value.trim(),
      type:  $('#m-type').value.trim(),
      color: $('#m-color').value.trim(),
      price: priceVal
    };
    if (!payload.brand || !payload.type || !payload.color || !(payload.price > 0)) {
      alert('Bitte alle Felder korrekt ausfüllen. Tipp: Verwende "." als Dezimaltrennzeichen (z. B. 24.90).');
      return;
    }
    const method = state.editing ? 'PUT' : 'POST';
    const path   = state.editing ? `filaments/${encodeURIComponent(state.editing)}` : 'filaments';
    const btn = $('#modal-save'); btn.disabled = true; btn.textContent = 'Speichere…';
    await api(path, { method, body: JSON.stringify(payload) });
    closeModal(); await loadAll();
  } catch (e) {
    console.error(e);
    alert('Speichern fehlgeschlagen: ' + (e?.message || e || 'Unbekannter Fehler'));
  } finally {
    const btn = $('#modal-save'); btn.disabled = false; btn.textContent = 'Speichern';
  }
}

// ---- Table Events ----
$('#search')?.addEventListener('input', renderTable);
$('#btn-new')?.addEventListener('click', ()=>openModal());
$('#btn-bulk-delete')?.addEventListener('click', async ()=>{
  if (state.selected.size===0) return;
  if (!confirm(`${state.selected.size} Filament(e) löschen?`)) return;
  for (const id of Array.from(state.selected)) {
    await api(`filaments/${encodeURIComponent(id)}`, { method:'DELETE' });
  }
  await loadAll();
});
$('#check-all')?.addEventListener('change', (e)=>{
  const boxes = $$('#tbody-filaments input[type="checkbox"]');
  state.selected.clear();
  if (e.target.checked){ for (const b of boxes){ b.checked=true; state.selected.add(b.dataset.id); } }
  updateBulkButton();
});
$('#tbody-filaments')?.addEventListener('change', (e)=>{
  if (e.target.matches('input[type="checkbox"]')){
    const id = e.target.dataset.id; if (e.target.checked) state.selected.add(id); else state.selected.delete(id); updateBulkButton();
  }
});
$('#tbody-filaments')?.addEventListener('click', (e)=>{
  if (e.target.matches('button[data-edit]')) {
    openModal(e.target.getAttribute('data-edit'));
  }
  if (e.target.matches('button[data-del]')) {
    const id = e.target.getAttribute('data-del');
    const f = state.items.find(x=>x.id===id);
    if (f && confirm(`${f.brand} ${f.type} ${f.color} löschen?`)) {
      api(`filaments/${encodeURIComponent(id)}`, { method:'DELETE' }).then(loadAll);
    }
  }
});

// ---- Rechner ----
function refreshDatalist(){
  const dl = $('#filament-options');
  dl.innerHTML = state.items.map(f=>{
    const label = `${escapeHtml(f.brand)} • ${escapeHtml(f.type)} • ${escapeHtml(f.color)} (${fmt.format(Number(f.price||0))}/kg)`;
    return `<option value="${label}" data-id="${f.id}"></option>`;
  }).join('');
}

function addCalcRow(){
  const wrap = document.createElement('div');
  wrap.className = 'row';
  wrap.innerHTML = `
    <div class="grid grid-12" style="align-items:end;">
      <div style="grid-column: span 7;">
        <label><span>Filament (tippen zum Suchen)</span>
          <input type="text" list="filament-options" placeholder="Marke • Typ • Farbe (Preis/kg)" class="select" />
        </label>
      </div>
      <div style="grid-column: span 3;">
        <label><span>Gramm</span>
          <input type="number" min="0" step="1" placeholder="z. B. 20" />
        </label>
      </div>
      <div style="grid-column: span 1;">
        <div class="muted">Preis/kg</div>
        <div class="pricekg">€ 0,00</div>
      </div>
      <div style="grid-column: span 1; text-align:right;">
        <button class="btn" data-remove type="button">✕</button>
      </div>
    </div>
    <div style="margin-top:8px;">
      <div class="muted">Kosten</div>
      <div class="linecost" style="font-weight:600;">€ 0,00</div>
    </div>`;
  $('#calc-rows').appendChild(wrap);
  calcRecompute();
}

function getIdFromDatalistInput(inputEl){
  const listId = inputEl.getAttribute('list');
  if (!listId) return '';
  const list = document.getElementById(listId);
  if (!list) return '';
  const val = inputEl.value;
  const opt = Array.from(list.options).find(o => o.value === val);
  if (opt && opt.getAttribute('data-id')) return opt.getAttribute('data-id');
  const lower = val.toLowerCase();
  const found = state.items.find(f=>{
    const label = `${f.brand} • ${f.type} • ${f.color}`.toLowerCase();
    return lower && label.includes(lower);
  });
  return found ? found.id : '';
}

function gramsToCost(pricePerKg, grams){ return (Number(pricePerKg||0)/1000) * (Number(grams||0)); }

function calcRecompute(){
  let sum = 0; const ul = $('#breakdown'); ul.innerHTML = '';
  for (const row of $$('#calc-rows .row')){
    const inp = row.querySelector('input[list="filament-options"]');
    const grams = Number(row.querySelector('input[type="number"]').value || 0);
    const id = getIdFromDatalistInput(inp);
    const f = state.items.find(x=>x.id===id);
    const price = f? Number(f.price) : 0;
    row.querySelector('.pricekg').textContent = fmt.format(price);
    const cost = gramsToCost(price, grams); sum += cost;
    row.querySelector('.linecost').textContent = fmt.format(cost);
    const label = f ? `${grams}g ${f.color} ${f.brand} ${f.type}` : `${grams}g (unbekannt)`;
    const li = document.createElement('li'); li.textContent = `${label} — ${fmt.format(cost)}`; ul.appendChild(li);
  }
  $('#total').textContent = fmt.format(sum);
}

function escapeHtml(s){ return (s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }

// ---- Calculator Events ----
$('#btn-add-row').addEventListener('click', addCalcRow);
$('#calc-rows').addEventListener('click', (e)=>{ if (e.target.closest('[data-remove]')){ e.target.closest('.row').remove(); calcRecompute(); } });
$('#calc-rows').addEventListener('input', (e)=>{
  if (e.target.matches('input[list="filament-options"], input[type="number"]')) calcRecompute();
});

// ---- Tabs ----
$('#tab-filamente').addEventListener('click', ()=>{
  $('#tab-filamente').classList.add('active');
  $('#tab-rechner').classList.remove('active');
  $('#view-filamente').style.display='';
  $('#view-rechner').style.display='none';
});
$('#tab-rechner').addEventListener('click', ()=>{
  $('#tab-rechner').classList.add('active');
  $('#tab-filamente').classList.remove('active');
  $('#view-rechner').style.display='';
  $('#view-filamente').style.display='none';
});

// ---- Modal Events ----
document.addEventListener('click', (e)=>{
  if (e.target && e.target.id === 'modal-close') closeModal();
  if (e.target && e.target.id === 'modal') closeModal(); // Klick auf Backdrop
});
document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeModal(); });
$('#modal-reset').addEventListener('click', ()=>{ $('#m-brand').value=''; $('#m-type').value=''; $('#m-color').value=''; $('#m-price').value=''; });
$('#modal-save').addEventListener('click', saveModal);

// ---- Bootstrap ----
(async function(){
  await loadAll();
  if (state.items.length===0){
    const seed = [
      { brand:'Amazon Basics', type:'PLA',        color:'Schwarz',       price:19.99 },
      { brand:'Bambu',         type:'PLA Basic',  color:'Weiß',          price:22.90 },
      { brand:'Prusament',     type:'PLA',        color:'Galaxy Black',  price:29.90 },
      { brand:'eSun',          type:'PETG',       color:'Klar',          price:21.50 }
    ];
    for (const s of seed){ await api('filaments', { method:'POST', body: JSON.stringify(s) }); }
    await loadAll();
  }
  addCalcRow();
})();
