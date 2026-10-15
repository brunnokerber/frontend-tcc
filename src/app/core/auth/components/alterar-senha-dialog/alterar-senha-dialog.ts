import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { DialogLayoutComponent } from '@shared/components/dialog-layout/dialog-layout';
import { PasswordRequirementsComponent } from '@shared/components/password-requirements/password-requirements';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import { SENHA_FORTE_REGEX, strongPasswordValidator } from '@shared/validators/password.validators';

@Component({
  selector: 'app-alterar-senha-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FormErrorPipe,
    PasswordRequirementsComponent,
    DialogLayoutComponent,
  ],
  templateUrl: './alterar-senha-dialog.html',
  styleUrls: ['./alterar-senha-dialog.scss'],
})
export class AlterarSenhaDialogComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private dialogRef = inject(MatDialogRef<AlterarSenhaDialogComponent>);

  hidePassword = signal<boolean>(true);
  hideConfirmPassword = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  requiresReauth = signal<boolean>(false);

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
        return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
      },
    },
  );

  readonly passwordValue = toSignal(this.passwordForm.controls.password.valueChanges, {
    initialValue: '',
  });

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

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.requiresReauth.set(false);
    this.passwordForm.disable();

    try {
      await this.authService.updatePassword(password);
      this.toast.success('Senha atualizada com sucesso!');
      this.dialogRef.close(true);
    } catch (err: unknown) {
      let msg = 'Erro ao atualizar a senha.';
      if (err instanceof Error) {
        msg = err.message;
        const errObj = err as { requiresReauth?: boolean; code?: string; errorCode?: string };
        if (
          errObj.requiresReauth ||
          errObj.code === 'reauthentication_needed' ||
          msg.toLowerCase().includes('autenticação recente')
        ) {
          this.requiresReauth.set(true);
        } else if (errObj.code === 'same_password' || errObj.errorCode === 'same_password') {
          this.passwordForm.controls.password.setErrors({ samePassword: true });
        } else if (errObj.code === 'weak_password' || errObj.errorCode === 'weak_password') {
          this.passwordForm.controls.password.setErrors({ strongPassword: true });
        }
      }
      this.errorMessage.set(msg);
      this.toast.error(msg);
      this.passwordForm.enable();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onReauthenticate(): void {
    this.dialogRef.close(false);
    this.authService.logout();
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  togglePassword(): void {
    this.hidePassword.update((v) => !v);
  }

  toggleConfirmPassword(): void {
    this.hideConfirmPassword.update((v) => !v);
  }
}
