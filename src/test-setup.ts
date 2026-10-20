import { provideZonelessChangeDetection } from '@angular/core';
import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

// Mock de matchMedia para o ambiente JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock de URL.createObjectURL e revokeObjectURL para JSDOM
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = () => 'blob:mock-url';
}
if (!window.URL.revokeObjectURL) {
  window.URL.revokeObjectURL = () => {};
}

// Inicialização do ambiente de testes do Angular com Zoneless global
getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting([provideZonelessChangeDetection()]),
);
