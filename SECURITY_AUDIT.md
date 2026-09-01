# SEGEMPAT · Auditoria de Segurança

Atualizado em 01/09/2026.

## Controles validados

- Rotas administrativas protegidas por role `admin` antes de renderizar.
- RLS ativa nas tabelas públicas críticas.
- `anon` não possui acesso direto às tabelas públicas operacionais do SEGEMPAT.
- Grants de `authenticated` foram reduzidos ao mínimo necessário; privilégios como `TRUNCATE`, `TRIGGER` e `REFERENCES` foram removidos do cliente.
- `user_roles` e `profiles` são somente leitura para o cliente autenticado.
- Não existe grant automático de `admin` baseado apenas em matrícula informada pelo usuário.
- A role administrativa é sincronizada com colaborador real `Ativo + Inspetor` e removida quando o vínculo deixa de atender à regra.
- Novos usuários só podem ser criados quando a matrícula corresponde a colaborador `Ativo` em `employees`.
- O nome do perfil é obtido do cadastro funcional, não do texto informado pelo usuário.
- `profiles.matricula` é UNIQUE, impedindo duas contas para a mesma matrícula.
- Primeiro acesso exige código de ativação de uso único emitido pela Inspetoria.
- Código de ativação possui 8 dígitos, validade de 24 horas e novos códigos são armazenados com bcrypt/pgcrypto e salt individual.
- Compatibilidade com SHA-256 existe somente para códigos antigos ainda válidos; na migração não havia código legado pendente.
- A geração do código usa `gen_random_bytes()`/pgcrypto.
- A geração/revogação do código usa RPC `SECURITY DEFINER` restrita a `admin`.
- O `handle_new_user` exige matrícula ativa + código válido, não utilizado e não expirado.
- O código é consumido na mesma transação em que o perfil é criado.
- Colaborador inativo é bloqueado no guard autenticado e na RLS/API dos fluxos operacionais.
- Matrícula de colaborador com conta ou histórico operacional não pode ser alterada diretamente.
- Colaborador com conta ou histórico operacional não pode ser excluído; deve ser inativado para preservar histórico.

## Provas e certificados

- A correção da prova e a definição oficial de `score`/`passed` são feitas no banco pela RPC `submit_exam_attempt`.
- O papel `authenticated` não possui privilégio de `INSERT` direto em `exam_attempts`.
- `submit_exam_attempt` valida usuário ativo, prova publicada, setor autorizado e calcula a nota usando a chave armazenada somente no banco.
- A coluna `questions` da tabela `exams` não possui `SELECT` direto para `authenticated`.
- Leituras auxiliares recebem apenas colunas seguras de metadados; o JSON de questões/gabarito não é exposto por SELECT direto.
- A listagem operacional usa `list_available_exams()` e recebe somente metadados + quantidade de questões.
- A realização da prova usa `get_exam_for_attempt()`; as questões chegam sem `correct_index` e sem `model_answer`.
- O Inspetor lê provas completas somente pelas RPCs administrativas `list_exams_admin()` e `get_exam_admin()`.
- A tela de prova não faz correção local nem mostra gabarito; exibe o resultado oficial retornado pelo servidor.
- `sign_exam_attempt` exige colaborador ativo, tentativa do próprio usuário e caminho dentro do diretório do próprio `auth.uid()`.
- A assinatura só é formalizada se existir objeto real no bucket privado `exam-signatures`, com o caminho e proprietário esperados.
- Storage de assinatura permanece privado, restrito a PNG e com limite de tamanho já configurado.
- Certificado formal exige aprovação + `signature_agreed=true` + arquivo de assinatura + `signed_at`.
- O trigger legado `issue_certificate_after_attempt` foi alinhado à mesma regra; aprovação sem assinatura não gera certificado formal.
- `validate_certificate` é restrita à Inspetoria/admin e só valida tentativa aprovada e formalmente assinada.
- Registros legados eventualmente emitidos sem assinatura são preservados para auditoria, porém revogados.
- Auditoria após a migração encontrou zero certificados ativos inconsistentes.

