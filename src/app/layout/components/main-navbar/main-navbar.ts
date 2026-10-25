import { CommonModule } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-main-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './main-navbar.html',
  styleUrls: ['./main-navbar.scss'],
})
export class MainNavbarComponent {
  private authService = inject(AuthService);

  public readonly ongName = environment.ongName;
  public user = this.authService.getUser();
  public isAdmin = this.authService.isAdmin;
  public mobileMenuOpen = signal(false);

  public openUserSidenav = output<void>();

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  onOpenUserSidenav(): void {
    this.closeMobileMenu();
    this.openUserSidenav.emit();
  }

  logout(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }
}
