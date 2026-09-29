import { Component, inject, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private titleService = inject(Title);
  private themeService = inject(ThemeService); // Inicializa o tema globalmente em todas as rotas
  protected readonly title = signal(environment.ongName);

  ngOnInit(): void {
    this.titleService.setTitle(environment.ongName);
  }
}
