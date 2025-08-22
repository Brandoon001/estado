// ---- Configuração ----
const DEFAULT_GEOJSON_URL = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-23-mun.json'; // CE

const map = L.map('map', { zoomControl: true, attributionControl: true });
const baselayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 12, minZoom: 5, opacity: 0.35,
  attribution: '&copy; OpenStreetMap | Limites: IBGE / geodata-br'
}).addTo(map);

// Camada de municípios
let muniLayer = null;

const styleDefault = {
  weight: 0.8,
  color: '#000',
  opacity: 1,
  fillColor: '#ffffff',
  fillOpacity: 0.05
};

function guessName(props){
  return props.NM_MUN || props.NM_MUNICIP || props.NOME || props.name || props.NAME || props.municipio || props.MUNICIPIO || 'Município';
}

function onEachFeature(feature, layer){
  const name = guessName(feature.properties || {});
  layer.bindTooltip(name, {sticky:true, className:'tooltip'});

  layer.on('mouseover', () => layer.setStyle({weight: 2}));
  layer.on('mouseout', () => layer.setStyle({weight: 0.8}));

  layer.on('click', () => {
    const c = document.querySelector('#color').value;
    layer.setStyle({ fillColor: c, fillOpacity: 0.8 });
    layer.feature.properties._fill = c; // guarda
    lastClicked = layer;
  });
}

function buildLayer(geo){
  if(muniLayer){ muniLayer.remove(); }
  muniLayer = L.geoJSON(geo, { style: styleDefault, onEachFeature });
  muniLayer.addTo(map);
  try { map.fitBounds(muniLayer.getBounds(), { padding: [20,20] }); } catch(err){ map.setView([-5.2, -39.5], 7); }
}

async function loadDefault(){
  try{
    const res = await fetch(DEFAULT_GEOJSON_URL, { cache: 'force-cache' });
    const data = await res.json();
    buildLayer(data);
  }catch(err){
    console.error('Falha ao carregar GeoJSON padrão', err);
    alert('Não foi possível carregar o GeoJSON padrão. Use "Carregar GeoJSON local" no painel.');
  }
}
loadDefault();

// ---- UI ----
const colorInput = document.querySelector('#color');
const legendDot = document.querySelector('#legendColor');
const fileInput = document.querySelector('#file');
const searchInput = document.querySelector('#search');
const fitAllBtn = document.querySelector('#fitAll');
const resetSelBtn = document.querySelector('#resetSel');
const resetAllBtn = document.querySelector('#resetAll');
let eyedropperMode = false;
let lastClicked = null;

legendDot.style.background = colorInput.value;

colorInput.addEventListener('input', () => {
  legendDot.style.background = colorInput.value;
});

document.getElementById('eyedrop').addEventListener('click', () => {
  eyedropperMode = !eyedropperMode;
  const btn = document.getElementById('eyedrop');
  btn.style.borderColor = eyedropperMode ? 'var(--accent)' : '#2a2a2a';
  btn.textContent = eyedropperMode ? 'Contagotas (ativo)' : 'Contagotas';
  if(eyedropperMode && lastClicked){
    const c = (lastClicked.feature.properties._fill) || '#ffffff';
    if(c && c !== '#ffffff'){ colorInput.value = c; legendDot.style.background = c; }
  }
});

resetSelBtn.addEventListener('click', () => {
  if(lastClicked){ lastClicked.setStyle({ fillColor: '#ffffff', fillOpacity: 0.05 }); lastClicked.feature.properties._fill = null; }
});

resetAllBtn.addEventListener('click', () => {
  if(!muniLayer) return;
  muniLayer.eachLayer(l => { l.setStyle({ fillColor:'#ffffff', fillOpacity:0.05 }); l.feature.properties._fill = null; });
});

fitAllBtn.addEventListener('click', () => { if(muniLayer) map.fitBounds(muniLayer.getBounds(), { padding:[20,20] }); });

// Busca simples por nome
searchInput.addEventListener('keyup', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if(!q || !muniLayer) return;
  let found = null;
  muniLayer.eachLayer(l => {
    const name = guessName(l.feature.properties || {}).toLowerCase();
    if(!found && name.startsWith(q)) found = l;
  });
  if(found){
    found.bringToFront();
    found.setStyle({weight: 3});
    map.fitBounds(found.getBounds(), { maxZoom: 10, padding:[40,40] });
    setTimeout(()=> found.setStyle({weight: 0.8}), 800);
  }
});

// Abrir GeoJSON local
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0]; if(!file) return;
  const text = await file.text();
  const json = JSON.parse(text);
  buildLayer(json);
});
