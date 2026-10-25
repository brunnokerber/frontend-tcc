import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';
import { MainFooterComponent } from '../components/main-footer/main-footer';
import { MainNavbarComponent } from '../components/main-navbar/main-navbar';
import { UserSidenavComponent } from '../components/user-sidenav/user-sidenav';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MainNavbarComponent,
    UserSidenavComponent,
    MainFooterComponent,
  ],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.scss'],
})
export class MainLayoutComponent {
  public userSidenavOpen = signal(false);

  toggleUserSidenav(): void {
    this.userSidenavOpen.update((v) => !v);
  }

  openUserSidenav(): void {
    this.userSidenavOpen.set(true);
  }

  closeUserSidenav(): void {
    this.userSidenavOpen.set(false);
  }
}
