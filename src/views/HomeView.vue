
<template>
  <!-- Show login form if user is not logged in -->
  <LoginForm v-if="!isLoggedIn" @login="handleLogin" />

  <!-- Show main app if logged in -->
  <div v-else class="relative min-h-screen min-w-screen">
    <!-- User info and logout button -->
    <div class="fixed top-4 left-4 z-[9999] bg-white/90 px-4 py-2 rounded shadow flex items-center gap-3">
      <span class="text-sm text-gray-700">Welcome, <strong>{{ userName }}</strong></span>
      <button @click="handleLogout" class="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition">
        Logout
      </button>
    </div>

    <MapNZ
      :center="center"
      :zoom="zoom"
      :markers="computeMarkersWithDuplicates(spots)"
      @add-marker="onAddMarker"
      @marker-click="m => console.log('marker-click', m)"
      @delete-spot="onDeleteSpot"
      @edit-spot="onEditSpot"
    />

  <div class="fixed top-4 right-4 z-[9999] pointer-events-auto flex flex-col items-center gap-2 bg-white/90 p-3 rounded shadow">
      <small class="text-sm text-gray-600">Click the map to add a spot</small>
      <form v-if="showForm" @submit.prevent="addSpot" class="space-y-2">
        <div class="flex flex-col gap-2">
          <label for="lat" class="text-xs text-gray-600">Lat</label>
          <input v-model.number="form.lat" type="number" name="lat" step="0.0001" placeholder="Lat" required class="px-2 py-1 border rounded" />
          <label for="lon" class="text-xs text-gray-600">Lon</label>
          <input v-model.number="form.lng" type="number" name="lon" step="0.0001" placeholder="Lng" required class="px-2 py-1 border rounded" />
          <label for="title" class="text-xs text-gray-600">Place</label>
          <input v-model="form.title" type="text" name="title" placeholder="Title" required class="px-2 py-1 border rounded flex-1" />
          <label for="description" class="text-xs text-gray-600">Describe</label>
          <input v-model="form.description" type="text" name="description" placeholder="Description" class="px-2 py-1 border rounded flex-1" />
          <div class="flex gap-2">
            <button type="submit" class="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">{{ editingId ? 'Save changes' : 'Save' }}</button>
            <button type="button" @click="cancel" class="px-3 py-1 rounded bg-gray-200">Cancel</button>
          </div>
        </div>
      </form>
    </div>
    
    
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { collection, setDoc, doc, onSnapshot, Timestamp, QuerySnapshot, DocumentData, QueryDocumentSnapshot, deleteDoc } from '@firebase/firestore';
import { db } from '@/firebase';
import { getCookie, setCookie, deleteCookie } from '@/composables/useCookie';
import MapNZ from "@/components/map/MapNZ.vue";
import LoginForm from '@/components/LoginForm.vue';

type Spot = { id: string; lat: number; lng: number; title: string; description?: string; createdBy?: string; createdAt?: Date; isDuplicate?: boolean };

const center = ref({ lat: -41.0, lng: 174.0 });
const zoom = ref(5);
const spots = ref<Spot[]>([]);
const editingId = ref<string | null>(null);

// Auth state
const isLoggedIn = ref(false);
const userName = ref('');

// Check for existing login cookie on mount
function checkAuth() {
  const savedName = getCookie('traveller-name');
  if (savedName) {
    isLoggedIn.value = true;
    userName.value = savedName;
    setupFirestoreListener();
  }
}

function handleLogin(name: string) {
  isLoggedIn.value = true;
  userName.value = name;
  setupFirestoreListener();
}

function handleLogout() {
  deleteCookie('traveller-name');
  isLoggedIn.value = false;
  userName.value = '';
  // Clean up Firestore subscription when logging out
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = undefined;
  }
  spots.value = [];
}

// Set up Firestore real-time listener
function setupFirestoreListener() {
  if (unsubscribe) return; // already listening
  
  unsubscribe = onSnapshot(collection(db, 'spots'), (snapshot: QuerySnapshot<DocumentData>) => {
    spots.value = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      console.log('Processing doc:', doc.id, data);
      return {
        id: doc.id,
        ...data,
        lat: Number(Number(data.lat).toFixed(4)),  // ensure numbers rounded to 4 decimals
        lng: Number(Number(data.lng).toFixed(4)),
        title: data.title || '',
        // Convert Firestore Timestamp to Date if it exists
        createdAt: (data.createdAt as any)?.toDate?.(),
      };
    }) as Spot[];
    console.log('Updated spots array:', spots.value);
  }, (error: unknown) => {
    console.error("Error loading spots:", error);
  });
}

