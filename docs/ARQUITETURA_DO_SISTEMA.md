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

2. **Camada de Serviços e Persistência (BaaS - Supabase):** A comunicação entre o cliente web e a Camada de Serviços ocorre de forma assíncrona por meio de requisições HTTPS utilizando tokens de autenticação JSON Web Token (JWT) enviados no cabeçalho das requisições (RFC 7519). A camada de backend é provida pela plataforma Backend-as-a-Service (BaaS) Supabase, a qual encapsula o SGBDR PostgreSQL, cujos scripts de migração, políticas RLS e Edge Functions estão versionados no repositório [backend-supabase](https://github.com/brunnokerber/backend-supabase). O acesso aos dados é realizado diretamente via biblioteca Client SDK ou por APIs REST geradas dinamicamente pelo PostgREST, eliminando a necessidade de um servidor de aplicação intermediário mantido pela instituição (Supabase, 2024). A segurança da informação é assegurada nativamente no banco de dados por meio de políticas de Row Level Security (RLS), que interceptam cada consulta e validam os privilégios do perfil autenticado (`admin` ou `user`), enquanto tarefas de processamento sensível (como desativação síncrona de usuários) são delegadas a Edge Functions executadas em ambiente isolado na nuvem.

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
| | **Core, Features & Shared Services** | Serviços de negócio e infraestrutura (`AuthService`, `SupabaseService`, `PetsService`, `PetReportService` para relatórios Excel/PDF client-side), guardas de rota (`authGuard`, `adminGuard`) e componentes comuns. |
| **Comunicação** | **HTTPS / TLS 1.3 & JWT (RFC 7519)** | Tráfego criptografado e autenticação stateless com tokens no header `Authorization: Bearer <token>`. |
| **Serviços e Banco (BaaS)** | **Supabase Auth (GoTrue)** | Gestão de sessões, criptografia de credenciais, disparo de convites e recuperação de senhas. |
| | **PostgREST API Engine** | Interface RESTful gerada automaticamente sobre o schema relacional do PostgreSQL. |
| | **SGBDR PostgreSQL & RLS** | Persistência relacional (`pets`, `entradas`, `vacinas`, `consultas_exames`, `locais`, `pets_locais`, `veterinarios`, `voluntarios`, `profiles`), segurança a nível de linha e bloqueio de DELETE em tabelas primárias para proteção de histórico. |
| | **Stored Procedures / RPCs** | Transações ACID atômicas (`create_pet_com_entrada`, `update_pet_com_entrada`) para inserção/edição consistente com rollback automático. |
| | **Edge Functions (Deno / Serverless)** | Processamento administrativo sensível em nuvem isolada (`toggle-user-status`). |
| **DevOps & Infraestrutura** | **GitHub (Git)** | Controle de versão distribuído do código-fonte e histórico de commits. |
| | **GitHub Actions (CI/CD)** | Automação sequencial de Lint, Build de Produção, Testes Unitários/Cobertura e Deploy contínuo. |
| | **Vercel CDN Hosting** | Distribuição global de alta disponibilidade da SPA Angular com CDN e SSL automático. |

---

## 4. Estratégia de Indexação e Otimização no PostgreSQL

Com o objetivo de assegurar baixa latência operacional, suporte a conexões móveis e escalabilidade da base de dados, foi implementada uma estratégia completa de indexação relacional nas migrations `20261008000011_create_indexes_and_search.sql` e `20261008000012_create_indexes_and_search.sql` no [backend-supabase](https://github.com/brunnokerber/backend-supabase):

### 4.1. Busca Textual Otimizada por Trigramas (`pg_trgm` + GIN)
As pesquisas parciais executadas pelo frontend via operador `ILIKE '%termo%'` realizavam varredura sequencial (*Sequential Scan*) com complexidade temporal $O(n)$. Com a habilitação da extensão `pg_trgm` e a criação de índices do tipo **GIN (Generalized Inverted Index)** nas colunas textuais, as buscas por substrings foram convertidas para varreduras indexadas (*Bitmap Index Scan*) de alta velocidade:
- `idx_pets_nome_trgm` e `idx_pets_raca_trgm` na tabela `pets`.
- `idx_locais_nome_trgm`, `idx_locais_bairro_trgm` e `idx_locais_cidade_trgm` na tabela `locais`.
- `idx_veterinarios_nome_trgm` na tabela `veterinarios`.
- `idx_voluntarios_nome_trgm` na tabela `voluntarios`.

### 4.2. Índices GIN em Vetores de Strings (`TEXT[]` para Filtros de Disponibilidade)
A busca por voluntários disponíveis em dias específicos e turnos é executada através do operador de contenção `.contains()` do Supabase (`@>` no PostgreSQL). Foram criados índices GIN dedicados nos arrays:
- `idx_voluntarios_dias_semana` em `voluntarios(dias_semana)`
- `idx_voluntarios_turnos` em `voluntarios(turnos)`

### 4.3. Índices de Chaves Estrangeiras (Foreign Keys)
Para eliminar *table scans* durante operações de junção relacional (JOINs) geradas pelo PostgREST, todas as FKs receberam índices dedicados:
- `idx_entradas_id_pet`, `idx_entradas_id_usuario`
- `idx_vacinas_id_pet`, `idx_vacinas_id_veterinario`
- `idx_consultas_exames_id_pet`, `idx_consultas_exames_id_veterinario`
- `idx_pets_locais_id_pet`, `idx_pets_locais_id_local`
- `idx_direcionamento_doacoes_id_doacao`, `idx_direcionamento_doacoes_id_local`

### 4.4. Índices Compostos para Eliminação de Ordenação em Memória (*Sort Elimination*)
As abas do prontuário clínico e histórico de estadias demandam registros filtrados por `id_pet` e ordenados de forma decrescente pela data mais recente (`NULLS LAST`). Foram criados índices compostos cobrindo filtro + ordenação direta:
- `idx_vacinas_pet_data` em `vacinas(id_pet, data_aplicacao DESC NULLS LAST)`
- `idx_consultas_pet_data` em `consultas_exames(id_pet, data_realizacao DESC NULLS LAST)`
- `idx_pets_locais_pet_data` em `pets_locais(id_pet, data_saida DESC NULLS LAST)`
- `idx_voluntarios_created_at_desc` em `voluntarios(created_at DESC)` para ordenação padrão da listagem administrativa.

### 4.5. Índices Parciais e Identificadores Únicos
- `idx_pets_chip`, `idx_pets_moura` e `idx_pets_rga` criados com cláusula parcial `WHERE ... IS NOT NULL` para reduzir o tamanho físico do índice e acelerar buscas por identificadores específicos.
- `idx_veterinarios_crmv` em árvore B-Tree para buscas diretas por CRMV.
- `idx_pets_filtros` em `(status, tipo_pet, senioridade, porte)` para consultas multicritério combinadas.

### 4.6. Validação Empírica de Desempenho (`EXPLAIN ANALYZE`)
* **Consulta de Prontuário Clínico (`vacinas WHERE id_pet = ?`):** Utilização do índice `idx_vacinas_pet_data` via *Bitmap Index Scan* com tempo de execução aferido de **0.109 ms**.
* **Busca Textual por Substring (`pets WHERE nome ILIKE '%termo%'`):** Resolução instantânea via `idx_pets_nome_trgm` sem overhead de varredura completa de tabela.
* **Filtro de Disponibilidade de Voluntários (`dias_semana @> ARRAY['Sábado']`):** Execução via `idx_voluntarios_dias_semana` com *Bitmap Index Scan*.
