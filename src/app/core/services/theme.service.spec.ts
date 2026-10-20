import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-bs-theme');

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ThemeService],
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve ser instanciado e inicializar com tema padrão', () => {
    expect(service).toBeTruthy();
    expect(service.themeMode()).toBeDefined();
  });

  it('deve aplicar tema escuro (dark) corretamente no DOM e no localStorage', () => {
    service.setTheme('dark');

    expect(service.themeMode()).toBe('dark');
    expect(service.isDarkMode()).toBe(true);
    expect(localStorage.getItem('app_theme_preference')).toBe('dark');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('deve aplicar tema claro (light) corretamente no DOM e no localStorage', () => {
    service.setTheme('light');

    expect(service.themeMode()).toBe('light');
    expect(service.isDarkMode()).toBe(false);
    expect(localStorage.getItem('app_theme_preference')).toBe('light');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
  });

  it('deve alternar entre tema claro e escuro via toggleTheme()', () => {
    service.setTheme('light');
    expect(service.isDarkMode()).toBe(false);

    service.toggleTheme();
    expect(service.isDarkMode()).toBe(true);
    expect(service.themeMode()).toBe('dark');

    service.toggleTheme();
    expect(service.isDarkMode()).toBe(false);
    expect(service.themeMode()).toBe('light');
  });
});
