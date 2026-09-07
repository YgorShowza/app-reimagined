# SEGEMPAT — Checklist de Homologação Corporativa

Este documento organiza a sequência oficial para a TI e a gestão concluírem a homologação do SEGEMPAT no MySQL corporativo.

## Status atual

**PARTE DO MYSQL NO CÓDIGO CONCLUÍDA — PRONTO PARA CONECTAR AO BANCO DA EMPRESA.**

A homologação só termina depois dos testes no ambiente real da empresa.

## 1. Entrada da TI

Usar `MYSQL_TI_INPUTS.md` como formulário oficial.

- [ ] versão exata do MySQL 8.x;
- [ ] host/IP e porta;
- [ ] database;
- [ ] usuário da aplicação com privilégio mínimo;
- [ ] senha cadastrada somente como secret;
- [ ] TLS disponível e habilitado para a conexão da API (`NODE_ENV=production` exige TLS);
- [ ] CA corporativa e caminho absoluto, se exigidos;
- [ ] firewall/VPN/allowlist;
- [ ] host/URL HTTPS da API;
- [ ] storage persistente e política de backup;
- [ ] URLs HTTPS exatas do frontend.

Se o MySQL não disponibilizar TLS para a API, **parar a homologação** até a TI definir solução compatível.

## 2. Configuração mínima da API

Usar `server/.env.example` somente como modelo.

- [ ] `NODE_ENV=production`;
- [ ] conexão MySQL real;
- [ ] `MYSQL_SSL=true`;
- [ ] CA absoluta quando aplicável;
- [ ] segredo de sessão aleatório com 32+ bytes;
- [ ] cookie `Secure=true`;
- [ ] CORS somente para origens HTTPS explícitas;
- [ ] storage `filesystem` em caminho absoluto persistente;
- [ ] timezone funcional validado.

## 3. Gate 1 — Preflight

```text
npm ci
npm run preflight
```

- [ ] conexão real com o MySQL;
- [ ] MySQL 8+;
- [ ] database correto;
- [ ] sessão UTC;
- [ ] SQL estrito;
- [ ] `utf8mb4`;
- [ ] InnoDB;
- [ ] `FOREIGN_KEY_CHECKS=1`;
- [ ] TLS realmente negociado;
- [ ] storage permite criar/ler/remover arquivo de teste.

Se falhar, **não executar migrations**.

## 4. Gate 2 — Migration e baseline

```text
npm run migrate
```

- [ ] migrations sem erro;
- [ ] histórico/checksums coerentes;
- [ ] nenhuma migration aplicada foi alterada;
- [ ] nenhuma lacuna de versão;
- [ ] baseline legado compatível quando existir estrutura prévia;
- [ ] tabelas/colunas/tipos/defaults compatíveis;
- [ ] PKs, índices e UNIQUE compatíveis;
- [ ] colunas geradas e `CHECK constraints` compatíveis;
- [ ] ausência de triggers/FKs extras não declarados;
- [ ] ausência de órfãos.

Qualquer divergência deve bloquear a continuidade.

## 5. Gate 3 — Smoke estrutural

```text
npm run smoke
```

- [ ] tabelas essenciais presentes;
- [ ] InnoDB preservado;
- [ ] `utf8mb4` preservado;
- [ ] FKs e UNIQUE críticos presentes;
- [ ] `FOREIGN_KEY_CHECKS=1`;
- [ ] UTC e SQL estrito ativos;
- [ ] migrations 003/004/005 da Avaliação Prática auditadas;
- [ ] colunas, índices, FK, trigger de histórico e nota mínima da Avaliação Prática coerentes;
- [ ] geração recorrente sem slots duplicados ou vínculo incompleto com Cronograma.

## 6. Migração de dados e evidências

- [ ] definir fonte oficial;
- [ ] preservar UUIDs e matrículas;
- [ ] preservar vínculos usuário/colaborador;
- [ ] preservar provas, tentativas e certificados;
- [ ] preservar modelos e avaliações práticas recorrentes;
- [ ] preservar os marcadores `[PRACTICAL:<id>]` de vínculo com o Cronograma quando houver histórico gerado;
- [ ] copiar assinaturas/evidências para storage corporativo;
- [ ] registrar contagens antes/depois;
- [ ] validar amostras históricas e funcionais.

## 7. Gate 4 — Auditoria pós-carga

```text
npm run cutover:audit
```

