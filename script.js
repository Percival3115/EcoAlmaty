(() => {
const D = window.ENV_DATA, $ = (s, r = document) => r.querySelector(s);
const fmt = n => n.toLocaleString('ru-RU', {maximumFractionDigits: 1});
const state = {id: null, cat: 'green', cmp: new Set(), feats: {}, maps: [], charts: {}};
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 4500); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// --- геометрия: площадь по реальным границам (равнопромежуточная проекция, км²)
function areaKm2(geom) {
  const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  let total = 0;
  for (const poly of polys) poly.forEach((ring, i) => {
    const lat0 = ring[0][1] * Math.PI / 180, kx = 111.32 * Math.cos(lat0), ky = 110.574;
    let s = 0;
    for (let j = 0; j < ring.length - 1; j++) s += (ring[j][0] * kx) * (ring[j+1][1] * ky) - (ring[j+1][0] * kx) * (ring[j][1] * ky);
    total += (i === 0 ? 1 : -1) * Math.abs(s / 2);
  });
  return total;
}
function thumb(geom) {
  const rings = (geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates]).map(p => p[0]);
  const pts = rings.flat(), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = 180 / Math.max((x1 - x0) * Math.cos(y0 * Math.PI / 180), y1 - y0);
  const d = rings.map(r => 'M' + r.map(p => `${(10 + (p[0] - x0) * Math.cos(y0 * Math.PI / 180) * k).toFixed(1)},${(190 - (p[1] - y0) * k).toFixed(1)}`).join('L') + 'Z').join('');
  return `<svg viewBox="0 0 200 200" role="img" aria-label="Контур района"><path d="${d}" fill="#C8E96A" fill-opacity=".6" stroke="#315B3B" stroke-width="2"/></svg>`;
}

// --- карты
const BASES = {
  sat: () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom: 18, attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community (архивный снимок)'}),
  street: () => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© OpenStreetMap contributors'})
};
function makeMap(el) {
  const map = L.map(el, {scrollWheelZoom: false}).setView([43.24, 76.9], 11);
  const m = {map, base: BASES.street().addTo(map), layers: {}, sat: false};
  state.maps.push(m); return m;
}
function drawDistricts(m, gj) {
  for (const f of gj.features) {
    const id = f.properties['osm-relation-id'];
    if (!D.districts[id]) continue;
    const l = L.geoJSON(f, {style: styleFor(id, m), onEachFeature: (_, layer) => {
      layer.bindTooltip(D.districts[id].nameRu, {permanent: true, direction: 'center', className: 'dlabel'});
      layer.on('click', () => select(id));
      layer.getElement && layer.on('add', () => {});
    }}).addTo(m.map);
    m.layers[id] = l;
  }
}
const styleFor = (id, m) => ({color: m.sat ? '#F4FFD0' : '#315B3B', weight: id === state.id ? 4 : 2.5, fillColor: '#C8E96A', fillOpacity: id === state.id ? .5 : .22});
function restyle() { state.maps.forEach(m => Object.entries(m.layers).forEach(([id, l]) => { l.setStyle(styleFor(id, m)); if (id === state.id) l.bringToFront(); })); }
function fitAll(m) { const g = L.featureGroup(Object.values(m.layers)); if (g.getLayers().length) m.map.fitBounds(g.getBounds(), {padding: [20, 20]}); }
function fitOne(m, id) { m.map.flyToBounds(m.layers[id].getBounds(), {padding: [30, 30], duration: .8}); }

async function loadGeo() {
  for (const url of [D.geojsonUrl, D.geojsonLocal]) {
    try { const r = await fetch(url); if (!r.ok) throw 0; const gj = await r.json();
      if (gj.features.filter(f => D.districts[f.properties['osm-relation-id']]).length === 3) return gj; } catch (e) {}
  }
  throw new Error('GeoJSON недоступен');
}

