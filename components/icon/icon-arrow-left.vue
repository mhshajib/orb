<template>
    <!-- Points left, as the name says. It used to draw
         "M4 12H20M20 12L14 6M20 12L14 18" - an arrow pointing RIGHT - so every
         "Back" button in the app rendered as "→ Back", and ComposeWindow's
         rotate-90 "Expand" control pointed down while the window grows upward.
         All four call sites are correct now without touching their markup. -->
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
</template>
