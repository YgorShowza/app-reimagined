# API SEGEMPAT sobre MySQL corporativo

Este diretório é o backend que permite ao SEGEMPAT operar sem o banco legado. O navegador conversa somente com esta API; o servidor mantém as credenciais MySQL e aplica autenticação, autorização e regras de negócio.

## Requisitos

- Node.js 20+
- MySQL 8.0+
- acesso de rede do servidor ao MySQL
- HTTPS no proxy reverso da empresa

## Instalação

```bash
cd server
npm ci
cp .env.example .env
```

Preencha `.env` **somente no servidor da empresa**. Nunca publique esse arquivo e nunca use `VITE_` para credenciais.

## Primeiro ambiente

1. Crie o database e o usuário de aplicação com privilégio mínimo para o database do SEGEMPAT.
2. Configure `MYSQL_SSL=true` e o CA corporativo quando a política exigir.
3. Execute a migração:

```bash
npm run migrate
```

4. Crie o primeiro Inspetor (o comando cria/reutiliza a matrícula e grava apenas hash da senha):

```bash
MATRICULA=970 NOME="Nome do Inspetor" SETOR=Administrativo SENHA='senha-forte' npm run bootstrap-admin
```

5. Valide a instalação:

```bash
npm run preflight
npm run smoke
```

O script `preflight` confirma MySQL 8+, database correto, TLS quando exigido e integridade básica do schema. O `smoke` valida rotas públicas e, quando configuradas, rotas autenticadas sem imprimir credenciais.

## Publicação

Execute a API atrás de um proxy reverso HTTPS (IIS, Nginx ou infraestrutura equivalente) e permita somente as origens exatas em `SEGEMPAT_ALLOWED_ORIGINS`. Aponte o frontend para a URL pública da API usando `VITE_SEGEMPAT_API_URL`.

Exemplo de produção:

```text
VITE_SEGEMPAT_API_URL=https://api.segempat.empresa.local
```

Na configuração do frontend, a presença dessa variável ativa o adapter HTTP e deixa de usar o adapter legado. O corte definitivo só deve acontecer depois de a TI homologar login, Cronograma, Provas, Treinamentos, assinatura, certificados, relatórios e auditoria.

## Segurança operacional

- `MYSQL_PASSWORD`, `SEGEMPAT_SESSION_SECRET` e o CA do MySQL ficam apenas no servidor.
- `SEGEMPAT_SESSION_SECRET` deve ter pelo menos 32 bytes aleatórios e ser exclusivo por ambiente.
- Em HTTPS mantenha `SEGEMPAT_SESSION_SECURE=true`.
- Não use `SEGEMPAT_ALLOWED_ORIGINS=*` com cookies.
- Backups, rotação de segredos, firewall, VPN, logs e storage privado são responsabilidades da implantação corporativa.
- O endpoint de healthcheck não retorna versão, host, database ou detalhes de erro.
