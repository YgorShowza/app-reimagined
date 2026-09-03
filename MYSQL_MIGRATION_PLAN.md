# SEGEMPAT — Plano de Migração para MySQL 8.0

## Objetivo

Operar o SEGEMPAT sobre o MySQL da empresa sem expor credenciais do banco ao navegador e sem depender do Supabase quando a API corporativa estiver configurada.

## Arquitetura alvo

```text
Navegador / SEGEMPAT React
        |
        | HTTPS / JSON
        v
SEGEMPAT Backend API (Node/Express)
        |
        +--> MySQL 8.0 da empresa
        +--> armazenamento privado de assinaturas/evidências
        +--> autenticação/sessão assinada
```

**Regra obrigatória:** o navegador nunca recebe host, usuário ou senha do MySQL. Credenciais MySQL existem somente no servidor.

Durante a transição, o frontend mantém fallback legado para Supabase somente quando `VITE_SEGEMPAT_API_URL` não está configurado. Em modo API, os fluxos migrados usam a API SEGEMPAT.

## Situação atual do código

### Implementado

- [x] schema base MySQL 8 em `database/mysql/001_schema.sql`;
- [x] runner versionado de migrations MySQL com histórico, checksum e detecção segura de baseline existente;
- [x] validação de ordem numérica e versões duplicadas das migrations;
- [x] pool MySQL com UTC, `utf8mb4`, transações e suporte a TLS/CA corporativa;
- [x] smoke test do schema operacional e engines InnoDB;
- [x] sessão assinada no backend e reconstrução de autorização a cada requisição;
- [x] login, primeiro acesso, troca de senha e logout via MySQL;
- [x] código de ativação com hash, expiração, uso único e auditoria;
- [x] autorização administrativa vinculada a role `admin` + perfil funcional atual `Inspetor`;
- [x] Equipe/Colaboradores via API MySQL;
- [x] Cronograma via API MySQL, incluindo bulk atômico, recorrência, suspensões e sincronização com provas;
- [x] Banco de Questões via API MySQL;
- [x] Provas/tentativas com correção server-side;
- [x] assinatura de prova em storage privado controlado pelo backend;
- [x] certificados e evidências via API;
- [x] Treinamentos, Simulador, Stress Test, Teste Rápido e Desafio Diário via API;
- [x] XP/nível calculados no servidor e protegidos por transação;
- [x] Avaliação Prática e modelos de avaliação via API;
- [x] Ocorrências e Base de Conhecimento via API;
- [x] auditoria administrativa via backend;
- [x] rotas pessoais separadas de rotas administrativas quando necessário;
- [x] payloads do frontend sanitizados para não confiar em nome, matrícula, setor, criador ou avaliador enviados pelo navegador;
- [x] geração de Cronograma em modo API limitada a operações atômicas de até 1000 lançamentos;
- [x] CI validando migrations, sintaxe do backend, typecheck, lint e build.

### Ainda depende da infraestrutura real da empresa

- [ ] receber e configurar host/porta/database do MySQL de homologação;
- [ ] configurar usuário MySQL de privilégio mínimo;
- [ ] configurar TLS/SSL e CA corporativa, se exigido;
- [ ] disponibilizar a API SEGEMPAT em ambiente acessível pelo frontend;
- [ ] definir storage corporativo definitivo para assinaturas/evidências;
- [ ] aplicar migrations no MySQL de homologação;
- [ ] migrar os dados existentes;
- [ ] executar homologação ponta a ponta;
- [ ] executar cutover de produção e rollback planejado.

## Modelo de identidade

O MySQL usa `app_users` para conta/senha e `employees` como cadastro funcional.

```text
employees (cadastro funcional)
   |
   +-- matrícula
   |
app_users (conta/senha/sessão)
   |
profiles + user_roles
```

Uma pessoa pode existir em `employees` antes de receber acesso ao sistema.

## Conversões PostgreSQL -> MySQL

| PostgreSQL/Supabase | MySQL 8.0 |
| --- | --- |
| `uuid` | `CHAR(36)` |
| `jsonb` | `JSON` |
| `boolean` | `TINYINT(1)` |
| `timestamptz` | `DATETIME(3)` em UTC |
| `uuid[]` | `JSON` |
| RLS | autorização no backend |
| RPC `SECURITY DEFINER` | serviço/endpoint no backend |
| Supabase Storage | storage privado do backend |
| `auth.users` | `app_users` |

