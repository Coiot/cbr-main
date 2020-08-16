<template>
  <transition name="fade">
    <div>
      <div class="edition-list">
        <div class="list" @click="clickedEdition = 'S1List'">
          <p>Season One</p>
        </div>

        <div class="list" @click="clickedEdition = 'Mk2List'">
          <p>Mark Two</p>
        </div>

        <div class="list" @click="clickedEdition = 'PRList'">
          <p>Power Rankings</p>
        </div>

        <div class="list" @click="clickedEdition = 'OthersList'">
          <p>Others</p>
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
  width: 100%;
  display: flex;
  justify-content: space-around;
  margin: 4rem 0 0;
}

.list {
  flex-grow: 1;
  color: $textColor;
  text-shadow: 1px 2px #083832;
  background-color: #202020;
  border: 1px double #fff;
  padding: 1em 2em;
  margin: 0 1rem 2vw;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.list:hover {
  box-shadow: 0 6px 2px 0 rgba(8, 56, 50, 0.3);
  transform: scale(1.01);
}

.list p {
  font-size: 1rem;
  font-weight: 800;
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
