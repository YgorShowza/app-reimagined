# SEGEMPAT — Entrega para a TI · MySQL Corporativo

Documento operacional para a equipe de TI implantar e homologar o SEGEMPAT no ambiente corporativo.

## Arquitetura

```text
Navegador do usuário
        | HTTPS
        v
API SEGEMPAT — Node.js / Express
        | TLS interno
        v
MySQL 8 da empresa
```

A API é a única camada que acessa o banco. O navegador nunca recebe credenciais MySQL.

## Materiais do pacote

| Item | Arquivo |
| --- | --- |
| Dados que a TI precisa fornecer | `MYSQL_TI_INPUTS.md` |
| Roteiro detalhado de homologação | `MYSQL_CORPORATE_HANDOFF.md` |
| Checklist de homologação | `CORPORATE_HOMOLOGATION_CHECKLIST.md` |
| Checklist de produção/cutover | `PRODUCTION_CHECKLIST.md` |
| Auditoria de segurança atual | `SECURITY_AUDIT.md` |
| Schema MySQL | `database/mysql/001_schema.sql` |
| Modelo de variáveis da API | `server/.env.example` |
| Docker | `server/Dockerfile`, `server/docker-compose.yml` |
| systemd | `server/deploy/segempat-api.service` |
| Nginx | `server/deploy/nginx-segempat-api.conf` |

## Pré-requisitos da TI

- MySQL 8.x;
- database dedicado ao SEGEMPAT;
- usuário de aplicação de privilégio mínimo;
- TLS habilitado para MySQL em produção;
- CA corporativa instalada quando exigida;
- servidor/VM/container para a API;
- URL HTTPS da API;
- URL HTTPS do frontend;
- storage privado e persistente para evidências;
- firewall/VPN/allowlist conforme política da empresa;
- política de backup e restauração.

## Secrets

Nunca colocar em GitHub, issue, chat compartilhado ou variável `VITE_*`:

- `MYSQL_PASSWORD`;
- `SEGEMPAT_SESSION_SECRET`;
- chave privada de certificado;
- conteúdo de CA privada quando a política da empresa tratar como material restrito.

Usar `server/.env.example` somente como modelo.

## Ordem oficial da homologação

### 1. Preparar ambiente

```bash
cd server
npm ci
```

Configurar as variáveis reais no servidor/cofre de secrets.

### 2. Gate de ambiente

```bash
npm run preflight
```

Se falhar, **parar**. Não executar migrations.

### 3. Schema

```bash
npm run migrate
npm run smoke
```

Se qualquer um falhar, **parar** e corrigir a causa.

### 4. Migrar dados e evidências

Carregar os dados oficiais preservando UUIDs, matrículas e vínculos. Copiar assinaturas/evidências para o storage corporativo e registrar contagens antes/depois.

### 5. Auditoria pós-carga

```bash
npm run cutover:audit
```

Qualquer inconsistência crítica bloqueia a continuidade.

### 6. Primeiro Inspetor, somente se necessário

Se a carga não trouxer uma conta administrativa válida, executar o bootstrap depois da carga/auditoria. Não digitar a senha na linha de comando:

```bash
read -rsp 'Senha temporária: ' SENHA_TMP; echo
printf '%s' "$SENHA_TMP" | \
  CONFIRM_BOOTSTRAP_ADMIN=SIM SENHA_STDIN=SIM \
  MATRICULA=<MATRICULA> NOME="<NOME>" SETOR=Administrativo \
  npm run bootstrap-admin
unset SENHA_TMP
```

A senha temporária deve ser trocada no primeiro acesso.

### 7. Subir API

```bash
npm start
```

Ou usar Docker/systemd conforme padrão corporativo.

Confirmar:

```text
GET /health
GET /health/ready
```

`/health/ready` deve permanecer verde.

### 8. Ligar o frontend corporativo

Publicar o frontend com:

```text
VITE_SEGEMPAT_API_URL=https://<api-corporativa>
VITE_SEGEMPAT_REQUIRE_API=true
```

A segunda variável impede fallback silencioso para o backend legado.

Na API:

```text
SEGEMPAT_ALLOWED_ORIGINS=https://<frontend-corporativo>
```

A origem deve ser exata e HTTPS.

### 9. E2E

Executar pelo menos um ciclo completo com Inspetor e um com Operador, incluindo primeiro acesso, login/logout, Equipe, Cronograma, Banco de Questões, Provas, assinatura, certificados, Treinamentos, gamificação, Avaliação Prática, Ocorrências, Base de Conhecimento, Perfil e Auditoria.

### 10. Infraestrutura e cutover

Confirmar:

- TLS do MySQL;
- HTTPS da API/frontend;
- CORS e cookies;
- firewall/VPN/allowlist;
- grants do usuário MySQL;
- storage persistente;
- backup e restore;
- logs/monitoramento;
- rate limiting central no proxy/WAF se houver múltiplas réplicas;
- topologia de proxy compatível com `trust proxy=1` ou ajuste correspondente;
- plano de rollback e responsáveis.

## Segurança já implementada na API

- sessão HMAC em cookie HTTP-only;
- `Secure=true` obrigatório em produção;
- autorização reconstruída do MySQL a cada requisição;
- conta/colaborador inativo bloqueado;
- Inspetor exige role + perfil funcional;
- operações de escrita exigem `Origin` autorizada;
- login/ativação possuem limitação de tentativas local;
- troca de senha invalida sessões antigas;
- senhas e códigos temporários usam bcrypt;
- evidências ficam em storage privado;
- container e serviços possuem hardening de referência.

## Status

Antes da execução real dos gates:

**PARTE DO MYSQL NO CÓDIGO CONCLUÍDA — PRONTO PARA CONECTAR AO BANCO DA EMPRESA.**

Somente depois da homologação real:

**SEGEMPAT HOMOLOGADO NO MYSQL DA EMPRESA.**
