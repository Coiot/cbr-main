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

export { normalizeOwnerKey, OWNER_COLOR_MAP };
