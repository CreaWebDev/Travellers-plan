<template>
  <div class="relative w-full h-screen overflow-hidden shadow">
    <div ref="mapEl" class="w-full h-full"></div>

    <div class="backdrop-blur rounded-lg px-3 py-2 text-sm shadow">
      <p class="font-medium">New Zealand Map</p>
      <p class="opacity-70 text-5xl">Klik på kortet for at tilføje et punkt</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, defineExpose } from "vue";
// @ts-ignore – types are not installed for leaflet in this project
import L from "leaflet";
// @ts-ignore – types er ikke altid bundlet i markercluster
import "leaflet.markercluster";

type MarkerItem = {
  id?: string | number;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  createdBy?: string;
  isDuplicate?: boolean;
};

const props = defineProps<{
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MarkerItem[];
  tileAttribution?: string;
  tileUrlTemplate?: string;
  useClusters?: boolean;
}>();

const emit = defineEmits<{
  (e: "marker-click", marker: MarkerItem): void;
  (e: "add-marker", latlng: { lat: number; lng: number }): void;
  (e: "moved", center: { lat: number; lng: number; zoom: number }): void;
  (e: "delete-spot", marker: MarkerItem): void;
  (e: "edit-spot", marker: MarkerItem): void;
}>();

const initialCenter = props.center ?? { lat: -41.0, lng: 174.0 };
const initialZoom = props.zoom ?? 5;

const mapEl = ref<HTMLDivElement | null>(null);
let map: any | null = null;
let tile: any | null = null;

// enten en almindelig LayerGroup eller en MarkerClusterGroup
let layerGroup: any | null = null;

const localMarkers = ref<MarkerItem[]>(props.markers ?? []);
const markerRefs = new Map<string | number, any>();

// track whether any popup is currently open
let isPopupOpen = false;
let handleDocumentClick: ((ev: MouseEvent) => void) | null = null;

function keyFor(m: MarkerItem, i: number) {
  return (m.id ?? i) as string | number;
}

function buildPopup(m: MarkerItem) {
  const createdByLine = m.createdBy ? `<small style="color:#6b7280;">Created by: ${m.createdBy}</small><br/>` : '';
  return `
    <div>
      <small>${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}</small><br>
      <strong>${m.title ?? "Place"}</strong><br/>
      <span>${m.description ?? ""}</span><br/>
      ${createdByLine}
      <div style="margin-top:6px; display:flex; gap:8px;">
        <button class="delete-spot-btn" style="background:#ef4444;color:white;border:none;padding:6px 8px;border-radius:4px;cursor:pointer">Delete</button>
        <button class="edit-spot-btn" style="background:#2563eb;color:white;border:none;padding:6px 8px;border-radius:4px;cursor:pointer">Edit</button>
      </div>
    </div>
  `;
}

function createLayerGroup() {
  if (!map) return;
  // ryd eksisterende
  if (layerGroup) {
    layerGroup.clearLayers();
    layerGroup.removeFrom(map);
  }
  // @ts-ignore
  layerGroup = props.useClusters ? L.markerClusterGroup() : L.layerGroup();
  layerGroup.addTo(map);
}

function syncMarkers() {
  if (!map || !layerGroup) return;

  // fjern alle (simple og robust ved små mængder markers)
  layerGroup.clearLayers();
  markerRefs.clear();

  (localMarkers.value ?? []).forEach((m, i) => {
    const k = keyFor(m, i);
    // render duplicate spots as a red circle marker for visibility
    let inst: any;
    if (m.isDuplicate) {
      inst = L.circleMarker([m.lat, m.lng], { radius: 8, color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.9 });
    } else {
      // Use purple circle markers for normal spots
      inst = L.circleMarker([m.lat, m.lng], { 
        radius: 10, 
        color: '#7c3aed', 
        fillColor: '#a78bfa', 
        fillOpacity: 0.8,
        weight: 2
      });
    }
    inst.bindPopup(buildPopup(m));

    // Add a permanent tooltip with the title if it exists
    if (m.title) {
      inst.bindTooltip(m.title, {
        permanent: true,
        direction: 'right',
        offset: [10, 0],
        className: 'map-marker-tooltip'
      });
    }
    inst.on("click", () => emit("marker-click", m));
    // when popup opens, attach a click handler to the delete button that emits a delete event
    inst.on('popupopen', (e: any) => {
      try {
        const popupEl = e.popup.getElement();
        const btn: HTMLButtonElement | null = popupEl.querySelector('.delete-spot-btn');
        if (btn && !btn.dataset.attached) {
          btn.dataset.attached = '1';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            emit('delete-spot', m);
          });
        }
        const editBtn: HTMLButtonElement | null = popupEl.querySelector('.edit-spot-btn');
        if (editBtn && !editBtn.dataset.attached) {
          editBtn.dataset.attached = '1';
          editBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            emit('edit-spot', m);
          });
        }
      } catch (err) {
        // ignore
      }
    });
    markerRefs.set(k, inst);
    // @ts-ignore
    layerGroup.addLayer(inst);
  });
}

