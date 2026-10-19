import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { toXYZ, fromXYZ, countryAt } from './geo.js';

const vertex = `
varying vec2 vUv; varying vec3 vPosition; varying vec3 vNormal;
void main(){ vUv=uv; vPosition=(modelMatrix*vec4(position,1.0)).xyz; vNormal=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const fragment = `
uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D politicalMap; uniform sampler2D topoMap;
uniform vec3 sun; uniform float daylight; uniform float lights; uniform float mode;
varying vec2 vUv; varying vec3 vPosition; varying vec3 vNormal;
void main(){
  vec3 n=normalize(vNormal); float incidence=dot(n,sun);
  vec3 day=texture2D(dayMap,vUv).rgb;
  if(mode>0.5 && mode<1.5){ vec4 p=texture2D(politicalMap,vUv); day=mix(day*0.72,p.rgb,p.a*0.7); }
  if(mode>1.5){ float h=texture2D(topoMap,vUv).r; vec3 terrain=mix(vec3(0.025,0.13,0.21),vec3(0.14,0.42,0.31),smoothstep(0.04,0.24,h)); terrain=mix(terrain,vec3(0.65,0.49,0.26),smoothstep(0.24,0.6,h)); terrain=mix(terrain,vec3(0.88,0.91,0.89),smoothstep(0.6,0.95,h)); day=mix(day,terrain,0.72); }
  float illumination=mix(0.95,0.13+0.95*smoothstep(-0.15,0.8,incidence),daylight);
  float night=(1.0-smoothstep(-0.2,0.1,incidence))*daylight;
  vec3 city=texture2D(nightMap,vUv).rgb;
  city=pow(city,vec3(1.15))*vec3(1.45,1.12,0.73);
  vec3 color=day*illumination+city*night*lights*1.8;
  float fresnel=pow(1.0-max(dot(n,normalize(cameraPosition-vPosition)),0.0),3.5);
  color+=vec3(0.05,0.28,0.48)*fresnel*(0.3+0.7*smoothstep(-0.3,0.5,incidence));
  gl_FragColor=vec4(color,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export async function createEarth(host, data, callbacks) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '交互式三维地球，拖动旋转，滚轮或双指缩放');
  renderer.domElement.setAttribute('role', 'img');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1, 0.05, 120);
  const home = new THREE.Vector3(...toXYZ(24, 106, 3.35));
  camera.position.copy(home);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.65;
  controls.minDistance = 1.32;
  controls.maxDistance = 6;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.35;
  controls.minPolarAngle = 0.04;
  controls.maxPolarAngle = Math.PI - 0.04;

  const loader = new THREE.TextureLoader();
  const base = import.meta.env.BASE_URL;
  const [dayMap, nightMap, topoMap] = await Promise.all(['earth-day.jpg', 'earth-night.jpg', 'earth-topology.png'].map(name => loader.loadAsync(`${base}assets/${name}`)));
  for (const texture of [dayMap, nightMap]) texture.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [dayMap, nightMap, topoMap]) texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const politicalCanvas = document.createElement('canvas');
  politicalCanvas.width = 2048; politicalCanvas.height = 1024;
  const ctx = politicalCanvas.getContext('2d');
  const palette = ['#44999c', '#577ba7', '#8ba581', '#927ba9', '#bc9b6d', '#7c9bb9', '#58a48e', '#ac857e'];
  data.countries.features.forEach((feature, index) => {
    ctx.fillStyle = palette[index % palette.length];
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const polygon of polygons) {
      // Unwrap crossings of the antimeridian, then draw wrapped copies.
      const rings = polygon.map(ring => {
        let previous = ring[0][0];
        return ring.map(([lon, lat]) => { while (lon - previous > 180) lon -= 360; while (lon - previous < -180) lon += 360; previous = lon; return [lon, lat]; });
      });
      for (const shift of [-360, 0, 360]) {
        ctx.beginPath();
        for (const ring of rings) {
          ring.forEach(([lon, lat], i) => { const x = (lon + shift + 180) / 360 * 2048, y = (90 - lat) / 180 * 1024; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
          ctx.closePath();
        }
        ctx.fill('evenodd');
      }
    }
  });
  const politicalMap = new THREE.CanvasTexture(politicalCanvas);
  politicalMap.colorSpace = THREE.SRGBColorSpace;
  const uniforms = { dayMap: { value: dayMap }, nightMap: { value: nightMap }, topoMap: { value: topoMap }, politicalMap: { value: politicalMap }, sun: { value: new THREE.Vector3(1, 0, 0) }, daylight: { value: 1 }, lights: { value: 1 }, mode: { value: 0 } };
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment }));
  scene.add(globe);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.025, 96, 64), new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: `varying vec3 vPosition; varying vec3 vNormal; void main(){ float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(cameraPosition-vPosition))),3.0); gl_FragColor=vec4(0.18,0.56,0.85,rim*0.24); }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(atmosphere);

  const stars = new Float32Array(1500 * 3);
  let seed = 42;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < stars.length; i += 3) {
    const lat = Math.asin(2 * random() - 1) * 180 / Math.PI, lon = random() * 360;
    stars.set(toXYZ(lat, lon, 30 + random() * 40), i);
  }
  const starGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(stars, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x9cbbd6, size: 0.045, transparent: true, opacity: 0.7, sizeAttenuation: true, depthWrite: false })));

  function lineSegments(lines, color, opacity, radius = 1.003) {
    const vertices = [];
    for (const line of lines) for (let i = 1; i < line.length; i++) {
      vertices.push(...toXYZ(line[i - 1][1], line[i - 1][0], radius), ...toXYZ(line[i][1], line[i][0], radius));
    }
    return new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)), new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  }
  const borderLines = data.countries.features.flatMap(f => f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat());
  const borders = lineSegments(borderLines, 0x9ed4dd, 0.36);
  scene.add(borders);
  const gridLines = [];
  for (let lat = -60; lat <= 60; lat += 30) gridLines.push(Array.from({ length: 181 }, (_, i) => [i * 2 - 180, lat]));
  for (let lon = -180; lon < 180; lon += 30) gridLines.push(Array.from({ length: 91 }, (_, i) => [lon, i * 2 - 90]));
  const grid = lineSegments(gridLines, 0x759cba, 0.17, 1.005);
  scene.add(grid);
  const equator = lineSegments([Array.from({ length: 361 }, (_, i) => [i - 180, 0])], 0xe8bd75, 0.55, 1.005);
  const tropics = lineSegments([-23.436, 23.436].map(lat => Array.from({ length: 181 }, (_, i) => [i * 2 - 180, lat])), 0xe8bd75, 0.22, 1.005);
  grid.add(equator, tropics);
  const rivers = lineSegments((data.rivers?.features || []).flatMap(f => f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates), 0x65d8f2, 0.85, 1.004);
  rivers.visible = false;
  scene.add(rivers);
  const terminator = lineSegments([Array.from({ length: 181 }, (_, i) => [i * 2 - 180, 0])], 0xffc97a, 0.6, 1.008);
  terminator.visible = false;
  scene.add(terminator);

  const marker = new THREE.Group();
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 12), new THREE.MeshBasicMaterial({ color: 0xa4ffe4 }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.014, 0.018, 40), new THREE.MeshBasicMaterial({ color: 0x93f5d2, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  marker.add(pin, ring); marker.visible = false; scene.add(marker);
  let selectedOutline;
  let layer = 'natural', selected = null, flight = null, lastFrame = performance.now(), viewThrottle = 0, needsRender = true, lastRender = 0;
  controls.addEventListener('change', () => { needsRender = true; });
  let labelsEnabled = true;
  const labelRoot = document.createElement('div'); labelRoot.className = 'map-labels'; host.append(labelRoot);
  const labelPlaces = data.places.filter(p => p.featureId || p.type === 'city' || ['mountain', 'river', 'lake', 'desert'].includes(p.type));
  const labelItems = labelPlaces.map(place => {
    const el = document.createElement('button'); el.className = `map-label label-${place.type}`; el.textContent = place.name;
    el.setAttribute('aria-label', `定位${place.name}`); el.tabIndex = -1;
    el.onclick = () => callbacks.onSelect(place);
    labelRoot.append(el);
    return { el, place, vector: new THREE.Vector3(...toXYZ(place.lat, place.lon, 1.013)) };
  });
  const raycaster = new THREE.Raycaster();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
    const hit = raycaster.intersectObject(globe)[0];
    if (hit) { const point = fromXYZ(hit.point); const country = countryAt(data.countries.features, point.lon, point.lat); if (country) callbacks.onCountry(country, point); else callbacks.onCoordinates(point); }
  });
  controls.addEventListener('start', () => { flight = null; callbacks.onInteract(); });
  let firstSize = true;
  const homeDistance = () => Math.max(3.35, 1.08 * Math.sqrt(1 + (1 / (Math.tan(camera.fov * Math.PI / 360) * camera.aspect)) ** 2));
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    if (firstSize) { camera.position.setLength(homeDistance()); firstSize = false; }
    needsRender = true;
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  function highlight(place) {
    selected = place;
    marker.position.set(...toXYZ(place.lat, place.lon, 1.012));
    marker.lookAt(marker.position.clone().multiplyScalar(2)); marker.visible = true;
    if (selectedOutline) { scene.remove(selectedOutline); selectedOutline.geometry.dispose(); selectedOutline.material.dispose(); selectedOutline = null; }
    if (place.featureId || place.type === 'country') {
      const feature = data.countries.features.find(f => f.id === place.featureId || f.properties.name === place.name || f.properties.nameEn === place.en);
      if (feature) {
        selectedOutline = lineSegments(feature.geometry.type === 'Polygon' ? feature.geometry.coordinates : feature.geometry.coordinates.flat(), 0xb6ffe5, 0.95, 1.006);
        scene.add(selectedOutline);
      }
    }
  }
  function flyTo(place) {
    highlight(place); controls.autoRotate = false;
    flight = { start: performance.now(), from: camera.position.clone(), direction: new THREE.Vector3(...toXYZ(place.lat, place.lon)), distance: Math.max(1.6, Math.min(4.2, place.zoom || (place.type === 'country' ? 2.5 : 1.95))) };
  }
  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min((now - lastFrame) / 1000, 0.1); lastFrame = now;
    if (document.hidden) return;
    if (flight) {
      const t = Math.min((now - flight.start) / 1400, 1), ease = t * t * (3 - 2 * t);
      const from = flight.from.clone().normalize(), to = flight.direction;
      const quaternion = new THREE.Quaternion().setFromUnitVectors(from, to);
      const rotation = new THREE.Quaternion().slerp(quaternion, ease);
      const distance = THREE.MathUtils.lerp(flight.from.length(), flight.distance, ease) + Math.sin(t * Math.PI) * 0.45;
      camera.position.copy(from.applyQuaternion(rotation).multiplyScalar(distance));
      if (t === 1) flight = null;
    }
    controls.update(delta);
    ring.scale.setScalar(1 + Math.sin(now / 500) * 0.13);
    if (needsRender || controls.autoRotate || flight || (selected && now - lastRender > 80)) {
      renderer.render(scene, camera); needsRender = false; lastRender = now;
    }
    if (now - viewThrottle > 90) {
      viewThrottle = now;
      const direction = camera.position.clone().normalize(), occupied = [];
      const dist = camera.position.length();
      for (const { el, place, vector } of labelItems) {
        const appropriate = layer === 'countries' ? !!place.featureId : layer === 'cities' ? place.type === 'city' : ['mountain', 'river', 'lake', 'desert'].includes(place.type);
        const facing = vector.clone().normalize().dot(direction);
        if (!labelsEnabled || !appropriate || facing < 1 / dist + 0.08 || (dist > 4.5 && selected?.name !== place.name)) { el.style.display = 'none'; continue; }
        const screen = vector.clone().project(camera);
        const x = (screen.x + 1) / 2 * host.clientWidth, y = (-screen.y + 1) / 2 * host.clientHeight;
        const labelWidth = place.name.length * 13 + 10;
        if (x < labelWidth / 2 || x > host.clientWidth - labelWidth / 2 || y < 30 || y > host.clientHeight - 40 || occupied.some(([px, py, width]) => Math.abs(px - x) < (width + labelWidth) / 2 + 12 && Math.abs(py - y) < 30)) { el.style.display = 'none'; continue; }
        occupied.push([x, y, labelWidth]); el.style.display = ''; el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
      }
      callbacks.onViewChange({ ...fromXYZ(camera.position), distance: dist });
    }
  }
  requestAnimationFrame(animate);
  return {
    flyTo,
    setLayer(value) { needsRender = true; layer = value; uniforms.mode.value = value === 'countries' ? 1 : value === 'terrain' ? 2 : 0; rivers.visible = value === 'nature'; borders.material.opacity = value === 'countries' ? 0.65 : 0.28; },
    setOverlay(name, value) { needsRender = true; if (name === 'borders') borders.visible = value; if (name === 'grid') grid.visible = value; if (name === 'labels') labelsEnabled = value; if (name === 'terminator') terminator.visible = value; if (name === 'daylight') uniforms.daylight.value = Number(value); if (name === 'lights') uniforms.lights.value = Number(value); },
    setSun(position) { needsRender = true; const sun = new THREE.Vector3(...toXYZ(position.lat, position.lon)); uniforms.sun.value.copy(sun); terminator.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sun); },
    setAutoRotate(value) { controls.autoRotate = value; },
    zoomBy(factor) { flight = null; camera.position.setLength(THREE.MathUtils.clamp(camera.position.length() * factor, controls.minDistance, controls.maxDistance)); },
    reset() { flyTo({ name: '地球', type: 'planet', lat: 24, lon: 106, zoom: homeDistance() }); marker.visible = false; },
    clearSelection() { needsRender = true; selected = null; marker.visible = false; if (selectedOutline) { scene.remove(selectedOutline); selectedOutline.geometry.dispose(); selectedOutline.material.dispose(); selectedOutline = null; } },
    getView() { return { ...fromXYZ(camera.position), distance: camera.position.length() }; }
  };
}
