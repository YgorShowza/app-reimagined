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

## Risco residual antes de publicação pública

O fluxo de **primeiro acesso** ainda usa conhecimento da matrícula + criação de senha. A validação atual comprova que a matrícula existe e está ativa, mas não comprova que a pessoa que reivindica a conta é o titular da matrícula.

Antes de exposição ampla à internet, recomenda-se implementar um **código de ativação de uso único**, emitido pela Inspetoria para cada colaborador. O backend deve exigir esse código no `handle_new_user`, armazenando apenas hash, validade e estado de uso. A validação deve ocorrer no banco/servidor, nunca apenas no frontend.

Até esse controle existir, tratar o primeiro acesso como adequado apenas a ambiente controlado e não como autenticação forte de identidade.
