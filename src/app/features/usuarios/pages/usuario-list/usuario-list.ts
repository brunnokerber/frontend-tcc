import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { UsuarioDialogComponent } from '@core/auth/components/usuario-dialog/usuario-dialog';
import { AppRole, UserProfile } from '@core/auth/models/login.model';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';
import { UsuariosService } from '../../services/usuarios.service';

@Component({
  selector: 'app-usuario-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './usuario-list.html',
  styleUrls: ['./usuario-list.scss'],
})
export default class UsuarioListComponent implements OnInit {
  public usuariosService = inject(UsuariosService);
  public authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  public searchTerm = signal<string>('');
  public statusFilter = signal<'todos' | 'ativos' | 'desativados'>('todos');

  public currentUserId = computed(() => this.authService.getUserId());

  // KPIs
  public totalUsuarios = computed(() => this.usuariosService.usuarios().length);
  public totalAtivos = computed(() => this.usuariosService.usuarios().filter((u) => u.ativo !== false).length);
  public totalAdmins = computed(() => this.usuariosService.usuarios().filter((u) => u.role === 'admin' && u.ativo !== false).length);
  public totalOperadores = computed(() => this.usuariosService.usuarios().filter((u) => u.role === 'user' && u.ativo !== false).length);

  // Lista Filtrada
  public filteredUsuarios = computed(() => {
    const list = this.usuariosService.usuarios();
    const query = this.searchTerm().toLowerCase().trim();
    const status = this.statusFilter();

    return list.filter((u) => {
      // Filtro de Status
      if (status === 'ativos' && u.ativo === false) return false;
      if (status === 'desativados' && u.ativo !== false) return false;

      // Filtro de Busca
      if (query) {
        const emailMatch = (u.email || '').toLowerCase().includes(query);
        const roleMatch = u.role.toLowerCase().includes(query);
        const idMatch = u.id.toLowerCase().includes(query);
        return emailMatch || roleMatch || idMatch;
      }

      return true;
    });
  });

  async ngOnInit(): Promise<void> {
    await this.usuariosService.fetchUsuarios();
  }

  openInviteUserDialog(): void {
    const dialogRef = this.dialog.open(UsuarioDialogComponent, {
      width: '540px',
      maxWidth: '96vw',
      disableClose: true,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.usuariosService.fetchUsuarios();
      }
    });
  }

  confirmDeactivate(usuario: UserProfile): void {
    const isSelf = usuario.id === this.currentUserId();
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '460px',
      maxWidth: '94vw',
      data: {
        title: isSelf ? 'Desativar Minha Própria Conta' : 'Desativar Usuário',
        message: isSelf
          ? 'Tem certeza que deseja desativar sua conta? Você será desconectado e perderá o acesso ao sistema. O histórico dos registros cadastrados por você permanecerá intacto.'
          : `Tem certeza que deseja desativar o acesso de "${usuario.email || 'Usuário #' + usuario.id.slice(0, 6)}"? O usuário não poderá mais efetuar login, mas todos os registros vinculados a ele serão preservados.`,
        confirmText: 'Sim, Desativar Conta',
        confirmColor: 'warn',
        icon: 'person_off',
        isDestructive: true,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        if (isSelf) {
          await this.usuariosService.deactivateSelf();
        } else {
          await this.usuariosService.deactivateUsuario(usuario.id);
        }
      }
    });
  }

  confirmReactivate(usuario: UserProfile): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '460px',
      maxWidth: '94vw',
      data: {
        title: 'Reativar Conta de Usuário',
        message: `Deseja reativar a conta de "${usuario.email || 'Usuário #' + usuario.id.slice(0, 6)}"? O usuário voltará a ter acesso à plataforma com seu perfil (${usuario.role === 'admin' ? 'Administrador' : 'Operador'}).`,
        confirmText: 'Reativar Conta',
        confirmColor: 'primary',
        icon: 'how_to_reg',
        isDestructive: false,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        await this.usuariosService.reactivateUsuario(usuario.id);
      }
    });
  }

  async onChangeRole(usuario: UserProfile, newRole: AppRole): Promise<void> {
    if (usuario.role === newRole) return;
    await this.usuariosService.updateRole(usuario.id, newRole);
  }

  async confirmResendInvite(usuario: UserProfile): Promise<void> {
    const email = usuario.email;
    if (!email) {
      this.toast.warning('Este usuário não possui endereço de e-mail registrado.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '460px',
      maxWidth: '94vw',
      data: {
        title: 'Enviar Link de Redefinição de Senha',
        message: `Deseja enviar um link para definição / redefinição de senha para o e-mail "${email}"?`,
        confirmText: 'Enviar Link de Senha',
        confirmColor: 'primary',
        icon: 'mark_email_read',
        isDestructive: false,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.authService.sendResetPassword(email);
          this.toast.success(`E-mail com link de redefinição enviado com sucesso para "${email}"!`);
        } catch (err: any) {
          const msg = err.message || 'Erro ao enviar e-mail de redefinição.';
          this.toast.error(msg);
        }
      }
    });
  }
}
