# SEGEMPAT · Checklist de Produção

> `[x]` = comprovado tecnicamente. `[ ]` = ainda exige sessão/dispositivo real, deploy final ou decisão operacional.

## 1. Código e build
- [x] `main` compila com `bun install --frozen-lockfile`.
- [x] `bun run build` passa no CI de produção.
- [x] Lovable sincroniza o `main` e permanece `ready` nos commits homologados.
- [x] `recharts` removido; `bun.lock` regenerado e validado.
- [x] `jspdf` isolado como client-only para não quebrar SSR.
- [x] Tela global de erro está em português e com identidade SEGEMPAT.
- [x] Nenhuma tela “Em breve” está exposta na navegação de produção.

## 2. Supabase e migrations
- [x] Todas as mudanças de schema recentes possuem migration versionada.
- [x] Ordem-base de `training_activity_attempts` foi corrigida para instalações limpas.
- [x] Migrations recentes usam timestamps únicos.
- [ ] Executar o runner oficial de migrations no deploy final e confirmar que `supabase_migrations.schema_migrations` registrou também as migrations aplicadas antecipadamente no ambiente conectado, incluindo `20260901143000_atomic_cronograma_bulk_create.sql`.
- [ ] Realizar backup imediatamente antes do deploy/migration final.
- [x] Todas as tabelas públicas auditadas possuem RLS habilitada.
- [x] `anon` não possui acesso direto às tabelas operacionais.
- [x] Grants de `authenticated` foram reduzidos ao necessário.
- [x] RPCs privilegiadas usam `SECURITY DEFINER` com `search_path` explícito quando necessário.
- [x] RPCs operacionais sensíveis não são executáveis por `anon`.
- [x] Nenhuma chave `service_role` foi encontrada no frontend/repositório.

## 3. Autenticação e autorização
### Inspetor
- [ ] Login por matrícula validado manualmente no domínio final.
- [ ] Dashboard validado manualmente em sessão real.
- [x] Rotas administrativas são protegidas por role `admin`.
- [x] Auditoria é restrita por rota + RLS.
- [x] Colaborador `Ativo + Inspetor` com conta vinculada recebe role administrativa.
- [x] Mudança para Operacional/Inativo remove role administrativa funcional.
- [x] Matrícula `000` foi reconciliada como Inspetor/admin; conta técnica `970` foi preservada.

### Operador
- [ ] Login validado manualmente com conta real de Operador.
- [x] Rotas administrativas bloqueiam não-admin antes de renderizar.
- [x] Usuário comum sem colaborador ativo é bloqueado na sessão e no banco.
- [x] Dados próprios/setoriais possuem RLS compatível com o perfil.
- [x] Provas, Banco de Questões, Módulos e Conteúdos respeitam setor/`Todos` no banco.

### Primeiro acesso
- [x] Só matrícula de colaborador ativo pode ativar conta.
- [x] Exige código de ativação de 8 dígitos emitido pela Inspetoria.
- [x] Código expira em 24h e é de uso único.
- [x] Novos códigos usam hash adaptativo bcrypt com salt; nenhum código é armazenado em texto puro.
- [x] Geração usa RNG criptográfico.
- [x] Geração/revogação é bloqueada para não-admin.
- [x] Fluxo completo de ativação foi testado de forma transacional e sem resíduos.
- [x] `profiles` e `user_roles` são somente leitura para o cliente.
- [x] Matrícula vinculada não pode ser alterada diretamente; colaborador com conta deve ser inativado, não excluído.
- [ ] Primeiro acesso completo validado manualmente com um Operador real.

## 4. Cronograma
- [x] Lista, Calendário e Ano usam a mesma base de dados e lógica homologada.
- [x] Índice único bloqueia duplicidade exata.
- [x] Teste transacional validou criação, duplicidade, atualização para Realizado, resumo anual, modelo recorrente e suspensão, com zero resíduos.
- [x] `Novo Registro` abre o formulário existente via `/cronograma-gestao?novo=true`, sem duplicar CRUD.
- [x] Importação Excel usa RPC atômica e valida matrícula operacional ativa, mês, data e nota.
- [x] Teste transacional da importação validou `updated=1`, `created=1`, `ignored=1`, com zero resíduos.
- [x] Gerador Anual usa criação atômica server-side; não salva mais blocos parciais.
- [x] Teste de atomicidade confirmou que lote com linha inválida não persiste linhas anteriores.
- [x] Consulta de escala foi testada com 12.000 lançamentos sintéticos; consulta mensal indexada de 1.000 registros ~2,2 ms no banco testado.
- [x] PDFs do Cronograma são client-only, paginados, repetem cabeçalho e rodapé.
- [x] Lista de presença bloqueia exportação sem lançamentos.
- [ ] Lista/Calendário/Ano validados visualmente com massa operacional real.
- [ ] Edição/exclusão validadas manualmente em sessão real.
- [ ] Importação validada com arquivo Excel operacional real.
- [ ] Gerador Anual validado visualmente com equipe real.
- [ ] PDF e Lista de Presença conferidos/impressos no navegador operacional.

