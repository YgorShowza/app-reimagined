# SEGEMPAT — Dados necessários da TI para iniciar a homologação MySQL

Este documento marca a transição entre **código pronto** e **homologação no ambiente real da empresa**.

> Não registrar senha real, segredo de sessão ou conteúdo de certificados neste arquivo, em issue, commit ou chat compartilhado. Esses valores devem ser entregues pela TI por canal seguro e configurados somente no servidor.

## 1. Banco MySQL corporativo

Preencher/confirmar:

- Versão exata do MySQL 8.x:
- Host/IP do servidor MySQL:
- Porta TCP (padrão 3306):
- Nome do database destinado ao SEGEMPAT:
- Usuário de aplicação com privilégio mínimo:
- TLS disponível e habilitado para a conexão da API: `sim` (obrigatório com `NODE_ENV=production`):
- CA corporativa própria? `sim/não`:
- Se houver CA, caminho absoluto onde ela ficará no host da API:
- Origem de rede/IP que deve ser liberada no firewall/allowlist para a API:

A senha do usuário MySQL **não deve ser escrita neste documento**.

Se o MySQL corporativo não oferecer TLS para o host da API, a homologação em modo `production` deve parar até a TI definir uma solução compatível; não desabilitar o controle apenas para fazer o gate passar.

## 2. Servidor da API SEGEMPAT

- Tipo de execução: `Docker` / `Linux + systemd` / outro:
- Hostname/IP da API:
- Porta interna da API (padrão 8787):
- URL HTTPS final da API, por exemplo `https://api.segempat.empresa.local`:
- Proxy reverso: `Nginx` / `IIS` / balanceador corporativo / outro:
- Certificado HTTPS disponível? `sim/não`:
- Diretório/volume persistente para assinaturas e evidências:
- Esse storage entra no backup corporativo? `sim/não`:

## 3. Frontend corporativo

- URL HTTPS do frontend de homologação:
- URL HTTPS do frontend definitivo:
- A API deve aceitar exatamente essas origens em `SEGEMPAT_ALLOWED_ORIGINS`.

No build corporativo do frontend usar obrigatoriamente:

```text
VITE_SEGEMPAT_API_URL=<URL HTTPS DA API>
VITE_SEGEMPAT_REQUIRE_API=true
```

`VITE_SEGEMPAT_REQUIRE_API=true` é o controle de corte que impede fallback silencioso para o backend legado quando a API corporativa estiver ausente ou mal configurada.

## 4. Configuração a ser aplicada no servidor

Usar `server/.env.example` como modelo. Os valores reais devem existir somente no servidor/secrets manager.

Variáveis obrigatórias ou relevantes:

```text
NODE_ENV=production
PORT=8787
MYSQL_HOST=<HOST>
MYSQL_PORT=<PORTA>
MYSQL_DATABASE=<DATABASE>
MYSQL_USER=<USUARIO>
MYSQL_PASSWORD=<SEGREDO>
MYSQL_SSL=true
MYSQL_SSL_CA_PATH=<CAMINHO_ABSOLUTO_SE_EXIGIDO>
MYSQL_POOL_SIZE=10
SEGEMPAT_SESSION_SECRET=<SEGREDO_ALEATORIO_32+_BYTES>
SEGEMPAT_SESSION_COOKIE=segempat_session
SEGEMPAT_SESSION_TTL_HOURS=12
SEGEMPAT_SESSION_SECURE=true
SEGEMPAT_SESSION_SAMESITE=lax
SEGEMPAT_ALLOWED_ORIGINS=<ORIGENS_HTTPS_EXATAS>
SEGEMPAT_STORAGE_DRIVER=filesystem
SEGEMPAT_STORAGE_PATH=<CAMINHO_ABSOLUTO_PERSISTENTE>
SEGEMPAT_TIMEZONE=America/Maceio
```

## 5. Ordem oficial de execução da homologação

Com os dados acima configurados no ambiente real, executar na pasta `server/`:

```bash
npm ci
npm run preflight
npm run migrate
npm run smoke
```

Somente se todos os gates acima passarem:

1. realizar a carga/migração dos dados e evidências;
2. executar `npm run cutover:audit`;
3. executar `npm run bootstrap-admin` apenas se for necessário preparar o primeiro Inspetor;
4. iniciar a API com `npm start` ou pelo runtime corporativo definido;
5. confirmar `GET /health` e `GET /health/ready`;
6. publicar o frontend corporativo com `VITE_SEGEMPAT_API_URL=<HTTPS DA API>` e `VITE_SEGEMPAT_REQUIRE_API=true`;
7. executar os testes ponta a ponta.

Então validar:

- login de Inspetor;
- login de Operador;
- primeiro acesso/ativação;
- Equipe/Colaboradores;
- Cronograma;
- Banco de Questões e Provas;
- correção e tentativas;
- assinatura/evidências;
- certificados e validação;
- Treinamentos;
- Avaliação Prática;
- Ocorrências;
- demais módulos funcionais;
- CORS, cookies, HTTPS, firewall, backup e rollback.

## 6. Regra de parada

Se `preflight`, `migrate`, `smoke`, `cutover:audit` ou `/health/ready` falharem, **não considerar o ambiente homologado e não mascarar a divergência**. Corrigir a configuração, schema, dados ou infraestrutura e repetir o gate.

## 7. Critério de conclusão

Antes dos testes no ambiente real, o status correto permanece:

**PARTE DO MYSQL NO CÓDIGO CONCLUÍDA — PRONTO PARA CONECTAR AO BANCO DA EMPRESA.**

Somente após aprovação dos gates e do teste ponta a ponta no ambiente corporativo:

**SEGEMPAT HOMOLOGADO NO MYSQL DA EMPRESA.**
