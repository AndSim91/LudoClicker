// Admin tools: always in dev, in production only with ?admin=true in the URL.
// ponytail: read once at load; the flag lasts until a reload without it.
export const isAdminMode =
  import.meta.env.DEV ||
  (typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("admin") === "true");
