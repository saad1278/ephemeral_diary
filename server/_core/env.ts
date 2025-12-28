export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

// Validate required environment variables
if (!ENV.appId) {
  console.warn("[ENV] WARNING: VITE_APP_ID is not set");
}
if (!ENV.cookieSecret) {
  console.warn("[ENV] WARNING: JWT_SECRET is not set");
}
if (!ENV.oAuthServerUrl) {
  console.warn("[ENV] WARNING: OAUTH_SERVER_URL is not set");
}
if (!ENV.databaseUrl) {
  console.warn("[ENV] WARNING: DATABASE_URL is not set");
}

// Log OAuth configuration status
console.log("[ENV] OAuth Configuration:");
console.log("[ENV] - App ID configured:", !!ENV.appId);
console.log("[ENV] - OAuth Server URL configured:", !!ENV.oAuthServerUrl);
console.log("[ENV] - Cookie Secret configured:", !!ENV.cookieSecret);
