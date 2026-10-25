import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MainNavbarComponent } from './main-navbar';
import { AuthService } from '@core/auth/services/auth.service';

describe('MainNavbarComponent', () => {
  let component: MainNavbarComponent;
  let fixture: ComponentFixture<MainNavbarComponent>;
  const mockLogout = vi.fn();
  const mockIsAdmin = signal(true);
  const mockUser = {
    id: 'user-123',
    email: 'admin@peludinhos.org',
    role: 'admin',
  };

  const authServiceMock = {
    getUser: () => mockUser,
    isAdmin: mockIsAdmin,
    logout: mockLogout,
  };

  beforeEach(async () => {
    mockLogout.mockClear();
    mockIsAdmin.set(true);

    await TestBed.configureTestingModule({
      imports: [MainNavbarComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar e exibir dados do usuário e links de navegação', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('admin@peludinhos.org');
    expect(compiled.textContent).toContain('Pets');
    expect(compiled.textContent).toContain('Voluntários');
  });

  it('deve alternar a visibilidade do menu mobile', () => {
    expect(component.mobileMenuOpen()).toBe(false);
    component.toggleMobileMenu();
    expect(component.mobileMenuOpen()).toBe(true);
    component.closeMobileMenu();
    expect(component.mobileMenuOpen()).toBe(false);
  });

  it('deve emitir openUserSidenav ao acionar perfil', () => {
    const emitSpy = vi.fn();
    component.openUserSidenav.subscribe(emitSpy);

    component.onOpenUserSidenav();
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(component.mobileMenuOpen()).toBe(false);
  });

  it('deve efetuar logout e fechar menu mobile', () => {
    component.mobileMenuOpen.set(true);
    component.logout();

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(component.mobileMenuOpen()).toBe(false);
  });
});
