# SEGEMPAT — Checklist de Homologação Corporativa

Este documento organiza, em uma única sequência operacional, o que precisa ser validado pela TI e pela gestão para concluir a homologação do SEGEMPAT no MySQL corporativo.

## Status atual

**PARTE DO MYSQL NO CÓDIGO CONCLUÍDA — PRONTO PARA CONECTAR AO BANCO DA EMPRESA.**

Esse status indica que a preparação de código está concluída. A homologação só será considerada concluída depois dos testes no ambiente real da empresa.

## 1. Informações que a TI precisa fornecer

- [ ] versão exata do MySQL de homologação;
- [ ] host/IP do servidor MySQL;
- [ ] porta;
- [ ] nome do database;
- [ ] usuário da aplicação com privilégio mínimo;
- [ ] senha cadastrada como secret do ambiente;
- [ ] confirmação se TLS/SSL é obrigatório;
- [ ] CA corporativa, se exigida;
- [ ] regras de firewall/VPN/allowlist;
- [ ] host/URL onde a API SEGEMPAT será executada;
- [ ] caminho/volume persistente para assinaturas e evidências;
- [ ] URL HTTPS do frontend de homologação.

## 2. Configuração mínima da API

Usar `server/.env.example` apenas como modelo. Credenciais reais não devem ser versionadas no GitHub.

A configuração de produção/homologação deve contemplar, no mínimo:

- `NODE_ENV=production`;
- conexão MySQL real;
- TLS/CA conforme política da empresa;
- segredo de sessão aleatório com pelo menos 32 bytes;
- cookie de sessão com `Secure=true`;
- CORS com origens HTTPS explícitas;
- storage `filesystem` em caminho absoluto e persistente;
- timezone funcional `America/Maceio`, salvo decisão corporativa diferente formalmente validada.

## 3. Validação antes de qualquer migration

Dentro da pasta `server`:

```text
npm run preflight
```

O preflight deve terminar com `OK` e validar:

- [ ] conexão real com o MySQL;
- [ ] MySQL 8 ou superior;
- [ ] database selecionado é exatamente o configurado;
- [ ] sessão MySQL em UTC;
- [ ] modo SQL estrito ativo;
- [ ] charset do database `utf8mb4`;
- [ ] charset da conexão compatível com `utf8mb4`;
- [ ] InnoDB como engine esperada;
- [ ] `FOREIGN_KEY_CHECKS=1`;
- [ ] TLS realmente negociado quando `MYSQL_SSL=true`;
- [ ] storage corporativo permite criar, ler e remover arquivo de teste.

Se qualquer item falhar, **não aplicar migrations** até a TI corrigir o ambiente.

## 4. Aplicação do schema

Executar:

```text
npm run migrate
```

Critérios:

- [ ] migrations executadas sem erro;
- [ ] histórico de migrations registrado;
- [ ] checksums coerentes;
- [ ] nenhuma migration já aplicada foi alterada;
- [ ] nenhuma lacuna de versão detectada.

### Gate de compatibilidade do baseline legado

Se o banco já contiver as tabelas funcionais antes do primeiro registro em `schema_migrations`, o runner mantém um lock exclusivo de migration e só registra o baseline `001` depois que a estrutura existente for aprovada pelos validadores do código.

A validação cobre, antes do registro automático:

- [ ] definição e integridade de `schema_migrations`;
- [ ] engine, charset e collation das tabelas;
- [ ] conjunto exato de colunas, tipos, nulabilidade e defaults;
- [ ] charset/collation das colunas textuais;
- [ ] atributos de coluna como `AUTO_INCREMENT` e `INVISIBLE`;
- [ ] chaves primárias;
- [ ] índices secundários explícitos, ordem, prefixo e unicidade;
- [ ] ausência de índices `UNIQUE` adicionais não declarados no baseline;
- [ ] expressões e modo das colunas geradas;
- [ ] `CHECK constraints`, incluindo ausência de regras extras;
- [ ] ausência de triggers legados não declarados;
- [ ] foreign keys, colunas relacionadas e regras `ON DELETE`/`ON UPDATE`;
- [ ] ausência de foreign keys adicionais não declaradas;
- [ ] ausência de registros órfãos nas relações do baseline.

