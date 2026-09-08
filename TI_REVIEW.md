# SEGEMPAT — Guia de revisão técnica pela TI

Atualizado em 08/09/2026.

Este documento é o ponto de entrada para a análise técnica do repositório pela TI. Ele descreve o estado do código antes da conexão/homologação no ambiente corporativo.

## 1. Estado atual

**PARTE DO MYSQL NO CÓDIGO CONCLUÍDA — PRONTO PARA CONECTAR AO BANCO DA EMPRESA.**

O projeto ainda **não** deve ser declarado homologado no MySQL corporativo. A homologação depende do ambiente real da empresa, credenciais segregadas, TLS, rede, storage, backup/restore, domínio e testes E2E.

## 2. Arquitetura vigente

```text
Cloudflare / Frontend SEGEMPAT
            | HTTPS
            v
API SEGEMPAT — Node.js / Express
            | TLS
            v
MySQL 8 corporativo
```

Regras arquiteturais:

- o frontend não acessa MySQL diretamente;
- não existe backend Supabase/Lovable ativo nem fallback de backend legado;
- o modo demonstração é local, isolado e usa somente dados fictícios;
- o modo demonstração é desabilitado quando `VITE_SEGEMPAT_API_URL` existe ou `VITE_SEGEMPAT_REQUIRE_API=true`;
- segredos do banco e sessão ficam exclusivamente no servidor/cofre da empresa.

## 3. Banco e migrations

Migrations versionadas atuais:

- `001_schema.sql`
- `002_cronograma_history_integrity.sql`
- `003_practical_min_approval_score.sql`
- `004_practical_template_generation.sql`
- `005_practical_history_link_guard.sql`
- `006_governance_audit_session_hardening.sql`
- `007_occurrence_operational_record.sql`
- `008_occurrence_history_guard.sql`
- `009_secure_password_recovery.sql`
- `010_granular_access_control.sql`

A credencial de runtime é separada da credencial de migration. O readiness da API compara o histórico/checksum das migrations do banco com os arquivos versionados do deploy.

## 4. Controles de segurança relevantes

- sessão HMAC em cookie HTTP-only;
- `Secure=true` e MySQL TLS obrigatórios em produção;
- CORS/origens HTTPS explícitas;
- proteção de origem nas operações de escrita;
- autorização granular aplicada pela API: Administrador Master, Administrador, Inspetor e Operador;
- `access.permissions.manage` exclusiva do Master;
- proteção do último Master realmente utilizável;
- leitura gerencial sanitizada sem exposição indevida de gabaritos/respostas-modelo;
- recuperação administrativa de senha com hierarquia estrita, Master somente pela TI, hash bcrypt, TTL e bloqueio por tentativas;
- mudanças de privilégio e resets relevantes invalidam sessões;
- auditoria de ações privilegiadas;
- usuário MySQL de runtime com privilégio mínimo;
- storage de evidências fora do frontend;
- `robots.txt` e metadados globais impedem indexação pública da aplicação.

A avaliação detalhada está em `SECURITY_AUDIT.md` e a governança de dados em `LGPD_GOVERNANCE.md`.

## 5. Arquivos recomendados para a revisão

| Objetivo | Arquivo |
| --- | --- |
| Roteiro de entrega | `ENTREGA_TI.md` |
| Entradas que a TI deve fornecer | `MYSQL_TI_INPUTS.md` |
| Roteiro de conexão/homologação | `MYSQL_CORPORATE_HANDOFF.md` |
| Checklist corporativo | `CORPORATE_HOMOLOGATION_CHECKLIST.md` |
| Checklist de produção | `PRODUCTION_CHECKLIST.md` |
| Auditoria de segurança | `SECURITY_AUDIT.md` |
| Governança/LGPD | `LGPD_GOVERNANCE.md` |
| Evidências de aceite | `HOMOLOGATION_EVIDENCE_TEMPLATE.md` |
| Configuração de API sem secrets | `server/.env.example` |
| Schema/migrations | `database/mysql/` |
| API | `server/src/` |
| Deploy de referência | `server/Dockerfile`, `server/docker-compose.yml`, `server/deploy/` |

## 6. Sequência de homologação no ambiente da empresa

Na pasta `server/`:

```bash
npm ci
npm run preflight
npm run migrate
npm run smoke
npm run cutover:audit
npm run report-privileged-access
```

Depois:

1. subir a API;
2. validar `/health` e `/health/ready`;
3. publicar o frontend corporativo com `VITE_SEGEMPAT_REQUIRE_API=true`;
4. validar CORS/cookies/TLS/rede/storage;
5. executar E2E de Administrador Master, Inspetor e Operador;
6. validar backup, restore e rollback;
7. preencher `HOMOLOGATION_EVIDENCE_TEMPLATE.md`.

## 7. CI/CD e situação dos runners

O repositório possui contratos automatizados para build, arquitetura, MySQL, segurança, permissões, recuperação de senha, privacidade, apresentação e experiência desktop.

No momento desta revisão, os jobs hospedados do GitHub Actions estão sendo encerrados antes da execução, sem runner atribuído e sem steps iniciados. Isso deve ser tratado como uma pendência de infraestrutura/execução do GitHub, e não como evidência de aprovação ou reprovação do código.

O Cloudflare, por outro lado, compilou/publicou com sucesso o HEAD do `main` usado antes deste pacote de revisão. Após esta alteração, o SHA final também deve ser confirmado no Cloudflare.

Antes de exigir checks como regra obrigatória do `main`, a TI deve confirmar que os runners estão executando normalmente e rerodar os gates.

## 8. Repositório público e segredos

O código pode ser submetido a revisão pública **somente depois de executar**:

```bash
npm run audit:public
```

Esse comando deve ser executado em clone Git completo e verifica tanto o estado versionado atual quanto nomes e padrões críticos do histórico. Nenhum valor real de `MYSQL_PASSWORD`, `MYSQL_MIGRATION_PASSWORD`, `SEGEMPAT_SESSION_SECRET`, certificados privados, tokens ou dados corporativos deve ser publicado.

Os arquivos `.env.mysql.example` e `server/.env.example` são apenas modelos. Os valores reais devem ser cadastrados diretamente no ambiente/secret manager da empresa.

## 9. Branch principal

A recomendação para produção é proteger `main` contra exclusão/force-push e exigir Pull Request + checks obrigatórios. A proteção deve ser ativada depois que os runners estiverem normais, para não transformar a indisponibilidade atual do GitHub Actions em bloqueio permanente de manutenção.

A aprovação final, política de deploy, branch protection, domínio, rede e secrets pertencem à governança da TI da empresa.
