# SEGEMPAT · Auditoria de Segurança

Atualizado em 01/09/2026.

## Controles validados

- Rotas administrativas protegidas por role `admin` antes de renderizar.
- RLS ativa nas tabelas críticas.
- `user_roles` é somente leitura para o cliente autenticado.
- `profiles` é somente leitura para o cliente autenticado.
- Não existe grant automático de `admin` baseado apenas em matrícula informada pelo usuário.
- A role administrativa é sincronizada com colaborador real `Ativo + Inspetor` e removida quando o vínculo deixa de atender à regra.
- Novos usuários só podem ser criados quando a matrícula corresponde a colaborador `Ativo` em `employees`.
- O nome do perfil é obtido do cadastro funcional, não do texto informado pelo usuário.
- `profiles.matricula` é UNIQUE, impedindo duas contas para a mesma matrícula.
- Primeiro acesso exige código de ativação de uso único emitido pela Inspetoria.
- Código de ativação possui 8 dígitos, validade de 24 horas e novos códigos são armazenados com bcrypt/pgcrypto e salt individual.
- Compatibilidade com hash SHA-256 legado existe apenas para códigos anteriormente emitidos que ainda estejam válidos; na verificação de 01/09/2026 não havia código válido pendente nesse formato.
- A geração do código usa `gen_random_bytes()`/pgcrypto, não `random()`.
- A geração/revogação do código usa RPC `SECURITY DEFINER` restrita a `admin`.
- O `handle_new_user` exige matrícula ativa + código válido, não utilizado e não expirado.
- O código é consumido na mesma transação em que o perfil é criado.
- Colaborador inativo é bloqueado no guard autenticado e também na RLS/API dos fluxos operacionais.
- `is_current_employee()` exige colaborador ativo.
- Tentativas de prova, atividades de treinamento e ocorrências próprias exigem usuário ativo.
- A correção da prova e a definição de `score`/`passed` são feitas no banco pela RPC `submit_exam_attempt`.
- O papel `authenticated` não possui mais privilégio de `INSERT` direto em `exam_attempts`.
- `submit_exam_attempt` valida usuário ativo, prova publicada, setor autorizado e calcula nota/aprovação a partir das questões armazenadas no banco.
- RPC `sign_exam_attempt` exige colaborador ativo, tentativa do próprio usuário e assinatura no diretório de storage do próprio `auth.uid()`.
- Storage privado de assinaturas exige usuário ativo para leitura/escrita própria; admin mantém acesso administrativo.
- Matrícula de colaborador com conta vinculada não pode ser alterada diretamente.
- Colaborador com conta vinculada não pode ser excluído; deve ser inativado para preservar histórico e vínculo.
- Provas, Banco de Questões, Módulos e Conteúdos respeitam setor/`Todos` na RLS.
- `exam_attempts` não concede UPDATE genérico ao Operador.
- Assinatura de prova usa RPC restrita e bucket privado.
- Nenhuma chave `service_role`, senha de banco ou segredo de servidor foi encontrada no frontend/repositório. O `.env` versionado contém somente URL/ID e chave publishable do Supabase.

## Hardening aplicado nesta homologação

