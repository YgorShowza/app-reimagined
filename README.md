# SEGEMPAT

Sistema de Gestão, Operações e Desempenho da Unidade de Segurança Portuária da EMPAT.

O SEGEMPAT reúne gestão operacional, desenvolvimento profissional, avaliações, registros, evidências e acompanhamento da equipe em uma única aplicação.

## Status do projeto

**FRONTEND API-ONLY + API SEGEMPAT + MYSQL PRONTOS NO CÓDIGO — PREPARADO PARA CLOUDFLARE E HOMOLOGAÇÃO NO BANCO DA EMPRESA.**

O frontend não possui mais fallback de backend. Supabase e Lovable não fazem parte do runtime, autenticação, persistência, build ou hospedagem-alvo do SEGEMPAT. A homologação final continua dependendo da conexão com o MySQL real da empresa e dos testes ponta a ponta no ambiente corporativo.

## Arquitetura definitiva

```text
Cloudflare Workers / SEGEMPAT
        |
        | HTTPS / JSON
        v
API SEGEMPAT — Node.js / Express
        |
        +--> MySQL 8.0 corporativo
        +--> storage privado de assinaturas/evidências
        +--> autenticação e regras de negócio
```

O navegador nunca acessa o MySQL diretamente e não recebe host, usuário ou senha do banco.

O frontend usa obrigatoriamente:

```text
VITE_SEGEMPAT_API_URL=https://api.segempat.empresa.local
VITE_SEGEMPAT_REQUIRE_API=true
```

Se a API estiver ausente ou indisponível, a aplicação apresenta a indisponibilidade em vez de trocar de backend.

## Stack principal

### Frontend / hospedagem

- React 19
- TypeScript
- TanStack Router / TanStack Query
- TanStack Start / Vite
- Tailwind CSS
- Bun
- Cloudflare Workers (`@cloudflare/vite-plugin` + Wrangler)

### Backend corporativo

- Node.js 20+
- Express
- MySQL 8.0+
- `mysql2`
- autenticação por sessão assinada em cookie
- bcrypt para senhas e códigos sensíveis
- Helmet e CORS por allowlist
- storage privado controlado pelo servidor

## Perfis de acesso

### Inspetor

Perfil administrativo com acesso às funções de gestão, incluindo Dashboard, Analytics, Equipe, Cronograma, Provas, Banco de Questões, Treinamentos, Avaliações Práticas, Ocorrências, Certificados, evidências e Auditoria.

O backend considera administrador somente quem possui role administrativa e perfil funcional atual de Inspetor.

### Operador

Perfil operacional com acesso limitado por identidade, matrícula, setor e regras do backend. Rotas pessoais são vinculadas ao usuário autenticado e não confiam em identidade enviada pelo navegador.

## Módulos principais

- Equipe / Colaboradores
- Cronograma mensal e anual
- planejamento em massa e recorrências
- Banco de Questões
- Provas e tentativas
- assinatura eletrônica e evidências
- certificados e validação
- Treinamentos
- Teste Rápido
- Simulador
- Stress Test
- Desafio Diário
- XP e nível
- Avaliações Práticas
- Ocorrências
- Base de Conhecimento
- Meu Perfil
- Auditoria administrativa

## Segurança no modo API/MySQL

Os principais controles implementados incluem:

- credenciais MySQL exclusivamente no servidor;
- sessão assinada reconstruída a partir do banco a cada requisição protegida;
- bloqueio de conta ou colaborador inativo;
- autorização administrativa validada no backend;
- identidade funcional derivada da sessão/banco;
- correção de provas no servidor;
- gabaritos removidos das respostas entregues ao Operador;
- XP e nível calculados no servidor;
- operações críticas protegidas por transação quando aplicável;
- assinatura vinculada à tentativa do próprio usuário;
- evidências armazenadas fora do banco em storage privado;
- códigos de ativação com hash, expiração e uso único;
- CORS com origens explícitas;
- cookies seguros exigidos em produção;
- suporte a TLS/CA corporativa para MySQL;
- auditoria de operações críticas;
- frontend com API obrigatória e HTTPS;
- readiness que revalida o histórico completo e os checksums das migrations do banco contra o deploy.

## MySQL e migrations

O baseline MySQL está em:

```text
database/mysql/001_schema.sql
```