## 5. Provas, assinatura e certificados
- [x] Nota e aprovação são calculadas no servidor por `submit_exam_attempt`; INSERT direto em `exam_attempts` é bloqueado.
- [x] Operador recebe prova sanitizada sem `correct_index`/`model_answer`.
- [x] Coluna `questions` de `exams` não possui SELECT para `authenticated`; metadados seguros possuem grant por coluna.
- [x] Inspetor acessa prova completa por RPC administrativa.
- [x] Prova publicada respeita setor/`Todos` no banco.
- [x] Homologação E2E transacional passou: prova → correção server-side → aprovação → assinatura → certificado formal → validação; zero resíduos.
- [x] Certificado formal só existe/é válido após aprovação + assinatura completa.
- [x] Fluxo legado de `certificates/validate_certificate` foi alinhado à mesma regra e não é público.
- [x] Bucket `exam-signatures` é privado, PNG, 512 KB e vinculado ao usuário ativo.
- [x] Assinatura só altera tentativa do próprio usuário e exige arquivo no diretório correto.
- [ ] Criar/realizar prova manualmente com Inspetor + Operador reais.
- [ ] Assinatura validada com mouse.
- [ ] Assinatura validada em touchscreen.
- [ ] Certificado/PDF conferido visualmente e impresso.

## 6. Treinamento e gamificação
- [x] Banco operacional é entregue por RPC sanitizada; `correct_index/correct_answer` não chegam ao Operador.
- [x] `question_bank` não possui SELECT direto para `authenticated`/`anon`.
- [x] Score de Teste Rápido, Desafio Diário, Simulador e Stress Test é recalculado no servidor.
- [x] IDs, setor, tipo, dificuldade e quantidade esperada são validados pelo servidor.
- [x] Teste Rápido/Simulador/Stress concedem XP apenas na primeira conclusão do tipo no dia.
- [x] Desafio Diário permite uma execução por dia.
- [x] Homologação transacional dos quatro modos passou, inclusive tentativa de forjar `p_score=10`; servidor registrou a nota real. Zero resíduos.
- [x] Simulador, Stress Test e Desafio Diário possuem loading, erro inicial e retry.
- [ ] Os quatro modos validados manualmente em sessão real de Operador.

## 7. Ciclos, avaliação prática e ocorrências
- [x] Ciclos recalculam status a partir das datas atuais.
- [x] Unicidade de ciclo e janelas inválidas foram auditadas.
- [x] Avaliação prática possui RLS por perfil e estrutura de tarefas/nota/recorrência.
- [x] Ocorrências preenchem `created_by` e restringem Operador a registros próprios/vinculados.
- [ ] Avaliação prática concluída com evidência real.
- [ ] Ocorrência criada por Operador real.

## 8. Relatórios, auditoria e performance
- [x] Dashboard não exibe zeros falsos durante loading.
- [x] Analytics e Zona de Risco distinguem erro de ausência de dados.
- [x] Análise Individual trata falha de consulta separadamente.
- [x] Auditoria pagina 50 registros e usa `America/Maceio`.
- [x] Banco de Questões possui paginação.
- [x] React Query usa cache e reduz refetch desnecessário.
- [x] Índices críticos de Cronograma, tentativas, auditoria, ocorrências e avaliações foram revisados.
- [ ] Relatório Mensal validado com massa real.

## 9. Tema, responsividade e experiência
- [x] Tema sincroniza `data-theme`, `.dark` e `color-scheme`.
- [x] Modo Auto reage à preferência do sistema.
- [x] Tema é aplicado antes do primeiro paint.
- [x] Hero escuro usa texto explicitamente claro, evitando desaparecimento no tema claro.
- [x] Sidebar desktop, drawer mobile e navegação do Operador usam shell responsivo.
- [x] Cronograma Lista/Calendário/Ano recebeu tratamento mobile.
- [ ] Varredura visual final Claro ↔ Escuro em todas as telas com sessão autenticada real.
- [ ] Desktop real validado.
- [ ] Android real validado.
- [ ] iPhone/iOS real validado quando aplicável.

## 10. Integridade de dados
Últimas baterias: **zero inconsistências conhecidas** em duplicidade exata do Cronograma, vínculos órfãos, aprovação sem código, prova publicada vazia, assinatura incompleta marcada como formal, ciclo inválido, módulo com nota/ordem inválida e Desafio Diário duplicado.

## 11. Publicação
- [ ] Variáveis Supabase configuradas no ambiente final.
- [ ] Remover `.env` versionado somente após confirmar injeção de variáveis no deploy.
- [ ] Domínio/URL final definido.
- [ ] URLs permitidas do Supabase Auth configuradas para produção.
- [ ] Runner oficial de migrations executado e histórico conferido.
- [ ] Backup pré-publicação concluído.
- [ ] Conta Inspetor testada no domínio final.
- [ ] Conta Operador testada no domínio final.
- [ ] PDFs/impressão validados no navegador usado pela operação.

## 12. Infraestrutura
- [ ] Definir se haverá restrição por IP/VPN.

**Importante:** IP/VPN ainda não é um controle ativo e não deve ser apresentado como implementado.

## 13. Rollback
Antes da publicação registrar: commit estável anterior, commit publicado, backup do banco, migrations da versão e procedimento de rollback do frontend/schema quando tecnicamente seguro.
