import { CommonModule } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { AlterarSenhaDialogComponent } from '@core/auth/components/alterar-senha-dialog/alterar-senha-dialog';
import { UsuarioDialogComponent } from '@core/auth/components/usuario-dialog/usuario-dialog';
import { AuthService } from '@core/auth/services/auth.service';
import { ThemeMode, ThemeService } from '@core/services/theme.service';
import { environment } from '@env/environment';
import { UsuariosService } from '@features/usuarios/services/usuarios.service';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-user-sidenav',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './user-sidenav.html',
  styleUrls: ['./user-sidenav.scss'],
})
export class UserSidenavComponent {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private usuariosService = inject(UsuariosService);
  private dialog = inject(MatDialog);

  public readonly ongName = environment.ongName;
  public readonly appVersion = environment.appVersion;
  public user = this.authService.getUser();
  public isAdmin = this.authService.isAdmin;

  // Tema
  public themeMode = this.themeService.themeMode;
  public isDarkMode = this.themeService.isDarkMode;

  public close = output<void>();

  onClose(): void {
    this.close.emit();
  }

  setTheme(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
  }

  openInviteUserDialog(): void {
    this.onClose();
    this.dialog.open(UsuarioDialogComponent, {
      width: '540px',
      maxWidth: '96vw',
      disableClose: true,
      autoFocus: false,
    });
  }

  openChangePasswordDialog(): void {
    this.onClose();
    this.dialog.open(AlterarSenhaDialogComponent, {
      width: '500px',
      maxWidth: '96vw',
      autoFocus: false,
    });
  }

  confirmDeactivateOwnAccount(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '460px',
      maxWidth: '94vw',
      data: {
        title: 'Desativar Minha Conta',
        message:
          'Tem certeza que deseja desativar sua conta de acesso? Você será desconectado e não poderá mais efetuar login. Todo o histórico de registros cadastrados por você permanecerá intacto.',
        confirmText: 'Sim, Desativar Minha Conta',
        confirmColor: 'warn',
        icon: 'person_off',
        isDestructive: true,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        this.onClose();
        await this.usuariosService.deactivateSelf();
      }
    });
  }

  logout(): void {
    this.onClose();
    this.authService.logout();
  }
}