## Segurança preservada no backend MySQL

- Operador só consulta dados próprios quando aplicável;
- conteúdo, provas e questões são filtrados por setor;
- Inspetor depende de autorização administrativa explícita e perfil funcional atual;
- colaborador inativo perde acesso mesmo com cookie ainda válido;
- notas de provas são calculadas no servidor;
- XP e nível são calculados no servidor;
- gabaritos não são enviados antes da conclusão;
- identidade funcional é derivada do banco/sessão, não do navegador;
- assinatura é vinculada a tentativa registrada no MySQL;
- códigos de ativação possuem hash, expiração e uso único;
- operações críticas usam transações sempre que o MySQL permite atomicidade;
- auditoria é escrita pelo servidor;
- TLS MySQL pode exigir CA corporativa com validação de certificado ativa.

## Migrations MySQL

As migrations ficam em `database/mysql` e seguem o padrão:

```text
001_schema.sql
002_descricao.sql
003_descricao.sql
...
```

O runner:

1. ordena versões numericamente;
2. rejeita versões duplicadas, inclusive variações numericamente equivalentes;
3. registra checksum SHA-256;
4. não permite alterar uma migration já registrada;
5. reconhece instalação anterior ao runner somente quando o baseline representativo está completo;
6. bloqueia automaticamente baseline parcial para evitar mascarar banco incompleto.

**Observação:** DDL do MySQL pode fazer auto-commit. Migrations incrementais devem ser pequenas, previsíveis e, quando possível, idempotentes.

## Variáveis de ambiente

### Frontend

```text
VITE_SEGEMPAT_API_URL=https://segempat-api.empresa.local
```

### Servidor

```text
MYSQL_HOST=
MYSQL_PORT=3306
MYSQL_DATABASE=
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_SSL=true
MYSQL_SSL_CA_PATH=
SEGEMPAT_SESSION_SECRET=
SEGEMPAT_ALLOWED_ORIGINS=
SEGEMPAT_STORAGE_PATH=
```

Secrets reais devem ser cadastrados diretamente no ambiente de deploy, não incluídos no código ou em arquivos versionados.

## Dados que precisamos da TI para homologação

- versão exata do MySQL;
- host/IP interno;
- porta;
- database/schema;
- exigência de TLS/SSL e certificado CA;
- firewall/VPN/allowlist;
- usuário da aplicação e permissões concedidas;
- ambiente de homologação separado de produção;
- local definitivo para storage de assinaturas/evidências;
- URL/host onde a API SEGEMPAT será executada.

## Fase de migração de dados

Antes do cutover será necessário:

- exportar os dados atuais pelo procedimento autorizado;
- preservar UUIDs e vínculos funcionais;
- migrar tabelas operacionais para MySQL;
- tratar contas/senhas conforme política aprovada pela empresa;
- copiar assinaturas/evidências;
- comparar contagens e integridade por tabela;
- validar amostras funcionais e históricas.

## Critério de “código pronto para conectar ao MySQL da empresa”

A parte de código pode ser considerada concluída quando:

1. os fluxos necessários em modo API não dependem de Supabase em runtime;
2. CI estiver verde no commit final;
3. migrations, smoke test, autenticação, permissões e storage estiverem preparados para configuração corporativa;
4. não houver pendência conhecida de consistência que dependa apenas de alteração de código local.

## Critério de “SEGEMPAT homologado no MySQL da empresa”

Só será considerado pronto para produção depois de:

1. API conectada ao MySQL real de homologação;
2. migrations aplicadas e smoke test aprovado;
3. dados migrados e integridade conferida;
4. login Inspetor e Operador testados;
5. Equipe, Cronograma, Provas, Banco de Questões, Treinamentos, Avaliação Prática, Ocorrências, assinatura, certificados, relatórios e auditoria testados ponta a ponta;
6. TLS, CORS, cookies, firewall e permissões validados no ambiente real;
7. plano de rollback aprovado para o cutover.
