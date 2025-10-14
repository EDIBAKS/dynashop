<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container :style="wallpaperStyle">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import wallpaperUrl from '../assets/63934.jpg'

const wallpaperStyle = {
  backgroundImage: `url(${wallpaperUrl})`,
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundAttachment: 'fixed',
  minHeight: '100vh',
}
</script>
