<template>
  <transition name="fade">
    <div>
      <div class="edition-list">
        <div class="list">
          <span>Season Two</span>
        </div>

        <div class="list" @click="clickedEdition = 'S1List'">
          <span>Season One</span>
        </div>

        <div class="list" @click="clickedEdition = 'Mk2List'">
          <span>Mark Two</span>
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
import S1List from "./S1List.vue";

export default {
  data() {
    return {
      clickedEdition: S1List,
    };
  },
  components: {
    S1List,
  },
  computed: {},
};
</script>

<style scoped>
.edition-list {
  height: 3.4rem;
  display: flex;
  justify-content: center;
  background-color: #fff;
  border-bottom: 4px solid #ffbf46;
  padding: 0.3em 1.5em 0;
  margin: 0 0 1rem;
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

@media (max-width: 719px) {
  .edition-list {
    flex-flow: column;
    margin: 1rem 0 0;
  }

  .list {
    word-break: break-all;
    padding: 0 1rem;
    margin: 0.5rem 1.5rem;
  }
}
</style>
