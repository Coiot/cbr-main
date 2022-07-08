<template>
  <transition name="fade">
    <div class="album-list">
      <div class="header">
        <h1>Season Two</h1>
        <span>February 10, 2021 – June 19, 2022 </span>
      </div>
      <router-link
        :to="post.path"
        tag="div"
        v-for="(post, index) in albums"
        v-if="index < 1"
        :key="post.title"
        class="post"
        :style="{ backgroundImage: `url(${post.frontmatter.image})` }"
        :tabindex="0"
      >
        <div class="title-info">
          <p>{{ post.frontmatter.title }}</p>
          <span v-if="post.frontmatter.edition">{{
            post.frontmatter.edition
          }}</span>
        </div>

        <div class="album-info">
          <p>{{ post.frontmatter.narrated_by }}</p>
          <span
            >Starting Turn: {{ post.frontmatter.starting_turn }}&emsp;Release
            Date: {{ post.frontmatter.release_date }}</span
          >
        </div>
      </router-link>

      <h1>Competitors</h1>
      <ul class="competitors">
        <li v-for="civ in civs">
          <p>{{ civ.name }}</p>
          <span>{{ civ.leader }} – {{ civ.author }}</span>
        </li>
      </ul>

      <h1>Cycle One</h1>
      <div class="arc">
        <div class="arc-header">
          <h2>Stirred Embers</h2>
          <span>Arc One</span>
          <p>61 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post, index) in albums"
            v-if="index > 0 && index < 6"
            :key="post.title"
            :tabindex="0"
          >
            <div class="list">
              <p>
                {{ post.frontmatter.title }}
                <span>{{ post.frontmatter.edition }}</span>
              </p>

              <p>
                {{ post.frontmatter.narrated_by }}
                <span
                  >Starting Turn:
                  {{ post.frontmatter.starting_turn }}&emsp;Release Date:
                  {{ post.frontmatter.release_date }}</span
                >
              </p>
            </div>
          </router-link>
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h2>Memento Mori</h2>
          <span>Arc Two</span>
          <p>61 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post, index) in albums"
            v-if="index > 5 && index < 10"
            :key="post.title"
            :tabindex="0"
          >
            <div class="list">
              <p>
                {{ post.frontmatter.title }}
                <span>{{ post.frontmatter.edition }}</span>
              </p>

              <p>
                {{ post.frontmatter.narrated_by }}
                <span
                  >Starting Turn:
                  {{ post.frontmatter.starting_turn }}&emsp;Release Date:
                  {{ post.frontmatter.release_date }}</span
                >
              </p>
            </div>
          </router-link>
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h2>The Culling</h2>
          <span>Arc Three</span>
          <p>54 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post, index) in albums"
            v-if="index > 9 && index < 15"
            :key="post.title"
            :tabindex="0"
          >
            <div class="list">
              <p>
                {{ post.frontmatter.title }}
                <span>{{ post.frontmatter.edition }}</span>
              </p>

              <p>
                {{ post.frontmatter.narrated_by }}
                <span
                  >Starting Turn:
                  {{ post.frontmatter.starting_turn }}&emsp;Release Date:
                  {{ post.frontmatter.release_date }}</span
                >
              </p>
            </div>
          </router-link>
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h2>Centuries Of Agony</h2>
          <span>Arc Four</span>
          <p>46 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post, index) in albums"
            v-if="index > 14 && index < 23"
            :key="post.title"
            :tabindex="0"
          >
            <div class="list">
              <p>
                {{ post.frontmatter.title }}
                <span>{{ post.frontmatter.edition }}</span>
              </p>

              <p>
                {{ post.frontmatter.narrated_by }}
                <span
                  >Starting Turn:
                  {{ post.frontmatter.starting_turn }}&emsp;Release Date:
                  {{ post.frontmatter.release_date }}</span
                >
              </p>
            </div>
          </router-link>
        </article>
      </div>
      <h1>Cycle Two</h1>
      <div class="arc">
        <div class="arc-header">
          <h2>Reborn to Die</h2>
          <span>Arc Five</span>
          <p>22 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post, index) in albums"
            v-if="index > 22 && index < 29"
            :key="post.title"
            :tabindex="0"
          >
            <div class="list">
              <p>
                {{ post.frontmatter.title }}
                <span>{{ post.frontmatter.edition }}</span>
              </p>

              <p>
                {{ post.frontmatter.narrated_by }}
                <span
                  >Starting Turn:
                  {{ post.frontmatter.starting_turn }}&emsp;Release Date:
                  {{ post.frontmatter.release_date }}</span
                >
              </p>
            </div>
          </router-link>
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h2>Low Mountains, High Tides</h2>
          <span>Arc Six</span>
          <p>16 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post, index) in albums"
            v-if="index > 28 && index < 33"
            :key="post.title"
            :tabindex="0"
          >
            <div class="list">
              <p>
                {{ post.frontmatter.title }}
                <span>{{ post.frontmatter.edition }}</span>
              </p>

              <p>
                {{ post.frontmatter.narrated_by }}
                <span
                  >Starting Turn:
                  {{ post.frontmatter.starting_turn }}&emsp;Release Date:
                  {{ post.frontmatter.release_date }}</span
                >
              </p>
            </div>
          </router-link>
        </article>
      </div>
      <div class="arc">
        <div class="arc-header">
          <h2>Queen's Gambit</h2>
          <span>Arc Seven</span>
          <p>13 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post, index) in albums"
            v-if="index > 32 && index < 40"
            :key="post.title"
            :tabindex="0"
          >
            <div class="list">
              <p>
                {{ post.frontmatter.title }}
                <span>{{ post.frontmatter.edition }}</span>
              </p>

              <p>
                {{ post.frontmatter.narrated_by }}
                <span
                  >Starting Turn:
                  {{ post.frontmatter.starting_turn }}&emsp;Release Date:
                  {{ post.frontmatter.release_date }}</span
                >
              </p>
            </div>
          </router-link>
        </article>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "Season Two",
  data() {
    return {
      civs: [
        {
          name: "Anangu",
          leader: "Anangu",
          author: "TopHatPaladin",
        },
        {
          name: "Bhutan",
          leader: "Jigme Singye Wangchuck",
          author: "RawSasquatch",
        },
        {
          name: "Burkina Faso",
          leader: "Thomas Sankara",
          author: "DMS",
        },
        {
          name: "Chinook",
          leader: "Comcomly",
          author: "Sukritact",
        },
        {
          name: "Chola",
          leader: "Raja Raja I",
          author: "More Civilizations",
        },
        {
          name: "Chukchi",
          leader: "Lawtiliwadlin",
          author: "Senshidenshi",
        },
        {
          name: "Dene",
          leader: "Thanadelthur",
          author: "Colonialist Legacies",
        },
        {
          name: "Dutch East India Company",
          leader: "Jan Coen",
          author: "Vanadius",
        },
        {
          name: "Finland",
          leader: "Mannerheim",
          author: "Hypereon",
        },
        {
          name: "Gauls",
          leader: "Vercingetorix",
          author: "Sukritact",
        },
        {
          name: "Georgia",
          leader: "Tamar",
          author: "Urdnot_Scott",
        },
        {
          name: "Germany",
          leader: "Wilhelm II",
          author: "TarcisioCM",
        },
        {
          name: "Gran Colombia",
          leader: "Simon Bolivar",
          author: "Leugi",
        },
        {
          name: "Great Perm",
          leader: "Stephen",
          author: "CurlySnail",
        },
        {
          name: "Hawaii",
          leader: "Lili'uokalani",
          author: "JFD and Janboruta",
        },
        {
          name: "Hejaz",
          leader: "Hussein bin Ali",
          author: "Uighur_Caesar",
        },
        {
          name: "Iceland",
          leader: "Kristjan Eldjarn",
          author: "DuskJockey",
        },
        {
          name: "Jamaica",
          leader: "Marcus Garvey",
          author: "PiGreat",
        },
        {
          name: "Japan",
          leader: "Tanaka Kakuei",
          author: "Homusubi",
        },
        {
          name: "Jerusalem",
          leader: "Baldwin III",
          author: "More Civilizations",
        },
        {
          name: "Kosovo",
          leader: "Ibrahim Rugova",
          author: "Silent Forza",
        },
        {
          name: "Kulin",
          leader: "William Barak",
          author: "Colonialist Legacies",
        },
        {
          name: "Kurdistan",
          leader: "Mustafa Barzani",
          author: "Uighur_Caesar",
        },
        {
          name: "Laos",
          leader: "Fa Ngum",
          author: "JFD",
        },
        {
          name: "Lesotho",
          leader: "Moshoeshoe I",
          author: "CurlySnail",
        },
        {
          name: "Malacca",
          leader: "Mansur Shah",
          author: "Orangechrisy",
        },
        {
          name: "Manchu",
          leader: "Nurhaci",
          author: "Senshidenshi",
        },
        {
          name: "Mapuche",
          leader: "Lautaro",
          author: "Leugi",
        },
        {
          name: "Marajoara",
          leader: "P'küee",
          author: "Senshidenshi",
        },
        {
          name: "Mississippi",
          leader: "Tuskaloosa",
          author: "Tomatekh",
        },
        {
          name: "Namibia",
          leader: "Jacob Morenga",
          author: "TopHatPaladin",
        },
        {
          name: "Neutral Nation",
          leader: "Tsouharissen",
          author: "Dawkinzz and Round Table",
        },
        {
          name: "New Netherland",
          leader: "Peter Stuyvesant",
          author: "Vanadius",
        },
        {
          name: "Nigeria",
          leader: "Awolowo",
          author: "Colonialist Legacies",
        },
        {
          name: "Northern Yuan",
          leader: "Mandukhai",
          author: "TopHatPaladin",
        },
        {
          name: "Olmecs",
          leader: "U Kix Chan",
          author: "Leugi & Tomatekh",
        },
        {
          name: "Paraguay",
          leader: "Solano López",
          author: "Uighur_Caesar",
        },
        {
          name: "Peru-Bolivia",
          leader: "Andrés de Santa Cruz",
          author: "Senshidenshi",
        },
        {
          name: "Provisional All-Russian Government",
          leader: "Kolchak",
          author: "ExplosiveWatermelon",
        },
        {
          name: "Ptolemies",
          leader: "Cleopatra",
          author: "Light in the East & TarcisioCM",
        },
        {
          name: "Punjab",
          leader: "Ranjit Singh",
          author: "JFD & Janboruta",
        },
        {
          name: "Quilombo dos Palmares",
          leader: "Zumbi",
          author: "PorkBean",
        },
        {
          name: "Rio Grande",
          leader: "Antonio Canales Rosillo",
          author: "JakeWalrusWhale",
        },
        {
          name: "Somalia",
          leader: "Mohammed Siad Barre",
          author: "TopHatPaladin",
        },
        {
          name: "Soviet Russia",
          leader: "Lenin",
          author: "JFD & Janboruta",
        },
        {
          name: "Spain",
          leader: "Carlos III",
          author: "TarcisioCM",
        },
        {
          name: "Sweden",
          leader: "Karl XII",
          author: "JFD & Janboruta",
        },
        {
          name: "Tahiti",
          leader: "Purea",
          author: "LastSword",
        },
        {
          name: "Taiping Heavenly Kingdom",
          leader: "Hong Xiuquan",
          author: "PorkBean",
        },
        {
          name: "Teutonic Order",
          leader: "Hermann von Salza",
          author: "Uighur_Caesar",
        },
        {
          name: "Three Affiliated Tribes",
          leader: "Four Bears",
          author: "Sukritact",
        },
        {
          name: "Tongva",
          leader: "Toypurina",
          author: "RawSasquatch",
        },
        {
          name: "Tuareg",
          leader: "Tin Hinan",
          author: "More Civilizations",
        },
        {
          name: "Two Sicilies",
          leader: "Ferdinand I",
          author: "JFD & Janboruta",
        },
        {
          name: "Uzbekistan",
          leader: "Islam Karimov",
          author: "JakeWalrusWhale",
        },
        {
          name: "Vandals",
          leader: "Genseric",
          author: "JFD & Janboruta",
        },
        {
          name: "Vietnam",
          leader: "Ho Chi Minh",
          author: "Chrisy15",
        },
        {
          name: "Wales",
          leader: "Llywelyn",
          author: "Hiram",
        },
        {
          name: "Yuan",
          leader: "Yuan",
          author: "TarcisioCM and Chrisy15",
        },
        {
          name: "Zaire",
          leader: "Mobutu Sese Seko",
          author: "DMS",
        },
        {
          name: "Zanzibar",
          leader: "Barghash bin Said",
          author: "Senshidenshi",
        },
      ],
    };
  },
  computed: {
    albums() {
      return this.$site.pages
        .filter(
          (x) => x.path.startsWith("/albums/s2") && !x.frontmatter.exclude
        )
        .sort(
          (b, a) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date)
        );
    },
  },
};
</script>

