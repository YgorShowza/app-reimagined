# SEGEMPAT · Auditoria de Segurança — Arquitetura MySQL/API

Atualizado em 05/09/2026.

> Este documento substitui a auditoria de 01/09/2026 baseada em Supabase/RLS/RPC. A versão anterior continua preservada no histórico do Git, mas **não representa a arquitetura corporativa alvo atual**.

## Escopo atual

Arquitetura auditada:

```text
Frontend SEGEMPAT
      |
      | HTTPS + cookie HTTP-only
      v
API SEGEMPAT — Node.js / Express
      |
      +--> MySQL 8 corporativo via TLS
      +--> storage privado persistente
```

O navegador não recebe host, usuário, senha ou CA do MySQL. A autorização que antes dependia de RLS/RPC foi movida para a API própria.

## Controles implementados no código

### Banco e transporte

- credenciais MySQL existem somente no backend;
- `NODE_ENV=production` exige `MYSQL_SSL=true`;
- quando uma CA própria é informada, o caminho deve ser absoluto em produção;
- o cliente MySQL usa `rejectUnauthorized: true`;
- conexões são inicializadas com UTC, `FOREIGN_KEY_CHECKS=1` e modo SQL estrito;
- pool possui limite configurável e charset `utf8mb4`;
- `preflight`, `smoke` e `/health/ready` verificam invariantes do ambiente real.

### Sessão, identidade e autorização

- sessão em cookie `HttpOnly` e `Secure` obrigatório em produção;
- token de sessão usa HMAC-SHA256 e possui expiração;
- contexto funcional é reconstruído do MySQL em toda requisição protegida;
- conta e colaborador precisam permanecer `Ativo`;
- privilégio administrativo exige simultaneamente role `admin` e perfil funcional atual `Inspetor`;
- o token contém uma versão opaca derivada por HMAC da credencial armazenada, sem expor o bcrypt; troca de senha invalida tokens antigos;
- alterações de conta, vínculo funcional e role continuam sendo reavaliadas diretamente no MySQL a cada requisição, sem depender do conteúdo antigo do cookie;
- `last_login_at` e outros updates não relacionados à credencial não invalidam acidentalmente a sessão recém-criada;
- após troca de senha, a sessão atual é rotacionada e as demais sessões antigas deixam de ser aceitas;
- tokens malformados, com segmentos extras, sem versão, expirados ou excessivamente grandes são rejeitados.

### Proteção contra CSRF e origem indevida

- CORS usa allowlist explícita e `credentials: true`;
- wildcard é rejeitado quando cookies de sessão são usados;
- em produção, origens CORS precisam ser HTTPS;
- toda operação de escrita em `/api` exige cabeçalho `Origin` explícito e presente em `SEGEMPAT_ALLOWED_ORIGINS`;
- a API não aceita formulário URL-encoded para operações funcionais; o contrato corporativo usa JSON;
- essa validação de origem protege inclusive cenários em que `SameSite=None` venha a ser necessário.

### Autenticação e primeiro acesso

- login usa mensagem genérica para matrícula/senha inválida e caminho criptográfico semelhante quando a matrícula não existe, reduzindo sinal de enumeração por tempo;
- tentativas de login e ativação são limitadas por janela temporal e combinação de IP + matrícula;
- senha é armazenada somente como bcrypt;
- primeiro acesso exige colaborador ativo e código de ativação de 8 dígitos;
- código temporário é bcrypt, expira e é de uso único;
- criação de Inspetor inicial é uma operação explícita e auditada;
- bootstrap suporta senha via `stdin`, evitando registrar a senha no histórico do shell;
- mudança de senha exige a senha atual e proíbe reutilizar exatamente a mesma senha.

### Autorização funcional