## Banco de Questões, treinamento e XP

- O Operador não possui acesso direto às colunas de gabarito do `question_bank`.
- O Inspetor lê o banco completo somente pela RPC administrativa `list_question_bank_admin()`.
- Atividades operacionais usam `list_operational_questions()`, que omite `correct_index`, `correct_answer` e `explanation`.
- Teste Rápido, Desafio Diário, Simulador e Stress Test não recebem gabarito no navegador.
- Simulador e Stress Test não revelam certo/errado e explicação antes da conclusão; a resposta é apenas registrada e corrigida no servidor.
- `submit_training_activity` ignora `p_score` do cliente e recalcula nota, aprovação e acertos a partir de `question_bank`.
- A RPC valida IDs, quantidade de questões, estado ativo, setor, tipo de banco e dificuldade quando aplicável.
- O tipo genérico `Treinamento` não é aceito pela RPC de gamificação enquanto não houver fluxo específico verificável.
- Teste Rápido, Simulador e Stress Test concedem XP somente na primeira conclusão recompensada do tipo no dia.
- Desafio Diário possui proteção de uma execução por usuário/dia.

## Funções privilegiadas e superfície de ataque

- Todas as funções `SECURITY DEFINER` auditadas ficaram sem `EXECUTE` para `anon`.
- Helpers usados em RLS/RPC (`has_role`, `is_current_employee`, `is_active_employee_user`, `current_employee_sector`) são executáveis somente por `authenticated` quando necessário.
- Funções exclusivas de trigger (`audit_row_change`, `issue_certificate_from_attempt`, `protect_linked_employee_identity`, `sync_employee_access_role`, `handle_new_user` e helpers de trigger presentes) não são executáveis diretamente pelo cliente autenticado.
- RPCs operacionais e administrativas mantêm validações internas mesmo quando o papel `authenticated` possui `EXECUTE`.
- Nenhuma chave `service_role`, senha de banco ou segredo de servidor foi encontrada no frontend/repositório. O `.env` versionado contém somente URL/ID e chave publishable do Supabase.

## Hardening aplicado nesta homologação

1. Removido auto-admin por matrícula informada pelo cliente.
2. Primeiro acesso limitado a colaborador ativo e código temporário de uso único.
3. `profiles`/`user_roles` tornados somente leitura para o cliente.
4. Códigos de ativação migrados para RNG criptográfico + bcrypt com salt.
5. Ciclo de vida da role administrativa sincronizado ao cadastro funcional.
6. Usuário inativo bloqueado no frontend, RLS, RPCs e Storage.
7. Identidade funcional vinculada protegida contra alteração de matrícula/exclusão direta.
8. Correção de provas movida integralmente para o servidor.
9. INSERT direto de tentativas removido.
10. Entrega das provas separada em RPC administrativa completa e RPC operacional sanitizada.
11. Acesso à coluna `questions` de `exams` removido do cliente autenticado; apenas metadados seguros podem ser lidos diretamente quando necessários a telas auxiliares.
12. Assinatura passou a exigir arquivo real existente no Storage privado.
13. Certificado legado alinhado à regra formal de aprovação + assinatura.
14. Grants de tabelas reduzidos por princípio de menor privilégio; `anon` removido.
15. `EXECUTE` de funções `SECURITY DEFINER` endurecido; `anon` removido.
16. Correção e XP das atividades rápidas movidos para o servidor.
17. Entrega do Banco de Questões separada em RPC administrativa completa e RPC operacional sanitizada.
18. Chaves de correção do Banco de Questões removidas da entrega operacional.
19. Criação/importação em massa do Cronograma protegidas por RPCs atômicas com validação server-side.

## Testes técnicos executados

