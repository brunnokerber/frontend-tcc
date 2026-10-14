import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { PasswordRequirementsComponent } from '@shared/components/password-requirements/password-requirements';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import {
  SENHA_FORTE_REGEX,
  strongPasswordValidator,
} from '@shared/validators/password.validators';

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
    PasswordRequirementsComponent,
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
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(SENHA_FORTE_REGEX),
          strongPasswordValidator(),
          Validators.maxLength(100),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: (group) => {
        const pass = group.get('password')?.value;
        const confirm = group.get('confirmPassword')?.value;
        return pass && confirm && pass !== confirm
          ? { passwordMismatch: true }
          : null;
      },
    }
  );

  /**
   * Sinal reativo derivado das alterações do campo de senha para alimentar o checklist em tempo real.
   */
  readonly passwordValue = toSignal(
    this.passwordForm.controls.password.valueChanges,
    { initialValue: '' }
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
        this.toast.warning(
          'Sessão expirada ou link inválido. Faça login ou solicite um novo convite.'
        );
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
      this.toast.success(
        'Senha cadastrada com sucesso! Bem-vindo(a) à plataforma.'
      );
      this.router.navigate(['/pets']);
    } catch (err: unknown) {
      let msg = 'Erro ao cadastrar nova senha.';
      if (err instanceof Error) {
        msg = err.message;
        const errObj = err as { code?: string; errorCode?: string };
        if (errObj.code === 'same_password' || errObj.errorCode === 'same_password') {
          this.passwordForm.controls.password.setErrors({ samePassword: true });
        } else if (errObj.code === 'weak_password' || errObj.errorCode === 'weak_password') {
          this.passwordForm.controls.password.setErrors({ strongPassword: true });
        }
      }
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
