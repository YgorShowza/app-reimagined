# SEGEMPAT · Auditoria de Segurança

Atualizado em 31/08/2026.

## Controles validados

- Rotas administrativas protegidas por role `admin` antes de renderizar.
- RLS ativa nas tabelas críticas.
- `user_roles` é somente leitura para o cliente autenticado.
- `profiles` é somente leitura para o cliente autenticado.
- Não existe grant automático de `admin` baseado apenas em matrícula.
- A role administrativa existente é explicitamente persistida em `user_roles`.
- Novos usuários só podem ser criados quando a matrícula corresponde a colaborador `Ativo` em `employees`.
- O nome do perfil é obtido do cadastro funcional, não do texto informado pelo usuário.
- `profiles.matricula` é UNIQUE, impedindo duas contas para a mesma matrícula.
- Primeiro acesso exige código de ativação de uso único emitido pela Inspetoria.
- Código de ativação possui 8 dígitos, validade de 24 horas e é armazenado apenas como hash SHA-256.
- A geração do código usa `gen_random_bytes()`/pgcrypto, não `random()`.
- A geração/revogação do código usa RPC `SECURITY DEFINER` restrita a `admin`.
- O `handle_new_user` exige matrícula ativa + código válido, não utilizado e não expirado.
- O código é consumido na mesma transação em que o perfil é criado.
- Colaborador `Ativo + Inspetor` com conta vinculada recebe role `admin` por regra funcional controlada.
- Ao mudar para Operacional ou Inativo, a role `admin` vinculada ao colaborador é removida.
- Conta administrativa técnica sem vínculo em `employees` permanece independente dessa sincronização.
- Colaborador inativo é bloqueado no guard autenticado e também na RLS/API dos fluxos operacionais.
- `is_current_employee()` exige colaborador ativo.
- Tentativas de prova, atividades de treinamento e ocorrências próprias exigem usuário ativo na RLS.
- RPC `sign_exam_attempt` exige colaborador ativo.
- Storage privado de assinaturas exige usuário ativo para leitura/escrita própria; admin mantém acesso administrativo.
- Matrícula de colaborador com conta vinculada não pode ser alterada diretamente.
- Colaborador com conta vinculada não pode ser excluído; deve ser inativado para preservar histórico e vínculo.
- Provas, Banco de Questões, Módulos e Conteúdos respeitam setor/`Todos` na RLS.
- `exam_attempts` não concede UPDATE genérico ao Operador.
- Assinatura de prova usa RPC restrita e bucket privado.
- Nenhuma chave `service_role` foi encontrada no frontend/repositório.

## Hardening aplicado nesta homologação

1. Removido trigger antigo de auto-admin por matrícula.
2. `handle_new_user` passou a exigir matrícula ativa em `employees`.
3. Removidas políticas INSERT/UPDATE de `profiles` para o usuário.
4. Removidos grants de escrita de `profiles` e `user_roles` para `authenticated`/`anon`.
5. Grants finais dessas tabelas para o cliente autenticado: somente `SELECT`.
6. Criada `registration_activation_codes` com RLS e sem escrita direta pelo cliente.
7. Criadas RPCs administrativas `generate_registration_code` e `revoke_registration_code`.
8. Primeiro acesso passou a exigir código temporário de uso único no backend e frontend.
9. A tela Equipe passou a oferecer área administrativa `Acessos` para emissão/revogação do código.
10. RNG do código de ativação foi migrado para `gen_random_bytes()`.
11. Perfil funcional `Inspetor` passou a sincronizar com role `admin` somente após vínculo real de conta.
12. Perfis existentes foram reconciliados com `employees.access_profile/status`.
13. Guard autenticado passou a encerrar sessão de usuário comum sem colaborador ativo.
14. RLS de tentativas, atividades e ocorrências foi endurecida para exigir usuário ativo.
15. Storage de assinaturas passou a exigir usuário ativo para operações próprias.
16. Matrícula e exclusão de cadastro funcional vinculado passaram a ser protegidas por trigger.

## Testes técnicos executados

- código de ativação gerado em 8 dígitos;
- hash SHA-256 conferido no banco;
- perfil criado automaticamente com matrícula/nome funcional corretos;
- código consumido no primeiro uso;
- reutilização do código bloqueada;
- geração por não-admin bloqueada;
- teste repetido após troca para RNG criptográfico: aprovado;
- zero resíduos de usuários/tokens/colaboradores fictícios após homologação transacional;
- simulação JWT da matrícula `000` confirmou colaborador ativo + role `admin`;
- reconciliação confirmou `000` como Inspetor/admin e preservou conta administrativa técnica `970`.

## Estado do primeiro acesso

Para criar uma conta nova, o colaborador precisa:

1. existir em `employees` com status `Ativo`;
2. possuir um código válido emitido pela Inspetoria;
3. informar o código de 8 dígitos dentro da validade de 24 horas;
4. ainda não possuir perfil/conta para aquela matrícula.

O código não é persistido em texto puro e é invalidado após o primeiro uso.

## Pendências de segurança fora da aplicação

- decidir se a operação exigirá restrição por IP/VPN;
- validar URLs finais de autenticação no Supabase antes da publicação;
- executar backup pré-publicação;
- validar primeiro acesso, inativação e recuperação operacional com contas reais no domínio final.
