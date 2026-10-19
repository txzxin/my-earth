import './style.css';
import { createEarth } from './earth.js';
import { solarPosition, solarAltitude, searchPlaces } from './geo.js';
import { places } from './data/places.js';
import { countryFacts } from './data/country-facts.js';

const paths = {
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-9 9 9 5 9-5M3 17l9 5 9-5"/>',
  mountain: '<path d="m2 20 8-15 5 9 3-5 5 11H2Zm5-9 3 2 2-2"/>',
  map: '<path d="m9 3-7 3v15l7-3 6 3 7-3V3l-7 3-6-3Zm0 0v15m6-12v15"/>',
  city: '<path d="M3 21V8h7V3h8v7h3v11H3Zm7-13v13M6 11v1m0 3v1m7-10v1m2-1v1m-2 3v1m2-1v1m-2 3v1m2-1v1m3-1v1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  play: '<path d="m9 4 12 8-12 8V4Z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  book: '<path d="M12 5C8 2 4 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-2-10 1Zm0 0v15"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.pin}</svg>`;
const typeNames = { country: '国家 / 地区', region: '地理区域', city: '城市', mountain: '山脉 / 山峰', river: '河流', lake: '湖泊', desert: '沙漠', ocean: '海洋', planet: '地球' };
const typeIcons = { country: 'map', region: 'map', city: 'city', mountain: 'mountain', river: 'globe', lake: 'globe', desert: 'sun', ocean: 'globe' };
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
let earth, selected = null, searchType = 'all', activeLayer = 'natural', autoRotate = false, daylight = true, lights = true, offset = 0, timeBase = null;
let currentDate = new Date(), sun = solarPosition(currentDate), toastTimeout;
let countries;

$('#app').innerHTML = `
  <header class="topbar">
    <a class="brand" href="./" aria-label="My Earth 首页"><span class="brand-symbol">${icon('globe')}</span><span>MY EARTH<span class="brand-sub">地球探索者</span></span></a>
    <nav class="topnav" aria-label="主导航"><button class="nav-item active" id="explore-nav">探索地球</button><button class="nav-item" id="quiz-open">地理小测<span class="tiny-dot"></span></button></nav>
    <div class="header-right"><span class="live-label"><span class="live-dot"></span>一颗正在发生的星球</span><button class="icon-button" id="help-open" aria-label="操作帮助" title="操作帮助">${icon('info')}</button><a class="github-link" href="https://github.com/txzxin/my-earth" target="_blank" rel="noreferrer" aria-label="查看 GitHub 源码">GITHUB ${icon('arrow')}</a></div>
  </header>
  <main class="workspace">
    <aside class="left-panel">
      <section class="search-section">
        <div class="eyebrow">LET CURIOSITY LEAD</div><h1>世界，触手可及<span>。</span></h1>
        <p class="intro">从一座城市，到一整片大陆。</p>
        <div class="search-wrapper">
          <label class="search-box" for="search-input">${icon('search')}<input id="search-input" placeholder="搜索国家、城市、山川…" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="search-results" aria-autocomplete="list"/><kbd>/</kbd><button id="search-clear" class="clear-search hidden" aria-label="清空搜索">${icon('close')}</button></label>
          <div class="search-dropdown hidden" id="search-dropdown"><div class="search-filters" role="group" aria-label="搜索类型"><button data-filter="all" class="active">全部</button><button data-filter="country">国家</button><button data-filter="city">城市</button><button data-filter="nature">山川</button></div><div id="search-results" role="listbox" aria-label="搜索结果"></div><div class="search-hint">输入中文、英文或常用别名，回车定位</div></div>
        </div>
        <div class="quick-search"><span>试试</span><button data-search="中国">中国</button><button data-search="珠穆朗玛峰">珠峰</button><button data-search="亚马孙河">亚马孙河</button></div>
      </section>
      <section class="layers-section"><div class="section-heading"><h2>${icon('layers')} 换个角度看地球</h2><span>05</span></div>
        <div class="layer-options" role="group" aria-label="地图图层">
          <button class="layer-card active" data-layer="natural" aria-pressed="true"><span class="layer-preview preview-natural"></span><span class="layer-text"><strong>自然地表</strong><small>山海之间，地球本色</small></span><span class="layer-radio"></span></button>
          <button class="layer-card" data-layer="countries" aria-pressed="false"><span class="layer-preview preview-countries">${icon('map')}</span><span class="layer-text"><strong>国家与疆界</strong><small>认识世界的每一片拼图</small></span><span class="layer-radio"></span></button>
          <button class="layer-card" data-layer="terrain" aria-pressed="false"><span class="layer-preview preview-terrain">${icon('mountain')}</span><span class="layer-text"><strong>地形起伏</strong><small>读懂大陆的高低脉络</small></span><span class="layer-radio"></span></button>
          <button class="layer-card" data-layer="cities" aria-pressed="false"><span class="layer-preview preview-cities">${icon('city')}</span><span class="layer-text"><strong>人类足迹</strong><small>城市星火，连成文明</small></span><span class="layer-radio"></span></button>
          <button class="layer-card" data-layer="nature" aria-pressed="false"><span class="layer-preview preview-nature">${icon('compass')}</span><span class="layer-text"><strong>山川与河流</strong><small>沿着大地的纹理去探索</small></span><span class="layer-radio"></span></button>
        </div>
      </section>
      <section class="overlays-section"><div class="section-heading"><h2>探索辅助</h2></div><div class="overlay-grid">
        <label><input type="checkbox" data-overlay="borders" checked/><span class="check-box"></span>国家边界</label>
        <label><input type="checkbox" data-overlay="grid" checked/><span class="check-box"></span>经纬网</label>
        <label><input type="checkbox" data-overlay="labels" checked/><span class="check-box"></span>地理名称</label>
        <label><input type="checkbox" data-overlay="terminator"/><span class="check-box"></span>晨昏线</label>
      </div></section>
      <button class="sources-button" id="sources-open">${icon('info')} 关于地球与数据来源 ${icon('chevron')}</button>
    </aside>
    <section class="earth-stage" id="earth-stage" aria-label="地球探索视图">
      <div class="scene-caption"><span class="status-line"></span><span id="layer-caption">BLUE MARBLE</span><span class="caption-separator">/</span><span id="view-caption">自然地表</span></div>
      <div class="globe-glow"></div>
      <div class="loading" id="loading"><span class="loading-orbit"></span><strong>正在唤醒这颗蓝色星球</strong><span id="loading-text">加载地表、灯光与地理数据…</span></div>
      <div class="globe-toolbar"><button class="icon-button" id="rotate-toggle" aria-label="开启自动旋转" aria-pressed="false" title="自动旋转">${icon('play')}</button><span></span><button class="icon-button" id="zoom-in" aria-label="放大地球" title="放大">${icon('plus')}</button><button class="icon-button" id="zoom-out" aria-label="缩小地球" title="缩小">${icon('minus')}</button><span></span><button class="icon-button" id="reset-view" aria-label="重置地球视角" title="重置视角">${icon('reset')}</button><button class="icon-button" id="fullscreen" aria-label="全屏探索" title="全屏探索">${icon('expand')}</button></div>
      <div class="compass" title="北方始终朝上"><span>N</span><div>✦</div><span>S</span></div>
      <div class="interaction-hint"><span class="mouse-icon"></span>拖动旋转<span class="hint-dot">·</span>滚轮缩放<span class="hint-dot">·</span>点击国家探索</div>
      <div class="layer-legend" id="layer-legend"><span class="legend-dot"></span>NASA 蓝色弹珠 · 自然地表</div>
    </section>
    <aside class="right-panel">
      <section class="light-panel panel"><div class="section-heading"><h2>${icon('sun')} 此刻的地球</h2><span class="live-badge" id="time-badge">实时</span></div><div class="sun-visual"><span class="mini-earth"></span><div><div class="solar-title">一半白昼，一半星光</div><p>太阳照亮的，正是此刻的世界。</p></div></div>
        <label class="switch-row"><span>${icon('sun')} 实时昼夜</span><input type="checkbox" id="daylight-toggle" checked/><span class="switch"></span></label>
        <label class="switch-row"><span>${icon('moon')} 夜间城市灯光</span><input type="checkbox" id="lights-toggle" checked/><span class="switch"></span></label>
        <div class="sun-coordinates"><span>太阳直射点</span><strong id="solar-coords">—</strong></div>
      </section>
      <section class="place-panel panel" id="place-panel" aria-live="polite"></section>
      <section class="discover-section"><div class="section-heading"><h2>下一站，去哪里？</h2>${icon('compass')}</div><button class="destination" data-destination="喜马拉雅山脉"><span class="destination-image dest-mountain"></span><span><strong>世界的屋脊</strong><small>喜马拉雅山脉 · 亚洲</small></span>${icon('arrow')}</button><button class="destination" data-destination="亚马孙河"><span class="destination-image dest-river"></span><span><strong>穿越绿色的心脏</strong><small>亚马孙河 · 南美洲</small></span>${icon('arrow')}</button><button class="destination" data-destination="撒哈拉沙漠"><span class="destination-image dest-desert"></span><span><strong>一片流动的金色</strong><small>撒哈拉沙漠 · 非洲</small></span>${icon('arrow')}</button></section>
    </aside>
    <section class="timeline" aria-label="日照时间控制"><div class="timeline-header"><div class="time-title">${icon('sun')}<span id="timeline-title">追随阳光的脚步</span><span class="time-divider"></span><time id="utc-time">—</time></div><button id="time-reset" class="text-button">${icon('reset')} 回到此刻</button></div><div class="time-slider-row"><span>${icon('moon')}</span><div class="range-wrapper"><input type="range" id="time-slider" min="-12" max="12" step="0.25" value="0" aria-label="调整日照时间，前后十二小时"/><div class="time-ticks"><span>−12h</span><span>−6h</span><span class="now-tick">此刻</span><span>+6h</span><span>+12h</span></div></div><span>${icon('sun')}</span></div><p class="timeline-note" id="timeline-note">拖动时间轴，观察昼夜如何在地球上交替</p></section>
  </main>
  <footer class="footer"><span class="coordinate-display">${icon('compass')}<span id="camera-coords">24.0° N &nbsp; 106.0° E</span><span class="footer-divider"></span><span id="view-altitude">视角高度 —</span></span><span class="footer-credit">为每一份好奇心而造 <span>✦</span> OUR ONE & ONLY EARTH</span></footer>
  <div class="toast hidden" id="toast" role="status"></div>
  <dialog id="modal"><button class="modal-close icon-button" id="modal-close" aria-label="关闭弹窗">${icon('close')}</button><div id="modal-content"></div></dialog>
`;

function toast(message) { $('#toast').textContent = message; $('#toast').classList.remove('hidden'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').classList.add('hidden'), 3200); }
function coordinates(lat, lon, precision = 1) { return `${Math.abs(lat).toFixed(precision)}° ${lat >= 0 ? 'N' : 'S'}　${Math.abs(lon).toFixed(precision)}° ${lon >= 0 ? 'E' : 'W'}`; }
function effectiveDate() { return offset === 0 ? new Date() : new Date(timeBase.getTime() + offset * 3600000); }
function renderPlace() {
  if (!selected) {
    $('#place-panel').innerHTML = `<div class="eyebrow">A PLANET FULL OF STORIES</div><div class="overview-title">每一个坐标，<br>都有一个故事。</div><p class="place-description">点击地球上的国家，或搜索一个向往的地方，开始你的地理探索。</p><div class="planet-stats"><div><strong>7</strong><span>大洲</span></div><div><strong>5</strong><span>大洋</span></div><div><strong>71<span>%</span></strong><span>海洋覆盖</span></div></div><span class="small-note">从熟悉的地方出发，发现更大的世界 ${icon('arrow')}</span>`;
    return;
  }
  const altitude = solarAltitude(selected.lat, selected.lon, sun);
  const isDay = altitude >= -0.833;
  const twilight = altitude < -0.833 && altitude > -18;
  const facts = countryFacts[selected.featureId];
  const compactNumber = value => new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  const factRows = facts ? `<div class="country-facts"><div><span>首都 / 首府</span><strong>${escapeHtml(facts.capital || '暂无资料')}</strong></div><div><span>所属大洲</span><strong>${escapeHtml(facts.continent)}</strong></div>${facts.area ? `<div><span>面积 · 来源口径</span><strong>${compactNumber(facts.area)} <small>km²</small></strong></div>` : ''}${facts.population > 0 ? `<div><span>人口 · 约 ${facts.populationYear}</span><strong>${compactNumber(facts.population)}</strong></div>` : ''}</div>` : '';
  $('#place-panel').innerHTML = `<div class="place-heading"><span class="eyebrow">${typeNames[selected.type] || '地理位置'}</span><button class="icon-button" id="place-close" aria-label="关闭地点详情">${icon('close')}</button></div><h2 class="place-name">${escapeHtml(selected.name)}</h2><div class="place-english">${escapeHtml(selected.en || '')}</div><div class="place-coords">${icon('pin')}${coordinates(selected.lat, selected.lon, 2)}</div><p class="place-description">${escapeHtml(selected.description || '在地球上探索这个地方，观察它与大陆、海洋和邻国的位置关系。')}</p><div class="place-sun"><span>${icon(isDay ? 'sun' : 'moon')}${isDay ? '此地正值白昼' : twilight ? '此地正值晨昏' : '此地正值夜晚'}</span><strong>${altitude.toFixed(1)}°<small>太阳高度</small></strong></div><button class="place-fly" id="place-fly">${icon('compass')} 再次定位 ${icon('arrow')}</button>`;
  if (factRows) $('.place-description').insertAdjacentHTML('afterend', factRows);
  $('#place-close').onclick = () => { selected = null; earth?.clearSelection(); renderPlace(); };
  $('#place-fly').onclick = () => earth?.flyTo(selected);
}
renderPlace();

function selectPlace(place) {
  selected = place;
  earth?.flyTo(place);
  setRotation(false);
  renderPlace();
  closeSearch();
  $('#search-input').blur();
}
function resolvePlace(name) { return places.find(p => p.name === name || p.aliases?.includes(name)) || searchPlaces(places, name)[0]; }
function findAndFly(name) { const place = resolvePlace(name); if (place) selectPlace(place); else toast('暂未收录这个地点，试试其他国家、城市或山川。'); }
let searchMatches = [], selectedResult = -1;
function renderSearch() {
  const query = $('#search-input').value;
  searchMatches = searchPlaces(places, query, searchType);
  selectedResult = -1;
  $('#search-input').removeAttribute('aria-activedescendant');
  $('#search-clear').classList.toggle('hidden', !query);
  $('.search-box kbd').classList.toggle('hidden', !!query);
  $('#search-results').innerHTML = searchMatches.length ? searchMatches.map((place, index) => `<button role="option" aria-selected="false" id="result-${index}" data-result="${index}" class="search-result"><span class="result-icon">${icon(typeIcons[place.type])}</span><span><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.en || '')}</small></span><span class="result-type">${typeNames[place.type] || '地点'}</span></button>`).join('') : `<div class="no-results">${icon('search')}<strong>还没找到这个地方</strong><span>试试“中国”“北京”“珠峰”或“尼罗河”</span></div>`;
  document.querySelectorAll('[data-result]').forEach(button => button.onclick = () => selectPlace(searchMatches[Number(button.dataset.result)]));
}
function openSearch() { renderSearch(); $('#search-dropdown').classList.remove('hidden'); $('#search-input').setAttribute('aria-expanded', 'true'); }
function closeSearch() { $('#search-dropdown').classList.add('hidden'); $('#search-input').setAttribute('aria-expanded', 'false'); }
$('#search-input').addEventListener('focus', openSearch);
$('#search-input').addEventListener('input', openSearch);
$('#search-clear').onclick = () => { $('#search-input').value = ''; $('#search-input').focus(); openSearch(); };
$('#search-input').addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSearch(); $('#search-input').blur(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); selectedResult = Math.max(0, Math.min(searchMatches.length - 1, selectedResult + (e.key === 'ArrowDown' ? 1 : -1)));
    document.querySelectorAll('[data-result]').forEach((b, i) => { b.classList.toggle('keyboard-selected', i === selectedResult); b.setAttribute('aria-selected', String(i === selectedResult)); });
    $('#search-input').setAttribute('aria-activedescendant', `result-${selectedResult}`);
    $(`#result-${selectedResult}`)?.scrollIntoView({ block: 'nearest' });
  }
  if (e.key === 'Enter' && searchMatches.length) { e.preventDefault(); selectPlace(searchMatches[Math.max(0, selectedResult)]); }
});
document.addEventListener('pointerdown', e => { if (!e.target.closest('.search-wrapper')) closeSearch(); });
document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => { searchType = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button)); renderSearch(); });
document.querySelectorAll('[data-search]').forEach(button => button.onclick = () => findAndFly(button.dataset.search));
document.querySelectorAll('[data-destination]').forEach(button => button.onclick = () => { setLayer('nature'); findAndFly(button.dataset.destination); });
const layers = {
  natural: ['BLUE MARBLE', '自然地表', 'NASA 蓝色弹珠 · 自然地表'],
  countries: ['WORLD POLITICAL', '国家与疆界', '国家着色 · 点击国土查看详情'],
  terrain: ['EARTH RELIEF', '地形起伏', '地形着色示意 · 低地 → 高地'],
  cities: ['HUMAN FOOTPRINT', '人类足迹', '主要城市名称 · 夜半球城市灯光'],
  nature: ['NATURAL WONDERS', '山川与河流', '山川地标 · 主要河流路径'],
};
function setLayer(layer) {
  activeLayer = layer; earth?.setLayer(layer);
  document.querySelectorAll('[data-layer]').forEach(b => { const active = b.dataset.layer === layer; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  const [caption, name, legend] = layers[layer];
  $('#layer-caption').textContent = caption; $('#view-caption').textContent = name; $('#layer-legend').innerHTML = `<span class="legend-dot"></span>${legend}`;
  if (layer === 'terrain') $('#layer-legend').insertAdjacentHTML('beforeend', '<span class="terrain-scale"></span>');
}
document.querySelectorAll('[data-layer]').forEach(button => button.onclick = () => setLayer(button.dataset.layer));
document.querySelectorAll('[data-overlay]').forEach(input => input.onchange = () => earth?.setOverlay(input.dataset.overlay, input.checked));
$('#daylight-toggle').onchange = e => { daylight = e.target.checked; earth?.setOverlay('daylight', daylight); $('.sun-visual').classList.toggle('light-disabled', !daylight); $('#lights-toggle').disabled = !daylight; $('#lights-toggle').closest('label').classList.toggle('disabled', !daylight); toast(daylight ? '已开启昼夜模拟' : '已切换为全日照视图，方便查看地表'); };
$('#lights-toggle').onchange = e => { lights = e.target.checked; earth?.setOverlay('lights', lights); };
function setRotation(value) { autoRotate = value; earth?.setAutoRotate(value); $('#rotate-toggle').innerHTML = icon(value ? 'pause' : 'play'); $('#rotate-toggle').setAttribute('aria-label', value ? '暂停自动旋转' : '开启自动旋转'); $('#rotate-toggle').setAttribute('aria-pressed', String(value)); }
$('#rotate-toggle').onclick = () => setRotation(!autoRotate);
$('#zoom-in').onclick = () => earth?.zoomBy(0.82);
$('#zoom-out').onclick = () => earth?.zoomBy(1.22);
$('#reset-view').onclick = () => { selected = null; setRotation(false); earth?.reset(); renderPlace(); };
$('#fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast('当前浏览器不支持全屏，请使用浏览器的全屏模式。'); } };
function updateTime() {
  currentDate = effectiveDate(); sun = solarPosition(currentDate); earth?.setSun(sun);
  $('#utc-time').textContent = new Intl.DateTimeFormat('zh-CN', { timeZone: 'UTC', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(currentDate) + ' UTC';
  $('#solar-coords').textContent = coordinates(sun.lat, sun.lon);
  $('#time-badge').textContent = offset === 0 ? '实时' : '模拟'; $('#time-badge').classList.toggle('simulated', offset !== 0);
  $('#timeline-title').textContent = offset === 0 ? '追随阳光的脚步' : `${offset > 0 ? '未来' : '过去'} ${Math.abs(offset)} 小时`;
  $('#timeline-note').textContent = offset === 0 ? '拖动时间轴，观察昼夜如何在地球上交替' : '当前为时间模拟 · 点击“回到此刻”恢复实时日照';
  if (selected && $('.place-sun')) {
    const altitude = solarAltitude(selected.lat, selected.lon, sun);
    const isDay = altitude >= -0.833;
    $('.place-sun').innerHTML = `<span>${icon(isDay ? 'sun' : 'moon')}${isDay ? '此地正值白昼' : altitude > -18 ? '此地正值晨昏' : '此地正值夜晚'}</span><strong>${altitude.toFixed(1)}°<small>太阳高度</small></strong>`;
  }
}
$('#time-slider').oninput = e => { if (!timeBase) timeBase = new Date(); offset = Number(e.target.value); if (!offset) timeBase = null; updateTime(); };
$('#time-reset').onclick = () => { offset = 0; timeBase = null; $('#time-slider').value = '0'; updateTime(); };
setInterval(updateTime, 1000); updateTime();

function openModal(content) { $('#modal-content').innerHTML = content; $('#modal').showModal(); closeSearch(); }
$('#modal-close').onclick = () => $('#modal').close();
$('#modal').addEventListener('click', e => { if (e.target === $('#modal')) { const r = $('#modal').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $('#modal').close(); } });
$('#help-open').onclick = () => openModal(`<div class="modal-eyebrow">A LITTLE GUIDE</div><h2>把世界握在手里</h2><p>这是一个可以自由探索的三维地球。让你的好奇心决定下一站。</p><div class="help-list"><div><kbd>拖动</kbd><span>旋转地球，改变观察方向</span></div><div><kbd>滚轮 / 双指</kbd><span>放大缩小，靠近想去的地方</span></div><div><kbd>点击国土</kbd><span>认识国家，查看中文地理信息</span></div><div><kbd>/</kbd><span>快速打开中文 / 英文地理搜索</span></div><div><kbd>时间轴</kbd><span>前后 12 小时，观察晨昏线移动</span></div></div><p class="modal-footnote">也可以通过左侧切换图层，或用地球右侧的按钮控制缩放与自动旋转。</p>`);
$('#sources-open').onclick = () => openModal(`<div class="modal-eyebrow">OUR ONE & ONLY EARTH</div><h2>一颗地球，多种视角</h2><p>My Earth 是一个面向好奇心的地理学习工具。数据随站点提供，无需地图服务密钥。</p><ul class="source-list"><li><strong>地表与城市灯光</strong><span>NASA 蓝色弹珠 / 地球夜景，经 three-globe 示例数据提供。灯光是静态观测合成影像，随模拟夜半球显示，并非实时拍摄。</span></li><li><strong>国家与河流</strong><span>Natural Earth 1:50m 国家边界 / 1:110m 河流数据，适合全球学习尺度。边界为来源数据的概略表示，不作为行政认定或测绘依据。</span></li><li><strong>日照计算</strong><span>根据 NOAA 太阳位置方程与当前 UTC 时间本地计算，每秒更新。地形图层是相对高度着色示意，地球几何表面未夸张起伏。</span></li><li><strong>中文地点索引</strong><span>${places.length} 个国家、地区、主要城市与自然地标。别名、英文名均可搜索；主要山川按代表坐标定位。</span></li></ul><a class="source-link" href="https://github.com/txzxin/my-earth/blob/main/public/assets/SOURCES.md" target="_blank" rel="noreferrer">完整数据来源与许可 ${icon('arrow')}</a>`);
$('#explore-nav').onclick = () => { $('#modal').close(); $('#search-input').focus(); };
document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !$('#modal').open) { e.preventDefault(); $('#search-input').focus(); } });

const questions = [
  { q: '世界上面积最大的海洋是？', options: ['大西洋', '太平洋', '印度洋', '北冰洋'], answer: 1, explain: '太平洋位于亚洲、大洋洲与美洲之间，是世界面积最大的海洋。', place: '太平洋' },
  { q: '珠穆朗玛峰位于哪一条山脉？', options: ['阿尔卑斯山脉', '安第斯山脉', '喜马拉雅山脉', '落基山脉'], answer: 2, explain: '喜马拉雅山脉由印度板块与欧亚板块碰撞形成，珠穆朗玛峰是其最高峰。', place: '珠穆朗玛峰' },
  { q: '亚马孙河主要流经哪一个大洲？', options: ['非洲', '亚洲', '北美洲', '南美洲'], answer: 3, explain: '亚马孙河横贯南美洲北部，水量极其丰富，滋养着广袤的热带雨林。', place: '亚马孙河' },
  { q: '地球的昼夜交替主要是因为？', options: ['地球自转', '月球公转', '太阳绕地球转', '地轴倾角变化'], answer: 0, explain: '地球自西向东自转，使各地依次进入日照与夜晚。试着拖动时间轴，观察昼夜交界。', place: null },
  { q: '撒哈拉沙漠位于哪里？', options: ['澳大利亚中部', '非洲北部', '亚洲西部', '南美洲西部'], answer: 1, explain: '撒哈拉横跨非洲北部，是世界最大的热沙漠。极地的冰雪荒漠面积则更大。', place: '撒哈拉沙漠' },
];
let questionIndex = 0, score = 0, answered = false;
function renderQuiz() {
  if (questionIndex >= questions.length) {
    $('#modal-content').innerHTML = `<div class="modal-eyebrow">CURIOSITY NEVER ENDS</div><h2>探索，是最好的学习。</h2><div class="quiz-score">${score}<span> / ${questions.length}</span></div><p>带着刚刚认识的地理知识，回到地球上，看看它们之间的关系。</p><button class="primary-button" id="quiz-restart">再挑战一次 ${icon('reset')}</button>`;
    $('#quiz-restart').onclick = () => { questionIndex = 0; score = 0; renderQuiz(); }; return;
  }
  answered = false; const q = questions[questionIndex];
  $('#modal-content').innerHTML = `<div class="modal-eyebrow">GEOGRAPHY BREAK / ${questionIndex + 1} OF ${questions.length}</div><h2>${q.q}</h2><p>给好奇心一个小小的挑战。</p><div class="quiz-options">${q.options.map((option, i) => `<button data-answer="${i}"><span>${'ABCD'[i]}</span>${option}</button>`).join('')}</div><div id="quiz-feedback" aria-live="polite"></div>`;
  document.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => {
    if (answered) return; answered = true;
    const correct = Number(button.dataset.answer) === q.answer; if (correct) score++;
    document.querySelectorAll('[data-answer]').forEach(b => { b.disabled = true; if (Number(b.dataset.answer) === q.answer) b.classList.add('correct'); else if (b === button) b.classList.add('incorrect'); });
    $('#quiz-feedback').innerHTML = `<strong>${correct ? '答对了！' : '又认识了一个新知识。'}</strong><p>${q.explain}</p><div class="quiz-actions">${q.place ? `<button class="text-button" id="quiz-locate">在地球上看看 ${icon('arrow')}</button>` : ''}<button class="primary-button" id="quiz-next">${questionIndex === questions.length - 1 ? '查看结果' : '下一题'} ${icon('arrow')}</button></div>`;
    if (q.place) $('#quiz-locate').onclick = () => { $('#modal').close(); findAndFly(q.place); };
    $('#quiz-next').onclick = () => { questionIndex++; renderQuiz(); };
  });
}
$('#quiz-open').onclick = () => { questionIndex = 0; score = 0; openModal(''); renderQuiz(); };

async function initialize() {
  try {
    const base = import.meta.env.BASE_URL;
    const [countryData, riverData] = await Promise.all(['countries.geojson', 'rivers.geojson'].map(async name => { const response = await fetch(`${base}assets/${name}`); if (!response.ok) throw new Error(`地理数据加载失败：${name}`); return response.json(); }));
    countries = countryData;
    earth = await createEarth($('#earth-stage'), { countries, rivers: riverData, places }, {
      onSelect: selectPlace,
      onCountry(feature) {
        const p = feature.properties;
        const existing = places.find(place => place.featureId === feature.id || (place.type === 'country' && (place.name === p.name || place.en === p.nameEn)));
        selectPlace(existing || { name: p.name, en: p.nameEn, featureId: feature.id, lat: p.lat, lon: p.lon, type: 'country', description: `位于${p.continent || '地球'}。观察它的疆界、海岸与周边地区。`, zoom: 2.5 });
      },
      onCoordinates(point) { selected = { name: '海洋与大地', en: 'A coordinate on our planet', type: 'region', ...point, description: '这是你刚刚点选的坐标。切换国家或山川图层，继续观察这一带的地理特征。', zoom: 2.5 }; renderPlace(); },
      onInteract() { setRotation(false); },
      onViewChange(view) { $('#camera-coords').innerHTML = coordinates(view.lat, view.lon); $('#view-altitude').textContent = `视角高度 ${Math.round((view.distance - 1) * 6371).toLocaleString()} km`; $('#earth-stage').dataset.distance = view.distance.toFixed(3); $('#earth-stage').dataset.lat = view.lat.toFixed(2); $('#earth-stage').dataset.lon = view.lon.toFixed(2); }
    });
    earth.setSun(sun); earth.setLayer(activeLayer);
    document.querySelectorAll('[data-overlay]').forEach(input => earth.setOverlay(input.dataset.overlay, input.checked));
    earth.setOverlay('daylight', daylight); earth.setOverlay('lights', lights); earth.setAutoRotate(autoRotate);
    if (selected) earth.flyTo(selected);
    $('#loading').classList.add('hidden'); $('#earth-stage').dataset.ready = 'true';
  } catch (error) {
    console.error(error);
    $('#loading').classList.add('load-error');
    $('#loading').innerHTML = `${icon('globe')}<strong>地球暂时未能加载</strong><span>请确认浏览器支持 WebGL，并刷新重试。</span><button class="primary-button" id="retry-load">重新加载</button>`;
    $('#retry-load').onclick = () => location.reload();
    $('#earth-stage').dataset.ready = 'error';
  }
}
$('#search-input').setAttribute('aria-label', '搜索国家、地区、城市或山川');
initialize();
