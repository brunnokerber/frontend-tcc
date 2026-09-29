import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';

import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { environment } from '@env/environment';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    FormErrorPipe,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export default class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly ongName = environment.ongName;

  hidePassword = signal<boolean>(true);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Controle do modo "Esqueci minha senha"
  isForgotPasswordMode = signal<boolean>(false);
  isForgotLoading = signal<boolean>(false);
  forgotSuccess = signal<boolean>(false);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.loginForm.disable();

    const formValue = this.loginForm.getRawValue();

    this.authService.login(formValue).subscribe({
      next: () => {
        this.toast.success('Login realizado com sucesso!');
        this.router.navigate(['/pets']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loginForm.enable();

        const message = err.error?.message || 'E-mail ou Senha inválidos';
        this.errorMessage.set(message);
        this.toast.error(message);
      },
    });
  }

  onForgotSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    const email = this.forgotForm.getRawValue().email.trim();
    this.isForgotLoading.set(true);
    this.forgotForm.disable();

    this.authService
      .requestPasswordReset(email)
      .then(() => {
        this.forgotSuccess.set(true);
        this.toast.success('Solicitação enviada! Verifique sua caixa de entrada.');
      })
      .catch((err) => {
        const msg = err.message || 'Erro ao solicitar recuperação de senha.';
        this.toast.error(msg);
      })
      .finally(() => {
        this.isForgotLoading.set(false);
        this.forgotForm.enable();
      });
  }

  showForgotPassword(): void {
    const currentEmail = this.loginForm.get('email')?.value || '';
    if (currentEmail) {
      this.forgotForm.patchValue({ email: currentEmail });
    }
    this.forgotSuccess.set(false);
    this.isForgotPasswordMode.set(true);
  }

  showLogin(): void {
    const currentEmail = this.forgotForm.get('email')?.value || '';
    if (currentEmail) {
      this.loginForm.patchValue({ email: currentEmail });
    }
    this.isForgotPasswordMode.set(false);
    this.forgotSuccess.set(false);
  }

  togglePassword(): void {
    this.hidePassword.update((prev) => !prev);
  }
}