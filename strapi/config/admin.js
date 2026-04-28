module.exports = ({ env }) => ({
    auth: {
      secret: env('ADMIN_JWT_SECRET', 'whatson-admin-jwt-secret'),
    },
    apiToken: {
      salt: env('API_TOKEN_SALT', 'whatson-api-token-salt'),
    },
    transfer: {
      token: {
        salt: env('TRANSFER_TOKEN_SALT', 'whatson-transfer-token-salt'),
      },
    },
  });