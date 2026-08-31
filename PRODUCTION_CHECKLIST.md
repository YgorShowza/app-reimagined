# SEGEMPAT · Checklist de Produção

Use este documento antes de publicar uma nova versão do sistema.

## 1. Código e build

- [ ] `main` contém somente alterações homologadas.
- [ ] Lovable preview está em estado `ready` no mesmo commit do `main`.
- [ ] `bun install --frozen-lockfile` conclui sem alterar `bun.lock`.
- [ ] `bun run build` conclui sem erro.
- [ ] Dependências não utilizadas são removidas somente junto da atualização do lockfile.
- [ ] Nenhuma tela “Em breve” está exposta na navegação de produção.

## 2. Supabase e migrations

- [ ] Todas as mudanças de schema possuem migration versionada.
- [ ] A ordem das migrations funciona em instalação limpa.
- [ ] `supabase_migrations.schema_migrations` corresponde aos arquivos versionados.
- [ ] Backup realizado antes de migration destrutiva ou mudança ampla.
- [ ] Tabelas críticas possuem RLS habilitada.
- [ ] Políticas de Inspetor e Operador foram revisadas.
- [ ] Funções privilegiadas usam `SECURITY DEFINER` apenas quando necessário e têm `search_path` explícito.
- [ ] Nenhuma chave `service_role` está presente no frontend/repositório.

## 3. Autenticação e autorização

### Inspetor

- [ ] Login por matrícula funciona.
- [ ] Dashboard administrativo abre sem erro.
- [ ] Rotas administrativas estão acessíveis ao perfil autorizado.
- [ ] Auditoria é visível somente para Inspetor.

### Operador

- [ ] Login por matrícula funciona.
- [ ] Rotas administrativas redirecionam para o painel.
- [ ] Operador vê somente os próprios dados quando a regra exigir.
- [ ] Provas publicadas respeitam setor-alvo ou `Todos`.
- [ ] Ciclos, avaliações práticas e ocorrências respeitam RLS.

## 4. Cronograma

- [ ] Lista abre e agrupa corretamente por colaborador.
- [ ] Calendário abre o mês selecionado.
- [ ] Visão Ano apresenta 12 meses e percentuais corretos.
- [ ] Troca Lista → Calendário → Ano preserva o mês esperado.
- [ ] Novo registro funciona.
- [ ] Edição e exclusão funcionam.
- [ ] Lançamento em massa evita duplicidades.
- [ ] Gerador Anual evita duplicidades.
- [ ] Importação Excel apresenta prévia antes de gravar.
- [ ] Resultado importado atualiza Pendente → Realizado corretamente.
- [ ] Suspensões/ausências são refletidas no planejamento.
- [ ] Modelos recorrentes geram somente registros necessários.
- [ ] Avaliações práticas recorrentes respeitam setor e periodicidade.
- [ ] Sincronização após prova atualiza apenas colaborador/prova envolvidos.
- [ ] PDF mensal abre e pagina corretamente.
- [ ] Lista de presença PDF abre e pagina corretamente.
- [ ] Mobile mantém Lista/Calendário/Ano utilizáveis.

## 5. Provas e certificados

- [ ] Inspetor cria prova em rascunho.
- [ ] Prova publicada possui ao menos uma questão.
- [ ] Operador do setor correto enxerga a prova.
- [ ] Operador de outro setor não enxerga a prova.
- [ ] Correção calcula nota corretamente.
- [ ] Aprovação/reprovação respeita percentual mínimo.
- [ ] Tentativa gera código quando aprovada.
- [ ] Assinatura eletrônica funciona com mouse.
- [ ] Assinatura eletrônica funciona em touchscreen.
- [ ] Assinatura é armazenada no bucket privado `exam-signatures`.
- [ ] Operador não possui UPDATE genérico sobre `exam_attempts`.
- [ ] RPC `sign_exam_attempt` aceita somente a tentativa do próprio usuário.
- [ ] Certificado formal só é liberado após aprovação + assinatura.
- [ ] Código é validável pela Inspetoria.
- [ ] Evidência de assinatura abre somente por URL temporária.

