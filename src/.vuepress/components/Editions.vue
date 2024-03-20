<template>
  <transition name="fade">
    <div>
      <div class="edition-list">
        <div class="list" @click="clickedEdition = 'S4List'">
          <span>CBRX Season 4</span>
        </div>

        <div class="list" @click="clickedEdition = 'S3List'">
          <span>CBRX Season 3</span>
        </div>

        <div class="list" @click="clickedEdition = 'S2List'">
          <span>CBRX Season 2</span>
        </div>

        <div class="list" @click="clickedEdition = 'S1List'">
          <span>CBRX Season 1</span>
        </div>

        <div class="list" @click="clickedEdition = 'Mk2List'">
          <span>CBR Mark 2</span>
        </div>

        <div class="list" @click="clickedEdition = 'PRList'">
          <span>Power Rankings</span>
        </div>

        <div class="list" @click="clickedEdition = 'OthersList'">
          <span>Others</span>
        </div>
      </div>
      <component :is="clickedEdition"></component>
    </div>
  </transition>
</template>

<script>
import S4List from "./S4List.vue";

export default {
  data() {
    return {
      clickedEdition: S4List,
    };
  },
  components: {
    S4List,
  },
  computed: {},
}
</script>

<style scoped>
.edition-list {
  height: 3.4rem;
  display: flex;
  justify-content: center;
  background-color: #fff;
  border-bottom: 4px solid #ffbf46;
  padding: 0.3em 1.5em 0;
  margin: 0 0 3rem;
}

.list {
  width: max-content;
  display: flex;
  flex-grow: 1;
  justify-content: center;
  color: #1a1a1a;
  cursor: pointer;
  margin: 0.8rem 0;
}

.list span {
  font-size: 1.2rem;
  font-weight: 800;
  text-shadow: 1px 1px #eee;
  transition: all 0.1s ease-in-out;
}

.list span:hover {
  border-bottom: 3px solid #ffcc6b;
  transform: scale(1.03);
}

@media (max-width: 799px) {
  .list span {
    font-size: 0.9rem;
  }

  .edition-list {
    display: none;
  }

  .list {
    word-break: break-all;
    padding: 0;
    margin: 0.5rem 1.5rem;
  }
}
</style>
