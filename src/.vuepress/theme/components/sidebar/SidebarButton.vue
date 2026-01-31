<template>
  <div class="sidebar-button" @click="$emit('toggle-sidebar')">
    <svg
      class="icon"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
      viewBox="0 0 448 512"
    >
      <path
        fill="1a1a1a"
        d="M436 124H12c-6.627 0-12-5.373-12-12V80c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v32c0 6.627-5.373 12-12 12zm0 160H12c-6.627 0-12-5.373-12-12v-32c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v32c0 6.627-5.373 12-12 12zm0 160H12c-6.627 0-12-5.373-12-12v-32c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v32c0 6.627-5.373 12-12 12z"
      ></path>
    </svg>
  </div>
</template>

<style>
.sidebar-button {
  position: absolute;
  inset-block-start: 0.4rem;
  inset-inline-start: 0.4rem;
  display: none;
  align-items: center;
  justify-content: center;
  inline-size: 2.6rem;
  block-size: 2.6rem;
  background: #fff;
  cursor: pointer;
}
.sidebar-button .icon {
  display: block;
  inline-size: 1.35rem;
  block-size: 1.35rem;
}
.sidebar-button:hover {
  fill: #000;
}
@media (max-width: 799px) {
  .sidebar-button {
    display: flex;
  }
}
</style>