// compute markers with duplicate flags
function computeMarkersWithDuplicates(items: Spot[]) {
  // group by rounded lat/lng (4 decimal places)
  const groups: Record<string, Spot[]> = {};
  for (const s of items) {
    const key = `${s.lat.toFixed(4)}|${s.lng.toFixed(4)}`;
    groups[key] = groups[key] || [];
    groups[key].push(s);
  }
  // mark duplicates
  const result: Spot[] = items.map(s => ({ ...s }));
  for (const key of Object.keys(groups)) {
    const group = groups[key];
    if (group.length > 1) {
      // set isDuplicate = true for these items in result
      for (const g of group) {
        const idx = result.findIndex(r => r.id === g.id);
        if (idx !== -1) result[idx].isDuplicate = true;
      }
    }
  }
  return result;
}

const showForm = ref(false);
const form = ref({ lat: 0, lng: 0, title: "", description: "" });

// Reference to Firestore unsubscribe function
let unsubscribe: (() => void) | undefined;


function cancel() {
  showForm.value = false;
  form.value = { lat: 0, lng: 0, title: "", description: "" };
  editingId.value = null;
}

// Subscribe to real-time updates
onMounted(() => {
  checkAuth();
});

// Clean up subscription when component unmounts
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

async function addSpot() {
  const lat = Number(Number(form.value.lat).toFixed(4));
  const lng = Number(Number(form.value.lng).toFixed(4));
  const title = form.value.title || 'New spot';
  const description = form.value.description || '';

  try {
    if (editingId.value) {
      // Update existing document in place (keep its current ID and don't change createdBy)
      await setDoc(doc(db, 'spots', editingId.value), { lat, lng, title, description }, { merge: true });
      cancel();
      return;
    }

    // Create new document with deterministic ID and creator name
    const payload = { lat, lng, title, description, createdBy: userName.value, createdAt: Timestamp.now() };
    const id = encodeURIComponent(`${lat.toFixed(4)}|${lng.toFixed(4)}|${title}`);
    await setDoc(doc(db, 'spots', id), payload);
    cancel();
  } catch (err) {
    console.error('Failed to save spot to Firestore:', err);
  }
}

function onAddMarker(latlng: { lat: number; lng: number }) {
  // prefill the form with the map-clicked coordinates and open the form (rounded to 4 decimals)
  form.value.lat = Number(latlng.lat.toFixed(4));
  form.value.lng = Number(latlng.lng.toFixed(4));
  form.value.title = "";
  form.value.description = "";
  showForm.value = true;
}

function openNewSpotForm() {
  // Open form with default center coordinates
  form.value.lat = Number(center.value.lat.toFixed(4));
  form.value.lng = Number(center.value.lng.toFixed(4));
  form.value.title = "";
  form.value.description = "";
  editingId.value = null;
  showForm.value = true;
}

function onEditSpot(spot: any) {
  if (!spot) return;
  editingId.value = String(spot.id ?? "");
  form.value.lat = Number(Number(spot.lat).toFixed(4));
  form.value.lng = Number(Number(spot.lng).toFixed(4));
  form.value.title = spot.title || '';
  form.value.description = spot.description || '';
  showForm.value = true;
}

// Delete handler tries direct doc id, then encoded id, then sha1 id (imported)
async function onDeleteSpot(spot: any) {
  try {
    if (!spot) return;
    if (spot.id) {
      await deleteDoc(doc(db, 'spots', String(spot.id)));
      console.log('Deleted spot', spot.id);
      return;
    }

    const lat = Number(spot?.lat || 0).toFixed(4);
    const lng = Number(spot?.lng || 0).toFixed(4);
    const title = spot?.title || '';
    const encoded = encodeURIComponent(`${lat}|${lng}|${title}`);

    let sha1hex: string | null = null;
    try {
      const enc = new TextEncoder().encode(`${lat}|${lng}|${title}`);
      const hash = await (window.crypto as any).subtle.digest('SHA-1', enc);
      sha1hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
      // ignore
    }

    const candidates = [encoded];
    if (sha1hex) candidates.push(sha1hex);

    for (const id of candidates) {
      try {
        await deleteDoc(doc(db, 'spots', id));
        console.log('Deleted spot by id', id);
        return;
      } catch (err) {
        // try next
      }
    }

    console.warn('Could not delete spot - no matching id found');
  } catch (err) {
    console.error('Failed to delete spot', err);
  }
}
</script>


