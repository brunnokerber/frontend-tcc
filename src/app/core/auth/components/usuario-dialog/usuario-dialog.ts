import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastService } from '@core/services/toast.service';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import { AppRole } from '../../models/login.model';
import { AuthService } from '../../services/auth.service';

export interface RoleOption {
  value: AppRole;
  label: string;
  badge: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-usuario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    FormErrorPipe,
  ],
  templateUrl: './usuario-dialog.html',
  styleUrls: ['./usuario-dialog.scss'],
})
export class UsuarioDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<UsuarioDialogComponent>);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  public isSubmitting = signal<boolean>(false);

  public roleOptions: RoleOption[] = [
    {
      value: 'user',
      label: 'Operador',
      badge: 'Padrão',
      description: 'Acesso para cadastrar e acompanhar pets, vacinas, procedimentos clínicos e locais parceiros.',
      icon: 'person',
    },
    {
      value: 'admin',
      label: 'Administrador',
      badge: 'Acesso Total',
      description: 'Acesso irrestrito a todos os módulos, com permissão para convidar novos usuários e gerenciar a plataforma.',
      icon: 'admin_panel_settings',
    },
  ];

  public inviteForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    role: ['user' as AppRole, [Validators.required]],
  });

  async onSendInvite(): Promise<void> {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      this.toast.warning('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    const formValues = this.inviteForm.getRawValue();
    const email = formValues.email?.trim().toLowerCase() || '';
    const role = formValues.role || 'user';

    this.isSubmitting.set(true);

    try {
      await this.authService.inviteUser(email, role);
      this.toast.success(`Convite de acesso enviado com sucesso para "${email}"!`);
      this.dialogRef.close({ email, role });
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao enviar convite para o usuário.';
      this.toast.error(errorMsg);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
