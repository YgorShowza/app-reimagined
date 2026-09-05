# SEGEMPAT — Plano de Migração para MySQL 8

## Objetivo

Operar o SEGEMPAT sobre o MySQL corporativo sem expor credenciais ao navegador e sem fallback silencioso para o backend legado durante o cutover.

## Arquitetura alvo

```text
Frontend SEGEMPAT
      |
      | HTTPS / JSON / cookie HTTP-only
      v
API SEGEMPAT — Node.js / Express
      |
      +--> MySQL 8 corporativo via TLS
      +--> storage privado persistente
```

O navegador nunca recebe host, usuário, senha ou CA do MySQL.

## Status atual

**PARTE DO MYSQL NO CÓDIGO CONCLUÍDA — PRONTO PARA CONECTAR AO BANCO DA EMPRESA.**

Esse status significa que a parte local de código, schema, API, validações, segurança, deploy e CI está preparada. A homologação final depende obrigatoriamente do ambiente real da empresa.

## Implementado

- schema base MySQL em `database/mysql/001_schema.sql`;
- runner de migrations com versão, checksum, detecção de lacunas e compatibilidade rígida de baseline;
- validações de engine, charset/collation, colunas, defaults, índices, CHECKs, triggers, foreign keys e órfãos;
- pool MySQL com UTC, modo SQL estrito, `FOREIGN_KEY_CHECKS=1`, `utf8mb4` e TLS;
- `npm run preflight` antes de qualquer migration;
- `npm run smoke` depois das migrations;
- `npm run cutover:audit` depois da carga de dados/evidências;
- autenticação MySQL, primeiro acesso, troca de senha e autorização Inspetor/Operador;
- sessão assinada, versionada e revalidada contra conta/colaborador a cada requisição;
- invalidação de sessões antigas após troca de senha;
- proteção de operações de escrita por `Origin` autorizada;
- limitação de tentativas de login/ativação na aplicação;
- Equipe, Cronograma, Banco de Questões, Provas, assinatura, certificados, Treinamentos, gamificação, Avaliação Prática, Ocorrências, Base de Conhecimento e Auditoria via API;
- storage privado controlado pelo backend;
- Docker, Compose, Nginx e systemd de referência;
- `/health` para liveness e `/health/ready` para readiness real;
- CI com sintaxe da API, configuração segura, migrations, frontend API-only, imagem Docker e hardening de deploy.

## Fallback legado e corte corporativo

Durante o desenvolvimento/preview, o código legado pode continuar disponível quando a API corporativa não está configurada.

No build corporativo é obrigatório usar:

```text
VITE_SEGEMPAT_API_URL=https://<api-corporativa>
VITE_SEGEMPAT_REQUIRE_API=true
```

Com `VITE_SEGEMPAT_REQUIRE_API=true`, a ausência da URL da API é erro explícito; o sistema não deve voltar silenciosamente para o backend legado.

## Conversões conceituais

| Arquitetura anterior | MySQL/API corporativa |
| --- | --- |
| Supabase Auth | `app_users` + sessão assinada |
| RLS | autorização no backend |
| RPC `SECURITY DEFINER` | endpoints/serviços da API |
| Supabase Storage | storage privado do backend |
| PostgreSQL `uuid` | `CHAR(36)` |
| `jsonb` | `JSON` |
| `timestamptz` | `DATETIME(3)` em UTC |

## Ordem oficial da homologação

1. TI fornece/configura host, porta, database, usuário, TLS/CA, rede, API, frontend e storage;
2. secrets são cadastrados somente no servidor/cofre;
3. `npm ci`;
4. `npm run preflight`;
5. `npm run migrate`;
6. `npm run smoke`;
7. migração/carga dos dados e evidências;
8. `npm run cutover:audit`;
9. `npm run bootstrap-admin` somente se a carga não trouxer um Inspetor válido;
10. subir a API;
11. manter `GET /health/ready` verde;
12. publicar frontend com `VITE_SEGEMPAT_REQUIRE_API=true`;
13. executar E2E Inspetor + Operador;
14. validar TLS, CORS, cookies, firewall/VPN, backup, restore e rollback;
15. aprovar o cutover.

Se `preflight`, `migrate`, `smoke`, `cutover:audit` ou `/health/ready` falharem, a sequência deve parar e a causa deve ser corrigida. Não mascarar divergências para fazer o gate passar.

## Migração de dados

A carga deve preservar, no mínimo:

- UUIDs e matrículas;
- contas, profiles e roles coerentes;
- colaboradores;
- Cronograma;
- provas, tentativas e respostas;
- certificados e códigos de verificação;
- Banco de Questões;
- treinamentos/atividades/XP;
- avaliações práticas;
- ocorrências;
- Base de Conhecimento;
- auditoria aplicável;
- assinaturas/evidências e seus vínculos.

Registrar contagem antes/depois por entidade crítica e conferir amostras funcionais/históricas.

## Segurança de migração

- MySQL não deve ser acessível pelo navegador;
- produção exige TLS MySQL;
- usuário de aplicação deve ter privilégio mínimo;
- secrets reais não entram no GitHub;
- operações HTTP de escrita exigem origem autorizada;
- bootstrap de Inspetor deve receber senha por canal seguro, preferencialmente stdin;
- em múltiplas réplicas, complementar o rate limiting local com proxy/WAF central;
- `trust proxy=1` deve ser conferido contra a topologia corporativa real.

## Variáveis principais

### Frontend

```text
VITE_SEGEMPAT_API_URL=https://<api-corporativa>
VITE_SEGEMPAT_REQUIRE_API=true
```

### Servidor

```text
NODE_ENV=production
MYSQL_HOST=
MYSQL_PORT=3306
MYSQL_DATABASE=
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_SSL=true
MYSQL_SSL_CA_PATH=
SEGEMPAT_SESSION_SECRET=
SEGEMPAT_SESSION_SECURE=true
SEGEMPAT_SESSION_SAMESITE=lax
SEGEMPAT_ALLOWED_ORIGINS=
SEGEMPAT_STORAGE_DRIVER=filesystem
SEGEMPAT_STORAGE_PATH=
SEGEMPAT_TIMEZONE=America/Maceio
```

## Critério final

O código está pronto para conexão quando o CI do HEAD final estiver verde e não houver pendência conhecida que dependa apenas de alteração local.

O sistema só recebe o status abaixo depois dos testes reais:

**SEGEMPAT HOMOLOGADO NO MYSQL DA EMPRESA.**