O runner de migrations mantém versão, checksum e histórico, rejeitando divergências ou lacunas. O schema foi preparado para MySQL 8, InnoDB, `utf8mb4`, foreign keys e índices críticos.

As migrations posteriores preservam evolução versionada, incluindo nota mínima, geração recorrente e proteção histórica da Avaliação Prática. Os gates `smoke` e `cutover:audit` verificam também o vínculo 1:1 das avaliações geradas com o Cronograma.

## Validação do ambiente corporativo

Antes de executar qualquer comando no ambiente da empresa, a TI deve preencher os dados de infraestrutura solicitados em [`MYSQL_TI_INPUTS.md`](MYSQL_TI_INPUTS.md). Senhas reais não devem ser colocadas no GitHub, em documentação ou no frontend.

Dentro de `server/`, a sequência técnica inicial é:

```bash
npm ci
npm run preflight
npm run migrate
npm run smoke
```

Depois do `smoke`, a TI deve carregar/migrar os dados oficiais e as evidências. Em seguida:

```bash
npm run cutover:audit
npm run bootstrap-admin   # somente se a carga não trouxer um Inspetor válido
npm start
```

Após iniciar a API, `GET /health/ready` precisa permanecer saudável. O readiness compara todo o histórico de `schema_migrations`, incluindo versão, nome e checksum, com os arquivos de migration presentes no deploy.

## Cloudflare

A configuração do Worker está em `wrangler.jsonc` e o Vite usa o plugin oficial do Cloudflare.

Com a URL HTTPS da API configurada:

```bash
bun install --frozen-lockfile
bun run build
bun run preview
```

Para publicar após autenticar a conta Cloudflare no ambiente autorizado:

```bash
bun run deploy
```

A autenticação do Cloudflare deve ser feita pelo proprietário/administrador da conta via Wrangler, dashboard ou pipeline corporativo. Tokens de API não devem ser colocados no repositório ou enviados em chat.

## Backend

A documentação específica da API está em:

- [`server/README.md`](server/README.md)
- [`server/.env.example`](server/.env.example)

Secrets reais nunca devem ser versionados.

## Documentação de migração e homologação

- [`MYSQL_TI_INPUTS.md`](MYSQL_TI_INPUTS.md) — dados necessários antes da conexão real;
- [`MYSQL_MIGRATION_PLAN.md`](MYSQL_MIGRATION_PLAN.md) — plano técnico da migração para MySQL;
- [`MYSQL_CORPORATE_HANDOFF.md`](MYSQL_CORPORATE_HANDOFF.md) — roteiro operacional para a TI;
- [`CORPORATE_HOMOLOGATION_CHECKLIST.md`](CORPORATE_HOMOLOGATION_CHECKLIST.md) — checklist de homologação;
- [`HOMOLOGATION_EVIDENCE_TEMPLATE.md`](HOMOLOGATION_EVIDENCE_TEMPLATE.md) — evidências e aceite final;
- [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md) — checklist geral de publicação;
- [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) — auditoria da arquitetura API/MySQL.

## Desenvolvimento e validações

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run build
```

## CI

O workflow `.github/workflows/ci.yml` valida continuamente o projeto no GitHub Actions. Além dos gates MySQL, segurança, Docker, Nginx/systemd, typecheck, lint e build, o CI impede a reintrodução de dependências ativas das plataformas legadas e valida o runtime Cloudflare.

O GitHub é a fonte versionada oficial do código e da documentação técnica do SEGEMPAT.

## Critério de conclusão

O código está preparado para frontend Cloudflare + API própria + MySQL corporativo.

O status **SEGEMPAT HOMOLOGADO NO MYSQL DA EMPRESA** só poderá ser declarado após:

1. conexão com o MySQL real de homologação;
2. `preflight`, migrations e `smoke` aprovados;
3. dados e evidências migrados;
4. `cutover:audit` aprovado;
5. `/health/ready` saudável com histórico completo de migrations íntegro;
6. testes ponta a ponta com Inspetor e Operador;
7. validação de TLS, CORS, cookies, firewall, storage, backup e permissões;
8. aprovação do plano de rollback/cutover;
9. preenchimento do `HOMOLOGATION_EVIDENCE_TEMPLATE.md` sem pendência crítica.
