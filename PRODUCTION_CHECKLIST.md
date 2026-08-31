# SEGEMPAT · Checklist de Produção

Use este documento antes de publicar uma nova versão do sistema.

> **Legenda:** `[x]` = validado tecnicamente nesta homologação. `[ ]` = ainda exige validação manual, dispositivo real, deploy ou decisão operacional.

## 1. Código e build

- [x] `main` contém somente alterações homologadas nesta rodada técnica.
- [x] Lovable preview está em estado `ready` no mesmo commit do `main`.
- [ ] `bun install --frozen-lockfile` conclui sem alterar `bun.lock`.
- [ ] `bun run build` conclui sem erro fora do preview do Lovable.
- [ ] Dependências não utilizadas são removidas somente junto da atualização do lockfile.
- [x] Nenhuma tela “Em breve” está exposta na navegação de produção.

## 2. Supabase e migrations

- [x] Todas as mudanças recentes de schema possuem migration versionada.
- [x] A ordem das migrations foi revisada e a dependência de `training_activity_attempts` foi corrigida com migration-base anterior ao Desafio Diário.
- [x] `supabase_migrations.schema_migrations` corresponde às migrations recentes versionadas.
- [ ] Backup realizado antes de migration destrutiva ou mudança ampla.
- [x] Tabelas críticas possuem RLS habilitada.
- [x] Políticas de Inspetor e Operador foram revisadas.
- [x] Funções privilegiadas usam `SECURITY DEFINER` somente nos fluxos necessários e com `search_path` explícito.
- [x] Nenhuma chave `service_role` foi encontrada no frontend/repositório.

## 3. Autenticação e autorização

### Inspetor

- [ ] Login por matrícula validado manualmente no ambiente final.
- [ ] Dashboard administrativo validado manualmente em sessão real.
- [x] Rotas administrativas possuem proteção central por role `admin`.
- [x] Auditoria é protegida por rota e RLS para Inspetor/admin.

### Operador

- [ ] Login por matrícula validado manualmente com conta real de Operador.
- [x] Rotas administrativas redirecionam para o painel quando a role não é `admin`.
- [x] RLS restringe dados próprios quando a regra exigir.
- [x] Provas publicadas respeitam setor-alvo ou `Todos` no próprio banco.
- [x] Ciclos, avaliações práticas e ocorrências possuem RLS compatível com o perfil Operador.
- [x] Banco de Questões, Módulos e Conteúdos ativos respeitam `Todos` ou o setor do usuário na RLS.

## 4. Cronograma

- [ ] Lista validada manualmente com massa real de colaboradores.
- [ ] Calendário validado manualmente com troca de mês.
- [ ] Visão Ano validada manualmente com percentuais reais.
- [ ] Troca Lista → Calendário → Ano validada manualmente em sequência.
- [ ] Novo registro validado manualmente.
- [ ] Edição e exclusão validadas manualmente.
- [x] Banco possui índice único contra duplicidade exata.
- [ ] Lançamento em massa validado manualmente com prévia real.
- [ ] Gerador Anual validado manualmente com equipe real.
- [ ] Importação Excel validada com arquivo operacional real.
- [x] Fluxo de sincronização após prova foi reduzido para colaborador/prova envolvidos.
- [ ] Resultado importado Pendente → Realizado validado manualmente.
- [ ] Suspensões/ausências validadas manualmente no planejamento.
- [ ] Modelos recorrentes validados manualmente.
- [ ] Avaliações práticas recorrentes validadas manualmente.
- [ ] PDF mensal validado em navegador operacional.
- [ ] Lista de presença PDF validada em navegador operacional.
- [x] Layout mobile de Lista/Calendário/Ano foi refinado e recompilado no Lovable.

## 5. Provas e certificados

- [ ] Inspetor cria prova em rascunho em sessão real.
- [x] Auditoria de integridade encontrou zero provas publicadas sem questões.
- [x] RLS permite ao Operador somente prova publicada para `Todos` ou setor compatível.
- [x] Teste de RLS confirmou zero conteúdo de setor indevido em identidade não-admin simulada.
- [ ] Correção de prova validada manualmente com tentativa real.
- [ ] Aprovação/reprovação validada manualmente contra percentual mínimo.
- [x] Trigger gera código único quando a tentativa é aprovada.
- [ ] Assinatura eletrônica validada manualmente com mouse.
- [ ] Assinatura eletrônica validada manualmente em touchscreen.
- [x] Bucket `exam-signatures` é privado, limitado a PNG e 512 KB.
- [x] Operador não possui UPDATE genérico sobre `exam_attempts`.
- [x] RPC `sign_exam_attempt` só altera tentativa pertencente ao usuário autenticado.
- [x] Interface só libera certificado formal após aprovação + assinatura.
- [ ] Código validado manualmente pela Inspetoria em fluxo ponta a ponta.
- [x] Evidência de assinatura usa URL temporária, sem tornar o bucket público.

## 6. Treinamento e gamificação