Qualquer divergência impede o registro automático do `001` e exige correção explícita do schema/dados antes da continuidade. O runner **não deve mascarar uma estrutura legada divergente como homologada**.

## 5. Smoke test estrutural

Executar:

```text
npm run smoke
```

O smoke deve confirmar:

- [ ] tabelas essenciais presentes;
- [ ] tabelas críticas em InnoDB;
- [ ] `utf8mb4` preservado;
- [ ] foreign keys críticas presentes;
- [ ] índices UNIQUE críticos presentes;
- [ ] `FOREIGN_KEY_CHECKS=1`;
- [ ] sessão em UTC;
- [ ] modo SQL estrito ativo.

## 6. Migração de dados

Antes da carga definitiva:

- [ ] definir fonte oficial dos dados atuais;
- [ ] preservar UUIDs e matrículas;
- [ ] preservar vínculos entre usuários, colaboradores, provas e certificados;
- [ ] copiar assinaturas/evidências para o storage corporativo;
- [ ] registrar contagens antes e depois da migração;
- [ ] validar amostras históricas e funcionais.

## 7. Auditoria pós-carga

Executar:

```text
npm run cutover:audit
```

A auditoria deve validar:

- [ ] contas e perfis coerentes;
- [ ] vínculo correto entre usuário e colaborador;
- [ ] administradores coerentes com perfil de Inspetor;
- [ ] cobertura funcional do Banco de Questões;
- [ ] certificados coerentes com tentativas aprovadas;
- [ ] códigos de verificação coerentes;
- [ ] revogações coerentes;
- [ ] assinaturas registradas realmente existem no storage;
- [ ] arquivos de assinatura são PNG válidos e possuem tamanho aceitável.

## 8. Subida da API

Somente depois dos passos anteriores:

```text
npm start
```

Confirmar:

- [ ] `GET /health` responde;
- [ ] `GET /health/ready` permanece verde;
- [ ] API acessível pelo frontend de homologação;
- [ ] CORS e cookies funcionando via HTTPS.

## 9. Teste ponta a ponta

Testar, no mínimo, com um perfil **Inspetor** e um perfil **Operador**:

- [ ] login;
- [ ] primeiro acesso;
- [ ] troca de senha;
- [ ] logout;
- [ ] Equipe/Colaboradores;
- [ ] Cronograma;
- [ ] Banco de Questões;
- [ ] Provas;
- [ ] tentativas e correção server-side;
- [ ] assinatura;
- [ ] certificado e validação;
- [ ] Treinamentos;
- [ ] Simulador;
- [ ] Stress Test;
- [ ] Teste Rápido;
- [ ] Desafio Diário;
- [ ] Avaliação Prática;
- [ ] Ocorrências;
- [ ] Base de Conhecimento;
- [ ] Meu Perfil;
- [ ] auditoria administrativa.

## 10. Segurança e infraestrutura

A TI deve confirmar:

- [ ] MySQL não exposto diretamente ao navegador;
- [ ] API é a única camada que acessa o banco;
- [ ] credenciais e secrets fora do repositório;
- [ ] TLS validado;
- [ ] firewall/allowlist validado;
- [ ] usuário MySQL com privilégio mínimo;
- [ ] storage persistente com backup;
- [ ] logs e monitoramento definidos;
- [ ] política de backup e restauração definida;
- [ ] plano de rollback validado antes do cutover.

## 11. Critério final

O projeto só poderá receber o status:

**SEGEMPAT HOMOLOGADO NO MYSQL DA EMPRESA**

quando todos os itens obrigatórios acima estiverem aprovados no ambiente real de homologação e os testes ponta a ponta estiverem concluídos sem pendência crítica.
