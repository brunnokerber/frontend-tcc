import packageJson from '../../../../package.json';

/**
 * Versão da aplicação sincronizada de forma atômica e centralizada
 * a partir do package.json (Single Source of Truth).
 */
export const APP_VERSION: string = packageJson.version;
