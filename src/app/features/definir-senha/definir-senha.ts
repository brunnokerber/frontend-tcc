import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
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
  selector: 'app-definir-senha',
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
  templateUrl: './definir-senha.html',
  styleUrls: ['./definir-senha.scss'],
})
export default class DefinirSenhaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly ongName = environment.ongName;

  hidePassword = signal<boolean>(true);
  hideConfirmPassword = signal<boolean>(true);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  userEmail = signal<string>('');

  passwordForm = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: (group) => {
        const pass = group.get('password')?.value;
        const confirm = group.get('confirmPassword')?.value;
        return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
      },
    }
  );

  ngOnInit(): void {
    // 1. Tenta capturar sessão vinda do hash da URL se o usuário acabou de clicar no e-mail
    const capture = this.authService.captureSessionFromUrlHash();
    if (capture.hasSession && capture.email) {
      this.userEmail.set(capture.email);
    } else {
      const currentUser = this.authService.getUser();
      if (currentUser?.email) {
        this.userEmail.set(currentUser.email);
      } else {
        // Se não há sessão ativa nem token válido, redireciona para login
        this.toast.warning('Sessão expirada ou link inválido. Faça login ou solicite um novo convite.');
        this.router.navigate(['/login']);
      }
    }
  }

  async onSubmit(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.passwordForm.getRawValue();

    if (password !== confirmPassword) {
      this.errorMessage.set('As senhas digitadas não coincidem.');
      this.toast.error('As senhas digitadas não coincidem.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.passwordForm.disable();

    try {
      await this.authService.updatePassword(password);
      this.toast.success('Senha cadastrada com sucesso! Bem-vindo(a) à plataforma.');
      this.router.navigate(['/pets']);
    } catch (err: any) {
      const msg = err.message || 'Erro ao cadastrar nova senha.';
      this.errorMessage.set(msg);
      this.toast.error(msg);
      this.passwordForm.enable();
    } finally {
      this.isLoading.set(false);
    }
  }

  togglePassword(): void {
    this.hidePassword.update((prev) => !prev);
  }

  toggleConfirmPassword(): void {
    this.hideConfirmPassword.update((prev) => !prev);
  }
}
