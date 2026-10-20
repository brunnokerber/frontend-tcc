import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  let snackBarMock: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    snackBarMock = {
      open: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ToastService,
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    });

    service = TestBed.inject(ToastService);
  });

  it('deve disparar snackbar de sucesso com painel toast-success e duração de 3000ms', () => {
    service.success('Pet salvo com sucesso!');
    expect(snackBarMock.open).toHaveBeenCalledWith('Pet salvo com sucesso!', 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['toast-success'],
    });
  });

  it('deve disparar snackbar de erro com painel toast-error e duração estendida de 5000ms', () => {
    service.error('Falha ao conectar com o servidor');
    expect(snackBarMock.open).toHaveBeenCalledWith('Falha ao conectar com o servidor', 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['toast-error'],
    });
  });

  it('deve disparar snackbar de warning com painel toast-warning', () => {
    service.warning('Atenção: data próxima do vencimento');
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Atenção: data próxima do vencimento',
      'Close',
      expect.objectContaining({
        duration: 3000,
        panelClass: ['toast-warning'],
      }),
    );
  });

  it('deve disparar snackbar de info com painel toast-info', () => {
    service.info('Nova atualização disponível');
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Nova atualização disponível',
      'Close',
      expect.objectContaining({
        duration: 3000,
        panelClass: ['toast-info'],
      }),
    );
  });
});
