import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuditBadgeComponent } from './audit-badge';
import { AuditResolverService } from '@core/audit/services/audit-resolver.service';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { UserProfile } from '@core/auth/models/login.model';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AuditBadgeComponent', () => {
  let component: AuditBadgeComponent;
  let fixture: ComponentFixture<AuditBadgeComponent>;
  let auditResolverMock: { resolveUser: ReturnType<typeof vi.fn> };
  let authServiceMock: { isAdmin: ReturnType<typeof vi.fn> };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const mockUser: UserProfile = {
    id: 'user-uuid-123',
    email: 'admin@peludinhos.org',
    role: 'admin',
    ativo: true,
  };

  beforeEach(async () => {
    auditResolverMock = {
      resolveUser: vi.fn().mockResolvedValue(mockUser),
    };

    authServiceMock = {
      isAdmin: vi.fn().mockReturnValue(true),
    };

    toastMock = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AuditBadgeComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuditResolverService, useValue: auditResolverMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditBadgeComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o botão de popover quando o usuário for administrador', async () => {
    fixture.componentRef.setInput('updatedBy', 'user-uuid-123');
    fixture.componentRef.setInput('updatedAt', '2026-10-24T18:00:00Z');
    await fixture.whenStable();

    const triggerBtn = fixture.nativeElement.querySelector('.audit-trigger-btn');
    expect(triggerBtn).toBeTruthy();
    expect(triggerBtn.textContent).toContain('user-uui');
  });

  it('deve exibir apenas pílula estática quando não for administrador', async () => {
    authServiceMock.isAdmin.mockReturnValue(false);
    fixture.componentRef.setInput('updatedBy', 'user-uuid-123');
    await fixture.whenStable();

    const triggerBtn = fixture.nativeElement.querySelector('.audit-trigger-btn');
    const staticPill = fixture.nativeElement.querySelector('.audit-non-admin-pill');

    expect(triggerBtn).toBeFalsy();
    expect(staticPill).toBeTruthy();
    expect(staticPill.textContent).toContain('user-uui');
  });

  it('deve resolver o perfil do usuário ao abrir o popover', async () => {
    fixture.componentRef.setInput('updatedBy', 'user-uuid-123');
    await fixture.whenStable();

    await component.onPopoverOpen();

    expect(auditResolverMock.resolveUser).toHaveBeenCalledWith('user-uuid-123');
    expect(component.userProfile()).toEqual(mockUser);
    expect(component.loaded()).toBe(true);
  });

  it('deve utilizar os dados do editor passados como input sem consultar o serviço', async () => {
    fixture.componentRef.setInput('updatedBy', 'user-uuid-123');
    fixture.componentRef.setInput('editor', {
      id: 'user-uuid-123',
      email: 'editor@peludinhos.org',
      role: 'admin',
    });
    await fixture.whenStable();

    await component.onPopoverOpen();

    expect(auditResolverMock.resolveUser).not.toHaveBeenCalled();
    expect(component.userProfile()?.email).toBe('editor@peludinhos.org');
  });

  it('deve copiar texto para o clipboard e disparar notificação toast', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    await component.copyText('admin@peludinhos.org', 'E-mail');

    expect(writeTextSpy).toHaveBeenCalledWith('admin@peludinhos.org');
    expect(toastMock.success).toHaveBeenCalledWith('E-mail copiado para a área de transferência!');
  });
});