- [ ] contas e perfis coerentes;
- [ ] vínculos usuário/colaborador corretos;
- [ ] Inspetores/admin coerentes;
- [ ] Banco de Questões consistente;
- [ ] certificados coerentes com tentativas;
- [ ] códigos/revogações coerentes;
- [ ] assinaturas registradas existem no storage;
- [ ] arquivos de assinatura válidos;
- [ ] cada avaliação prática gerada por modelo possui data operacional;
- [ ] cada avaliação prática recorrente possui exatamente um vínculo correspondente no Cronograma;
- [ ] colaborador, tema e data da avaliação prática coincidem com o lançamento do Cronograma;
- [ ] nenhum marcador `[PRACTICAL:<id>]` órfão permanece no Cronograma.

## 8. Primeiro Inspetor, se necessário

Somente depois de schema e auditorias aprovados:

```text
npm run bootstrap-admin
```

- [ ] credencial temporária tratada como secret;
- [ ] troca de senha no primeiro acesso.

## 9. Subida da API

```text
npm start
```

Ou runtime corporativo preparado em Docker/systemd.

- [ ] `GET /health` responde;
- [ ] `GET /health/ready` permanece verde;
- [ ] `/health/ready` confirma o histórico **completo** de migrations, não apenas a última versão;
- [ ] alterar/remover/adicionar indevidamente uma linha de `schema_migrations` faz o readiness ficar indisponível;
- [ ] checksum divergente de qualquer migration faz o readiness ficar indisponível;
- [ ] HTTPS válido no proxy;
- [ ] API acessível somente conforme rede prevista.

## 10. Cutover do frontend

No build corporativo:

```text
VITE_SEGEMPAT_API_URL=<URL HTTPS DA API>
VITE_SEGEMPAT_REQUIRE_API=true
```

- [ ] API URL é HTTPS absoluta;
- [ ] `VITE_SEGEMPAT_REQUIRE_API=true` habilitado;
- [ ] `SEGEMPAT_ALLOWED_ORIGINS` contém somente as origens HTTPS exatas;
- [ ] login e cookies funcionam via HTTPS;
- [ ] ausência da API não causa fallback silencioso para backend legado.

## 11. Teste ponta a ponta

Executar com **Inspetor** e **Operador**:

- [ ] login/logout;
- [ ] primeiro acesso e troca de senha;
- [ ] Equipe/Colaboradores;
- [ ] Cronograma;
- [ ] Banco de Questões;
- [ ] Provas/tentativas/correção server-side;
- [ ] assinatura/evidências;
- [ ] certificados;
- [ ] Treinamentos;
- [ ] Simulador;
- [ ] Stress Test;
- [ ] Teste Rápido;
- [ ] Desafio Diário;
- [ ] Avaliação Prática manual;
- [ ] criação de modelo de Avaliação Prática;
- [ ] geração recorrente de Avaliação Prática;
- [ ] repetição da geração sem duplicar o mesmo slot;
- [ ] suspensão do Cronograma respeitada pela geração recorrente;
- [ ] vínculo gerado aparece corretamente no Cronograma e nos indicadores;
- [ ] histórico formalizado não é removido por exclusão indevida da avaliação;
- [ ] Ocorrências;
- [ ] Base de Conhecimento;
- [ ] Meu Perfil;
- [ ] Auditoria administrativa.

## 12. Segurança, operação e rollback

- [ ] MySQL não exposto ao navegador;
- [ ] API é a única camada de acesso ao banco;
- [ ] secrets fora do repositório;
- [ ] TLS validado ponta a ponta;
- [ ] firewall/allowlist validado;
- [ ] usuário MySQL com privilégio mínimo;
- [ ] storage persistente com backup;
- [ ] logs/monitoramento definidos;
- [ ] backup/restauração testados conforme política da TI;
- [ ] rollback definido antes do cutover;
- [ ] commit exato implantado registrado como evidência.

## 13. Ordem oficial resumida

```text
TI inputs
  -> configurar secrets/rede/storage
  -> npm ci
  -> preflight
  -> migrate
  -> smoke
  -> migrar dados/evidências
  -> cutover:audit
  -> bootstrap-admin (se necessário)
  -> subir API
  -> /health/ready verde e histórico completo de migrations íntegro
  -> frontend REQUIRE_API=true
  -> E2E Inspetor + Operador
  -> aceite/rollback
```

## 14. Critério final

Somente quando todos os itens obrigatórios estiverem aprovados no ambiente real:

**SEGEMPAT HOMOLOGADO NO MYSQL DA EMPRESA**
