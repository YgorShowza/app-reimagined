# API SEGEMPAT sobre MySQL corporativo

Este diretório contém o backend que permite ao SEGEMPAT operar sobre o MySQL corporativo. O navegador conversa somente com esta API; as credenciais do banco permanecem no servidor, que também aplica autenticação, autorização, regras de negócio, auditoria e acesso ao storage privado.

## Requisitos

- Node.js 20+
- MySQL 8.0+
- acesso de rede do servidor da API ao MySQL
- HTTPS no proxy reverso da empresa
- volume persistente para assinaturas/evidências

## Instalação

```bash
cd server
npm ci
cp .env.example .env
```

Preencha `.env` **somente no servidor da empresa**. Nunca publique esse arquivo e nunca use variáveis `VITE_` para credenciais ou secrets do backend.

## Sequência do primeiro ambiente de homologação

1. Crie o database e o usuário de aplicação com privilégio mínimo para o database do SEGEMPAT.
2. Configure rede, TLS/SSL, CA corporativa, storage persistente, CORS e sessão segura.
3. Antes de qualquer migration, execute:

```bash
npm run preflight
```

O `preflight` é não destrutivo. Ele valida a conexão real, MySQL 8+, database selecionado, sessão UTC, modo SQL estrito, `utf8mb4`, InnoDB, `FOREIGN_KEY_CHECKS=1`, negociação TLS quando exigida e leitura/escrita real no storage.

4. Somente com o preflight aprovado, aplique o schema:

```bash
npm run migrate
```

5. Valide a estrutura criada:

```bash
npm run smoke
```

O `smoke` valida o schema MySQL: tabelas críticas, engines, charset, histórico de migrations, foreign keys, índices UNIQUE, sessão UTC, modo SQL estrito e demais invariantes indispensáveis ao funcionamento da API.

6. Crie o primeiro Inspetor somente depois de schema e smoke aprovados:

```bash
MATRICULA=970 NOME="Nome do Inspetor" SETOR=Administrativo SENHA='senha-forte' npm run bootstrap-admin
```

O comando cria ou reabilita a identidade administrativa de forma transacional, grava somente o hash bcrypt da senha e registra a operação em auditoria. Depois desse bootstrap inicial, os demais acessos devem seguir o fluxo normal de cadastro/código de ativação do sistema.

7. Depois da migração dos dados existentes e da cópia das evidências para o storage corporativo, execute:

```bash
npm run cutover:audit
```

O `cutover:audit` é a verificação pós-carga: confere vínculos de identidade, privilégios administrativos, cobertura funcional do Banco de Questões, coerência entre tentativas e certificados, revogações e existência/validade das assinaturas no storage.

8. Somente depois dos checks aprovados, suba a API:

```bash
npm start
```

Mantenha `GET /health/ready` verde no ambiente de homologação antes e durante os testes ponta a ponta.

## Publicação

Execute a API atrás de um proxy reverso HTTPS (IIS, Nginx ou infraestrutura equivalente) e permita somente as origens exatas em `SEGEMPAT_ALLOWED_ORIGINS`. Aponte o frontend para a URL pública da API usando `VITE_SEGEMPAT_API_URL`.

Exemplo:

```text
VITE_SEGEMPAT_API_URL=https://api.segempat.empresa.local
```

Quando essa variável está configurada, os fluxos migrados usam a API SEGEMPAT. O corte definitivo do backend legado só deve acontecer depois de a TI homologar, no mínimo, login, Equipe, Cronograma, Banco de Questões, Provas, Treinamentos, Avaliação Prática, Ocorrências, assinatura, certificados, relatórios e auditoria.

## Segurança operacional

- `MYSQL_PASSWORD`, `SEGEMPAT_SESSION_SECRET` e o CA do MySQL ficam apenas no servidor.
- `SEGEMPAT_SESSION_SECRET` deve ter pelo menos 32 bytes aleatórios e ser exclusivo por ambiente.
- Em produção/homologação HTTPS mantenha `SEGEMPAT_SESSION_SECURE=true`.
- Não use wildcard em `SEGEMPAT_ALLOWED_ORIGINS` com autenticação por cookie.
- O MySQL nunca deve ser exposto diretamente ao navegador.
- O usuário MySQL da aplicação deve usar privilégio mínimo.
- O storage de assinaturas/evidências deve ser persistente, privado e incluído na política de backup.
- Backups, rotação de secrets, firewall/VPN, logs, monitoramento e restauração fazem parte da homologação corporativa.
- Os endpoints de healthcheck não devem expor senha, host, database ou detalhes internos de erro.

## Documentação de entrega

Consulte também:

- `../MYSQL_MIGRATION_PLAN.md` — arquitetura, status e plano de migração;
- `../CORPORATE_HOMOLOGATION_CHECKLIST.md` — checklist operacional de homologação com a TI;
- `.env.example` — modelo das variáveis esperadas, sem secrets reais.

O status **“SEGEMPAT HOMOLOGADO NO MYSQL DA EMPRESA”** só deve ser declarado depois da conexão com a infraestrutura real e da homologação ponta a ponta sem pendência crítica.
