import packageJson from '../../package.json';

/* variavel de ambiente de desenvolvimento */
export const environment = {
  production: false,
  appVersion: packageJson.version,
  ongName: 'Peludinhos do Vale',
  apiUrl: 'http://127.0.0.1:54321',
  apiKey: 'no key',
};
