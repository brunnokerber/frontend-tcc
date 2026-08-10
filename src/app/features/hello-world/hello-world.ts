import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '@core/services/supabase';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '@core/auth/services/auth.service';

export interface HelloWorldMessage {
  id: number;
  message: string;
  created_at: string;
}

@Component({
  selector: 'app-hello-world',
  standalone: true,
  imports: [
    DatePipe, ReactiveFormsModule, MatButtonModule,
    MatCardModule, MatListModule, MatIconModule,
    MatFormFieldModule, MatInputModule
  ],
  templateUrl: './hello-world.html',
  styleUrl: './hello-world.scss',
})
export default class HelloWorld implements OnInit {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);

  mensagens = signal<HelloWorldMessage[]>([]);

  mensagemControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required]
  });

  ngOnInit() {
    this.carregarMensagens();
  }

  async carregarMensagens() {
    const { data, error } = await this.supabaseService.client
      .from('hello_world_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .overrideTypes<HelloWorldMessage[]>();

    if (error) {
      console.error('Erro ao buscar mensagens:', error.message);
    } else {
      this.mensagens.set(data || []);
    }
  }

  async enviarMensagem() {
    if (this.mensagemControl.invalid || !this.mensagemControl.value.trim()) {
      return;
    }

    const textoCustomizado = this.mensagemControl.value.trim();

    const { error } = await this.supabaseService.client
      .from('hello_world_messages')
      .insert([
        { message: textoCustomizado }
      ]);

    if (error) {
      console.error('RLS Bloqueou ou deu erro:', error.message);
    } else {
      this.mensagemControl.reset();
      this.carregarMensagens();
    }
  }

  sair() {
    this.authService.logout();
  }
}