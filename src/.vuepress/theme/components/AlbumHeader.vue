<template>
  <div class="header">

    <div class="column">
      <Label class="label">Title:</Label>
      <span class="value">{{ title }}</span>
    </div>

    <div class="column">
      <Label class="label">Release Date:</Label>
      <span class="value">{{ release_date }}</span>
    </div>

    <div class="column">
      <Label class="label">Narrated by:</Label>
      <span class="value">{{ narrated_by }}</span>
    </div>

     <div class="column">
      <Label class="label">Starting Turn:</Label>
      <span class="value">{{ starting_turn }}</span>
    </div>

     <div class="column">
      <Label class="label">Audio Narration:</Label>
      <span class="value">{{ audio_narration }}</span>
    </div>



  </div>

</template>

<script>
  export default {
    props: {
      title: {
        type: String,
        required: true
      },
      release_date: {
        type: String,
        required: true
      },
      narrated_by: {
        type: String,
        required: true
      },
      starting_turn: {
        type: String,
        required: true
      },
      audio_narration: {
        type: String,
        required: true
      },
      abstract: {
        type: String
      },  
      scenes: {
        type: Array,
        required: true
      }
    }
  }
</script>

<style scoped>

  .header {
    display: flex;
    padding: 2rem 0 0;
    width: 100%;
    max-width: 800px;
    margin: 0 auto 3rem auto;
  }

  .column {
    flex: 0 0 20%;
  }

  .label {
    margin-bottom: 0.5rem;
    font-weight: 700;
  }

  .value {
    font-weight: 400;
  }

  img {
    width: 100%;
    max-width: 100%;
    line-height: 0;
    margin: 2rem 0;
  }

</style>
