# Diretrizes e Regras do Projeto para Assistentes de IA (AGENTS.md)

Este documento estabelece as regras de conduta, padrões arquiteturais e obrigações mandatórias que todo assistente de IA deve cumprir ao propor ou implementar códigos, refatorações e manutenções neste repositório.

---

## 📌 Contexto do Projeto

- **Projeto:** Sistema de Gerenciamento de Animais Resgatados (*Peludinhos do Vale*)
- **Trabalho Acadêmico:** Trabalho de Conclusão de Curso (TCC) - Engenharia da Computação - Universidade Feevale
- **Stack Principal:** Angular 20 (Zoneless + Signals), TypeScript, Angular Material, Bootstrap / Bootstrap Icons, Supabase (BaaS, PostgreSQL, RLS, Edge Functions).

---

## 🚨 Regra de Ouro: Atualização Contínua e Mandatória de Documentação

> **É IMPRESCINDÍVEL E OBRIGATÓRIO manter toda a documentação do projeto sincronizada a cada nova funcionalidade (*feature*), alteração estrutural ou refatoração.**

Ao concluir qualquer tarefa que envolva nova feature, alteração de regras de negócio ou mudança de fluxo:

1. **Requisitos e Regras de Negócio ([docs/ELICITACAO_DE_REQUISITOS.md](./docs/ELICITACAO_DE_REQUISITOS.md)):**
   - Atualizar a lista de Requisitos Funcionais (RF), Não Funcionais (RNF) ou Regras de Negócio (RN) caso tenham sido criados, estendidos ou modificados.
   - Ajustar a matriz de rastreabilidade ou status de implementação.

2. **Arquitetura da Solução ([docs/ARQUITETURA_DO_SISTEMA.md](./docs/ARQUITETURA_DO_SISTEMA.md)):**
   - Atualizar diagramas lógicos, fluxo de dados, novos serviços do Supabase, novas políticas de segurança (RLS) ou novos módulos/camadas adicionadas.

3. **Guia Principal do Repositório ([README.md](./README.md)):**
   - Atualizar instruções de execução, novas variáveis de ambiente (`.env.local`), novos scripts do `package.json` ou novas rotas da aplicação.

4. **Resumo da Entrega:**
   - O assistente de IA **sempre deve informar explicitamente ao usuário** quais seções da documentação foram atualizadas em decorrência da implementação realizada.

---

## 🛠️ Padrões de Código e Arquitetura

### 1. Angular Moderno & Reatividade
- **Standalone Components:** Todos os componentes, diretivas e pipes devem ser `standalone: true`.
- **Zoneless & Signals:** Priorize a reatividade fina do Angular 20 com `signal()`, `computed()` e `effect()`, evitando dependência do Zone.js ou suscricões manuais em `RxJS` (`subscribe`) onde Signals forem suficientes.
- **Injeção de Dependências:** Utilize preferencialmente a função `inject()` em vez de injeções tradicionais no construtor.

### 2. Organização de Diretórios (Feature-Based)
- `src/app/core/`: Serviços globais singleton, interceptors, autenticação e guardas de rota.
- `src/app/shared/`: Componentes reutilizáveis de UI, pipes, diretivas e modelos genéricos.
- `src/app/features/`: Módulos de negócio autocontidos com carregamento tardio (*Lazy Loading*).

### 3. Qualidade de Código & Tipagem
- **TypeScript Estrito:** Nunca use `any`. Crie e mantenha interfaces e types consistentes para todos os modelos de dados e respostas de API.
- **Tratamento de Erros:** Sempre trate respostas de erro da API/Supabase fornecendo feedback visual ao usuário (snackbars/toasts).
- **Acessibilidade e Design Responsivo:** Garantir conformidade com mobile-first, suporte a tema claro/escuro e acessibilidade (contrastes, labels e tags semânticas).
- **Boas Práticas de CSS/SCSS:** **Evitar ao máximo o uso de `!important`** em estilizações. Priorize a especificidade correta de seletores, variáveis CSS (`var(--mat-sys-*)`) e herança limpa do Design System.

---

## 📋 Checklist Obrigatório de Finalização de Tarefa

Antes de considerar uma resposta ou feature concluída, a IA deve verificar:
- [ ] O código compila sem erros (`npm run build` / typecheck)?
- [ ] A nova funcionalidade está devidamente tipada sem uso de `any`?
- [ ] As estilizações respeitam as boas práticas de CSS sem uso desnecessário de `!important`?
- [ ] A documentação técnica em `docs/` e `README.md` foi atualizada?
- [ ] Foi comunicado ao usuário um resumo das alterações no código e nos documentos?

