# SEGEMPAT

Sistema de gestão de treinamentos, desempenho e rotinas operacionais da segurança portuária da EMPAT.

Este repositório é a versão portada do SEGEMPAT para **TanStack Start + TypeScript + Supabase**, com sincronização bidirecional com o projeto **App Reimagined** no Lovable.

## Stack

- React 19
- TanStack Start / TanStack Router
- TypeScript
- TanStack Query
- Tailwind CSS / shadcn-ui
- Supabase PostgreSQL
- Supabase Auth
- Supabase Row Level Security (RLS)
- Bun

## Perfis de acesso

### Inspetor (`admin`)

Possui acesso administrativo às áreas de gestão, treinamento, cronograma, equipe, análises, ocorrências, auditoria e relatórios.

### Operador

Acessa apenas as rotas operacionais autorizadas e dados vinculados ao próprio usuário. A restrição é aplicada em dois níveis:

1. guarda central das rotas autenticadas;
2. políticas RLS no Supabase.

Ocultar opções de menu não é tratado como mecanismo de segurança.

## Módulos principais

### Cronograma

É o módulo central do sistema e contempla:

- visualização Calendário e Ano;
- lançamentos individuais;
- lançamentos em massa;
- status Pendente, Realizado e Justificado;
- datas prevista e de conclusão;
- vínculo com provas;
- sincronização com resultados de provas;
- pendências;
- modelos recorrentes;
- suspensões de mês e ausências de colaboradores;
- métricas reais de execução;
- relatório mensal e anual;
- exportação CSV compatível com Excel;
- impressão/PDF pelo navegador.

### Provas e Banco de Questões

- criação e edição de provas;
- publicação de provas;
- múltipla escolha e discursivas;
- Banco de Questões com filtros por setor, dificuldade e tema;
- reaproveitamento de questões em novas provas;
- fluxo de realização pelo Operador;
- correção, nota e aprovação;
- histórico de tentativas;
- integração com Cronograma.

### Módulos e Ciclos de Treinamento

- módulos estruturados por setor e ordem;
- geração de prova a partir de um módulo;
- ciclos de validade por colaborador;
- cálculo automático da janela de renovação;
- status Em dia, Próximo ao vencimento e Vencido.

### Avaliação Prática

- planejamento por colaborador;
- checklist;
- pontuação;
- acompanhamento e conclusão;
- histórico no perfil individual.

### Ocorrências

- registro pelo Operador;
- gestão pelo Inspetor;
- criticidade, categoria e localização;
- análise e conclusão;
- vínculo ao colaborador.

### Certificados

- emissão automática após aprovação;
- registro persistente no Supabase;
- código único de verificação;
- impressão;
- validação pública por código em `/validar-certificado`;
- possibilidade de revogação no modelo de dados.

### Análise e gestão

- Dashboard do Inspetor;
- Dashboard do Operador;
- Analytics;
- Análise Individual;
- Zona de Risco;
- Radar Analítico;
- Foco do Mês;
- Oportunidades;
- Progresso;
- Meu Perfil;
- TV Mode;
- relatórios.

### Auditoria

As principais tabelas possuem triggers automáticos que registram INSERT, UPDATE e DELETE em `audit_logs`, incluindo:

- employees;
- exams;
- exam_attempts;
- cronograma_entries;
- cronograma_recurring_models;
- cronograma_suspensions;
- occurrences;
- practical_evaluations;
- knowledge_items;
- question_bank;
- training_modules;
- training_schedules;
- certificates.

## Banco de dados

As alterações estruturais devem sempre ser versionadas em `supabase/migrations/`.

Nunca altere somente o banco de produção sem registrar a migration correspondente no repositório.

Tabelas centrais:

- `profiles`
- `user_roles`
- `employees`
- `exams`
- `exam_attempts`
- `cronograma_entries`
- `cronograma_recurring_models`
- `cronograma_suspensions`
- `question_bank`
- `training_modules`
- `training_schedules`
- `practical_evaluations`
- `occurrences`
- `knowledge_items`
- `certificates`
- `audit_logs`

## Segurança

O projeto segue o princípio do menor privilégio.

- Inspetores são identificados pela role `admin`.
- Operadores não podem abrir rotas administrativas diretamente.
- Operadores veem apenas o próprio cadastro em `employees`.
- Rascunhos de provas são visíveis somente para Inspetores.
- Tentativas são vinculadas ao usuário autenticado.
- Cronograma, ciclos, avaliações e ocorrências usam RLS.
- Logs de auditoria são exclusivos do Inspetor.
- Validação pública de certificado ocorre através de uma função SQL `SECURITY DEFINER` que retorna somente os campos necessários à verificação.

## Desenvolvimento local

O projeto utiliza Bun.

```bash
git clone https://github.com/YgorShowza/app-reimagined.git
cd app-reimagined
bun install
bun run dev
```

As variáveis do Supabase precisam estar disponíveis no ambiente:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Não versione chaves secretas.

## Comandos

```bash
bun run dev
bun run test
bun run lint
bun run build
```

## Testes e CI

O repositório possui testes automatizados para regras críticas do Cronograma e ciclos de treinamento.

O workflow `.github/workflows/ci.yml` executa em pushes e pull requests para `main`:

1. instalação reproduzível das dependências;
2. testes;
3. lint;
4. build de produção.

Uma mudança não deve ser considerada homologada se qualquer uma dessas etapas falhar.

## GitHub e Lovable

O repositório `YgorShowza/app-reimagined` é a fonte de código sincronizada com o projeto **App Reimagined** no Lovable.

O fluxo utilizado é:

`GitHub → commit em main → sincronização Lovable → preview`

O Lovable pode levar alguns instantes para atualizar o preview depois de um commit externo.

## Critério de pronto

Uma funcionalidade só deve ser considerada concluída quando possui:

- interface funcional;
- persistência real no Supabase;
- autorização e RLS adequadas;
- tratamento de loading/erro/estado vazio;
- responsividade;
- dados não fictícios;
- integração com os módulos relacionados;
- migration quando houver alteração de banco;
- validação de build/testes.

## Design

A identidade visual premium atual é parte do produto e deve ser preservada. Alterações de design devem ser feitas somente quando trouxerem ganho claro de consistência, legibilidade, responsividade ou usabilidade.