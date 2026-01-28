import { getEdition } from "../../../data/editions";

const s5Edition = getEdition("s5");
const s5OwnerList = [
  ...((s5Edition && s5Edition.competitors) || []),
  {
    name: "Babylon",
    leader: "Nebuchadnezzar II",
    author: "Firaxis",
  },
];

function normalizeOwnerKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const OWNER_COLOR_MAP = {
  [normalizeOwnerKey("Babylon")]: { primary: "#244353", secondary: "#d4f9ff" },
  [normalizeOwnerKey("Zazzau")]: { primary: "#d1e7d2", secondary: "#165e44" },
  [normalizeOwnerKey("Yunnan")]: { primary: "#750224", secondary: "#baac87" },
  [normalizeOwnerKey("Yanomami")]: { primary: "#a44345", secondary: "#e4d1c4" },
  [normalizeOwnerKey("Xavante")]: { primary: "#24050e", secondary: "#eb5b39" },
  [normalizeOwnerKey("Xaragua")]: { primary: "#89124f", secondary: "#b3d942" },
  [normalizeOwnerKey("Wassoulou")]: {
    primary: "#a5dfeb",
    secondary: "#191c4d",
  },
  [normalizeOwnerKey("Wallachia")]: {
    primary: "#0a5857",
    secondary: "#bbb645",
  },
  [normalizeOwnerKey("Vyatka")]: { primary: "#f9dfb1", secondary: "#b54505" },
  [normalizeOwnerKey("Umhaill")]: { primary: "#efb212", secondary: "#6c0215" },
  [normalizeOwnerKey("Tlingit")]: { primary: "#e0d4b4", secondary: "#404a4e" },
  [normalizeOwnerKey("Ternate")]: { primary: "#3f3901", secondary: "#d4c56b" },
  [normalizeOwnerKey("Teotihuacan")]: {
    primary: "#1b1627",
    secondary: "#50b595",
  },
  [normalizeOwnerKey("Tang")]: { primary: "#45100a", secondary: "#c5c44b" },
  [normalizeOwnerKey("Susquehannock")]: {
    primary: "#d9b1e4",
    secondary: "#51070f",
  },
  [normalizeOwnerKey("Sumer")]: { primary: "#272b51", secondary: "#d96954" },
  [normalizeOwnerKey("Seychelles")]: {
    primary: "#3accc7",
    secondary: "#0c3856",
  },
  [normalizeOwnerKey("Scythia")]: { primary: "#99290a", secondary: "#f9d6b0" },
  [normalizeOwnerKey("Scotland")]: {
    primary: "#1c1e35",
    secondary: "#abbdb7",
  },
  [normalizeOwnerKey("Ryukyu")]: { primary: "#ad9ec5", secondary: "#262625" },
  [normalizeOwnerKey("Rouran")]: { primary: "#c1be33", secondary: "#721c05" },
  [normalizeOwnerKey("Rapa Nui")]: { primary: "#8babcb", secondary: "#67120a" },
  [normalizeOwnerKey("Qara-Khitai")]: {
    primary: "#171614",
    secondary: "#78b3cf",
  },
  [normalizeOwnerKey("Potiguara")]: {
    primary: "#0e3733",
    secondary: "#f07158",
  },
  [normalizeOwnerKey("Portugal")]: { primary: "#6b7e11", secondary: "#002983" },
  [normalizeOwnerKey("Ponca")]: { primary: "#e3c565", secondary: "#844505" },
  [normalizeOwnerKey("Pomo")]: { primary: "#d6683f", secondary: "#000000" },
  [normalizeOwnerKey("Phoenicia")]: {
    primary: "#77194d",
    secondary: "#d89819",
  },
  [normalizeOwnerKey("Pegu")]: { primary: "#b21b2a", secondary: "#fff398" },
  [normalizeOwnerKey("Papal States")]: {
    primary: "#bc5720",
    secondary: "#fceed1",
  },
  [normalizeOwnerKey("Pakistan")]: {
    primary: "#437415",
    secondary: "#d4d9b5",
  },
  [normalizeOwnerKey("Onondaga")]: {
    primary: "#e6d9d4",
    secondary: "#692060",
  },
  [normalizeOwnerKey("New South Wales")]: {
    primary: "#e6c7cb",
    secondary: "#67120a",
  },
  [normalizeOwnerKey("Mysore")]: { primary: "#6b080f", secondary: "#f07c4e" },
  [normalizeOwnerKey("Maravi")]: { primary: "#0e1202", secondary: "#c26258" },
  [normalizeOwnerKey("Ma'in")]: { primary: "#3c1f07", secondary: "#d1722b" },
  [normalizeOwnerKey("Luba")]: { primary: "#523a65", secondary: "#e0b8af" },
  [normalizeOwnerKey("Lanfang")]: { primary: "#b2ac1c", secondary: "#21201f" },
  [normalizeOwnerKey("Kipchaks")]: {
    primary: "#e59d3b",
    secondary: "#1f2028",
  },
  [normalizeOwnerKey("Ket")]: { primary: "#7d9792", secondary: "#5d1212" },
  [normalizeOwnerKey("Karankawa")]: {
    primary: "#154b75",
    secondary: "#f08977",
  },
  [normalizeOwnerKey("Kalmar Union")]: {
    primary: "#7f3725",
    secondary: "#dec073",
  },
  [normalizeOwnerKey("Japan")]: { primary: "#d3d3d3", secondary: "#68002d" },
  [normalizeOwnerKey("Itelmen")]: { primary: "#9ed8c7", secondary: "#231016" },
  [normalizeOwnerKey("Hyksos")]: { primary: "#43010d", secondary: "#ce462f" },
  [normalizeOwnerKey("Herero")]: { primary: "#f3aa98", secondary: "#550c1c" },
  [normalizeOwnerKey("Hanseatic League")]: {
    primary: "#f0e5dd",
    secondary: "#912316",
  },
  [normalizeOwnerKey("Guaycuru")]: {
    primary: "#d6c798",
    secondary: "#874420",
  },
  [normalizeOwnerKey("Green Ukraine")]: {
    primary: "#0b4033",
    secondary: "#ebe968",
  },
  [normalizeOwnerKey("France")]: { primary: "#1c3b56", secondary: "#f23929" },
  [normalizeOwnerKey("Ethiopia")]: {
    primary: "#110d4b",
    secondary: "#3a8a81",
  },
  [normalizeOwnerKey("Estonia")]: { primary: "#2e79bd", secondary: "#1c1c26" },
  [normalizeOwnerKey("Circassia")]: {
    primary: "#265c24",
    secondary: "#f0e152",
  },
  [normalizeOwnerKey("Chono")]: { primary: "#6d3026", secondary: "#9edaef" },
  [normalizeOwnerKey("Cebu")]: { primary: "#094048", secondary: "#78ded0" },
  [normalizeOwnerKey("Caral")]: { primary: "#793656", secondary: "#ffaa6d" },
  [normalizeOwnerKey("Bunuba")]: { primary: "#3f1021", secondary: "#f75142" },
  [normalizeOwnerKey("Bjarmians")]: {
    primary: "#3c1e3d",
    secondary: "#b4b5cf",
  },
  [normalizeOwnerKey("Bjarmias")]: {
    primary: "#3c1e3d",
    secondary: "#b4b5cf",
  },
  [normalizeOwnerKey("Bangladesh")]: {
    primary: "#064c39",
    secondary: "#ef7245",
  },
  [normalizeOwnerKey("Bactria")]: { primary: "#9db5e3", secondary: "#0c0d7d" },
  [normalizeOwnerKey("Aures")]: { primary: "#deb057", secondary: "#073c42" },
  [normalizeOwnerKey("Anishinaabe")]: {
    primary: "#42102a",
    secondary: "#b3c5ed",
  },
};

