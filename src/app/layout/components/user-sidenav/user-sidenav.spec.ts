import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserSidenavComponent } from './user-sidenav';
import { AuthService } from '@core/auth/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { UsuariosService } from '@features/usuarios/services/usuarios.service';

describe('UserSidenavComponent', () => {
  let component: UserSidenavComponent;
  let fixture: ComponentFixture<UserSidenavComponent>;

  const mockLogout = vi.fn();
  const mockIsAdmin = signal(true);
  const mockThemeMode = signal<'light' | 'dark' | 'system'>('light');
  const mockIsDarkMode = signal(false);
  const mockSetTheme = vi.fn();
  const mockDeactivateSelf = vi.fn().mockResolvedValue(true);
  const mockOpenDialog = vi.fn().mockReturnValue({ afterClosed: () => of(true) });

  const authServiceMock = {
    getUser: () => ({ id: 'usr-1', email: 'voluntario@ong.org', role: 'admin' }),
    isAdmin: mockIsAdmin,
    logout: mockLogout,
  };

  const themeServiceMock = {
    themeMode: mockThemeMode,
    isDarkMode: mockIsDarkMode,
    setTheme: mockSetTheme,
  };

  const usuariosServiceMock = {
    deactivateSelf: mockDeactivateSelf,
  };

  const dialogMock = {
    open: mockOpenDialog,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockIsAdmin.set(true);

    await TestBed.configureTestingModule({
      imports: [UserSidenavComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ThemeService, useValue: themeServiceMock },
        { provide: UsuariosService, useValue: usuariosServiceMock },
        { provide: MatDialog, useValue: dialogMock },
      ],
    })
      .overrideComponent(UserSidenavComponent, {
        add: {
          providers: [{ provide: MatDialog, useValue: dialogMock }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(UserSidenavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar e exibir dados do perfil do usuário', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('voluntario@ong.org');
    expect(compiled.textContent).toContain('Administrador');
  });

  it('deve permitir alterar o tema da aplicação', () => {
    component.setTheme('dark');
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('deve emitir evento de fechar ao acionar onClose', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.onClose();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('deve abrir modal de convidar usuário e fechar drawer', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.openInviteUserDialog();
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(mockOpenDialog).toHaveBeenCalled();
  });

  it('deve abrir modal de alterar senha e fechar drawer', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.openChangePasswordDialog();
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(mockOpenDialog).toHaveBeenCalled();
  });

  it('deve confirmar desativação da própria conta', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.confirmDeactivateOwnAccount();
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(mockOpenDialog).toHaveBeenCalled();
    expect(mockDeactivateSelf).toHaveBeenCalled();
  });

  it('deve efetuar logout e fechar drawer', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.logout();
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
