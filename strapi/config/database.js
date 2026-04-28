module.exports = ({ env }) => ({
  connection: {
    client: env('DATABASE_CLIENT', 'mysql2'),
    connection: {
      host: env('DATABASE_HOST', 'localhost'),
      port: env.int('DATABASE_PORT', 3306),
      database: env('DATABASE_NAME', 'whatson'),
      user: env('DATABASE_USERNAME', 'strapi'),
      password: env('DATABASE_PASSWORD', 'strapi_pass'),
    },
  },
});
