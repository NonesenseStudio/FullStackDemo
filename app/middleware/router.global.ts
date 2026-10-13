const publicRoutes = ["/login", "/register", "/signup", "/"];

export default defineNuxtRouteMiddleware(async (to) => {
  if (publicRoutes.includes(to.path)) return;

  const requestFetch = useRequestFetch();
  const { authenticated } = await requestFetch<{
    authenticated: boolean;
  }>("/api/auth/session");

  if (!authenticated) {
    return navigateTo({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }
});
