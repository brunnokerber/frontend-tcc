import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { environment } from '@env/environment';

@Component({
  selector: 'app-main-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './main-footer.html',
  styleUrls: ['./main-footer.scss'],
})
export class MainFooterComponent {
  public readonly ongName = environment.ongName;
  public readonly appVersion = environment.appVersion;
}
