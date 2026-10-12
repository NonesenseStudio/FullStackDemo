const publicRoutes = ["/login", "/register", "/signup", "/"];

export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie<string | null>("token");

  if (!token.value && !publicRoutes.includes(to.path)) {
    return navigateTo({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }
});
