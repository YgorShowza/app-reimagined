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
- Matrícula de colaborador com conta vinculada não pode ser alterada diretamente.
- Colaborador com conta vinculada não pode ser excluído; deve ser inativado para preservar histórico.

## Provas e certificados

- A correção da prova e a definição oficial de `score`/`passed` são feitas no banco pela RPC `submit_exam_attempt`.
- O papel `authenticated` não possui privilégio de `INSERT` direto em `exam_attempts`.
- `submit_exam_attempt` valida usuário ativo, prova publicada, setor autorizado e calcula a nota usando a chave armazenada somente no banco.
- O Operador não possui `SELECT` direto na tabela `exams`.
- A listagem operacional usa `list_available_exams()` e recebe somente metadados + quantidade de questões.
- A realização da prova usa `get_exam_for_attempt()`; as questões chegam sem `correct_index` e sem `model_answer`.
- O Inspetor lê provas completas somente pelas RPCs administrativas `list_exams_admin()` e `get_exam_admin()`.
- A tela de prova não faz mais correção local nem mostra gabarito; exibe o resultado oficial retornado pelo servidor.
- `sign_exam_attempt` exige colaborador ativo, tentativa do próprio usuário e caminho dentro do diretório do próprio `auth.uid()`.
- A assinatura só é formalizada se existir objeto real no bucket privado `exam-signatures`, com o caminho e proprietário esperados.
- Storage de assinatura permanece privado, restrito a PNG e com limite de tamanho já configurado.
- Certificado formal exige aprovação + `signature_agreed=true` + arquivo de assinatura + `signed_at`.
- O trigger legado `issue_certificate_after_attempt` foi alinhado à mesma regra; aprovação sem assinatura não gera certificado formal.
- `validate_certificate` é restrita à Inspetoria/admin e só valida tentativa aprovada e formalmente assinada.
- Registros legados eventualmente emitidos sem assinatura são preservados para auditoria, porém revogados.
- Auditoria após a migração encontrou zero certificados ativos inconsistentes.

## Banco de Questões, treinamento e XP

- O Operador não possui `SELECT` direto na tabela `question_bank`.
- O Inspetor lê o banco completo somente pela RPC administrativa `list_question_bank_admin()`.
- Atividades operacionais usam `list_operational_questions()`, que omite `correct_index`, `correct_answer` e `explanation`.
- Teste Rápido, Desafio Diário, Simulador e Stress Test não recebem gabarito no navegador.
- Simulador e Stress Test deixaram de revelar certo/errado e explicação antes da conclusão; a resposta é apenas registrada e corrigida no servidor.
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
11. SELECT direto de `exams` removido do cliente autenticado.
12. Assinatura passou a exigir arquivo real existente no Storage privado.
13. Certificado legado alinhado à regra formal de aprovação + assinatura.
14. Grants de tabelas reduzidos por princípio de menor privilégio; `anon` removido.
15. `EXECUTE` de funções `SECURITY DEFINER` endurecido; `anon` removido.
16. Correção e XP das atividades rápidas movidos para o servidor.
17. Entrega do Banco de Questões separada em RPC administrativa completa e RPC operacional sanitizada.
18. SELECT direto de `question_bank` removido do cliente autenticado.

## Testes técnicos executados

- código de ativação: validade, uso único, RNG criptográfico, bcrypt e bloqueio para não-admin;
- zero código legado válido pendente no momento da migração para bcrypt;
- prova transacional: gabarito oculto, nota oficial 10 calculada no servidor, aprovação server-side, zero certificado antes da assinatura e rejeição de assinatura com arquivo inexistente;
- rollback da homologação de prova: zero prova e zero tentativa fictícia residual;
- gamificação transacional: envio malicioso de `p_score=10` com respostas erradas resultou em nota 0 e reprovação;
- primeira conclusão do Teste Rápido concedeu 10 XP e repetição no mesmo dia concedeu 0 XP;
- rollback da homologação de gamificação: zero questão e zero tentativa fictícia residual;
- `authenticated` confirmado sem `SELECT` direto em `exams` e `question_bank`;
- `authenticated` confirmado sem `INSERT` direto em `exam_attempts`;
- `anon` confirmado sem `EXECUTE` nas funções `SECURITY DEFINER` auditadas;
- zero certificados ativos inconsistentes após formalização documental;
- bateria de integridade: zero aprovação sem código, zero assinatura marcada sem evidência, zero prova publicada sem questões, zero módulo com nota/ordem inválida, zero ciclo com janela inválida e zero Desafio Diário duplicado.

## Estado das migrations recentes

As migrations recentes de hardening estão versionadas no GitHub e o schema correspondente foi aplicado/validado no banco conectado durante a homologação. Entre elas:

- `20260901012000_activation_code_adaptive_hash.sql`
- `20260901013000_server_side_exam_grading.sql`
- `20260901014000_least_privilege_table_grants.sql`
- `20260901015000_server_side_training_grading.sql`
- `20260901020000_secure_exam_delivery.sql`
- `20260901021000_lock_exam_answer_keys.sql`
- `20260901022000_certificate_formalization_guard.sql`
- `20260901023000_function_execute_hardening.sql`
- `20260901024000_signature_storage_guard.sql`
- `20260901025000_secure_question_delivery.sql`
- `20260901026000_lock_question_bank_answer_keys.sql`

Parte dessas versões foi aplicada diretamente no banco conectado para evitar janelas de incompatibilidade entre frontend e backend. O próximo deploy formal deve executar/reconciliar o histórico pelo runner oficial de migrations. Não marcar versões manualmente como aplicadas sem conferir o estado do schema.

## Pendências de segurança/produção fora da aplicação

- decidir se a operação exigirá restrição por IP/VPN;
- validar URLs finais de autenticação no Supabase antes da publicação;
- executar backup pré-publicação;
- validar primeiro acesso, inativação e recuperação operacional com contas reais no domínio final;
- validar assinatura real em touchscreen e abertura da evidência no navegador operacional;
- executar a homologação final com uma conta real de Operador (o ambiente atual ainda não possui perfil Operador autenticado para teste ponta a ponta).
