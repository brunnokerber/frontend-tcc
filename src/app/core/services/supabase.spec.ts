import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@core/auth/services/auth.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';

describe('SupabaseService', () => {
  let service: SupabaseService;
  const mockClient = {} as SupabaseClient;
  const mockAuthService = {
    supabaseClient: mockClient,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    service = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return the client from AuthService', () => {
    expect(service.client).toBe(mockClient);
  });
});
