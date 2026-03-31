const BASE_URL = 'https://app.termogradnja-bakovic.hr';

const config = {
  baseUrl: BASE_URL,
  jwtLoginPath: '/wp-json/jwt-auth/v1/token',
  jwtValidatePath: '/wp-json/jwt-auth/v1/token/validate',
  endpoints: {
    gradilista: '/wp-json/wp/v2/gradiliste',
    alati: '/wp-json/wp/v2/alat',
  },
};

export default config;
