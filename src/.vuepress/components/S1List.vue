<template>
  <transition name="fade">
    <div class="album-list">
      <div class="header">
        <h1>Season One</h1>
        <span>June 19, 2019 – July 08, 2020</span>
      </div>
      <router-link
        :to="post.path"
        tag="div"
        v-for="(post,index) in albums"
        v-if="index < 1"
        :key="post.title"
        class="post"
        :style="{ backgroundImage: `url(${post.frontmatter.image})` }"
        :tabindex="0"
      >
        <div class="title-info">
          <p>{{ post.frontmatter.title }}</p>
          <span v-if="post.frontmatter.edition">{{ post.frontmatter.edition }}</span>
        </div>

        <div class="album-info">
          <p>{{ post.frontmatter.narrated_by }}</p>
          <span>Starting Turn: {{ post.frontmatter.starting_turn }}&emsp;Release Date: {{ post.frontmatter.release_date }}</span>
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
          <h2>A New History</h2>
          <span>Arc One</span>
          <p>61 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 0 && index < 37"
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
                <span>Starting Turn: {{ post.frontmatter.starting_turn }}&emsp;Release Date: {{ post.frontmatter.release_date }}</span>
              </p>
            </div>
          </router-link>
        </article>
      </div>
      <h1>Cycle Two</h1>
      <div class="arc">
        <div class="arc-header">
          <h2>Time Reset</h2>
          <span>Arc #</span>
          <p>33 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 36 && index < 54"
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
                <span>Starting Turn: {{ post.frontmatter.starting_turn }}&emsp;Release Date: {{ post.frontmatter.release_date }}</span>
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
  name: "Season One",
  data() {
    return {
      civs: [
        {
          name: "Algeria",
          leader: "Abdelkader	",
          author: "DJSHenninger",
        },
        {
          name: "Apache",
          leader: "Geronimo	",
          author: "Uighur_Caesar",
        },
        {
          name: "Australia",
          leader: "Bob Hawke	",
          author: "Colonialist Legacies",
        },
        {
          name: "Aztec",
          leader: "Montezuma",
          author: "Firaxis",
        },
        {
          name: "Benin",
          leader: "Ewuare",
          author: "LastSword",
        },
        {
          name: "Beta Israel",
          leader: "Gudit",
          author: "DMS",
        },
        {
          name: "Canada",
          leader: "William Lyon Mackenzie King",
          author: "LunarNeedle",
        },
        {
          name: "Canton Pirates",
          leader: "Ching Shih",
          author: "Scissor",
        },
        {
          name: "Czech Republic",
          leader: "Vaclac Havel",
          author: "SabyZ",
        },
        {
          name: "Evenks",
          leader: "Bombogor",
          author: "Sensidenshi",
        },
        {
          name: "Golden Horde	",
          leader: "Tokhtamysh",
          author: "Chaingunfighter1",
        },
        {
          name: "Goths",
          leader: "Alaric",
          author: "Tomatekh",
        },
        {
          name: "Haida",
          leader: "Koyah",
          author: "LastSword",
        },
        {
          name: "Haiti",
          leader: "Toussaint Louverture",
          author: "Leugi",
        },
        {
          name: "Holy Roman Empire",
          leader: "Elected Emperor",
          author: "LastSword",
        },
        {
          name: "India",
          leader: "Indira Gandhi",
          author: "Scissor",
        },
        {
          name: "Iroquois",
          leader: "Hiawatha",
          author: "Chrisy15",
        },
        {
          name: "Kazakhs",
          leader: "Ablai Khan",
          author: "DJSHenninger",
        },
        {
          name: "Khamug Khanate",
          leader: "Jamukha",
          author: "Lungora",
        },
        {
          name: "Korea",
          leader: "Seonjo",
          author: "Sensidenshi",
        },
        {
          name: "Kuikuro",
          leader: "Anetü",
          author: "Tomatekh",
        },
        {
          name: "Libya",
          leader: "Omar Mukhtar",
          author: "Jmangelo",
        },
        {
          name: "Madagascar",
          leader: "Ranavalona I",
          author: "DMS & Colonialist Legacies",
        },
        {
          name: "Manx",
          leader: "Illiam Dhone",
          author: "ryanjames",
        },
        {
          name: "Maratha",
          leader: "Shivaji",
          author: "MoreCivs",
        },
        {
          name: "Métis",
          leader: "Louis Riel",
          author: "Vivala",
        },
        {
          name: "Minoa",
          leader: "Minos",
          author: "More Civilizations",
        },
        {
          name: "Moors",
          leader: "Abd-ar Rahman III",
          author: "Sukitract",
        },
        {
          name: "Murri	",
          leader: "Gambu Ganuurru",
          author: "Colonialist Legacies",
        },
        {
          name: "Muscovy",
          leader: "Ivan IV",
          author: "JFD & Janboruta",
        },
        {
          name: "Nazca",
          leader: "Cahuachi",
          author: "More Civs",
        },
        {
          name: "Ndongo",
          leader: "Nzinga",
          author: "LastSword",
        },
        {
          name: "Nenets",
          leader: "Vauli Piettomin",
          author: "Gedemo",
        },
        {
          name: "Nepal",
          leader: "Prithvi Narayan",
          author: "LastSword",
        },
        {
          name: "New Zealand",
          leader: "Richard Seddon",
          author: "JFD & Janboruta",
        },
        {
          name: "Nubia",
          leader: "Piye",
          author: "More Civilizations & Light in the East",
        },
        {
          name: "Oman",
          leader: "Saif bin Sultan",
          author: "More Civilizations",
        },
        {
          name: "Ottomans",
          leader: "Mehmed II",
          author: "JFD & Janboruta",
        },
        {
          name: "Palmyra",
          leader: "Zenobia",
          author: "Firebug",
        },
        {
          name: "Papua",
          leader: "Rajapapua",
          author: "Gedemo",
        },
        {
          name: "Parthia",
          leader: "Mithridates I",
          author: "TarcisioCM",
        },
        {
          name: "Poverty Point",
          leader: "Táhera	",
          author: "Tomatekh",
        },
        {
          name: "Prussia",
          leader: "Frederick",
          author: "JFD & Janboruta",
        },
        {
          name: "Qin",
          leader: "Ying Zheng	",
          author: "Captain",
        },
        {
          name: "Qing",
          leader: "Cixi",
          author: "JFD & Janboruta",
        },
        {
          name: "Sami	",
          leader: "Eadni",
          author: "Sukitract",
        },
        {
          name: "Scotland",
          leader: "Robert I Bruce",
          author: "More Civilizations",
        },
        {
          name: "Seljuqs",
          leader: "Alp Arslan",
          author: "DJSHenninger",
        },
        {
          name: "Selk'nam",
          leader: "Xo'on Uhan-Té",
          author: "Grant",
        },
        {
          name: "Shikoku",
          leader: "Sakamoto Ryoma",
          author: "Homusubi",
        },
        {
          name: "Songhai",
          leader: "Askia",
          author: "Firaxis",
        },
        {
          name: "Sulu",
          leader: "Jamalul Kiram II	",
          author: "Cardboard",
        },
        {
          name: "Taungoo",
          leader: "Bayinnaung",
          author: "EmeraldRange",
        },
        {
          name: "Tonga",
          leader: "Siaosi",
          author: "ExplosiveWatermelon",
        },
        {
          name: "Uruguay",
          leader: "Juan Antonio Lavalleja",
          author: "TechnostarBTD5",
        },
        {
          name: "Venezuela",
          leader: "Hugo Chavez",
          author: "DMS",
        },
        {
          name: "Venice",
          leader: "Enrico Dandolo",
          author: "Chrisy15",
        },
        {
          name: "Vikings",
          leader: "Ragnar",
          author: "LastSword",
        },
        {
          name: "Xia",
          leader: "Yu",
          author: "Tomatekh",
        },
        {
          name: "Yup'ik",
          leader: "Apaanugpak",
          author: "Gedemo",
        },
        {
          name: "Zimbabwe",
          leader: "Nyatsimba Mutota",
          author: "LastSword",
        },
      ],
    };
  },
  computed: {
    albums() {
      return this.$site.pages
        .filter(
          (x) => x.path.startsWith("/albums/s1") && !x.frontmatter.exclude
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
  color: hsl(40, 80%, 60%);
  font-size: 0.9rem;
  margin-right: 0.9rem;
}

.competitors li:hover {
  color: #ffbf46;
  transform: scale(1.02);
}

.competitors p {
  font-size: 1.25rem;
  font-weight: 900;
  text-shadow: 2px 2px #083832;
  padding-right: 0.7rem;
  margin: 0.5rem 0;
}

.competitors span {
  color: #fff !important;
  font-size: 0.8rem;
  font-weight: 400;
  text-shadow: 2px 2px #083832;
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
