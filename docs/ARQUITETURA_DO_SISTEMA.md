# Arquitetura Geral da Solução
## Sistema de Gerenciamento de Animais Resgatados (*Peludinhos do Vale*)

---

**Instituição:** Universidade Feevale  
**Curso:** Engenharia da Computação  
**Trabalho de Conclusão de Curso (TCC)**  
**Projeto:** DESENVOLVIMENTO E VALIDAÇÃO DE SOFTWARE DE GERENCIAMENTO DE DADOS CADASTRAIS DE ANIMAIS DE ONGS DE ACOLHIMENTO E TRATAMENTO DE ANIMAIS DE RUA  
**Versão:** 1.1.0 — Outubro de 2026  

---

## 1. Visão Geral e Fundamentação da Arquitetura

A definição da arquitetura de software estabelece a estrutura organizacional dos componentes do sistema, suas interfaces externas e o padrão de comunicação que viabiliza o atendimento aos requisitos funcionais e não funcionais projetados (Pressman e Maxim, 2016; Sommerville, 2018).

Para atender aos critérios de usabilidade móvel, baixo tempo de resposta, segurança de acesso e custo nulo de infraestrutura exigidos pela ONG *Peludinhos do Vale*, a solução foi concebida sob uma arquitetura descentralizada e desacoplada em três camadas principais:

1. **Camada de Apresentação (Frontend SPA):** Single Page Application desenvolvida no framework Angular 20, utilizando a arquitetura Zoneless com reatividade granular alimentada por Signals e Computed Signals para otimizar o ciclo de renderização e reduzir o consumo de memória nos dispositivos dos voluntários (Angular, 2026). A interface é organizada sob o padrão *Feature-Based Design*, dividida entre um módulo central (*Core*) para serviços globais e autenticação, componentes compartilhados (*Shared*) e módulos de negócio autocontidos com carregamento tardio (*Lazy Loading*). A estilização e a ergonomia de telas adaptáveis a desktops e smartphones são providas pela integração entre Bootstrap e Angular Material, garantindo a alternância de temas claro e escuro e a observância às diretrizes de acessibilidade e alvos de toque (Dalmazo, 2024; Marcotte, 2010).

2. **Camada de Serviços e Persistência (BaaS - Supabase):** A comunicação entre o cliente web e a Camada de Serviços ocorre de forma assíncrona por meio de requisições HTTPS utilizando tokens de autenticação JSON Web Token (JWT) enviados no cabeçalho das requisições (RFC 7519). A camada de backend é provida pela plataforma Backend-as-a-Service (BaaS) Supabase, a qual encapsula o SGBDR PostgreSQL. O acesso aos dados é realizado diretamente via biblioteca Client SDK ou por APIs REST geradas dinamicamente pelo PostgREST, eliminando a necessidade de um servidor de aplicação intermediário mantido pela instituição (Supabase, 2024). A segurança da informação é assegurada nativamente no banco de dados por meio de políticas de Row Level Security (RLS), que interceptam cada consulta e validam os privilégios do perfil autenticado (`admin` ou `user`), enquanto tarefas de processamento sensível (como desativação síncrona de usuários) são delegadas a Edge Functions executadas em ambiente isolado na nuvem.

3. **Camada de Automação e Infraestrutura (DevOps):** Sustenta a qualidade, a manutenibilidade e a entrega contínua da aplicação web. O código-fonte é versionado em repositório no GitHub sob controle de versão distribuído via Git. Integrada ao repositório, uma esteira automatizada de Integração e Entrega Contínuas (CI/CD) construída com GitHub Actions é disparada a cada atualização no código, executando sequencialmente os passos de validação sintática (lint), compilação de pacotes (build), testes unitários e medição da cobertura de código (*Code Coverage*) antes de realizar o deploy automático da aplicação para a hospedagem em nuvem na Vercel (Rêgo Neto, 2021).

---

## 2. Diagrama Arquitetural da Solução

![Arquitetura Geral da Solução](./assets/Arquitetura%20do%20sistema.png)

> 📁 **Arquivo Fonte Editável:** O arquivo de modelagem vetorial está disponível em [`docs/Arquitetura do sistema.drawio`](./Arquitetura%20do%20sistema.drawio) e pode ser aberto diretamente no [draw.io](https://app.diagrams.net/).

---

## 3. Resumo dos Componentes por Camada

| Camada | Componente / Tecnologia | Responsabilidade Principal |
| :--- | :--- | :--- |
| **Apresentação (Frontend)** | **Angular 20 (Zoneless + Signals)** | Gestão de estado reativo fino, roteamento de telas com Lazy Loading e renderização otimizada. |
| | **Angular Material 20 + Bootstrap 5** | Design System responsivo, temas Light/Dark e componentes acessíveis com alvos de toque ergonômicos. |
| | **Core & Shared Modules** | Serviços singleton (`AuthService`, `SupabaseService`), guardas de rota (`authGuard`, `adminGuard`) e componentes comuns. |
| **Comunicação** | **HTTPS / TLS 1.3 & JWT (RFC 7519)** | Tráfego criptografado e autenticação stateless com tokens no header `Authorization: Bearer <token>`. |
| **Serviços e Banco (BaaS)** | **Supabase Auth (GoTrue)** | Gestão de sessões, criptografia de credenciais, disparo de convites e recuperação de senhas. |
| | **PostgREST API Engine** | Interface RESTful gerada automaticamente sobre o schema relacional do PostgreSQL. |
| | **SGBDR PostgreSQL & RLS** | Persistência relacional (`pets`, `entradas`, `vacinas`, `consultas_exames`, `locais`, `pets_locais`, `veterinarios`, `profiles`) e segurança a nível de linha. |
| | **Edge Functions (Deno / Serverless)** | Processamento administrativo sensível em nuvem isolada (`toggle-user-status`). |
| **DevOps & Infraestrutura** | **GitHub (Git)** | Controle de versão distribuído do código-fonte e histórico de commits. |
| | **GitHub Actions (CI/CD)** | Automação sequencial de Lint, Build de Produção, Testes Unitários/Cobertura e Deploy contínuo. |
| | **Vercel CDN Hosting** | Distribuição global de alta disponibilidade da SPA Angular com CDN e SSL automático. |