## 6. Treinamento e gamificação

- [ ] Módulos ativos aparecem somente para público compatível.
- [ ] Teste Rápido carrega questões compatíveis com setor.
- [ ] Simulador carrega cenários compatíveis com setor/dificuldade.
- [ ] Stress Test usa setor real do colaborador.
- [ ] Desafio Diário permite uma execução por usuário/dia.
- [ ] Teste Rápido/Simulador/Stress Test podem ser repetidos, mas XP é concedido apenas na primeira conclusão do tipo no dia.
- [ ] XP é calculado no servidor.
- [ ] Nível é recalculado corretamente.
- [ ] Histórico aparece no Meu Perfil sem se misturar a certificados formais.

## 7. Ciclos e avaliações práticas

- [ ] Ciclo calcula vencimento a partir do último treinamento.
- [ ] Status `Em dia`, `Próximo ao vencimento` e `Vencido` é recalculado em tempo real.
- [ ] Não existem dois ciclos para o mesmo colaborador.
- [ ] Modelo de avaliação prática aceita tarefas/procedimentos.
- [ ] Avaliação prática concluída registra nota e evidências esperadas.

## 8. Ocorrências

- [ ] Operador consegue criar ocorrência própria.
- [ ] `created_by` é preenchido com usuário autenticado.
- [ ] Operador vê somente ocorrência própria/vinculada.
- [ ] Inspetor pode analisar, atualizar e concluir.
- [ ] Exclusão fica restrita à Inspetoria.

## 9. Relatórios e Analytics

- [ ] Dashboard não apresenta zeros falsos durante loading.
- [ ] Analytics diferencia erro de ausência de dados.
- [ ] Zona de Risco nunca interpreta erro de consulta como risco zero.
- [ ] Análise Individual trata ausência de equipe e falha de consulta separadamente.
- [ ] Relatório anual gera CSV apenas quando há dados setoriais.
- [ ] Relatório Mensal apresenta dados do período correto.
- [ ] Auditoria pagina listas grandes e usa fuso `America/Maceio`.

## 10. Integridade de dados

Resultado esperado: zero em todas as verificações abaixo.

- [ ] Duplicidades exatas no Cronograma.
- [ ] Cronograma com colaborador órfão.
- [ ] Tentativa com prova órfã.
- [ ] Ocorrência com colaborador órfão.
- [ ] Avaliação prática com colaborador órfão.
- [ ] Aprovação sem código de validação.
- [ ] Prova publicada sem questões.
- [ ] Assinatura marcada sem arquivo/data.
- [ ] Ciclo com janela de datas inválida.
- [ ] Módulo com nota mínima fora de 0–10.
- [ ] Módulo com ordem inferior a 1.
- [ ] Desafio Diário duplicado no mesmo dia.

## 11. Performance

- [ ] React Query mantém cache e evita refetch desnecessário.
- [ ] Relógio do cabeçalho não força re-render global do layout.
- [ ] Listas grandes possuem paginação ou limitação adequada.
- [ ] Consultas do Cronograma usam índices por mês/colaborador/setor/status.
- [ ] Conclusão de prova não faz varredura global do Cronograma.
- [ ] Bundle não carrega bibliotecas pesadas sem uso.
- [ ] Desktop e mobile permanecem responsivos com volume de dados.

Referência de stress já executada durante homologação: 12.000 lançamentos sintéticos em tabela temporária; consulta mensal de 1.000 registros usou índice e foi executada em aproximadamente 2,2 ms no PostgreSQL do ambiente testado.

## 12. Publicação

- [ ] Variáveis do Supabase configuradas no ambiente de deploy.
- [ ] `.env` versionado é removido somente depois de confirmar que o deploy injeta as variáveis corretamente.
- [ ] Domínio/URL final definidos.
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
