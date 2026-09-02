import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';

import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule,
    FormErrorPipe
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export default class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  hidePassword = signal(true);
  isLoading = signal(false);
  errorMessage = signal('');

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  onSubmit() {
    if (this.loginForm.invalid) { return; }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.loginForm.disable();

    const formValue = this.loginForm.getRawValue();

    this.authService.login(formValue).subscribe({
      next: () => {
        this.toast.success('Login realizado com sucesso!');
        this.router.navigate(['/pets']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loginForm.enable();

        const message = err.error?.message || 'E-mail ou Senha inválidos';
        this.errorMessage.set(message);
        this.toast.error(message);
      }
    });
  }

  togglePassword() {
    this.hidePassword.update(prev => !prev);
  }
}