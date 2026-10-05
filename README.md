# Sistema de Gerenciamento de Animais Resgatados (Peludinhos do Vale)
### Trabalho de Conclusão de Curso (TCC) — Engenharia da Computação | Universidade Feevale

> **Projeto:** DESENVOLVIMENTO E VALIDAÇÃO DE SOFTWARE DE GERENCIAMENTO DE DADOS CADASTRAIS DE ANIMAIS DE ONGS DE ACOLHIMENTO E TRATAMENTO DE ANIMAIS DE RUA  
> **Frontend:** Single Page Application (SPA) reativa desenvolvida em **Angular 20**, **Signals**, **Angular Material 20** e **Supabase**.

---

## 📑 Sumário

- [Visão Geral e Contexto](#-visão-geral-e-contexto)
- [Documentações Oficiais do TCC](#-documentações-oficiais-do-tcc)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura de Diretórios](#-arquitetura-de-diretórios)
- [Pré-requisitos](#-pré-requisitos)
- [Guia de Instalação e Execução (Ramp-up Rápido)](#-guia-de-instalação-e-execução-ramp-up-rápido)
- [Configuração de Ambientes](#-configuração-de-ambientes)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Módulos e Principais Funcionalidades](#-módulos-e-principais-funcionalidades)
- [Controle de Acesso e Permissões (RBAC)](#-controle-de-acesso-e-permissões-rbac)

---

## 🐾 Visão Geral e Contexto

A plataforma foi desenvolvida para solucionar desafios operacionais de ONGs e abrigos de proteção animal, informatizando o fluxo de:
1. **Triagem de Resgates e Cadastro de Animais:** Coleta detalhada de características biológicas, fotos, documentos e cálculo algorítmico automatizado de fase de vida (*Filhote, Adulto, Sênior*).
2. **Prontuário Clínico & Financeiro:** Acompanhamento de vacinas com calendário preventivo, consultas, exames laboratoriais, cirurgias e totalização reativa de despesas investidas no animal.
3. **Gestão de Estadias e Lares Temporários:** Histórico contínuo de movimentação e auxílio financeiro pago a lares parceiros.
4. **Corpo Clínico Parceiro:** Cadastro e vínculo de médicos veterinários por CRVET.
5. **Governança de Usuários:** Autenticação segura JWT, papéis de acesso (*Administrador* vs. *Operador*), convites por e-mail e soft delete com banimento síncrono.

---

## 📚 Documentações Oficiais do TCC

Acesse os documentos de fundamentação metodológica e modelagem do projeto:

* 📄 [**Elicitação e Especificação de Requisitos**](./docs/ELICITACAO_DE_REQUISITOS.md) — 24 Requisitos Funcionais (RF), 18 Regras de Negócio (RN), 10 Requisitos Não-Funcionais (RNF) e Matriz de Rastreabilidade (RTM).
* 📊 [**Modelo Conceitual EER (brModelo)**](./docs/MODELO_EER_BRMODELO.md) — Diagrama Conceitual Estendido, cardinalidades $(min, max)$, dicionário de entidades e mapeamento EER $\leftrightarrow$ Relacional.

---

## 🛠️ Tecnologias Utilizadas

* **Framework:** [Angular](https://angular.dev/) v20.2.x (Standalone Components, Signals & Computed Signals, Reactive Forms, Control Flow `@if/@for`)
* **Design System & UI:** [Angular Material](https://material.angular.io/) v20.2.x, Material Design 3, FontAwesome & Bootstrap Icons
* **Estilização:** Sass (SCSS) modularizado com temas Light/Dark reativos
* **Backend as a Service (BaaS):** [Supabase](https://supabase.com/) (PostgreSQL Relacional, GoTrue Auth com JWT, Row Level Security e Edge Functions)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/) v5.9+

---

## 📂 Arquitetura de Diretórios

O projeto segue a arquitetura em camadas orientada a funcionalidades (*Feature-Driven Architecture*):

```plaintext
frontend-tcc/
├── docs/                        # Documentação formal de requisitos e diagramas EER
│   ├── ELICITACAO_DE_REQUISITOS.md
├── src/
│   ├── app/
│   │   ├── core/                # Serviços singleton, auth, guards, interceptors, supabase client
│   │   │   ├── audit/           # Modelos de auditoria (created_at, updated_at)
│   │   │   ├── auth/            # AuthService, login/reset models, guards (authGuard, adminGuard)
│   │   │   ├── config/          # Configurações globais
│   │   │   └── services/        # SupabaseService, ThemeService, ToastService, NavigationService
│   │   ├── features/            # Módulos de negócio da aplicação
│   │   │   ├── definir-senha/   # Fluxo de primeiro acesso e recuperação de senha
│   │   │   ├── locais/          # Cadastro, listagem e filtros de locais/lares temporários
│   │   │   ├── login/           # Tela de autenticação
│   │   │   ├── pets/            # Prontuário, triagem, vacinas, procedimentos e estadias
│   │   │   ├── usuarios/        # Administração de usuários e convites (apenas Admin)
│   │   │   └── veterinarios/    # Cadastro e busca de médicos veterinários
│   │   ├── layout/              # Shell da aplicação (MainLayout, Sidenav, Header, alternância de tema)
│   │   └── shared/              # Utilitários, pipes, diretivas e componentes reutilizáveis
│   │       ├── adapters/        # CustomDateAdapter (formatação brasileira DD/MM/YYYY)
│   │       ├── components/      # ConfirmationDialog e modais genéricos
│   │       ├── directives/      # Máscaras de data e formulários
│   │       ├── pipes/           # FormErrorPipe e pipes de formatação
│   │       └── utils/           # Manipulação de strings e tratamento de erros do Supabase
│   ├── environments/            # Variáveis de ambiente (desenvolvimento e produção)
│   └── styles/                  # Design tokens, badges de status, temas e mixins SCSS
├── angular.json                 # Configuração do Angular CLI
└── package.json                 # Dependências e scripts de execução
```

---

## ⚡ Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:
* [Node.js](https://nodejs.org/) versão **18.x** ou **20.x LTS**
* [npm](https://www.npmjs.com/) (geralmente instalado junto com o Node.js)
* [Angular CLI](https://angular.dev/tools/cli) instalado globalmente (opcional, mas recomendado):
  ```bash
  npm install -g @angular/cli
  ```

---

## 🚀 Guia de Instalação e Execução (Ramp-up Rápido)

### 1. Clonar o repositório
```bash
git clone <URL_DO_REPOSITORIO>
cd frontend-tcc
```

### 2. Instalar as dependências do projeto
```bash
npm install
```

### 3. Configurar as variáveis de ambiente
Verifique o arquivo `src/environments/environment.ts` com as credenciais do Supabase local ou remoto:
```typescript
export const environment = {
  production: false,
  ongName: 'Peludinhos do Vale',
  apiUrl: 'http://127.0.0.1:54321', // URL do Supabase local ou cloud
  apiKey: 'sua-anon-key-aqui'
};
```

### 4. Executar o servidor de desenvolvimento
```bash
npm start
```
ou
```bash
ng serve
```

Acesse a aplicação no navegador em: **`http://localhost:4200/`**

---

## 🌐 Configuração de Ambientes

O projeto possui separação entre ambiente de desenvolvimento e produção:

| Arquivo | Descrição |
| :--- | :--- |
| `src/environments/environment.ts` | Configuração padrão utilizada pelo `npm start` (ambiente local). |
| `src/environments/environment.production.ts` | Configuração com chaves de produção/nuvem ativada com flag `--c production`. |

Para rodar o frontend apontando para o ambiente de homologação/produção:
```bash
npm run start-remote
```

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm start` | Inicia o servidor local de desenvolvimento com Hot Reload em `http://localhost:4200`. |
| `npm run start-remote` | Inicia o servidor local apontando para as configurações de produção. |
| `npm run build` | Compila os artefatos de produção otimizados na pasta `dist/`. |
| `npm run test` | Executa a suíte de testes unitários com Karma e Jasmine. |

---

## 🧩 Módulos e Principais Funcionalidades

### 1. Módulo de Pets (`/pets`)
* **Listagem com Filtros Dinâmicos:** Pesquisa por nome, espécie (Cachorro, Gato, Outro), sexo, status, senioridade e porte.
* **Formulário de Cadastro/Edição:** Registro com cálculo de senioridade em tempo real a partir da data de nascimento.
* **Prontuário Individual:** Painel consolidado contendo histórico de vacinação, histórico clínico/cirúrgico, histórico de estadias e somatório financeiro total investido no animal.

### 2. Módulo de Locais e Lares Temporários (`/locais`)
* Cadastro completo de lares parceiros, clínicas, abrigos e feiras com endereçamento completo.
* Histórico de alocação de pets por localidade (`pets_locais`) com valor de auxílio.

### 3. Módulo de Veterinários (`/veterinarios`)
* Cadastro de médicos veterinários e clínicas parceiras por nome, CRVET e telefone de contato.

### 4. Módulo de Administração de Usuários (`/usuarios` — Apenas Admin)
* Convite de novos usuários por e-mail com atribuição de perfil (`admin` ou `user`).
* Desativação lógica com banimento síncrono no Auth sem exclusão de dados de auditoria (*Soft Delete*).
* Alternância dinâmica de papéis e auto-desativação com encerramento de sessão.

---

## 🔐 Controle de Acesso e Permissões (RBAC)

| Perfil | Acessos e Permissões |
| :--- | :--- |
| **Administrador (`admin`)** | Acesso total a todas as telas, cadastro de pets, prontuários, clínicas, lares temporários e gestão completa de usuários (`/usuarios`). |
| **Operador (`user`)** | Acesso operacional para cadastro de pets, lançamentos no prontuário, gestão de lares temporários e veterinários. Bloqueado na rota `/usuarios` via `adminGuard`. |
