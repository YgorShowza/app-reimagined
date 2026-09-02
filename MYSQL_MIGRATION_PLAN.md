# SEGEMPAT — Plano de Migração para MySQL 8.0

## Objetivo

Preparar o SEGEMPAT para operar sobre o MySQL da empresa sem manter o frontend acoplado ao Supabase.

A migração será feita em duas fases para não interromper o app atual:

1. **Compatibilidade** — o app continua funcionando no Supabase enquanto o frontend passa a consumir uma camada própria de backend/API.
2. **Cutover** — o backend/API passa a usar MySQL e o Supabase deixa de ser dependência operacional.

## Arquitetura alvo

```text
Navegador / SEGEMPAT React
        |
        | HTTPS / JSON
        v
SEGEMPAT Backend API (server-side)
        |
        +--> MySQL 8.0 da empresa
        +--> armazenamento privado de assinaturas/evidências
        +--> autenticação/sessão
```

**Regra obrigatória:** o navegador nunca recebe host, usuário ou senha do MySQL. Credenciais MySQL existem somente no servidor.

## O que hoje depende do Supabase

O Supabase atual entrega quatro funções diferentes:

- PostgreSQL para dados;
- Auth para sessão/usuários;
- RLS para autorização por perfil/setor/usuário;
- Storage para assinaturas de provas.

No MySQL essas responsabilidades precisam ser separadas:

- **MySQL:** persistência;
- **Backend API:** autorização equivalente à RLS e regras de negócio;
- **Sessão do backend:** autenticação;
- **Storage privado da empresa ou filesystem/S3 compatível:** assinaturas/evidências.

## Modelo de identidade

O banco MySQL terá `app_users` para substituir `auth.users`.

`employees` continua sendo o cadastro funcional e **não** deve ser usado diretamente como tabela de senha.

Fluxo:

```text
employees (cadastro funcional)
   |
   +-- matricula
   |
app_users (conta/senha/sessão)
   |
profiles + user_roles
```

Isso preserva o desenho atual do SEGEMPAT: uma pessoa pode existir no cadastro funcional antes de possuir acesso ao sistema.

## UUIDs

Na primeira versão MySQL, IDs serão `CHAR(36)` para preservar integralmente os UUIDs já existentes e evitar remapeamento de chaves durante a migração.

Depois da homologação, a TI pode opcionalmente migrar UUIDs para `BINARY(16)` para reduzir tamanho de índices.

## Conversões PostgreSQL -> MySQL

| PostgreSQL/Supabase | MySQL 8.0 |
| --- | --- |
| `uuid` | `CHAR(36)` |
| `jsonb` | `JSON` |
| `text` | `TEXT`/`VARCHAR` |
| `boolean` | `TINYINT(1)` |
| `timestamptz` | `DATETIME(3)` em UTC |
| `uuid[]` | `JSON` |
| RLS | autorização no backend |
| RPC `SECURITY DEFINER` | service/use-case no backend |
| Supabase Storage | storage privado do backend |
| `auth.users` | `app_users` |

## Segurança que deve ser preservada no backend MySQL

As regras abaixo não podem ser delegadas somente ao frontend:

- Operador só consulta dados próprios quando aplicável;
- conteúdo/provas/questões filtrados por setor;
- Inspetor possui autorização administrativa explícita;
- colaborador Inativo não opera mesmo com sessão antiga;
- notas de provas são calculadas no servidor;
- XP é calculado no servidor;
- gabaritos não são enviados ao Operador antes da conclusão;
- assinatura pertence ao próprio usuário/tentativa;
- certificado formal exige aprovação + assinatura;
- códigos de ativação têm hash adaptativo, uso único e expiração;
- auditoria é escrita no servidor e somente Inspetor consulta.

## Etapas de implementação

### Fase A — preparação (sem trocar banco)

- [x] inventariar schema PostgreSQL real;
- [x] mapear PKs, uniques, FKs e índices;
- [x] definir arquitetura MySQL/API;
- [x] criar schema MySQL inicial;
- [x] criar contratos de backend independentes de banco;
- [ ] mover serviços do frontend para o novo cliente de API gradualmente;
- [ ] retirar chamadas diretas a `supabase.from`, `.rpc`, `.storage` e `.auth` das telas.

### Fase B — backend MySQL

- [ ] receber dados de conexão MySQL da TI em variáveis **server-only**;
- [ ] adicionar driver MySQL no servidor (`mysql2` ou driver aprovado pela empresa);
- [ ] implementar pool de conexões;
- [ ] implementar autenticação/sessão;
- [ ] implementar autorização por perfil/setor;
- [ ] implementar endpoints de Equipe, Cronograma, Provas, Treinamentos, Avaliação Prática, Ocorrências, Relatórios e Certificados;
- [ ] implementar upload privado de assinatura/evidência;
- [ ] implementar auditoria transacional.

### Fase C — migração de dados

- [ ] criar dump lógico do banco atual;
- [ ] exportar `auth.users` somente pelo procedimento administrativo autorizado;
- [ ] migrar 19 tabelas públicas preservando UUIDs;
- [ ] migrar ou recriar contas de usuários com política aprovada pela empresa;
- [ ] copiar assinaturas/evidências para o storage escolhido;
- [ ] comparar contagens e checksums por tabela;
- [ ] executar testes de integridade.

### Fase D — cutover

- [ ] homologar ambiente MySQL isolado;
- [ ] congelar escritas no banco antigo;
- [ ] executar delta final;
- [ ] trocar `SEGEMPAT_API_URL` para backend MySQL;
- [ ] validar login Inspetor/Operador;
- [ ] validar Cronograma, provas, assinatura, certificado e relatórios;
- [ ] manter plano de rollback durante a janela definida pela TI.

## Variáveis de ambiente alvo

### Frontend (pode ser exposto)

```text
VITE_SEGEMPAT_API_URL=https://segempat-api.empresa.local
```

### Servidor (NUNCA usar prefixo VITE_)

```text
SEGEMPAT_DB_DRIVER=mysql
MYSQL_HOST=
MYSQL_PORT=3306
MYSQL_DATABASE=
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_SSL=true
SEGEMPAT_SESSION_SECRET=
SEGEMPAT_STORAGE_DRIVER=
SEGEMPAT_STORAGE_PATH=
```

## Informações que ainda serão necessárias da TI

Para a conexão final, precisamos somente de informações técnicas — **não devem ser enviadas em chat se forem credenciais reais**. O ideal é cadastrá-las diretamente como secrets/variáveis no ambiente de deploy.

- versão exata do MySQL;
- host/IP interno;
- porta;
- nome do database/schema;
- exigência de TLS/SSL e certificado CA;
- política de rede (VPN, allowlist, firewall);
- usuário de aplicação com privilégios mínimos;
- ambiente de homologação separado de produção;
- opção de storage para assinaturas/evidências;
- política corporativa de autenticação (senha local, AD/LDAP, SSO ou outro).

## Critério de conclusão

A migração será considerada concluída quando:

1. nenhuma tela importar Supabase diretamente;
2. todo acesso aos dados ocorrer através da API SEGEMPAT;
3. a API estiver conectada ao MySQL com usuário de privilégio mínimo;
4. regras hoje feitas por RLS/RPC estiverem testadas no backend;
5. contagens e integridade do banco MySQL forem equivalentes;
6. login, Cronograma, prova, assinatura, certificado, relatórios e auditoria passarem na homologação.
