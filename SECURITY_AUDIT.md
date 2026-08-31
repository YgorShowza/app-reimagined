# SEGEMPAT · Auditoria de Segurança

Atualizado em 31/08/2026.

## Controles validados

- Rotas administrativas protegidas por role `admin` antes de renderizar.
- RLS ativa nas tabelas críticas.
- `user_roles` é somente leitura para o cliente autenticado.
- `profiles` é somente leitura para o cliente autenticado.
- Não existe grant automático de `admin` baseado em matrícula.
- A role administrativa existente é explicitamente persistida em `user_roles`.
- Novos usuários só podem ser criados quando a matrícula corresponde a colaborador `Ativo` em `employees`.
- O nome do perfil é obtido do cadastro funcional, não do texto informado pelo usuário.
- `profiles.matricula` é UNIQUE, impedindo duas contas para a mesma matrícula.
- Primeiro acesso exige código de ativação de uso único emitido pela Inspetoria.
- Código de ativação possui 8 dígitos, validade de 24 horas e é armazenado apenas como hash SHA-256.
- A geração/revogação do código usa RPC `SECURITY DEFINER` restrita a `admin`.
- O `handle_new_user` exige matrícula ativa + código válido, não utilizado e não expirado.
- O código é consumido na mesma transação em que o perfil é criado.
- Provas, Banco de Questões, Módulos e Conteúdos respeitam setor/`Todos` na RLS.
- `exam_attempts` não concede UPDATE genérico ao Operador.
- Assinatura de prova usa RPC restrita e bucket privado.
- Nenhuma chave `service_role` foi encontrada no frontend/repositório.

## Hardening aplicado nesta homologação

1. Removido trigger `profiles_grant_admin` e função de auto-admin por matrícula.
2. `handle_new_user` passou a exigir matrícula ativa em `employees`.
3. Removidas políticas INSERT/UPDATE de `profiles` para o usuário.
4. Removidos grants de escrita de `profiles` e `user_roles` para `authenticated`/`anon`.
5. Grants finais dessas tabelas para o cliente autenticado: somente `SELECT`.
6. Criada `registration_activation_codes` com RLS e sem acesso de escrita direto pelo cliente.
7. Criadas RPCs administrativas `generate_registration_code` e `revoke_registration_code`.
8. Primeiro acesso passou a exigir código temporário de uso único no backend e no frontend.
9. A tela Equipe passou a oferecer área administrativa `Acessos` para emissão controlada do código.

## Estado do primeiro acesso

O risco de reivindicação apenas pelo conhecimento da matrícula foi eliminado. Para criar uma conta nova, o colaborador precisa:

1. existir em `employees` com status `Ativo`;
2. possuir um código válido emitido pela Inspetoria;
3. informar o código de 8 dígitos dentro da validade de 24 horas;
4. ainda não possuir perfil/conta para aquela matrícula.

O código não é persistido em texto puro e é invalidado após o primeiro uso.

## Pendências de segurança fora da aplicação

- decidir se a operação exigirá restrição por IP/VPN;
- validar URLs finais de autenticação no Supabase antes da publicação;
- executar backup pré-publicação;
- validar primeiro acesso e recuperação operacional com contas reais em ambiente final.
