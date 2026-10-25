import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { MainLayoutComponent } from './main-layout';
import { AuthService } from '@core/auth/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { UsuariosService } from '@features/usuarios/services/usuarios.service';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  const authServiceMock = {
    getUser: () => ({ id: 'u1', email: 'teste@ong.org', role: 'admin' }),
    isAdmin: signal(true),
    logout: () => {},
  };

  const themeServiceMock = {
    themeMode: signal('light'),
    isDarkMode: signal(false),
    setTheme: () => {},
  };

  const usuariosServiceMock = {
    deactivateSelf: async () => {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ThemeService, useValue: themeServiceMock },
        { provide: UsuariosService, useValue: usuariosServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar com o sidenav do usuário fechado', () => {
    expect(component).toBeTruthy();
    expect(component.userSidenavOpen()).toBe(false);
  });

  it('deve abrir, fechar e alternar o sidenav do usuário', () => {
    component.openUserSidenav();
    expect(component.userSidenavOpen()).toBe(true);

    component.closeUserSidenav();
    expect(component.userSidenavOpen()).toBe(false);

    component.toggleUserSidenav();
    expect(component.userSidenavOpen()).toBe(true);
  });
});