function fitToBounds(pad = 0.1) {
  if (!map || !layerGroup) return;
  // @ts-ignore
  const groupBounds: L.LatLngBounds | undefined = (layerGroup as any).getBounds?.() || null;
  if (groupBounds && groupBounds.isValid()) {
    map.fitBounds(groupBounds.pad(pad));
  }
}

function setMarkers(markers: MarkerItem[]) {
  localMarkers.value = markers ?? [];
  syncMarkers();
}

function clearMarkers() {
  localMarkers.value = [];
  syncMarkers();
}

// defineExpose({ fitToBounds, setMarkers, clearMarkers });

onMounted(() => {
  if (!mapEl.value) return;

  map = L.map(mapEl.value, {
    center: [initialCenter.lat, initialCenter.lng],
    zoom: initialZoom,
    zoomControl: true,
    attributionControl: true,
  });

  tile = L.tileLayer(
    props.tileUrlTemplate ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        props.tileAttribution ??
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }
  ).addTo(map);

  createLayerGroup();
  setMarkers(props.markers ?? []);

  // track popup open/close state
  map.on('popupopen', () => { isPopupOpen = true; });
  map.on('popupclose', () => { isPopupOpen = false; });

  // Map click: close popup if open, otherwise emit add-marker to open form
  map.on("click", (e: any) => {
    if (isPopupOpen) {
      map!.closePopup();
      return;
    }
    const { lat, lng } = e.latlng;
    emit("add-marker", { lat, lng });
  });

  map.on("moveend", () => {
    const c = map!.getCenter();
    emit("moved", { lat: c.lat, lng: c.lng, zoom: map!.getZoom() });
  });

  // clicking anywhere outside the popup should close it
  handleDocumentClick = (ev: MouseEvent) => {
    if (!map) return;
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    // if click is inside popup, a marker icon, or an interactive vector (circleMarker), ignore
    if (target.closest('.leaflet-popup, .leaflet-marker-icon, .leaflet-interactive')) return;
    // if a popup is open, close it
    if (isPopupOpen) {
      map.closePopup();
    }
  };
  document.addEventListener('click', handleDocumentClick, false);
});

onBeforeUnmount(() => {
  if (handleDocumentClick) {
    document.removeEventListener('click', handleDocumentClick, false);
    handleDocumentClick = null;
  }
  markerRefs.forEach(m => m.remove());
  markerRefs.clear();
  layerGroup?.clearLayers();
  map?.remove();
  map = null;
});

watch(() => props.useClusters, () => {
  createLayerGroup();
  syncMarkers();
});

watch(() => props.markers, (val) => {
  localMarkers.value = val ?? [];
  syncMarkers();
}, { deep: true });

watch(() => props.center, (val) => {
  if (map && val) map.setView([val.lat, val.lng] as any, map.getZoom());
});

watch(() => props.zoom, (val) => {
  if (map && typeof val === "number") map.setZoom(val);
});
</script>

<style>
/* Simple, readable tooltip styling for marker titles */
.leaflet-tooltip.map-marker-tooltip {
  background: rgba(255, 255, 255, 0.92);
  color: #111827; /* gray-900 */
  border: 1px solid #e5e7eb; /* gray-200 */
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
  pointer-events: none; /* don't block map interactions */
}
</style>