// --- рендер
function renderCards() {
  $('#cards').innerHTML = Object.entries(D.districts).map(([id, d]) => `
    <article class="card reveal" tabindex="0" data-id="${id}">
      <div class="thumb">${thumb(state.feats[id].geometry)}</div>
      <h3>${d.nameRu}</h3><p>${d.desc}</p>
      <div class="meter" title="Показателей с подтверждёнными данными по району"><i style="width:0%"></i></div>
      <small>Данные по району: 0 из 5 показателей</small><br>
      <button class="btn ghost sm">Исследовать район</button></article>`).join('');
  document.querySelectorAll('.card').forEach(c => { const go = () => { select(c.dataset.id); $('#map-section').scrollIntoView(); }; c.onclick = go; c.onkeydown = e => (e.key === 'Enter') && go(); });
  observe();
}
function renderPanel() {
  const id = state.id, p = $('#d-panel');
  if (!id) { p.innerHTML = '<h3>Район не выбран</h3><p>Нажмите на контур на карте или выберите карточку района.</p>'; return; }
  const d = D.districts[id], a = areaKm2(state.feats[id].geometry);
  $('#d-title').textContent = d.nameRu;
  p.innerHTML = `<h3>${d.nameRu}</h3><p>${d.desc}</p>
    <p><b>Площадь:</b> ${fmt(a)} км² <span class="badge calc">расчёт по границам OSM</span><br><small>Метод: равнопромежуточная проекция, формула площади многоугольника; охват — район; источник — GeoJSON akilbekov/almaty.geo.json. Может отличаться от официальной площади.</small></p>
    <p><b>Период наблюдений:</b> нет данных</p>` +
    D.categories.map(c => `<details><summary>${c.icon} ${c.title}</summary><p><span class="badge ${c.status}">${c.statusText}</span></p><p>${c.note}</p><p><a href="${c.source}" target="_blank" rel="noopener">Источник</a></p></details>`).join('');
}
function renderTabs() {
  $('#tabs').innerHTML = D.categories.map(c => `<button role="tab" data-c="${c.id}" class="${c.id === state.cat ? 'on' : ''}">${c.icon} ${c.title}</button>`).join('');
  $('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) { state.cat = b.dataset.c; renderTabs(); renderCat(); } };
}
function renderCat() {
  const c = D.categories.find(x => x.id === state.cat), dn = state.id ? D.districts[state.id].nameRu : 'выбранный район (не выбран)';
  const w = D.cityWaste2025;
  let extra = '';
  if (c.id === 'waste') extra = `<ul><li>Собрано и транспортировано ТБО: <b>${fmt(w.collectedT)} т</b></li><li>Переработано: <b>${fmt(w.recycledT)} т</b></li><li>Доля переработки: <b>${w.recyclingPct}%</b></li><li>Охват услугами вывоза: <b>${w.coveragePct}%</b></li></ul><p><span class="badge city">${w.scope}</span> ${w.caveat}</p>`;
  $('#cat-panel').innerHTML = `<h3>${c.icon} ${c.title}</h3><p>${c.what}</p>
    <p><b>${dn}:</b> <span class="badge no">Нет подтверждённых данных по району</span></p>
    <p><span class="badge ${c.status}">${c.statusText}</span> ${c.note}</p>${extra}<p><a href="${c.source}" target="_blank" rel="noopener">Открыть источник</a></p>`;
  $('#waste-box').style.display = c.id === 'waste' ? '' : 'none';
}
function charts() {
  if (state.charts.w) return;
  const w = D.cityWaste2025;
  state.charts.w = new Chart($('#wasteChart'), {type: 'bar', data: {labels: ['Собрано ТБО', 'Переработано ТБО'], datasets: [{label: 'тонн, Алматы 2025', data: [w.collectedT, w.recycledT], backgroundColor: ['#315B3B', '#C8E96A']}]},
    options: {indexAxis: 'y', plugins: {tooltip: {callbacks: {label: c => fmt(c.raw) + ' т (город, 2025)'}}}, scales: {x: {title: {display: true, text: 'тонн'}}}}});
  state.charts.a = new Chart($('#areaChart'), {type: 'bar', data: {labels: [], datasets: [{label: 'км²', data: [], backgroundColor: '#315B3B'}]},
    options: {indexAxis: 'y', plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => fmt(c.raw) + ' км² (расчёт по границам OSM)'}}}, scales: {x: {title: {display: true, text: 'км²'}}}}});
}
function renderCompare() {
  const ids = Object.keys(D.districts);
  $('#cmp-pick').innerHTML = ids.map(i => `<button class="chip ${state.cmp.has(i) ? 'on' : ''}" data-i="${i}" aria-pressed="${state.cmp.has(i)}">${D.districts[i].nameRu}</button>`).join('');
  const sel = ids.filter(i => state.cmp.has(i));
  const cell = () => `<td><span class="badge no">нет данных</span></td>`;
  $('#cmp-table').innerHTML = `<tr><th>Показатель</th>${sel.map(i => `<th>${D.districts[i].nameRu}</th>`).join('')}</tr>
    <tr><td>Площадь, км² (расчёт)</td>${sel.map(i => `<td>${fmt(areaKm2(state.feats[i].geometry))}</td>`).join('')}</tr>` +
    D.categories.map(c => `<tr><td>${c.title}</td>${sel.map(cell).join('')}</tr>`).join('');
  const a = state.charts.a; if (a) { a.data.labels = sel.map(i => D.districts[i].nameRu); a.data.datasets[0].data = sel.map(i => +areaKm2(state.feats[i].geometry).toFixed(1)); a.update(); }
}
$('#cmp-pick').onclick = e => { const b = e.target.closest('button'); if (!b) return; const i = b.dataset.i;
  if (state.cmp.has(i)) { if (state.cmp.size > 2) state.cmp.delete(i); else return toast('Для сравнения нужно минимум два района'); } else state.cmp.add(i); renderCompare(); };

