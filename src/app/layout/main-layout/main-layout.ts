import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UsuarioDialogComponent } from '@core/auth/components/usuario-dialog/usuario-dialog';
import { AuthService } from '@core/auth/services/auth.service';
import { ThemeMode, ThemeService } from '@core/services/theme.service';
import { environment } from '@env/environment';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';
import { UsuariosService } from '@features/usuarios/services/usuarios.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatTooltipModule,
    MatSidenavModule,
  ],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.scss'],
})
export class MainLayoutComponent {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private usuariosService = inject(UsuariosService);
  private dialog = inject(MatDialog);

  public readonly ongName = environment.ongName;
  public user = this.authService.getUser();
  public isAdmin = this.authService.isAdmin;
  public mobileMenuOpen = signal(false);
  public userSidenavOpen = signal(false);

  // Tema
  public themeMode = this.themeService.themeMode;
  public isDarkMode = this.themeService.isDarkMode;

  setTheme(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleUserSidenav(): void {
    this.userSidenavOpen.update((v) => !v);
  }

  openUserSidenav(): void {
    this.userSidenavOpen.set(true);
  }

  closeUserSidenav(): void {
    this.userSidenavOpen.set(false);
  }

  openInviteUserDialog(): void {
    this.closeUserSidenav();
    this.closeMobileMenu();
    this.dialog.open(UsuarioDialogComponent, {
      width: '540px',
      maxWidth: '96vw',
      disableClose: true,
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
        this.closeUserSidenav();
        await this.usuariosService.deactivateSelf();
      }
    });
  }

  logout(): void {
    this.closeUserSidenav();
    this.authService.logout();
  }
}
