import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { MainFooterComponent } from './main-footer';
import { environment } from '@env/environment';

describe('MainFooterComponent', () => {
  let component: MainFooterComponent;
  let fixture: ComponentFixture<MainFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainFooterComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(MainFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar e exibir o nome da ONG e versão', () => {
    expect(component).toBeTruthy();
    expect(component.ongName).toBe(environment.ongName);
    expect(component.appVersion).toBe(environment.appVersion);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(environment.ongName);
    expect(compiled.textContent).toContain(`v${environment.appVersion}`);
  });
});