const SQRT3 = Math.sqrt(3);
const RESOURCE_COLOR_OPTIONS = { saturation: 62, lightness: 55 };
const IMPROVEMENT_COLOR_OPTIONS = { saturation: 45, lightness: 60 };
const FEATURE_COLORS = {
  ice: "#d7eff9",
  jungle: "#1d7b4a",
  marsh: "#5e6b3d",
  oasis: "#8bcf9c",
  "flood-plains": "#b58b4b",
  forest: "#1f5e3b",
  fallout: "#8b2d2d",
  atoll: "#5ec2c9",
  crater: "#6d4c41",
  fuji: "#cfd8dc",
  mesa: "#b87a4a",
  reef: "#5ec2c9",
  volcano: "#ef6c00",
  gibraltar: "#757575",
  geyser: "#80deea",
  "fountain-youth": "#4fc3f7",
  potosi: "#9e9e9e",
  "el-dorado": "#ffca28",
  "sri-pada": "#81c784",
  "mt-sinai": "#f5f5f5",
  "mt-kailash": "#b0bec5",
  uluru: "#d84315",
  "lake-victoria": "#4fc3f7",
  kilimanjaro: "#78909c",
  "solomons-mines": "#ffb74d",
};
const WONDER_COLORS = {
  crater: "#c17a52",
  fuji: "#e0e0e0",
  mesa: "#b87a4a",
  volcano: "#ef6c00",
  gibraltar: "#757575",
  geyser: "#80deea",
  "fountain-youth": "#4fc3f7",
  potosi: "#9e9e9e",
  "el-dorado": "#ffca28",
  "sri-pada": "#81c784",
  "mt-sinai": "#f5f5f5",
  "mt-kailash": "#b0bec5",
  uluru: "#d84315",
  "lake-victoria": "#4fc3f7",
  kilimanjaro: "#78909c",
  "solomons-mines": "#ffb74d",
};
const BASE_UNITS = [
  { name: "Settler", role: "civilian" },
  { name: "Worker", role: "civilian" },
  { name: "Warrior", role: "combat" },
  { name: "Scout", role: "combat" },
  { name: "Archer", role: "combat" },
  { name: "Spearman", role: "combat" },
  { name: "Chariot Archer", role: "combat" },
  { name: "Swordsman", role: "combat" },
  { name: "Horseman", role: "combat" },
  { name: "Catapult", role: "combat" },
  { name: "Knight", role: "combat" },
  { name: "Crossbowman", role: "combat" },
  { name: "Pikeman", role: "combat" },
  { name: "Trebuchet", role: "combat" },
  { name: "Longswordsman", role: "combat" },
  { name: "Musketman", role: "combat" },
  { name: "Cannon", role: "combat" },
  { name: "Lancer", role: "combat" },
  { name: "Rifleman", role: "combat" },
  { name: "Cavalry", role: "combat" },
  { name: "Infantry", role: "combat" },
  { name: "Artillery", role: "combat" },
  { name: "Tank", role: "combat" },
  { name: "Anti Tank Gun", role: "combat" },
  { name: "Anti Aircraft Gun", role: "combat" },
  { name: "Paratrooper", role: "combat" },
  { name: "Fighter", role: "combat" },
  { name: "Bomber", role: "combat" },
  { name: "Atomic Bomb", role: "combat" },
  { name: "Rocket Artillery", role: "combat" },
  { name: "Mechanized Infantry", role: "combat" },
  { name: "Modern Tank", role: "combat" },
  { name: "Helicopter", role: "combat" },
  { name: "Mobile Sam", role: "combat" },
  { name: "Guided Missile", role: "combat" },
  { name: "Jet Fighter", role: "combat" },
  { name: "Stealth Bomber", role: "combat" },
  { name: "Nuclear Missile", role: "combat" },
  { name: "Giant Death Robot", role: "combat" },
  { name: "XCOM", role: "combat" },
  { name: "Workboat", role: "civilian" },
  { name: "Trireme", role: "combat" },
  { name: "Caravel", role: "combat" },
  { name: "Frigate", role: "combat" },
  { name: "Ironclad", role: "combat" },
  { name: "Destroyer", role: "combat" },
  { name: "Battleship", role: "combat" },
  { name: "Submarine", role: "combat" },
  { name: "Carrier", role: "combat" },
  { name: "Nuclear Submarine", role: "combat" },
  { name: "Missile Cruiser", role: "combat" },
  { name: "Artist", role: "civilian" },
  { name: "Scientist", role: "civilian" },
  { name: "Merchant", role: "civilian" },
  { name: "Engineer", role: "civilian" },
  { name: "Great General", role: "civilian" },
];
const MODDED_ERA_UNITS = [
  { name: "Cuirassier", role: "combat" },
  { name: "Explorer", role: "combat" },
  { name: "Field Gun", role: "combat" },
  { name: "Line Infantry", role: "combat" },
  { name: "Skirmisher", role: "combat" },
  { name: "Surveyor", role: "combat" },
  { name: "Uhlan", role: "combat" },
  { name: "Carrack", role: "combat" },
  { name: "Cruiser", role: "combat" },
  { name: "Galleon", role: "combat" },
  { name: "Ship of the Line", role: "combat" },
  { name: "UAV Fighter", role: "combat" },
  { name: "Suborbital Bomber", role: "combat" },
  { name: "Railgun", role: "combat" },
  { name: "Mech Artillery", role: "combat" },
  { name: "Hover Tank", role: "combat" },
  { name: "Cyber Sub", role: "combat" },
  { name: "Missile Destroyer", role: "combat" },
  { name: "Neo Destroyer", role: "combat" },
  { name: "Arsenal Ship", role: "combat" },
  { name: "Supercarrier", role: "combat" },
  { name: "Drone", role: "combat" },
  { name: "Battle Suit", role: "combat" },
  { name: "Chimera", role: "combat" },
  { name: "Hydra", role: "combat" },
  { name: "Special Forces", role: "combat" },
  { name: "Airborne Forces", role: "combat" },
  { name: "Splicer", role: "combat" },
  { name: "Terminator", role: "combat" },
  { name: "Nexus", role: "combat" },
  { name: "T-Rex", role: "combat" },
  { name: "Nueroframe", role: "combat" },
];
const ALL_UNITS = [...BASE_UNITS, ...MODDED_ERA_UNITS];
const BASE_UNIT_IDS = ALL_UNITS.map((unit) =>
  unit.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")
);
const NOTE_PIN_PATHS = [
  {
    d: "M176 252.6C176 280.7 185.1 313.6 201.6 349.1C217.9 384.2 240 419.2 262.9 450.6C283.2 478.6 303.7 503.1 320.1 521.7C336.5 503.1 356.9 478.6 377.3 450.6C400.2 419.2 422.3 384.2 438.6 349.1C455 313.6 464.2 280.7 464.2 252.6C464.2 175.8 400.5 112 320.2 112C239.9 112 176 175.7 176 252.6z",
    opacity: 0.3,
  },
  {
    d: "M320 112C400.3 112 464 175.7 464 252.6C464 280.7 454.9 313.6 438.4 349.1C422.1 384.2 400 419.2 377.1 450.6C356.8 478.6 336.3 503.1 319.9 521.7C303.5 503.1 283.1 478.6 262.7 450.6C239.8 419.2 217.7 384.2 201.4 349.1C185 313.6 175.8 280.7 175.8 252.6C175.8 175.8 239.5 112 319.8 112zM352.9 557C407.7 495.4 512 363.8 512 252.6C512 148.4 426 64 320 64C214 64 128 148.4 128 252.6C128 363.8 232.3 495.4 287.1 557C297.3 568.5 305.8 577.5 311.6 583.5C316.9 589 320 592 320 592C320 592 323 589 328.4 583.5C334.2 577.5 342.7 568.5 352.9 557z",
  },
];
const RUINS_PATHS = [
  {
    d: "M96 304C96 368.8 128 427.3 179.2 465.8C187.2 471.8 192 481.3 192 491.4L192 528C192 536.8 199.2 544 208 544L256 544L256 496C256 487.2 263.2 480 272 480C280.8 480 288 487.2 288 496L288 544L352 544L352 496C352 487.2 359.2 480 368 480C376.8 480 384 487.2 384 496L384 544L432 544C440.8 544 448 536.8 448 528L448 491.4C448 481.3 452.7 471.9 460.8 465.8C512 427.3 544 368.9 544 304C544 191 445.7 96 320 96C194.3 96 96 191 96 304zM288 320C288 355.3 259.3 384 224 384C188.7 384 160 355.3 160 320C160 284.7 188.7 256 224 256C259.3 256 288 284.7 288 320zM480 320C480 355.3 451.3 384 416 384C380.7 384 352 355.3 352 320C352 284.7 380.7 256 416 256C451.3 256 480 284.7 480 320z",
    opacity: 0.6,
  },
  {
    d: "M448 491.4C448 481.3 452.7 471.9 460.8 465.8C512 427.3 544 368.9 544 304C544 191 445.7 96 320 96C194.3 96 96 191 96 304C96 368.8 128 427.3 179.2 465.8C187.2 471.8 192 481.3 192 491.4L192 528C192 536.8 199.2 544 208 544L256 544L256 496C256 487.2 263.2 480 272 480C280.8 480 288 487.2 288 496L288 544L352 544L352 496C352 487.2 359.2 480 368 480C376.8 480 384 487.2 384 496L384 544L432 544C440.8 544 448 536.8 448 528L448 491.4zM480 491.4L480 528C480 554.5 458.5 576 432 576L208 576C181.5 576 160 554.5 160 528L160 491.4C101.5 447.4 64 379.8 64 304C64 171.5 178.6 64 320 64C461.4 64 576 171.5 576 304C576 379.8 538.5 447.4 480 491.4zM224 352C241.7 352 256 337.7 256 320C256 302.3 241.7 288 224 288C206.3 288 192 302.3 192 320C192 337.7 206.3 352 224 352zM224 256C259.3 256 288 284.7 288 320C288 355.3 259.3 384 224 384C188.7 384 160 355.3 160 320C160 284.7 188.7 256 224 256zM448 320C448 302.3 433.7 288 416 288C398.3 288 384 302.3 384 320C384 337.7 398.3 352 416 352C433.7 352 448 337.7 448 320zM352 320C352 284.7 380.7 256 416 256C451.3 256 480 284.7 480 320C480 355.3 451.3 384 416 384C380.7 384 352 355.3 352 320z",
  },
];

export {
  s5OwnerList,
  normalizeOwnerKey,
  OWNER_COLOR_MAP,
  SQRT3,
  RESOURCE_COLOR_OPTIONS,
  IMPROVEMENT_COLOR_OPTIONS,
  FEATURE_COLORS,
  WONDER_COLORS,
  BASE_UNITS,
  MODDED_ERA_UNITS,
  ALL_UNITS,
  BASE_UNIT_IDS,
  NOTE_PIN_PATHS,
  RUINS_PATHS,
};