- rotas administrativas usam `requireAdmin`;
- rotas pessoais usam `requireAuth` e derivam identidade da sessão;
- cadastro funcional inativo bloqueia acesso mesmo com cookie ainda dentro do TTL;
- alterações de perfil funcional sincronizam a role administrativa no backend;
- matrícula com conta ou histórico operacional não pode ser alterada/excluída de forma destrutiva;
- notas de provas e atividades são calculadas no servidor;
- gabaritos são removidos das respostas operacionais antes da entrega ao navegador;
- XP, certificados e vínculos de assinatura são decididos no backend.

### Assinaturas e evidências

- storage implementado é privado e controlado pela API;
- produção exige caminho absoluto e persistente;
- assinatura é vinculada à tentativa e ao usuário autenticado;
- arquivo é criado com permissão restritiva e nome não fornecido pelo navegador;
- leitura administrativa verifica vínculo no banco, confinamento de caminho e assinatura PNG;
- `cutover:audit` confirma existência e coerência das evidências migradas.

### Integração do frontend corporativo

- `VITE_SEGEMPAT_REQUIRE_API=true` impede publicação corporativa sem `VITE_SEGEMPAT_API_URL`;
- o cliente legado Supabase também possui bloqueio explícito em modo API-only, evitando acesso silencioso mesmo se algum código antigo for chamado por engano;
- gateway de primeiro acesso usa as rotas reais `/api/access/activation-codes`;
- importação de resultados do Cronograma usa endpoint MySQL único e transacional no modo corporativo.

### Infraestrutura de execução

- container roda como usuário não-root `node`;
- Compose aplica `no-new-privileges` e remove capabilities Linux;
- porta do container fica publicada somente em `127.0.0.1:8787` no modelo fornecido;
- Docker healthcheck usa `/health/ready`;
- exemplo systemd usa usuário dedicado, `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome` e escrita limitada ao storage;
- exemplo Nginx força HTTPS e TLS 1.2/1.3 e encaminha o tráfego à interface local.

## Controles automáticos no CI

O workflow do GitHub valida continuamente:

- versões de migrations MySQL e alinhamento de foreign keys críticas;
- sintaxe de todos os arquivos JavaScript da API/scripts;
- configuração segura de produção e rejeição de configurações inseguras;
- sessão/CSRF por testes de contrato e execução HTTP local;
- contrato `VITE_SEGEMPAT_REQUIRE_API=true` e bloqueio do backend legado;
- rotas críticas de primeiro acesso e importação atômica do Cronograma;
- build do container e metadados de usuário/healthcheck;
- hardening do Compose, Nginx e systemd;
- typecheck, lint e build de produção do frontend em modo API-only.

## Limitações que só podem ser encerradas no ambiente da empresa

Ainda não é possível afirmar segurança operacional final sem verificar no ambiente real:

- versão/configuração exata do MySQL corporativo;
- cadeia de certificados TLS/CA realmente negociada;
- grants reais do usuário MySQL de aplicação;
- firewall, VPN e allowlist efetivamente aplicados;
- política de backup/restauração do MySQL e storage;
- proxy corporativo e preservação correta do IP de origem;
- logs/monitoramento e retenção definidos pela TI;
- contas reais Inspetor/Operador e dispositivos reais;
- restauração testada a partir de backup;
- plano de rollback aprovado.

## Riscos residuais conhecidos e tratamento

- A sessão é stateless: logout limpa o cookie do dispositivo, enquanto revogação imediata de um token copiado depende de inativação da conta ou rotação da credencial. O TTL padrão é 12 horas e o contexto da conta é revalidado em toda requisição.
- O limitador de autenticação implementado na aplicação é por instância. Em implantação com múltiplas réplicas, a TI deve complementar com rate limiting central no proxy/WAF.
- `trust proxy=1` pressupõe exatamente um proxy corporativo confiável à frente da API; se a topologia for diferente, a TI deve ajustar essa configuração antes da publicação.

## Critério de aceite de segurança

A auditoria de código pode ser considerada concluída quando o CI do HEAD final estiver verde. A **homologação de segurança de produção** somente termina depois de TLS, grants, rede, backup, restore, proxy, cookies, CORS, storage e testes ponta a ponta serem comprovados no ambiente corporativo.