function select(id) {
  state.id = id; restyle(); renderPanel(); renderCat();
  const m = state.maps[1]; if (m && m.layers[id]) fitOne(m, id);
  const h = state.maps[0]; if (h && h.layers[id]) fitOne(h, id);
}

// --- карта: переключатели
document.querySelectorAll('.mapbar [data-base]').forEach(b => b.onclick = () => {
  const m = state.maps[1]; document.querySelectorAll('.mapbar [data-base]').forEach(x => x.classList.toggle('on', x === b));
  const k = b.dataset.base, note = $('#eco-note');
  m.map.removeLayer(m.base); m.base = BASES[k === 'sat' ? 'sat' : 'street']().addTo(m.map); m.base.bringToBack();
  note.hidden = k !== 'eco'; m.sat = k === 'sat'; restyle();
  if (k === 'eco') note.innerHTML = '<b>Экологические слои недоступны.</b> Проверенных геопривязанных растров и измерений (NDVI, LST, PM2.5, трафик, контейнерные площадки) в проекте пока нет, поэтому тепловые карты не рисуются. См. «Методология».';
});
$('#reset').onclick = () => { state.id = null; restyle(); renderPanel(); $('#d-title').textContent = 'Выберите район'; state.maps.forEach(fitAll); };

// --- методология, источники
function renderStatic() {
  $('#method-list').innerHTML = D.categories.map(c => `<details><summary>${c.icon} ${c.title}</summary><p>${c.what}</p><p>${c.note}</p></details>`).join('') +
    `<details><summary>Типы данных и достоверность</summary><p>Каждое значение относится к одному из типов: подтверждённое по району; подтверждённое по Алматы в целом; расчётное из реальных данных (например, площадь по границам); недоступное. Недоступные показатели не заменяются нулями или случайными числами.</p></details>`;
  $('#src-list').innerHTML = D.sources.map(s => `<li><a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a><span>${esc(s[2])}</span></li>`).join('');
}
// --- интерфейс
function observe() { const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), {threshold: .1}); document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el)); }
document.querySelectorAll('.block,.final').forEach(el => el.classList.add('reveal'));
$('.burger').onclick = e => { const o = $('#menu').classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', o); };
$('#menu').onclick = () => $('#menu').classList.remove('open');
const secs = [...document.querySelectorAll('#menu a')].map(a => [a, $(a.getAttribute('href'))]);
addEventListener('scroll', () => { $('#toTop').hidden = scrollY < 500; let cur = secs[0]; secs.forEach(s => s[1].getBoundingClientRect().top < 160 && (cur = s)); secs.forEach(s => s[0].classList.toggle('active', s === cur)); }, {passive: true});
$('#toTop').onclick = () => scrollTo({top: 0, behavior: 'smooth'});

// --- старт
renderStatic(); renderTabs(); renderPanel(); observe();
const mh = makeMap('map-hero'), mm = makeMap('map-main');
document.querySelectorAll('.map').forEach(el => { const d = document.createElement('div'); d.className = 'ld'; d.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;z-index:400;pointer-events:none'; d.innerHTML = '<span class="spin"></span>'; el.appendChild(d); });
loadGeo().then(gj => {
  document.querySelectorAll('.ld').forEach(e => e.remove());
  gj.features.forEach(f => { if (D.districts[f.properties['osm-relation-id']]) state.feats[f.properties['osm-relation-id']] = f; });
  state.maps.forEach(m => { drawDistricts(m, gj); fitAll(m); m.map.once('click', () => m.map.scrollWheelZoom.enable()); });
  Object.keys(D.districts).slice(0, 3).forEach(i => state.cmp.add(i));
  renderCards(); charts(); renderCompare(); renderCat();
  window.ECO_AREAS = Object.fromEntries(Object.keys(state.feats).map(i => [D.districts[i].nameRu, +areaKm2(state.feats[i].geometry).toFixed(1)]));
}).catch(() => {
  document.querySelectorAll('.ld').forEach(e => e.remove());
  toast('Не удалось загрузить границы районов. Запустите через http-сервер и проверьте интернет или положите файл в data/districts.geojson.');
  $('#cards').innerHTML = '<div class="panel">Границы районов не загружены — контуры не показываются, данные не подменяются.</div>';
});
})();