- código de ativação: validade, uso único, RNG criptográfico, bcrypt e bloqueio para não-admin;
- zero código legado válido pendente no momento da migração para bcrypt;
- homologação transacional de prova com rollback: prova publicada sintética, duas questões, nota oficial `5.0` calculada pelo servidor, aprovação a 50%, sincronização do Cronograma para `Realizado`, assinatura vinculada a objeto real do Storage, emissão de um certificado formal e validação administrativa positiva;
- rollback da homologação de prova: zero prova, Cronograma, certificado ou objeto de assinatura fictício residual;
- homologação transacional da gamificação com rollback: Teste Rápido nota `8.0` e +10 XP; repetição no mesmo dia nota `10.0` e 0 XP; Simulador nota `7.5` e +20 XP; Stress Test nota `8.0` e +25 XP; Desafio Diário nota `6.7` e +15 XP; segunda tentativa do Desafio Diário bloqueada;
- homologação atômica do Cronograma com rollback: 2 lançamentos criados em lote, importação atualizou 1 pendente para `Realizado`, duplicado no arquivo foi ignorado e lote contendo linha inválida falhou com zero criação parcial;
- `authenticated` confirmado sem acesso à coluna `questions` de `exams` e sem acesso às chaves de correção do `question_bank`;
- `authenticated` confirmado sem `INSERT` direto em `exam_attempts`;
- `anon` confirmado sem `EXECUTE` nas funções `SECURITY DEFINER` auditadas;
- zero certificados ativos inconsistentes após formalização documental;
- bateria de integridade: zero aprovação sem código, zero assinatura marcada sem evidência, zero prova publicada sem questões, zero módulo com nota/ordem inválida, zero ciclo com janela inválida e zero Desafio Diário duplicado.

## Estado das migrations recentes

As migrations recentes de hardening estão versionadas no GitHub, aplicadas/validadas no banco conectado e o histórico de `supabase_migrations.schema_migrations` foi confrontado com o schema durante a homologação. A única versão comprovadamente aplicada ao schema e ausente do histórico (`20260901180000_protect_employee_operational_history.sql`) foi reconciliada após comparação integral da função e dos privilégios.

Principais migrations de hardening/consistência:

- `20260901012000_activation_code_adaptive_hash.sql`
- `20260901013000_server_side_exam_grading.sql`
- `20260901014000_least_privilege_table_grants.sql`
- `20260901015000_server_side_training_grading.sql`
- `20260901020000_secure_exam_delivery.sql`
- `20260901021000_lock_exam_answer_keys.sql`
- `20260901022000_certificate_formalization_guard.sql`
- `20260901022500_fix_certificate_trigger_signature.sql`
- `20260901023000_function_execute_hardening.sql`
- `20260901024000_signature_storage_guard.sql`
- `20260901025000_secure_question_delivery.sql`
- `20260901026000_lock_question_bank_answer_keys.sql`
- `20260901030000_atomic_cronograma_import.sql`
- `20260901031000_admin_exam_question_crud_rpcs.sql`
- `20260901032000_admin_only_exam_table_select.sql`
- `20260901033000_server_side_cronograma_exam_sync.sql`
- `20260901036000_safe_exam_metadata_columns.sql`
- `20260901143000_atomic_cronograma_bulk_create.sql`
- `20260901144000_validate_cronograma_question_links.sql`
- `20260901180000_protect_employee_operational_history.sql`

## Pendências de segurança/produção fora da aplicação

- decidir se a operação exigirá restrição por IP/VPN;
- validar URLs finais de autenticação no Supabase antes da publicação;
- executar backup pré-publicação;
- validar primeiro acesso, inativação e recuperação operacional com contas reais no domínio final;
- validar assinatura real em touchscreen e abertura da evidência no navegador operacional;
- executar a homologação final com uma conta real de Operador (o ambiente atual ainda não possui perfil Operador autenticado para teste ponta a ponta).
