<template>
  <transition name="fade">
    <div class="album-list">
      <div class="header">
        <h1>Mark Two</h1>
        <span>August 11, 2015 – December 18, 2018</span>
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
          <h2>Mayham</h2>
          <span>Arc One</span>
          <p>61 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 0 && index < 7"
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
      <div class="arc">
        <div class="arc-header">
          <h2>Immortal Paradise</h2>
          <span>Arc Two</span>
          <p>61 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 6 && index < 14"
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
      <div class="arc">
        <div class="arc-header">
          <h2>Age of Discord</h2>
          <span>Arc Three</span>
          <p>60 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 13 && index < 23"
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
      <div class="arc">
        <div class="arc-header">
          <h2>Orange Phase</h2>
          <span>Arc Four</span>
          <p>58 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 22 && index < 33"
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
      <div class="arc">
        <div class="arc-header">
          <h2>Pacific Generation</h2>
          <span>Arc Five</span>
          <p>49 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 32 && index < 42"
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
      <div class="arc">
        <div class="arc-header">
          <h2>Nuclear Season</h2>
          <span>Arc Six</span>
          <p>45 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 41 && index < 49"
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
      <div class="arc">
        <div class="arc-header">
          <h2>Fallout Period</h2>
          <span>Arc Seven</span>
          <p>34 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 48 && index < 57"
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
      <div class="arc">
        <div class="arc-header">
          <h2>Northern Ice Age</h2>
          <span>Arc Eight</span>
          <p>32 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 56 && index < 67"
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
      <div class="arc">
        <div class="arc-header">
          <h2>Grand Alliances</h2>
          <span>Arc Nine</span>
          <p>27 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 66 && index < 74"
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
      <div class="arc">
        <div class="arc-header">
          <h2>Time of Rapture</h2>
          <span>Arc Ten</span>
          <p>24 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 73 && index < 83"
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
          <h2>Rise of the Machines</h2>
          <span>Arc Eleven</span>
          <p>21 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 82 && index < 92"
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
      <div class="arc">
        <div class="arc-header">
          <h2>Bio-Augment Tides</h2>
          <span>Arc Tweleve</span>
          <p>18 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 91 && index < 98"
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
      <div class="arc">
        <div class="arc-header">
          <h2>The Green Revolution</h2>
          <span>Arc Thirteen</span>
          <p>16 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 97 && index < 110"
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
      <div class="arc">
        <div class="arc-header">
          <h2>Samba Forever</h2>
          <span>Arc Fourteen</span>
          <p>11 competitors remain.</p>
        </div>
        <article class="arc-list">
          <router-link
            :to="post.path"
            tag="div"
            v-for="(post,index) in albums"
            v-if="index > 109 && index < 120"
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
  name: "Mk2",
  data() {
    return {
      civs: [
        {
          name: "Afghanistan",
          leader: "Mirwais Hotak",
          author: "Colonialist Legacies",
        },
        {
          name: "Arabia",
          leader: "Harun Al-Rashid",
          author: "Firaxis",
        },
        {
          name: "Argentina",
          leader: "Eva Peron",
          author: "Leugi",
        },
        {
          name: "Armenia",
          leader: "Tiridates III",
          author: "JFD and Janboruta",
        },
        {
          name: "Ashanti",
          leader: "Osei Tutu I",
          author: "MoreCivilizations",
        },
        {
          name: "Australia",
          leader: "Henry Parkes",
          author: "Colonialist Legacies",
        },
        {
          name: "Ayyubids",
          leader: "Saladin",
          author: "MoreCivilizations",
        },
        {
          name: "Blackfoot",
          leader: "Crowfoot",
          author: "Colonialist Legacies",
        },
        {
          name: "Boers",
          leader: "Paul Kruger",
          author: "Colonialist Legacies",
        },
        {
          name: "Brazil",
          leader: "Pedro II",
          author: "Firaxis",
        },
        {
          name: "Buccaneers",
          leader: "Henry Morgan",
          author: "MoreCivilizations",
        },
        {
          name: "Burma",
          leader: "Anawratha",
          author: "Sukritact",
        },
        {
          name: "Byzantium",
          leader: "Alexios I Komnenos",
          author: "JFD and Janboruta",
        },
        {
          name: "Canada",
          leader: "Lester B. Pearson",
          author: "Colonialist Legacies",
        },
        {
          name: "Carthage",
          leader: "Hannibal",
          author: "JFD and Janboruta",
        },
        {
          name: "Champa",
          leader: "Che Bong Nga",
          author: "Tomatekh",
        },
        {
          name: "Chile",
          leader: "Bernardo O‘Higgins",
          author: "Leugi",
        },
        {
          name: "China",
          leader: "Mao Zedong",
          author: "Our World/DMS",
        },
        {
          name: "England",
          leader: "Elizabeth I",
          author: "Firaxis",
        },
        {
          name: "Ethiopia",
          leader: "Halie Selassie",
          author: "Firaxis",
        },
        {
          name: "Finland",
          leader: "Urho Kekkonen",
          author: "Hypereon",
        },
        {
          name: "France",
          leader: "Napoleon",
          author: "JFD and Janboruta",
        },
        {
          name: "Germany",
          leader: "Hitler",
          author: "JFD and Janboruta",
        },
        {
          name: "Hawaii",
          leader: "Kamehameha",
          author: "MoreCivilizations",
        },
        {
          name: "Huns",
          leader: "Attila",
          author: "Firaxis",
        },
        {
          name: "Iceland",
          leader: "Ingolfur Arnorson",
          author: "JFD and Janboruta",
        },
        {
          name: "Inca",
          leader: "Pachacuti",
          author: "Firaxis",
        },
        {
          name: "Indonesia",
          leader: "Gajah Mada",
          author: "Firaxis",
        },
        {
          name: "Inuit",
          leader: "Ekeuhnick",
          author: "Colonialist Legacies",
        },
        {
          name: "Ireland",
          leader: "Malachy II",
          author: "Hiram",
        },
        {
          name: "Israel",
          leader: "David",
          author: "Leugi",
        },
        {
          name: "Japan",
          leader: "Meiji",
          author: "JFD and Janboruta",
        },
        {
          name: "Kimberley",
          leader: "Jandamarra",
          author: "Colonialist Legacies",
        },
        {
          name: "Kongo",
          leader: "Nzinga",
          author: "Tomatekh",
        },
        {
          name: "Korea",
          leader: "Sejong",
          author: "Firaxis",
        },
        {
          name: "Mali",
          leader: "Mansa Musa",
          author: "Tomatekh",
        },
        {
          name: "Maori",
          leader: "Te Rauparaha",
          author: "MoreCivilizations",
        },
        {
          name: "Maya",
          leader: "Pacal",
          author: "Firaxis",
        },
        {
          name: "Mexico",
          leader: "Benito Juarez",
          author: "Colonialist Legacies",
        },
        {
          name: "Mongolia",
          leader: "Genghis Khan",
          author: "TarcisioCM",
        },
        {
          name: "Morocco",
          leader: "Ahmad Al-Mansur",
          author: "Firaxis",
        },
        {
          name: "Mughals",
          leader: "Akbar",
          author: "MoreCivilizations",
        },
        {
          name: "Norway",
          leader: "Haakon IV",
          author: "JFD and Janboruta",
        },
        {
          name: "Persia",
          leader: "Darius I",
          author: "Firaxis",
        },
        {
          name: "Philippines",
          leader: "Jose Rizal",
          author: "Colonialist Legacies",
        },
        {
          name: "Poland",
          leader: "Casimir III",
          author: "Firaxis",
        },
        {
          name: "Portugal",
          leader: "Maria I",
          author: "Firaxis",
        },
        {
          name: "Rome",
          leader: "Augustus Caesar",
          author: "Firaxis",
        },
        {
          name: "Sibir",
          leader: "Kuchum Khan",
          author: "Hiram",
        },
        {
          name: "Sioux",
          leader: "Sitting Bull",
          author: "Tomatekh",
        },
        {
          name: "Sparta",
          leader: "Leonidas",
          author: "MoreCivilizations",
        },
        {
          name: "Sri Lanka",
          leader: "Parakramabahu I",
          author: "Light In The East",
        },
        {
          name: "Sweden",
          leader: "Gustavus Adolphus",
          author: "JFD and Janboruta",
        },
        {
          name: "Texas",
          leader: "Sam Houston",
          author: "RawSasquatch/Kramer",
        },
        {
          name: "Tibet",
          leader: "Songsten Gampo",
          author: "MoreCivilizations",
        },
        {
          name: "Timurids",
          leader: "Timur",
          author: "Tomatekh",
        },
        {
          name: "USA",
          leader: "Lincoln",
          author: "JFD and Janboruta",
        },
        {
          name: "USSR",
          leader: "Stalin",
          author: "JFD and Janboruta",
        },
        {
          name: "Vietnam",
          leader: "Trung Sisters",
          author: "Colonialist Legacies",
        },
        {
          name: "Yakutia",
          leader: "Tygyn Darkhan",
          author: "Hiram",
        },
        {
          name: "Zulu",
          leader: "Shaka",
          author: "Firaxis",
        },
      ],
    };
  },
  computed: {
    albums() {
      return this.$site.pages
        .filter(
          (x) => x.path.startsWith("/albums/mk2") && !x.frontmatter.exclude
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
  padding: 0.5em 0 0.1em;
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
