const s1Competitors = [
  {
    name: "Algeria",
    leader: "Abdelkader\t",
    author: "DJSHenninger",
  },
  {
    name: "Apache",
    leader: "Geronimo\t",
    author: "Uighur_Caesar",
  },
  {
    name: "Australia",
    leader: "Bob Hawke\t",
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
    name: "Golden Horde\t",
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
    leader: "Anet\u00fc",
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
    name: "M\u00e9tis",
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
    name: "Murri\t",
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
    leader: "T\u00e1hera\t",
    author: "Tomatekh",
  },
  {
    name: "Prussia",
    leader: "Frederick",
    author: "JFD & Janboruta",
  },
  {
    name: "Qin",
    leader: "Ying Zheng\t",
    author: "Captain",
  },
  {
    name: "Qing",
    leader: "Cixi",
    author: "JFD & Janboruta",
  },
  {
    name: "Sami\t",
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
    leader: "Xo'on Uhan-T\u00e9",
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
    leader: "Jamalul Kiram II\t",
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
];

const s2Competitors = [
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
    leader: "P'k\u00fc\u00ee",
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
    leader: "Solano L\u00f3pez",
    author: "Uighur_Caesar",
  },
  {
    name: "Peru-Bolivia",
    leader: "Andr\u00e9s de Santa Cruz",
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
];

const s3Competitors = [
  {
    name: "Afghanistan",
    leader: "Ahmad Shah Durrani",
    author: "JFD",
  },
  {
    name: "The Ainu",
    leader: "Shakushain",
    author: "LITE",
  },
  {
    name: "America",
    leader: "Franklin Roosevelt",
    author: "JFD",
  },
  {
    name: "The Anglo-Dutch",
    leader: "William III",
    author: "Vanadius",
  },
  {
    name: "The Anglo-Norse",
    leader: "Canute",
    author: "JFD",
  },
  {
    name: "Angola",
    leader: "Jonas Savimbi",
    author: "JakeWalrusWhale",
  },
  {
    name: "The Arapaho",
    leader: "Pretty Nose",
    author: "Arilasqueto",
  },
  {
    name: "Assyria",
    leader: "Sammuramat",
    author: "TarcisioCM",
  },
  {
    name: "Bengal",
    leader: "Shuja-ud-Din Muhammad Khan",
    author: "EmeraldRange + Jarcast",
  },
  {
    name: "Botswana",
    leader: "Seretse Khama",
    author: "DMS",
  },
  {
    name: "Brandenburg",
    leader: "Frederick-William I",
    author: "Urdnot_Scott",
  },
  {
    name: "Brazil",
    leader: "Pedro I",
    author: "JFD",
  },
  {
    name: "Cambodia",
    leader: "Norodom Sihanouk",
    author: "Senshi",
  },
  {
    name: "Castile",
    leader: "Isabella",
    author: "JFD",
  },
  {
    name: "Central America",
    leader: "Francisco Morazon",
    author: "Uighur_Caesar",
  },
  {
    name: "Chad",
    leader: "Idriss Deby",
    author: "RawSasquatch",
  },
  {
    name: "Chile",
    leader: "Salvador Allende",
    author: "HoopThrower",
  },
  {
    name: "The Comanche",
    leader: "Iron Jacket",
    author: "JakeWalrusWhale",
  },
  {
    name: "The Cree",
    leader: "Poundmaker",
    author: "Colonialist Legacies",
  },
  {
    name: "Egypt",
    leader: "Akhenaten",
    author: "JFD",
  },
  {
    name: "The Gokturks",
    leader: "Bumin Qaghan",
    author: "Grant",
  },
  {
    name: "Greenland",
    leader: "Hans Egede",
    author: "Senshi",
  },
  {
    name: "Han",
    leader: "Wu",
    author: "JFD",
  },
  {
    name: "The Inca",
    leader: "Tupac Yupanqui",
    author: "Leugi + More Civs",
  },
  {
    name: "Indonesia",
    leader: "Suharto",
    author: "Senshi",
  },
  {
    name: "Ireland",
    leader: "Michael Collins",
    author: "Urdnot_Scott",
  },
  {
    name: "Kayap\xf3",
    leader: "Raoni Metuktire",
    author: "GPuzzle",
  },
  {
    name: "Khazaria",
    leader: "Bulan",
    author: "JFD",
  },
  {
    name: "Kilwa",
    leader: "Ali ibn al-Hassan",
    author: "JFD + More Civs",
  },
  {
    name: "Kokang",
    leader: "Olive Yang",
    author: "ExplosiveWatermelon + EmeraldRange",
  },
  {
    name: "The Kwakwaka'wakw",
    leader: "Willie Seaweed",
    author: "Urdnot_Scott",
  },
  {
    name: "Kyivan Rus'",
    leader: "Olga",
    author: "TarcisioCM",
  },
  {
    name: "Lithuania",
    leader: "Gediminas",
    author: "JFD",
  },
  {
    name: "Mali",
    leader: "Sundiata Keita",
    author: "Urdnot_Scott",
  },
  {
    name: "The Maori",
    leader: "Potatau te Wherowhero",
    author: "JFD",
  },
  {
    name: "The Massagetae",
    leader: "Tomyris",
    author: "TarcisioCM",
  },
  {
    name: "Great Ming",
    leader: "Yongle",
    author: "JFD",
  },
  {
    name: "The Modoc",
    leader: "Kintpaush",
    author: "RawSasquatch",
  },
  {
    name: "The Mohave",
    leader: "Irataba",
    author: "RawSasquatch",
  },
  {
    name: "Mori",
    leader: "Mori Motonari",
    author: "PorkBean",
  },
  {
    name: "The Muisca",
    leader: "Nemequene",
    author: "Leugi",
  },
  {
    name: "The Normans",
    leader: "Robert Guiscard",
    author: "TranquilSilence",
  },
  {
    name: "North Korea",
    leader: "Kim Il-Sung",
    author: "Uighur_Caesar",
  },
  {
    name: "Pandya",
    leader: "Alli Rani",
    author: "Arilasqueto",
  },
  {
    name: "The Permians",
    leader: "Azykay",
    author: "Grant",
  },
  {
    name: "The Philippines",
    leader: "Emilio Aguinaldo",
    author: "DuskJockey",
  },
  {
    name: "Qocho",
    leader: "S\xfcng\xfcl\xfcg Khagan",
    author: "Grant",
  },
  {
    name: "Rio de la Plata",
    leader: "Jose de San Mart\xedn",
    author: "Leugi",
  },
  {
    name: "The Seminole",
    leader: "Micanopy",
    author: "Uighur_Caesar",
  },
  {
    name: "Tetouan",
    leader: "Sayyida al-Hurra",
    author: "JakeWalrusWhale",
  },
  {
    name: "Timor-Leste",
    leader: "Xanana Gusm\xe3o",
    author: "JakeWalrusWhale",
  },
  {
    name: "Turkey",
    leader: "Mustafa Kemal Ataturk",
    author: "Uighur_Caesar",
  },
  {
    name: "Tuva",
    leader: "Donduk Kuular",
    author: "TopHatPaladin + Senshi",
  },
  {
    name: "Uganda",
    leader: "Idi Amin",
    author: "RawSasquatch",
  },
  {
    name: "Vermont",
    leader: "Ethan Allen",
    author: "RawSasquatch",
  },
  {
    name: "Vladimir",
    leader: "Vsevolod",
    author: "JFD",
  },
  {
    name: "The Wiradjuri",
    leader: "Windradyne",
    author: "SeroSedSerio",
  },
  {
    name: "Yemen",
    leader: "Arwa al-Sulayhi",
    author: "Urdnot_Scott",
  },
  {
    name: "The Yolngu",
    leader: "Wonggu",
    author: "EmeraldRange",
  },
  {
    name: "Yugoslavia",
    leader: "Josip Broz Tito",
    author: "Senshi",
  },
  {
    name: "The Zulu",
    leader: "Cetshwayo",
    author: "TopHatPaladin",
  },
];

const s4Competitors = [
  {
    name: "Bavaria",
    leader: "Ludwig II",
    author: "JFD",
  },
  {
    name: "Bora-Bora",
    leader: "Puni",
    author: "JakeWalrusWhale",
  },
  {
    name: "Bukhara",
    leader: "Muhammad Shaybani",
    author: "JakeWalrusWhale",
  },
  {
    name: "Burgundy",
    leader: "Charles I",
    author: "Alga",
  },
  {
    name: "Dai Viet",
    leader: "Tran Thanh Tong",
    author: "Lungora",
  },
  {
    name: "Ecuador",
    leader: "Gabriel Moreno",
    author: "JFD",
  },
  {
    name: "England",
    leader: "Henry V",
    author: "JFD",
  },
  {
    name: "Eswatini",
    leader: "Labotsibeni Mdluli",
    author: "DuskJockey",
  },
  {
    name: "Faroe Islands",
    leader: "Tr\u00f8ndur \u00ed G\u00f8tu",
    author: "DMS",
  },
  {
    name: "Goguryeo",
    leader: "Gwanggaeto",
    author: "More Civs + DuskJockey",
  },
  {
    name: "Harappa",
    leader: "Went-Antu",
    author: "Tomatekh",
  },
  {
    name: "Kanem-Bornu",
    leader: "Idris Alawma I",
    author: "DMS",
  },
  {
    name: "Kazakhstan",
    leader: "Nursultan Nazarbayev",
    author: "Uighur_Caesar",
  },
  {
    name: "Kazan",
    leader: "M\u00f6x\u00e4mm\u00e4d\u00e4min",
    author: "Alga",
  },
  {
    name: "Latvia",
    leader: "Karlis Ulmanis",
    author: "TopHatPaladin",
  },
  {
    name: "Maguindanao",
    leader: "Muhammad Kudarat",
    author: "NopeCopter",
  },
  {
    name: "Makhnovia",
    leader: "Nestor Makhno",
    author: "ExplosiveWatermelon",
  },
  {
    name: "Mexico",
    leader: "Maximilian I",
    author: "JFD",
  },
  {
    name: "Mogadishu",
    leader: "Abu Bakr ibn Umar",
    author: "EmeraldRange",
  },
  {
    name: "Mongolia",
    leader: "Sorghaghtani",
    author: "DuskJockey",
  },
  {
    name: "Ndongo",
    leader: "Ana Nzinga",
    author: "NopeCopter",
  },
  {
    name: "New Holland",
    leader: "Johan Maurits",
    author: "Alga",
  },
  {
    name: "Osage",
    leader: "Pawhuska",
    author: "Coiot",
  },
  {
    name: "Pontus",
    leader: "Mithridates VI",
    author: "Grant",
  },
  {
    name: "Rio Grande",
    leader: "Bento Gon\u00e7alves",
    author: "JakeWalrusWhale",
  },
  {
    name: "Rome",
    leader: "Trajan",
    author: "Urdnot",
  },
  {
    name: "Royal Hungary",
    leader: "Elizabeth B\u00e1thory",
    author: "JFD",
  },
  {
    name: "Saba-D'mt",
    leader: "Makeda",
    author: "ExplosiveWatermelon + Lungora",
  },
  {
    name: "Shang",
    leader: "Daji",
    author: "Arilasqueto",
  },
  {
    name: "Siam",
    leader: "Rama V",
    author: "JFD",
  },
  {
    name: "Sierra Leone",
    leader: "Thomas Peters",
    author: "JakeWalrusWhale",
  },
  {
    name: "Singapore",
    leader: "Lee Kuan Yew",
    author: "EmeraldRange",
  },
  {
    name: "Tehuelche",
    leader: "Mar\u00eda",
    author: "HoopThrower",
  },
  {
    name: "Afsharids",
    leader: "Nader Shah",
    author: "More Civs",
  },
  {
    name: "Alaouites",
    leader: "Ismail ibn Sharif",
    author: "Uighur_Caesar",
  },
  {
    name: "Crow",
    leader: "Joe Medicine Crow",
    author: "RawSasquatch",
  },
  {
    name: "Dzungars",
    leader: "Galdan Khan",
    author: "Coiot",
  },
  {
    name: "Finns",
    leader: "Kirmukarmu",
    author: "Grant",
  },
  {
    name: "Florida",
    leader: "Gregor MacGregor",
    author: "JakeWalrusWhale",
  },
  {
    name: "Ikko Ikki",
    leader: "Kennyo",
    author: "PorkBean",
  },
  {
    name: "Kalmyks",
    leader: "Ayuka Khan",
    author: "EmeraldRange",
  },
  {
    name: "Khoshuts",
    leader: "G\u00fcshi Khan",
    author: "Coiot + ExplosiveWatermelon",
  },
  {
    name: "Mamluks",
    leader: "Shajar al-Durr",
    author: "Zharques",
  },
  {
    name: "Nivkh",
    leader: "Umu",
    author: "ExplosiveWatermelon + Lungora",
  },
  {
    name: "Noongar",
    leader: "Yagan",
    author: "TopHatPaladin",
  },
  {
    name: "Palawa",
    leader: "Tarenorerer",
    author: "RawSasquatch",
  },
  {
    name: "Pueblo",
    leader: "Po'pay",
    author: "RawSasquatch",
  },
  {
    name: "Qarmatians",
    leader: "Abu Tahir al-Jannabi",
    author: "Urdnot",
  },
  {
    name: "Rozvi",
    leader: "Changamire Dombo",
    author: "Arilasqueto + NopeCopter",
  },
  {
    name: "Selkups",
    leader: "Vonya",
    author: "Arilasqueto + PorkBean + Senshi",
  },
  {
    name: "Seneca",
    leader: "Cornplanter",
    author: "More Civs + Neirai",
  },
  {
    name: "Shawnee",
    leader: "Tecumseh",
    author: "GPuzzle",
  },
  {
    name: "Ta\u00edno",
    leader: "Ag\u00fceyban\u00e1 II",
    author: "Uighur_Caesar",
  },
  {
    name: "Ume-S\u00e1mi",
    leader: "Rijkuo-maja",
    author: "Rhoze",
  },
  {
    name: "Visigoths",
    leader: "Leovigild",
    author: "Francesca",
  },
  {
    name: "Wahgi",
    leader: "Bol'im",
    author: "RawSasquatch",
  },
  {
    name: "Yellowknives",
    leader: "Akaitcho",
    author: "TopHatPaladin",
  },
  {
    name: "Thule",
    leader: "Javraganak",
    author: "Alga",
  },
  {
    name: "Tiwanaku",
    leader: "Huyustus",
    author: "Leugi",
  },
  {
    name: "Vijayanagara",
    leader: "Krishnadevaraya",
    author: "More Civs",
  },
  {
    name: "Zheng",
    leader: "Koxinga",
    author: "Arilasqueto + ExplosiveWatermelon",
  },
];

const s5Competitors = [
  {
    name: "Anishinaabe",
    leader: "Pontiac",
    author: "Colonialist Legacies + More Civs",
  },
  {
    name: "Aures",
    leader: "Dihya",
    author: "RawSasquatch",
  },
  {
    name: "Bactria",
    leader: "Demetrius I",
    author: "Francesca",
  },
  {
    name: "Bangladesh",
    leader: "Sheikh Mujibur Rahman",
    author: "Senshi",
  },
  {
    name: "Bjarmians",
    leader: "Harekr",
    author: "Rhoze",
  },
  {
    name: "Bunuba",
    leader: "Jandamarra",
    author: "Senshi",
  },
  {
    name: "Caral",
    leader: "Capac",
    author: "Tomatekh",
  },
  {
    name: "Cebu",
    leader: "Humabon",
    author: "Lungora + NopeCopter",
  },
  {
    name: "Chono",
    leader: "Martin Olleta",
    author: "Rhoze",
  },
  {
    name: "Circassia",
    leader: "Ismail Berzeg",
    author: "RawSasquatch",
  },
  {
    name: "Estonia",
    leader: "Lennart Meri",
    author: "Agla",
  },
  {
    name: "Ethiopia",
    leader: "Zara Yaqob",
    author: "DMS",
  },
  {
    name: "France",
    leader: "Maximillien Robespierre",
    author: "Urdnot",
  },
  {
    name: "Green Ukraine",
    leader: "Yurii Hlushko",
    author: "Alga",
  },
  {
    name: "Guaycuru",
    leader: "Eso",
    author: "TopHatPaladin",
  },
  {
    name: "Hanseatic League",
    leader: "Jurgen Wullenwever",
    author: "Agla",
  },
  {
    name: "Herero",
    leader: "Jacob Morenga",
    author: "TopHatPaladin",
  },
  {
    name: "Hyksos",
    leader: "Apophis",
    author: "Francesca",
  },
  {
    name: "Itelmen",
    leader: "Harchin",
    author: "Rhoze",
  },
  {
    name: "Japan",
    leader: "Toyotomi Hideyoshi",
    author: "Senshi",
  },
  {
    name: "Kalmar Union",
    leader: "Margarethe I",
    author: "JFD",
  },
  {
    name: "Karankawa",
    leader: "Joseph Maria",
    author: "JakeWalrusWhale",
  },
  {
    name: "Ket",
    leader: "Olgit",
    author: "TopHatPaladin",
  },
  {
    name: "Kipchaks",
    leader: "Togortak",
    author: "Lungora + NopeCopter",
  },
  {
    name: "Lanfang",
    leader: "Luo Fangbo",
    author: "Porkbean",
  },
  {
    name: "Luba",
    leader: "Illunga Sungu",
    author: "TopHatPaladin",
  },
  {
    name: "Ma'in",
    leader: "Waqah'il Sadiq I",
    author: "DMS",
  },
  {
    name: "Maravi",
    leader: "Kolonga Mazula",
    author: "JakeWalrusWhale",
  },
  {
    name: "Mysore",
    leader: "Tipu Sultan",
    author: "More Civs",
  },
  {
    name: "New South Wales",
    leader: "John Macarthur",
    author: "Senshi",
  },
  {
    name: "Onondaga",
    leader: "Tadodaho",
    author: "Leugi",
  },
  {
    name: "Pakistan",
    leader: "Muhammad Ali Jinnah",
    author: "Senshi",
  },
  {
    name: "Papal States",
    leader: "Julius II",
    author: "JFD",
  },
  {
    name: "Pegu",
    leader: "Shin Sawbu",
    author: "EmeraldRange",
  },
  {
    name: "Phoenicia",
    leader: "Hiram I",
    author: "More Civs",
  },
  {
    name: "Pomo",
    leader: "Essie Parrish",
    author: "Coiot + Orangechrisy",
  },
  {
    name: "Ponca",
    leader: "White Eagle",
    author: "NopeCopter + Rhoze",
  },
  {
    name: "Portugal",
    leader: "Joao II",
    author: "Francesca",
  },
  {
    name: "Potiguara",
    leader: "Felipe Camarao",
    author: "Rhoze",
  },
  {
    name: "Qara-Khitai",
    leader: "Yelu Dashi",
    author: "JakeWalrusWhale",
  },
  {
    name: "Rapa Nui",
    leader: "Hotu Matu'a",
    author: "More Civs",
  },
  {
    name: "Rouran",
    leader: "Yujilulu Mugulu",
    author: "Grant",
  },
  {
    name: "Ryukyu",
    leader: "Sho Shin",
    author: "RawSasquatch",
  },
  {
    name: "Scotland",
    leader: "Mary I",
    author: "Lasqueto",
  },
  {
    name: "Scythia",
    leader: "Ateas",
    author: "Agla",
  },
  {
    name: "Seychelles",
    leader: "France-Albert Rene",
    author: "JakeWalrusWhale",
  },
  {
    name: "Sumer",
    leader: "Eannatum",
    author: "Tematekh",
  },
  {
    name: "Susquehannock",
    leader: "Old Sheehays",
    author: "Lynn",
  },
  {
    name: "Tang",
    leader: "Taizong",
    author: "TopHatPaladin",
  },
  {
    name: "Teotihuacan",
    leader: "Spearthrower Owl",
    author: "Zharques",
  },
  {
    name: "Ternate",
    leader: "Babullah",
    author: "Grant",
  },
  {
    name: "Tlingit",
    leader: "Sheiyksh I",
    author: "Colonialist Legacies + Firebug",
  },
  {
    name: "Umhaill",
    leader: "Grace O'Malley",
    author: "Lasqueto",
  },
  {
    name: "Vyatka",
    leader: "Ioann Anikiev Myshkin",
    author: "Rhoze",
  },
  {
    name: "Wallachia",
    leader: "Vlad III Tepes",
    author: "JFD",
  },
  {
    name: "Wassoulou",
    leader: "Samori Ture",
    author: "NopeCopter",
  },
  {
    name: "Xaragua",
    leader: "Anacaona",
    author: "Lasqueto + NopeCopter",
  },
  {
    name: "Xavante",
    leader: "Apoena",
    author: "RawSasquatch",
  },
  {
    name: "Yanomami",
    leader: "Davi Kopenawa",
    author: "More Civs",
  },
  {
    name: "Yunnan",
    leader: "Long Yun",
    author: "Senshi",
  },
  {
    name: "Zazzau",
    leader: "Amina",
    author: "NopeCopter",
  },
];

const mk2Competitors = [
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
    leader: "Bernardo O\u2018Higgins",
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
    leader: "Songtsen Gampo",
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
];

export const editions = [
  {
    id: "s5",
    navLabel: "CBRX Season 5",
    title: "Season Five",
    subtitle: "January 14, 2026 \u2013 Present",
    pathPrefixes: ["/albums/s5"],
    sortOrder: "asc",
    featuredCount: 1,
    competitors: s5Competitors,
    listMeta: { showStartingTurn: false },
    sections: [
      {
        arcs: [{ range: [1, 50] }],
      },
    ],
  },
  {
    id: "s4",
    navLabel: "CBRX Season 4",
    title: "Season Four",
    subtitle: "March 20, 2024 \u2013 March 11, 2025",
    pathPrefixes: ["/albums/s4"],
    sortOrder: "asc",
    featuredCount: 1,
    competitors: s4Competitors,
    listMeta: { showStartingTurn: false },
    sections: [
      {
        arcs: [{ range: [1, 50] }],
      },
    ],
  },
  {
    id: "s3",
    navLabel: "CBRX Season 3",
    title: "Season Three",
    subtitle: "October 05, 2022 \u2013 October 12, 2023",
    pathPrefixes: ["/albums/s3"],
    sortOrder: "asc",
    featuredCount: 1,
    competitors: s3Competitors,
    listMeta: { showStartingTurn: false },
    sections: [
      {
        title: "Cycle One",
        arcs: [{ range: [1, 45] }],
      },
      {
        title: "Cycle Two",
        arcs: [{ range: [45, 50] }],
      },
    ],
  },
  {
    id: "s2",
    navLabel: "CBRX Season 2",
    title: "Season Two",
    subtitle: "February 10, 2021 \u2013 June 19, 2022",
    pathPrefixes: ["/albums/s2"],
    sortOrder: "asc",
    featuredCount: 1,
    competitors: s2Competitors,
    sections: [
      {
        title: "Cycle One",
        arcs: [
          {
            title: "Stirred Embers",
            label: "Arc One",
            note: "61 competitors remain.",
            range: [1, 6],
          },
          {
            title: "Memento Mori",
            label: "Arc Two",
            note: "61 competitors remain.",
            range: [6, 10],
          },
          {
            title: "The Culling",
            label: "Arc Three",
            note: "54 competitors remain.",
            range: [10, 15],
          },
          {
            title: "Centuries Of Agony",
            label: "Arc Four",
            note: "46 competitors remain.",
            range: [15, 23],
          },
        ],
      },
      {
        title: "Cycle Two",
        arcs: [
          {
            title: "Reborn to Die",
            label: "Arc Five",
            note: "22 competitors remain.",
            range: [23, 29],
          },
          {
            title: "Low Mountains, High Tides",
            label: "Arc Six",
            note: "16 competitors remain.",
            range: [29, 33],
          },
          {
            title: "Queen's Gambit",
            label: "Arc Seven",
            note: "13 competitors remain.",
            range: [33, 40],
          },
        ],
      },
    ],
  },
  {
    id: "s1",
    navLabel: "CBRX Season 1",
    title: "Season One",
    subtitle: "June 19, 2019 \u2013 July 08, 2020",
    pathPrefixes: ["/albums/s1"],
    sortOrder: "asc",
    featuredCount: 1,
    competitors: s1Competitors,
    sections: [
      {
        title: "Cycle One",
        arcs: [
          {
            title: "A New History",
            label: "Arc One",
            note: "61 competitors remain.",
            range: [1, 37],
          },
        ],
      },
      {
        title: "Cycle Two",
        arcs: [
          {
            title: "Time Reset",
            label: "Arc Two",
            note: "33 competitors remain.",
            range: [37, 54],
          },
        ],
      },
    ],
  },
  {
    id: "mk2",
    navLabel: "CBR Mark 2",
    title: "Mark Two",
    subtitle: "August 11, 2015 \u2013 December 18, 2018",
    pathPrefixes: ["/albums/mk2"],
    sortOrder: "asc",
    featuredCount: 1,
    competitors: mk2Competitors,
    sections: [
      {
        title: "Cycle One",
        arcs: [
          {
            title: "Mayham",
            label: "Arc One",
            note: "61 competitors remain.",
            range: [1, 7],
          },
          {
            title: "Immortal Paradise",
            label: "Arc Two",
            note: "61 competitors remain.",
            range: [7, 14],
          },
          {
            title: "Age of Discord",
            label: "Arc Three",
            note: "60 competitors remain.",
            range: [14, 23],
          },
          {
            title: "Orange Phase",
            label: "Arc Four",
            note: "58 competitors remain.",
            range: [23, 33],
          },
          {
            title: "Pacific Generation",
            label: "Arc Five",
            note: "49 competitors remain.",
            range: [33, 42],
          },
          {
            title: "Nuclear Season",
            label: "Arc Six",
            note: "45 competitors remain.",
            range: [42, 49],
          },
          {
            title: "Fallout Period",
            label: "Arc Seven",
            note: "34 competitors remain.",
            range: [49, 57],
          },
          {
            title: "Northern Ice Age",
            label: "Arc Eight",
            note: "32 competitors remain.",
            range: [57, 67],
          },
          {
            title: "Grand Alliances",
            label: "Arc Nine",
            note: "27 competitors remain.",
            range: [67, 74],
          },
          {
            title: "Time of Rapture",
            label: "Arc Ten",
            note: "24 competitors remain.",
            range: [74, 83],
          },
        ],
      },
      {
        title: "Cycle Two",
        arcs: [
          {
            title: "Rise of the Machines",
            label: "Arc Eleven",
            note: "21 competitors remain.",
            range: [83, 92],
          },
          {
            title: "Bio-Augment Tides",
            label: "Arc Tweleve",
            note: "18 competitors remain.",
            range: [92, 98],
          },
          {
            title: "The Green Revolution",
            label: "Arc Thirteen",
            note: "16 competitors remain.",
            range: [98, 110],
          },
          {
            title: "Samba Forever",
            label: "Arc Fourteen",
            note: "11 competitors remain.",
            range: [110, 120],
          },
        ],
      },
    ],
  },
  {
    id: "pr",
    navLabel: "Power Rankings",
    title: "Power Rankings",
    subtitle: "CBR.tv Archive",
    pathPrefixes: ["/albums/pr"],
    sortOrder: "desc",
    featuredCount: 1,
    listSuffixPrefix: "\u2013 ",
  },
  {
    id: "others",
    navLabel: "Others",
    title: "Other Albums",
    subtitle: "Blogs & Side Games",
    pathPrefixes: ["/albums/others"],
    sortOrder: "desc",
    featuredCount: 2,
    listSuffixPrefix: "\u2013 ",
  },
];

export const editionsById = editions.reduce((acc, edition) => {
  acc[edition.id] = edition;
  return acc;
}, {});

export const editionNavItems = editions.filter(
  (edition) => edition.showInEditions !== false
);

export const getEdition = (id) => editionsById[id];
