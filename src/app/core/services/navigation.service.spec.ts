import { Location } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationService } from './navigation.service';

describe('NavigationService (Navegação com Fallback)', () => {
  let service: NavigationService;
  let locationMock: { back: ReturnType<typeof vi.fn> };
  let routerMock: { navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    locationMock = { back: vi.fn() };
    routerMock = { navigate: vi.fn(), navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        NavigationService,
        { provide: Location, useValue: locationMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    service = TestBed.inject(NavigationService);
  });

  it('deve chamar location.back() se window.history.length for maior que 1', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);

    service.back('/pets');

    expect(locationMock.back).toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });

  it('deve chamar router.navigateByUrl() com rota string se não houver histórico de navegação', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);

    service.back('/pets');

    expect(locationMock.back).not.toHaveBeenCalled();
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/pets');
  });

  it('deve chamar router.navigate() com array de comandos se fallback for array', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);

    service.back(['/pets', 123]);

    expect(locationMock.back).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/pets', 123]);
  });

  it('deve usar fallback padrão ["/"] se nenhum parâmetro for informado e history.length for 1', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);

    service.back();

    expect(locationMock.back).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });
});
