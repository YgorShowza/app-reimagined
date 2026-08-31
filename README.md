# SEGEMPAT

Sistema de Gestão, Operações e Desempenho da Unidade de Segurança Portuária da EMPAT.

O projeto atual é a versão portada e evoluída do SEGEMPAT original, com frontend React/TanStack, Supabase como backend e Lovable como ambiente de desenvolvimento/preview.

## Stack

- React 19
- TanStack Router / TanStack Query
- TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL, Storage e RLS
- Bun
- Vite / TanStack Start
- Lovable

## Perfis

### Inspetor

Acesso administrativo às áreas operacionais, incluindo:

- Dashboard e Analytics
- Equipe
- Cronograma de treinamentos
- Provas e Banco de Questões
- Módulos de Treinamento
- Ciclos e Vencimentos
- Avaliações Práticas
- Ocorrências
- Relatórios
- Certificados e validação
- Evidências de assinatura
- Auditoria
- Documento de Segurança

### Operador

Acesso restrito por identidade, matrícula, setor e políticas RLS:

- Painel e pendências
- Provas publicadas para o próprio setor ou para Todos
- Treinamentos
- Progresso e certificados
- Teste Rápido
- Simulador
- Stress Test
- Desafio Diário
- Avaliação Prática própria
- Ocorrências próprias
- Meu Perfil

## Cronograma

O Cronograma é um dos módulos centrais do sistema e oferece:

- Lista agrupada por colaborador
- Calendário mensal
- Visão anual
- Gestão completa de registros
- Planejamento em massa
- Gerador anual
- Importação de resultados por Excel
- Banco de Questões
- Avaliações práticas planejadas e recorrentes
- Suspensões e ausências
- Relatório PDF mensal
- Lista de presença em PDF
- Sincronização com resultados de provas

## Segurança

A autorização de dados é aplicada no Supabase por Row Level Security (RLS), além da proteção de rotas no frontend.

Controles relevantes:

- perfis administrativos via `user_roles`;
- leitura de dados do Operador limitada aos próprios registros quando aplicável;
- provas publicadas filtradas por setor no próprio banco;
- assinatura eletrônica armazenada em bucket privado;
- assinatura da prova por RPC restrita (`sign_exam_attempt`), sem UPDATE genérico da tentativa;
- códigos únicos de validação para aprovações;
- certificado formal liberado apenas após aprovação e assinatura eletrônica;
- XP de atividades concedido por RPC no servidor;
- limite diário de recompensa para atividades repetíveis;
- Desafio Diário limitado a uma execução por usuário/dia;
- logs de auditoria exclusivos da Inspetoria.

O filtro de acesso por IP/VPN não está implementado na arquitetura atual e não deve ser considerado um controle ativo.

## Desenvolvimento local

O projeto usa Bun e o lockfile deve ser respeitado.

```sh
git clone <URL-DO-REPOSITORIO>
cd app-reimagined
bun install --frozen-lockfile
bun run dev
```

Build de produção:

```sh
bun run build
```

Lint:

```sh
bun run lint
```

## Variáveis de ambiente

O frontend utiliza somente URL/identificador do projeto Supabase e publishable key. Nunca adicionar `service_role`, senha do banco ou outro segredo privilegiado ao frontend.

Variáveis utilizadas atualmente:

```text
SUPABASE_PROJECT_ID
SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
```

Para produção, preferir configuração de variáveis no provedor de deploy em vez de manter `.env` versionado.

## Migrations

As migrations estão em:

```text
supabase/migrations/
```

A ordem dos arquivos faz parte da integridade do projeto. Não aplicar mudanças de schema diretamente em produção sem também versionar a migration correspondente.

Antes de publicar uma nova versão:

1. confirmar que o histórico `supabase_migrations.schema_migrations` corresponde ao repositório;
2. validar RLS e funções `SECURITY DEFINER`;
3. executar build de produção;
4. executar a bateria de integridade;
5. testar os fluxos críticos com Inspetor e Operador.

## CI

O GitHub Actions executa em push/PR para `main`:

```text
bun install --frozen-lockfile
bun run build
```

Arquivo: `.github/workflows/ci.yml`.

## Homologação

O projeto possui validações estruturais para:

- duplicidades do Cronograma;
- relações órfãs;
- provas publicadas sem questões;
- certificados/códigos inconsistentes;
- assinaturas incompletas;
- ciclos inválidos;
- módulos inválidos;
- duplicidade do Desafio Diário;
- políticas RLS;
- índices de consultas críticas.

O checklist de publicação está em `PRODUCTION_CHECKLIST.md`.

## Regra de manutenção

O GitHub é a fonte versionada do código e das migrations. Alterações devem ser pequenas, rastreáveis e validadas no preview antes de novos commits funcionais serem empilhados.
