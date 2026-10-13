// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@nuxt/icon/module"],
  css: ["~/assets/main.css"],
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
});
