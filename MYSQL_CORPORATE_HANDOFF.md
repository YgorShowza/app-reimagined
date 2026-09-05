# SEGEMPAT — Handoff para Homologação no MySQL Corporativo

Este documento é o roteiro operacional de entrega do SEGEMPAT para a TI conectar o backend ao MySQL real de homologação da empresa sem expor credenciais no frontend ou no GitHub.

## 1. Objetivo

Concluir a etapa que não pode ser validada apenas pelo código versionado: conexão real com o ambiente corporativo, aplicação controlada do schema, auditoria dos dados e teste ponta a ponta.

A arquitetura esperada é:

```text
Frontend SEGEMPAT
      |
      | HTTPS
      v
API SEGEMPAT (Node.js / Express)
      |
      +--> MySQL 8.0+ corporativo
      +--> storage privado persistente
```

O navegador não deve receber host, usuário, senha, CA ou qualquer outro segredo do MySQL.

## 2. Dados que a TI deve fornecer

Preencher fora do repositório, no cofre de secrets ou no ambiente seguro de homologação:

| Item | Valor de homologação |
| --- | --- |
| Host/IP MySQL | ______________________________ |
| Porta | ______________________________ |
| Database | ______________________________ |
| Usuário da aplicação | ______________________________ |
| Senha | **secret — não registrar neste documento** |
| MySQL exige TLS? | sim / não |
| Caminho da CA, se aplicável | ______________________________ |
| Host/URL da API | ______________________________ |
| URL HTTPS do frontend | ______________________________ |
| Caminho do storage persistente | ______________________________ |
| VPN/firewall/allowlist necessários | ______________________________ |
| Responsável técnico da TI | ______________________________ |
| Data da homologação | ____/____/________ |

## 3. Preparação do ambiente

No host da API:

1. instalar Node.js 20 ou superior;
2. disponibilizar o código do SEGEMPAT a partir da revisão aprovada do GitHub;
3. entrar na pasta `server`;
4. executar `npm ci`;
5. criar as variáveis de ambiente usando `server/.env.example` apenas como referência;
6. cadastrar credenciais reais como secrets do ambiente;
7. garantir acesso de rede do host da API ao MySQL;
8. garantir volume persistente e backup para assinaturas/evidências.

Nunca copiar credenciais reais para arquivos versionados, variáveis `VITE_*`, código do frontend, issues ou commits.

## 4. Gate 1 — Preflight

Executar:

```bash
cd server
npm run preflight
```

Só continuar se o comando terminar com `OK`.

O preflight deve confirmar, entre outros controles:

- conexão com o MySQL configurado;
- versão MySQL 8.0 ou superior;
- database correto;
- charset compatível com `utf8mb4`;
- sessão em UTC;
- modo SQL estrito;
- InnoDB;
- `FOREIGN_KEY_CHECKS=1`;
- TLS efetivamente negociado quando habilitado;
- storage corporativo gravável e legível.

### Regra de parada

Se o preflight falhar, **não executar migrations**. Registrar o erro e corrigir primeiro a infraestrutura/configuração.

## 5. Gate 2 — Migration e compatibilidade do baseline

Com o preflight aprovado:

```bash
npm run migrate
```

O runner protege o histórico de migrations e, quando encontra estrutura legada antes do registro do baseline, exige compatibilidade com `database/mysql/001_schema.sql` antes de aceitar o baseline automaticamente.

Entre os pontos validados estão:

- tabelas e colunas esperadas;
- tipos, nulabilidade e defaults;
- charset/collation;
- `AUTO_INCREMENT` e atributos de coluna;
- chaves primárias;
- índices e unicidade;
- colunas geradas;
- `CHECK constraints`;
- triggers inesperados;
- foreign keys e regras referenciais;
- registros órfãos.

### Regra de parada

Qualquer divergência estrutural deve bloquear a continuidade. Não alterar o runner para “aceitar” uma estrutura divergente apenas para fazer a homologação passar.

## 6. Gate 3 — Smoke estrutural

Depois da migration:

```bash
npm run smoke
```

Só continuar se o smoke terminar sem erro.

Registrar como evidência:

- data/hora;
- revisão/commit homologado;
- ambiente;
- resultado do comando;
- responsável pela execução.

## 7. Carga/migração dos dados

Antes da carga definitiva, a fonte oficial dos dados atuais deve ser definida pela gestão/TI.

Preservar obrigatoriamente:

- UUIDs e matrículas;
- vínculos entre usuários e colaboradores;
- provas, tentativas e resultados;
- certificados e códigos de verificação;
- treinamentos e registros operacionais;
- assinaturas/evidências e seus vínculos.

Registrar contagem antes e depois da migração para as entidades críticas.

## 8. Gate 4 — Auditoria pós-carga

Após carregar os dados:

```bash
npm run cutover:audit
```

Corrigir qualquer inconsistência antes de liberar usuários para teste.

## 9. Primeiro Inspetor

Somente quando necessário para preparar a primeira conta administrativa:

```bash
npm run bootstrap-admin
```

A criação do primeiro Inspetor deve ocorrer em ambiente controlado, com credenciais temporárias tratadas como secret e troca de senha no primeiro acesso.

## 10. Subida da API

Com os gates anteriores aprovados:

```bash
npm start
```

Validar:

```text
GET /health
GET /health/ready
```

O endpoint de readiness deve permanecer saudável antes do início do teste funcional.

## 11. Teste ponta a ponta

Executar pelo menos um ciclo com perfil **Inspetor** e um com perfil **Operador**.

Cobertura mínima:

- login e logout;
- primeiro acesso e troca de senha;
- Equipe/Colaboradores;
- Cronograma;
- Banco de Questões;
- Provas, tentativas e correção;
- assinatura e evidências;
- certificados e validação;
- Treinamentos;
- Simulador;
- Stress Test;
- Teste Rápido;
- Desafio Diário;
- Avaliação Prática;
- Ocorrências;
- Base de Conhecimento;
- Meu Perfil;
- Auditoria administrativa.

## 12. Evidências da homologação

Guardar, em local corporativo apropriado:

- identificação da revisão/commit implantado;
- resultado do `preflight`;
- resultado da migration;
- resultado do `smoke`;
- resultado do `cutover:audit`;
- evidências dos testes Inspetor/Operador;
- validação de TLS, firewall, CORS e cookies;
- validação de backup/storage;
- aprovação do rollback/cutover.

Não armazenar senha, secret de sessão ou chave privada nas evidências.

## 13. Critério de aceite

A frase abaixo só pode ser utilizada depois que todos os gates obrigatórios forem aprovados no ambiente real da empresa:

**SEGEMPAT HOMOLOGADO NO MYSQL DA EMPRESA**

Até esse momento, o status correto permanece:

**PARTE DO MYSQL NO CÓDIGO CONCLUÍDA — PRONTO PARA CONECTAR AO BANCO DA EMPRESA.**
