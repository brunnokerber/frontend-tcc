# Sistema de Gerenciamento de Animais Resgatados (Peludinhos do Vale)
### Trabalho de Conclusão de Curso (TCC) — Engenharia da Computação | Universidade Feevale

> **Projeto:** DESENVOLVIMENTO E VALIDAÇÃO DE SOFTWARE DE GERENCIAMENTO DE DADOS CADASTRAIS DE ANIMAIS DE ONGS DE ACOLHIMENTO E TRATAMENTO DE ANIMAIS DE RUA  
> **Versão Atual:** `0.1.0` (Outubro de 2026)  
> **Frontend:** Single Page Application (SPA) reativa desenvolvida em **Angular 20**, **Signals**, **Angular Material 20** e **Supabase**.  
> **Backend:** Infraestrutura de banco de dados, migrações SQL, Edge Functions e RLS disponíveis no repositório [backend-supabase](https://github.com/brunnokerber/backend-supabase).

---

## 📑 Sumário

- [Visão Geral e Contexto](#-visão-geral-e-contexto)
- [Documentações Oficiais do TCC e Repositórios](#-documentações-oficiais-do-tcc-e-repositórios)
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
4. **Corpo Clínico Parceiro:** Cadastro e vínculo de médicos veterinários por CRMV.
5. **Governança de Usuários:** Autenticação segura JWT, papéis de acesso (*Administrador* vs. *Operador*), convites por e-mail e soft delete com banimento síncrono.

---

## 📚 Documentações Oficiais do TCC e Repositórios

Acesse os documentos de fundamentação metodológica, modelagem e código-fonte do ecossistema:

* 📄 [**Elicitação e Especificação de Requisitos**](./docs/ELICITACAO_DE_REQUISITOS.md) — 27 Requisitos Funcionais (RF), 19 Regras de Negócio (RN), 10 Requisitos Não-Funcionais (RNF) e Matriz de Rastreabilidade (RTM).
* 🏛️ [**Arquitetura Geral da Solução**](./docs/ARQUITETURA_DO_SISTEMA.md) — Diagrama de arquitetura em 3 camadas (Frontend SPA, Supabase BaaS, DevOps) com script Draw.io nativo.
* 🗄️ [**Repositório do Backend (Supabase)**](https://github.com/brunnokerber/backend-supabase) — Scripts SQL de migração DDL/DML, modelagem relacional no PostgreSQL, políticas RLS (Row Level Security) e Edge Functions.

---

## 🛠️ Tecnologias Utilizadas

* **Framework:** [Angular](https://angular.dev/) v20.2.x (Standalone Components, Signals & Computed Signals, Reactive Forms, Control Flow `@if/@for`)
* **Design System & UI:** [Angular Material](https://material.angular.io/) v20.2.x, Material Design 3, FontAwesome & Bootstrap Icons
* **Estilização:** Sass (SCSS) modularizado com temas Light/Dark reativos
* **Backend as a Service (BaaS):** [Supabase](https://supabase.com/) (PostgreSQL Relacional, GoTrue Auth com JWT, Row Level Security e Edge Functions) — Repositório com scripts e migrações em [backend-supabase](https://github.com/brunnokerber/backend-supabase)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/) v5.9+

---

## 📂 Arquitetura de Diretórios

O projeto segue a arquitetura em camadas orientada a funcionalidades (*Feature-Driven Architecture*):

```plaintext
frontend-tcc/
├── docs/                        # Documentação formal de requisitos e diagramas EER
│   ├── ELICITACAO_DE_REQUISITOS.md
│   └── ARQUITETURA_DO_SISTEMA.md
├── src/
│   ├── app/
│   │   ├── core/                # Serviços singleton, auth, guards, interceptors, supabase client
│   │   │   ├── audit/           # Modelos de auditoria (created_at, updated_at)
│   │   │   ├── auth/            # AuthService, login/reset models, guards (authGuard, adminGuard)
│   │   │   ├── config/          # Configurações globais (app-version.config centralizado)
│   │   │   └── services/        # SupabaseService, ThemeService, ToastService, NavigationService
│   │   ├── features/            # Módulos de negócio da aplicação
│   │   │   ├── definir-senha/   # Fluxo de primeiro acesso e recuperação de senha
│   │   │   ├── locais/          # Cadastro, listagem e filtros de locais/lares temporários
│   │   │   ├── login/           # Tela de autenticação
│   │   │   ├── pets/            # Prontuário, triagem, vacinas, procedimentos e estadias
│   │   │   ├── usuarios/        # Administração de usuários e convites (apenas Admin)
│   │   │   ├── veterinarios/    # Cadastro e busca de médicos veterinários
│   │   │   └── voluntarios/     # Gestão e escalas de voluntários por dia/turno (apenas Admin)
│   │   ├── layout/              # Shell da aplicação (MainLayout, Sidenav, Header, alternância de tema)
│   │   └── shared/              # Utilitários, pipes, diretivas e componentes reutilizáveis
│   │       ├── adapters/        # CustomDateAdapter (formatação brasileira DD/MM/YYYY)
│   │       ├── components/      # PageHeaderComponent, StatCardComponent (KPIs), FilterPanelComponent, DialogLayout padronizado, ConfirmationDialog e modais utilitários
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
  appVersion: '0.1.0',
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
| `npm test` | Executa a suíte de testes unitários em modo headless ultrarrápido com Vitest. |
| `npm run test:watch` | Executa os testes unitários em modo interativo de observação (*Watch mode*). |
| `npm run test:coverage` | Executa a suíte completa de testes e gera relatórios de cobertura de código (*V8 Coverage* em `coverage/`). |
| `npm run format` | Executa a formatação e padronização automática de código com Prettier em todos os arquivos (`.ts`, `.html`, `.scss`, `.json`). |
| `npm run format:check` | Valida se todos os arquivos do projeto seguem o padrão do Prettier sem alterá-los. |

### 🧪 Testes Unitários e Cobertura (Vitest)

O projeto adota o **Vitest** com `@analogjs/vite-plugin-angular` e simulação DOM via `jsdom` como motor oficial de testes unitários:
* **Execução Rápida e Headless:** Não requer navegador Chrome instalado nem inicialização de servidor pesado, sendo ideal tanto para o fluxo local quanto para esteiras de CI/CD.
* **Cobertura de Código Nativa:** Utiliza o provedor `@vitest/coverage-v8`, gerando relatórios de cobertura em múltiplos formatos: `text` (terminal), `lcov` (integração contínua) e `json-summary`.
* **Execução:**
  ```bash
  # Rodar todos os testes uma única vez
  npm test

  # Rodar testes com auto-reload (watch)
  npm run test:watch

  # Rodar testes gerando relatório de cobertura
  npm run test:coverage
  ```

### 🎨 Padronização de Código (Prettier)

O projeto utiliza o **Prettier** para assegurar consistência sintática e visual em todo o código-fonte:
* **Configuração Centralizada:** Gerenciada no arquivo [`.prettierrc`](./.prettierrc), definindo largura máxima de 100 caracteres, aspas simples (`singleQuote`), ponto-e-vírgula obrigatório (`semi`), indentação de 2 espaços (`tabWidth`), fim de linha compatível com Windows/Linux (`endOfLine: 'auto'`) e parser específico do Angular para templates HTML.
* **Arquivos Ignorados:** Especificados em [`.prettierignore`](./.prettierignore) para isolar artefatos de build (`dist/`), dependências (`node_modules/`) e binários.
* **Execução:**
  ```bash
  # Formatar e reescrever arquivos automaticamente
  npm run format

  # Apenas checar se há arquivos fora do padrão
  npm run format:check
  ```

---

## 🧩 Módulos e Principais Funcionalidades

### 1. Módulo de Pets (`/pets`)
* **Listagem com Filtros Dinâmicos e Cards Responsivos:** Pesquisa por nome, espécie (Cachorro, Gato, Outro), sexo, status, senioridade e porte, com tabela desktop e cards móveis adaptáveis dotados de botão primário e menu contextual de ações.
* **Formulário de Cadastro/Edição:** Registro com cálculo de senioridade em tempo real a partir da data de nascimento.
* **Prontuário Individual:** Painel consolidado contendo histórico de vacinação, histórico clínico/cirúrgico, histórico de estadias e somatório financeiro total investido no animal.

### 2. Módulo de Locais e Lares Temporários (`/locais`)
* Cadastro completo de lares parceiros, clínicas, abrigos e feiras com endereçamento completo.
* Histórico de alocação de pets por localidade (`pets_locais`) com valor de auxílio.

### 3. Módulo de Veterinários (`/veterinarios`)
* Cadastro de médicos veterinários e clínicas parceiras por nome, CRMV e telefone de contato.

### 4. Módulo de Administração de Usuários (`/usuarios` — Apenas Admin)
* Convite de novos usuários por e-mail com atribuição de perfil (`admin` ou `user`).
* Desativação lógica com banimento síncrono no Auth sem exclusão de dados de auditoria (*Soft Delete*).
* Alternância dinâmica de papéis e auto-desativação com encerramento de sessão.

### 5. Módulo de Voluntários e Escalas de Apoio (`/voluntarios` — Apenas Admin)
* Cadastro de colaboradores voluntários com nome, telefone com máscara brasileira, e-mail e observações operacionais.
* Seleção dinâmica de múltiplos dias da semana (*Segunda* a *Domingo*) e turnos disponíveis (*Manhã*, *Tarde*, *Noite*).
* Filtros combinados por dias e turnos utilizando operador `@>` (`.contains()`) com aceleração por índices GIN no PostgreSQL.
* Acionamento direto via WhatsApp para convocação rápida para plantões, resgates e eventos.

---

## 🔐 Controle de Acesso, Autenticação e Segurança

### 1. Papéis de Acesso (RBAC)

| Perfil | Acessos e Permissões |
| :--- | :--- |
| **Administrador (`admin`)** | Acesso total a todas as telas, cadastro de pets, prontuários, retificação e edição de dados de entrada/resgate, gestão de clínicas, lares temporários, quadro de voluntários (`/voluntarios`) e administração completa de usuários (`/usuarios`). |
| **Operador (`user`)** | Acesso operacional para cadastro de pets, lançamentos no prontuário, gestão de lares temporários e veterinários. Bloqueado nas rotas `/usuarios` e `/voluntarios` via `adminGuard` e com dados de entrada de pets em modo somente-leitura na edição. |

### 2. Credenciais de Desenvolvimento (Mock Local / Seed)
A conta de administrador inicial da seed de banco de dados (`seed.sql`) está em estrita conformidade com a política de senhas fortes:

* **E-mail:** `admin@admin.com`
* **Senha:** `Admin@123`
* **Papel:** `admin`

### 3. Diretrizes de Segurança do Supabase Auth

1. **Política de Senhas Fortes:**
   * Rejeição nativa no backend via HTTP 422 (`weak_password`).
   * Validação reativa síncrona nos formulários Angular (`strongPasswordValidator` e `SENHA_FORTE_REGEX`) acompanhada de checklist visual com indicadores dinâmicos em tempo real nas telas de Primeiro Acesso (`/definir-senha`), Redefinição e Alteração de Senha no Perfil.
   * Regras mandatórias: Mínimo 8 caracteres, ao menos 1 maiúscula (A-Z), ao menos 1 minúscula (a-z), ao menos 1 número (0-9) e ao menos 1 caractere especial (`!@#$%^&*()_+-=[]{};':"|,.<>/?~`).

2. **Fluxo de Cadastro Fechado (Signup Fechado):**
   * Auto-registro desativado (`signup_disabled`). Não há rotas nem formulários públicos de cadastro desassistido.
   * Novos voluntários são adicionados exclusivamente por administradores via Edge Function `invite-user`, recebendo link temporário seguro para definição de credencial inicial em `/definir-senha`.

3. **Gerenciamento de Sessão e Timeouts de Inatividade:**
   * Duração máxima da sessão (*Timebox*): **24 horas**.
   * Timeout de inatividade: **8 horas**.
   * O `AuthService` monitora o ciclo de vida via `supabase.auth.onAuthStateChange` (`SIGNED_OUT` ou expiração de refresh), redirecionando para `/login` com emissão de notificação informativa (*toast*).

4. **Proteção na Troca de Senha (`secure_password_change: true`):**
   * O Supabase exige reautenticação recente para alteração de credencial pelo próprio usuário. Caso a sessão tenha sido aberta há muito tempo, o frontend detecta o bloqueio e orienta o usuário a realizar novo login antes de prosseguir.
