<template>
  <button
    type="button"
    class="bookmark-button"
    :class="{ active: active }"
    :aria-label="ariaLabel"
    :title="title"
    @click.stop="$emit('toggle')"
  >
    <svg
      class="bookmark-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      aria-hidden="true"
    >
      <path :d="iconPath" />
    </svg>
  </button>
</template>

<script>
const BOOKMARK_EMPTY_PATH =
  "M128 128C128 92.7 156.7 64 192 64L448 64C483.3 64 512 92.7 512 128L512 545.1C512 570.7 483.5 585.9 462.2 571.7L320 476.8L177.8 571.7C156.5 585.9 128 570.6 128 545.1L128 128zM192 112C183.2 112 176 119.2 176 128L176 515.2L293.4 437C309.5 426.3 330.5 426.3 346.6 437L464 515.2L464 128C464 119.2 456.8 112 448 112L192 112z";
const BOOKMARK_FILLED_PATH =
  "M192 64C156.7 64 128 92.7 128 128L128 544C128 555.5 134.2 566.2 144.2 571.8C154.2 577.4 166.5 577.3 176.4 571.4L320 485.3L463.5 571.4C473.4 577.3 485.7 577.5 495.7 571.8C505.7 566.1 512 555.5 512 544L512 128C512 92.7 483.3 64 448 64L192 64z";

export default {
  name: "BookmarkButton",
  props: {
    active: {
      type: Boolean,
      default: false,
    },
    ariaLabel: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
  },
  computed: {
    iconPath() {
      return this.active ? BOOKMARK_FILLED_PATH : BOOKMARK_EMPTY_PATH;
    },
  },
};
</script>

<style scoped>
.bookmark-button {
  background: transparent;
  color: #ffbf46;
  border: 1px solid #ffbf46;
  border-radius: 999px;
  padding: 0.15rem 0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.bookmark-button:hover {
  background: #ffbf46;
  color: #1a1a1a;
}

.bookmark-button.active {
  background: #ffbf46;
  color: #1a1a1a;
}

.bookmark-icon {
  width: 1.1rem;
  height: 1.1rem;
  fill: currentColor;
}
</style>
