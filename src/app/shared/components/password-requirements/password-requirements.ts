import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { evaluatePasswordStrength, PasswordCriteria } from '@shared/validators/password.validators';

@Component({
  selector: 'app-password-requirements',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './password-requirements.html',
  styleUrls: ['./password-requirements.scss'],
})
export class PasswordRequirementsComponent {
  readonly password = input<string>('');

  readonly criteria = computed<PasswordCriteria>(() => evaluatePasswordStrength(this.password()));
}
