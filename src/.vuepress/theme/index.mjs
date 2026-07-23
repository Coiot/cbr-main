export const localTheme = (themeConfig = {}) => ({
  name: "cbr-local-theme",
  define: {
    __CBR_THEME_CONFIG__: themeConfig,
  },
});
