const { URL } = require("url");

const extraOrigins = [];
if (process.env.PUBLIC_URL) {
  try {
    extraOrigins.push(new URL(process.env.PUBLIC_URL).origin);
  } catch {
    /* ignore */
  }
}

const corsOrigins = [...new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:1337",
  "http://127.0.0.1:1337",
  "http://localhost:5173",
  "http://localhost:8080",
  "https://the37n.gr",
  "https://www.the37n.gr",
  ...extraOrigins.filter(Boolean),
])];

module.exports = [
  "strapi::logger",
  "strapi::errors",
  "strapi::security",
  {
    name: "strapi::cors",
    config: {
      enabled: true,
      // Όχι '*' με credentials (admin cookies) — εμφανίζεται σαν admin error / CORS.
      origin: corsOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
      headers: ["Content-Type", "Authorization", "Origin", "Accept"],
      keepHeaderOnError: true,
    },
  },
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  {
    name: "strapi::public",
    config: {
      defaultIndex: false,
      path: "./public",
    },
  },
];