- [x] Módulos ativos são restringidos por setor/`Todos` na RLS.
- [x] Banco possui questões ativas para Simulador e treinamento dinâmico.
- [ ] Teste Rápido validado manualmente em sessão real de Operador.
- [ ] Simulador validado manualmente em sessão real de Operador.
- [x] Stress Test usa setor operacional real do colaborador no código.
- [x] Desafio Diário possui índice único por usuário/tipo/dia.
- [x] Teste Rápido/Simulador/Stress Test concedem XP apenas na primeira conclusão do tipo no dia.
- [x] XP é calculado no servidor por RPC `SECURITY DEFINER`.
- [x] Nível é recalculado no servidor conforme faixas de pontos.
- [x] Atividades são persistidas separadamente de `exam_attempts`, sem gerar certificado formal.

## 7. Ciclos e avaliações práticas

- [x] Ciclo calcula status a partir das datas atuais, sem depender apenas do texto salvo.
- [x] Status `Em dia`, `Próximo ao vencimento` e `Vencido` é recalculado em leitura.
- [x] Existe unicidade de ciclo por colaborador e a auditoria encontrou zero duplicidades.
- [x] Modelo de avaliação prática possui estrutura para tarefas/procedimentos, nota mínima, setor e recorrência.
- [ ] Avaliação prática concluída validada manualmente com evidências reais.

## 8. Ocorrências

- [ ] Operador cria ocorrência em sessão real.
- [x] Camada de dados preenche `created_by` com o usuário autenticado.
- [x] RLS limita Operador a ocorrência própria/vinculada.
- [x] UPDATE administrativo fica restrito à Inspetoria/admin.
- [x] DELETE administrativo fica restrito à Inspetoria/admin.

## 9. Relatórios e Analytics

- [x] Dashboard não apresenta zeros falsos durante loading.
- [x] Analytics diferencia erro de ausência de dados e não depende mais de Recharts para renderização.
- [x] Zona de Risco não interpreta erro de consulta como risco zero.
- [x] Análise Individual separa ausência de equipe de falha de consulta.
- [x] Relatório anual bloqueia exportação CSV quando não há dados setoriais.
- [ ] Relatório Mensal validado manualmente com dados de período real.
- [x] Auditoria pagina 50 registros por página e usa fuso `America/Maceio`.

## 10. Integridade de dados

Resultado obtido na última bateria: **zero problemas em todas as verificações abaixo**.

- [x] Duplicidades exatas no Cronograma.
- [x] Cronograma com colaborador órfão.
- [x] Tentativa com prova órfã.
- [x] Ocorrência com colaborador órfão.
- [x] Avaliação prática com colaborador órfão.
- [x] Aprovação sem código de validação.
- [x] Prova publicada sem questões.
- [x] Assinatura marcada sem arquivo/data.
- [x] Ciclo com janela de datas inválida.
- [x] Módulo com nota mínima fora de 0–10.
- [x] Módulo com ordem inferior a 1.
- [x] Desafio Diário duplicado no mesmo dia.

## 11. Performance

- [x] React Query possui cache e evita refetch desnecessário ao retornar para a aba.
- [x] Relógio do cabeçalho está isolado em componente próprio.
- [x] Auditoria e Banco de Questões possuem paginação/limitação adequada.
- [x] Consultas do Cronograma possuem índices por mês, colaborador, setor e status.
- [x] Conclusão de prova não faz mais varredura global do Cronograma.
- [ ] Dependências mortas do `package.json`/`bun.lock` removidas em operação controlada.
- [ ] Responsividade final validada manualmente com massa de dados em dispositivos reais.

Referência de stress executada durante homologação: **12.000 lançamentos sintéticos** em tabela temporária; consulta mensal de 1.000 registros usou índice e foi executada em aproximadamente **2,2 ms** no PostgreSQL do ambiente testado.

## 12. Publicação

- [ ] Variáveis do Supabase configuradas no ambiente de deploy.
- [ ] `.env` versionado removido somente após confirmar injeção correta das variáveis no deploy.
- [ ] Domínio/URL final definido.
- [ ] URLs permitidas de autenticação do Supabase configuradas para produção.
- [ ] Backup pré-publicação concluído.
- [ ] Conta de teste Inspetor validada no domínio final.
- [ ] Conta de teste Operador validada no domínio final.
- [ ] Teste em desktop concluído.
- [ ] Teste em Android concluído.
- [ ] Teste em iPhone/iOS concluído quando aplicável.
- [ ] Impressão/PDF validada no navegador usado pela operação.

## 13. Pendência de infraestrutura conhecida

- [ ] Definir se haverá restrição por IP/VPN.

**Importante:** filtro de IP/VPN não está implementado atualmente. Não tratar esse controle como ativo até existir validação real no backend/rede.

## 14. Rollback

Antes da publicação, registrar:

- commit estável anterior;
- commit publicado;
- backup do banco;
- migrations novas da versão;
- procedimento para retornar o frontend ao commit anterior;
- procedimento para desfazer migration quando tecnicamente seguro.
