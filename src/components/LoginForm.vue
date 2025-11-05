<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Welcome</h1>
      <p class="text-gray-600 mb-6">Please enter your name to access the travel planner</p>
      
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
          <input 
            v-model="name" 
            type="text" 
            id="name"
            placeholder="Enter your name"
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
        </div>
        
        <button 
          type="submit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
        >
          Continue
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { setCookie } from '@/composables/useCookie';

const name = ref('');
const emit = defineEmits<{
  (e: 'login', userName: string): void;
}>();

function handleLogin() {
  if (name.value.trim()) {
    setCookie('traveller-name', name.value.trim());
    emit('login', name.value.trim());
  }
}
</script>