<style scoped>
.album-list {
  margin: 0 5rem;
}

.header {
  display: inline-flex;
  align-items: baseline;
}

.header span {
  font-size: 1.5rem;
  font-weight: 300;
  text-shadow: 2px 2px #083832;
  margin-left: 2rem;
}

.post {
  position: relative;
  width: 100%;
  height: 80vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: 0 6px 0 0 #ffbf46;
  margin-bottom: 2.5rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.post:hover {
  box-shadow: 0 2px 0 0 #ffbf46;
  transform: scale(1.01);
}

img {
  width: 100%;
  line-height: 0;
  margin: 2rem 0;
}

.title-info {
  position: absolute;
  left: 0;
  top: 2rem;
  padding: 1.5rem 2rem;
  text-shadow: 2px 2px #083832;
  background: #202020;
  border: 1px double #fff;
  border-left: 0;
  box-shadow: 1px 4px 3px 0 rgba(19, 0, 0, 0.3);
  max-width: 550px;
}

.title-info p {
  display: inline-block;
  width: auto;
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
}

.title-info span {
  margin: 0;
  margin-left: 0.5rem;
  font-size: 1.1rem;
}

.album-info {
  position: absolute;
  right: 0;
  bottom: 1rem;
  padding: 1.5rem 2rem;
  color: #1a1a1a;
  text-shadow: 2px 2px #eee;
  background: #fff;
  border: 1px double #1a1a1a;
  border-right: 0;
  box-shadow: -3px 4px 0 0 #ffbf46;
  max-width: 900px;
}

.album-info p {
  display: inline-block;
  width: auto;
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
}

.album-info span {
  margin: 0;
  margin-left: 0.5rem;
  font-size: 1rem;
}

h1 {
  font-size: 4rem;
  font-weight: 900;
  text-shadow: 3px 3px #083832;
  padding: 0.7em 0 0.1em;
  margin-top: 0;
}

.competitors {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  grid-template-rows: repeat(auto-fit, minmax(0.3rem, 1fr));
  list-style-type: none;
  counter-reset: civs;
}

.competitors li {
  width: 100%;
  display: flex;
  flex-flow: row;
  align-items: baseline;
  counter-increment: civs;

  transition: all 0.2s ease-in-out;
}

.competitors li:before {
  content: counter(civs);
  color: #444;
  font-size: 0.9rem;
  margin-right: 0.9rem;
}

.competitors li:hover {
  color: #ffbf46;
  transform: scale(1.02);
}

.competitors p {
  font-size: 1.2rem;
  font-weight: 900;
  text-shadow: 2px 2px #083832;
  padding-right: 0.5rem;
  margin: 0.5rem 0;
}

.competitors span {
  color: #fff !important;
  font-size: 0.85rem;
  font-weight: 400;
  word-break: break-word;
}

.arc {
  width: 100%;
  display: flex;
  flex-flow: row;
}

.arc + .arc {
  margin: 3em 0;
}

.arc-header {
  width: 50%;
}

.arc-header h2 {
  font-size: 2.2rem;
  font-weight: 900;
  text-shadow: 3px 3px #083832;
  margin: 0 0 0.5em;
}

.arc-header span {
  color: #ffbf46;
  font-size: 1.7rem;
  font-weight: 800;
  text-shadow: 2px 2px #083832;
}

.arc-header p {
  text-shadow: 2px 2px #083832;
  margin-right: 3em;
}

.arc-list {
  width: 80%;
  display: flex;
  flex-flow: column;
  flex-wrap: nowrap;
  flex-grow: 1;
}

.list {
  flex-grow: 1;
  text-shadow: 1px 2px #083832;
  background-color: #202020;
  border: 1px double #fff;
  box-shadow: -4px 4px 0 0 #ffbf46;
  padding: 0em 1.8em;
  margin-bottom: 2.5vw;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.list:hover {
  box-shadow: 0 6px 2px 0 rgba(8, 56, 50, 0.3);
  transform: scale(1.01);
}

.list p {
  font-size: 1.4rem;
  font-weight: 800;
  text-shadow: 2px 2px #083832;
  line-height: 1.2;
}

.list p span {
  font-size: 65%;
  font-weight: 400;
  text-shadow: 2px 2px #083832;
  margin-left: 0.6rem;
}

@media (max-width: 900px) {
  .header {
    flex-flow: column;
    margin-bottom: 2rem;
  }

  .header h1 {
    margin: 0;
  }

  .header span {
    margin-left: 0;
  }

  .arc {
    flex-flow: column;
  }

  .arc-header {
    width: 100%;
    line-height: 0.1;
    padding: 0;
  }

  .arc-header h2 {
    font-size: 3rem;
  }

  .arc-header span {
    font-size: 2.5rem;
  }

  .arc-header p {
    font-size: 1.5rem;
    padding: 1rem 0;
    margin-right: 0;
  }

  .arc-list {
    width: 100%;
  }

  .album-list {
    margin: 1rem 1.5rem 0;
  }

  h1 {
    word-break: break-word;
    padding: 0.4em 0 0.1em;
  }

  h2 {
    word-break: break-word;
    border-bottom: none;
  }
}
</style>
