# SEGEMPAT — Entrega para a TI (banco de dados MySQL da empresa)

Documento único para o time de TI. O objetivo é simples: **o SEGEMPAT passa a
guardar todos os dados no MySQL corporativo**.

Para a execução da homologação no ambiente real, usar também o roteiro operacional
`MYSQL_CORPORATE_HANDOFF.md`, que organiza os gates de preflight, migration, smoke,
auditoria pós-carga, teste ponta a ponta e coleta de evidências.

## Como funciona

```text
Navegador do usuário
        |  HTTPS (rede corporativa)
        v
API SEGEMPAT  (este repositório, pasta server/)
        |  conexão interna
        v
MySQL da empresa
```

- O navegador **nunca** fala com o MySQL e nunca recebe senha de banco.
- A API é um serviço Node.js 20 que roda no ambiente da empresa (VM, container
  ou servidor de aplicação) e é a única coisa que abre conexão com o MySQL.
- Autenticação, perfis (Inspetor/Operador), regras de negócio, auditoria e
  armazenamento de assinaturas são aplicados no servidor.

## O que já está pronto no projeto

| Item | Onde |
| --- | --- |
| Schema completo do MySQL 8 | `database/mysql/001_schema.sql` |
| API HTTP com todos os módulos (login, Equipe, Cronograma, Provas, Banco de Questões, Treinamentos, Avaliação Prática, Ocorrências, Certificados, Auditoria) | `server/src/` |
| Verificação do ambiente antes de tocar no banco | `npm run preflight` |
| Aplicação do schema | `npm run migrate` |
| Validação do schema aplicado | `npm run smoke` |
| Criação do primeiro Inspetor | `npm run bootstrap-admin` |
| Auditoria pós-carga de dados | `npm run cutover:audit` |
| Container | `server/Dockerfile`, `server/docker-compose.yml` |
| Serviço Linux | `server/deploy/segempat-api.service` |
| Proxy HTTPS | `server/deploy/nginx-segempat-api.conf` |
| Roteiro operacional de homologação | `MYSQL_CORPORATE_HANDOFF.md` |
| Checklist de homologação | `CORPORATE_HOMOLOGATION_CHECKLIST.md` |

## O que a TI precisa providenciar

1. **Banco**: um database MySQL 8.0+ (`segempat`) e um usuário de aplicação com
   privilégio mínimo nesse database.
2. **Servidor da API**: VM/container com Node.js 20 (ou Docker) e rota de rede
   até o MySQL.
3. **HTTPS**: um nome interno publicado, por exemplo
   `https://api.segempat.empresa.local`, atrás de Nginx ou IIS.
4. **Storage persistente** para assinaturas/evidências, incluído no backup.
5. **Segredos**: senha do MySQL e `SEGEMPAT_SESSION_SECRET` (32 bytes
   aleatórios), guardados só no servidor.

## Roteiro de instalação (uma vez)

```bash
# 1. Configuração — preencher somente no servidor
cd server
cp .env.example .env

# 2. Dependências
npm ci

# 3. Conferir ambiente/conexão (não altera nada)
npm run preflight

# 4. Criar o schema
npm run migrate

# 5. Validar o schema
npm run smoke

# 6. Criar o primeiro Inspetor, somente quando necessário
# Não registrar senha real em documentação, commit, issue ou log compartilhado.
CONFIRM_BOOTSTRAP_ADMIN=SIM MATRICULA=<MATRICULA> NOME="<NOME>" \
  SETOR=Administrativo SENHA='<SENHA_TEMPORARIA_FORTE>' npm run bootstrap-admin

# 7. Subir o serviço
npm start   # ou systemd / docker compose
```

Com container, o equivalente está comentado no topo de
`server/docker-compose.yml`.

## Ligar o aplicativo à API

Depois que a API estiver publicada, informe a URL. Basta uma variável no
frontend:

```text
VITE_SEGEMPAT_API_URL=https://api.segempat.empresa.local
```

Com ela configurada, o aplicativo passa a ler e gravar **tudo** no MySQL da
empresa. O `SEGEMPAT_ALLOWED_ORIGINS` da API deve conter exatamente a origem do
frontend (sem `*`, porque a sessão usa cookie).

## Homologação antes do corte definitivo

Testar com um Inspetor e um Operador: primeiro acesso, login, logout, Equipe,
Cronograma (lançamento individual e em massa), Banco de Questões, Provas e
correção, Treinamentos, Avaliação Prática, Ocorrências, assinatura,
certificados, relatórios e auditoria.

A sequência oficial para o ambiente corporativo é:

1. `npm run preflight`;
2. `npm run migrate`;
3. `npm run smoke`;
4. migração/carga dos dados;
5. `npm run cutover:audit`;
6. subida da API;
7. teste ponta a ponta com Inspetor e Operador;
8. validação de backup, rollback, TLS, CORS, cookies e firewall.

O detalhamento e as regras de parada estão em `MYSQL_CORPORATE_HANDOFF.md` e
`CORPORATE_HOMOLOGATION_CHECKLIST.md`.

## Segurança

- MySQL nunca exposto à internet nem ao navegador.
- Sessão em cookie HTTP-only, `SEGEMPAT_SESSION_SECURE=true` em HTTPS.
- Senhas somente em hash bcrypt.
- Trilha de auditoria em `audit_logs`.
- Restrições por IP/VPN/firewall aplicadas no proxy reverso.
- Credenciais reais e secrets nunca versionados no GitHub.

## Status correto antes da conexão real

Enquanto os gates não forem executados contra o ambiente corporativo, o status
correto do projeto é:

**PARTE DO MYSQL NO CÓDIGO CONCLUÍDA — PRONTO PARA CONECTAR AO BANCO DA EMPRESA.**

Somente depois da aprovação de todos os gates pode ser declarado:

**SEGEMPAT HOMOLOGADO NO MYSQL DA EMPRESA.**