1. Removido trigger antigo de auto-admin por matrícula informada pelo cliente.
2. `handle_new_user` passou a exigir matrícula ativa em `employees`.
3. Removidas políticas INSERT/UPDATE de `profiles` para o usuário.
4. Removidos grants de escrita de `profiles` e `user_roles` para `authenticated`/`anon`.
5. Grants finais dessas tabelas para o cliente autenticado: somente `SELECT`.
6. Criada `registration_activation_codes` com RLS e sem escrita direta pelo cliente.
7. Criadas RPCs administrativas `generate_registration_code` e `revoke_registration_code`.
8. Primeiro acesso passou a exigir código temporário de uso único no backend e frontend.
9. A tela Equipe passou a oferecer área administrativa `Acessos` para emissão/revogação do código.
10. RNG do código de ativação foi migrado para `gen_random_bytes()`.
11. Hash de novos códigos foi migrado de SHA-256 simples para bcrypt com salt individual, preservando leitura temporária de hash legado apenas para códigos ainda válidos.
12. Perfil funcional `Inspetor` passou a sincronizar com role `admin` somente após vínculo real de conta.
13. Perfis existentes foram reconciliados com `employees.access_profile/status`.
14. Guard autenticado passou a encerrar sessão de usuário comum sem colaborador ativo.
15. RLS de tentativas, atividades e ocorrências foi endurecida para exigir usuário ativo.
16. Storage de assinaturas passou a exigir usuário ativo para operações próprias.
17. Matrícula e exclusão de cadastro funcional vinculado passaram a ser protegidas por trigger.
18. Correção de prova foi movida para RPC server-side `submit_exam_attempt`.
19. INSERT direto de Operador em `exam_attempts` foi removido, impedindo fabricação de `score`/`passed` via API cliente.

## Testes técnicos executados

- código de ativação gerado em 8 dígitos;
- RNG criptográfico validado;
- suporte a bcrypt/pgcrypto validado no ambiente conectado;
- função de geração confirmada usando hash adaptativo;
- compatibilidade de verificação de hash legado confirmada na função de cadastro;
- zero códigos válidos pendentes em SHA-256 no momento da migração;
- perfil criado automaticamente com matrícula/nome funcional corretos na homologação anterior;
- código consumido no primeiro uso;
- reutilização do código bloqueada;
- geração por não-admin bloqueada;
- zero resíduos de usuários/tokens/colaboradores fictícios após homologação transacional;
- simulação de vínculo administrativo confirmou colaborador ativo + role `admin`;
- função `submit_exam_attempt` criada no banco e privilégio INSERT de `authenticated` em `exam_attempts` confirmado como `false`;
- bateria de integridade pós-hardening: zero aprovação sem código, zero assinatura marcada sem evidência, zero prova publicada sem questões, zero módulo com nota/ordem inválida, zero ciclo com janela inválida e zero Desafio Diário duplicado.

## Estado do primeiro acesso

Para criar uma conta nova, o colaborador precisa:

1. existir em `employees` com status `Ativo`;
2. possuir um código válido emitido pela Inspetoria;
3. informar o código de 8 dígitos dentro da validade de 24 horas;
4. ainda não possuir perfil/conta para aquela matrícula.

O código não é persistido em texto puro e é invalidado após o primeiro uso.

## Estado das migrations recentes

As migrations `20260901012000_activation_code_adaptive_hash.sql` e `20260901013000_server_side_exam_grading.sql` estão versionadas no GitHub e o schema correspondente foi aplicado/validado no banco conectado em 01/09/2026.

No momento desta auditoria, essas duas versões ainda não apareciam em `supabase_migrations.schema_migrations`, pois a aplicação foi feita diretamente para evitar uma janela de incompatibilidade com o frontend. O próximo deploy formal deve executar o runner oficial de migrations e reconciliar o histórico. As migrations foram escritas de forma idempotente para permitir essa execução posterior.

## Risco residual conhecido

A tabela `exams` ainda armazena enunciado e chave de correção no mesmo JSONB. A RLS limita quais provas publicadas o Operador pode ler, e a nota oficial não pode mais ser fabricada porque é recalculada no servidor. Ainda assim, um usuário tecnicamente avançado com acesso legítimo à prova pode inspecionar o payload recebido pelo navegador e encontrar `correct_index`/`model_answer`. A correção completa exige separar ou mascarar a chave de respostas para o cliente de realização da prova sem prejudicar a edição administrativa. Não considerar esse ponto resolvido até essa separação ser implementada.

## Pendências de segurança fora da aplicação

- decidir se a operação exigirá restrição por IP/VPN;
- validar URLs finais de autenticação no Supabase antes da publicação;
- executar backup pré-publicação;
- validar primeiro acesso, inativação e recuperação operacional com contas reais no domínio final;
- validar o fluxo completo de prova/assinatura/certificado com conta real após a nova RPC de correção server-side.
