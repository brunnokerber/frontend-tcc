import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_STORAGE_KEY = 'app_theme_preference';

  public readonly themeMode = signal<ThemeMode>(this.getSavedTheme());
  public readonly isDarkMode = signal<boolean>(false);

  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    const saved = this.getSavedTheme();
    this.applyTheme(saved);

    // Escuta mudanças automáticas de tema no sistema operacional do usuário
    this.mediaQuery.addEventListener('change', () => {
      if (this.themeMode() === 'system') {
        this.applyTheme('system');
      }
    });
  }

  public setTheme(mode: ThemeMode): void {
    localStorage.setItem(this.THEME_STORAGE_KEY, mode);
    this.themeMode.set(mode);
    this.applyTheme(mode);
  }

  public toggleTheme(): void {
    const current = this.isDarkMode();
    this.setTheme(current ? 'light' : 'dark');
  }

  private getSavedTheme(): ThemeMode {
    const saved = localStorage.getItem(this.THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system';
  }

  private applyTheme(mode: ThemeMode): void {
    let effectiveDark = false;

    if (mode === 'dark') {
      effectiveDark = true;
    } else if (mode === 'light') {
      effectiveDark = false;
    } else {
      // Padrão do sistema/navegador do usuário
      effectiveDark = this.mediaQuery.matches;
    }

    this.isDarkMode.set(effectiveDark);

    const root = document.documentElement;
    if (effectiveDark) {
      root.classList.add('dark-theme');
      root.setAttribute('data-bs-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark-theme');
      root.setAttribute('data-bs-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }
}
