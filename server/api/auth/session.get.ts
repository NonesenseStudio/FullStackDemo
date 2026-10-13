import { defineEventHandler, getCookie } from "h3";

export default defineEventHandler((event) => ({
  authenticated: Boolean(getCookie(event, "token")),
}));
