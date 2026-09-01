# SEGEMPAT · Status de Homologação

Atualizado em 01/09/2026.

Este documento separa o que já foi comprovado por código/banco/CI do que ainda depende de uso real em navegador, dispositivo ou ambiente de produção.

## Automaticamente homologado

### Build e execução
- CI do GitHub verde com `bun install --frozen-lockfile` e build de produção.
- Build SSR validado.
- Lovable em estado `ready` no último estado verificado.
- `bun.lock` alinhado ao `package.json`.

### Segurança e identidade
- RLS habilitada em todas as tabelas públicas auditadas.
- `anon` sem privilégios diretos nas tabelas públicas do SEGEMPAT.
- Primeiro acesso restrito a colaborador ativo + código de ativação de uso único.
- Código de ativação com RNG criptográfico, validade de 24h e bcrypt com salt.
- `profiles` e `user_roles` somente leitura para o cliente.
- Role administrativa reconciliada com colaborador `Ativo + Inspetor`.
- Colaborador inativo bloqueado no guard, RLS, RPCs e Storage.

### Provas e certificados
- Operador não possui `SELECT` direto em `exams`.
- Prova operacional é entregue sem `correct_index` e sem `model_answer`.
- Nota e aprovação são calculadas no servidor pela RPC `submit_exam_attempt`.
- `authenticated` não possui `INSERT` direto em `exam_attempts`.
- Assinatura exige arquivo real no bucket privado e pertencente ao próprio usuário.
- Certificado formal só é emitido após aprovação + assinatura eletrônica completa.
- Fluxo legado de certificados foi alinhado à mesma regra.
- Validação de certificado é administrativa e exige tentativa formalmente assinada.

### Homologação transacional da prova
Resultado: **6/6 aprovado**, com rollback integral.
1. Prova entregue sem gabarito.
2. Correção server-side correta.
3. Zero certificado antes da assinatura.
4. Assinatura eletrônica validada.
5. Um certificado formal após assinatura.
6. Validação administrativa retornando certificado válido.

Após o teste: zero prova, tentativa ou arquivo de assinatura fictício residual.

### Banco de Questões e atividades rápidas
- Operador não possui `SELECT` direto em `question_bank`.
- RPC operacional omite gabarito e explicação.
- Teste Rápido, Simulador, Stress Test e Desafio Diário são corrigidos no servidor.
- `p_score` enviado pelo navegador não possui autoridade.
- Proteções de setor, tipo, dificuldade, quantidade e IDs são server-side.
- Teste Rápido, Simulador e Stress Test não permitem farm de XP diário.
- Desafio Diário é limitado a uma execução por dia.

### Homologação transacional das atividades
Resultado: **7/7 aprovado**, com rollback integral.
1. Teste Rápido: score server-side 10, XP 10, `p_score=999` ignorado.
2. Segunda execução do Teste Rápido: XP 0.
3. Simulador: score 10, XP 20.
4. Stress Test: score 10, XP 25.
5. Desafio Diário: score 10, XP 15.
6. Segunda execução do Desafio Diário bloqueada.
7. Soma controlada de XP igual ao esperado.

Após o teste: zero questão ou tentativa fictícia residual.

### Cronograma
- Visões Lista, Calendário e Ano existentes.
- Cabeçalho integrado com `Novo Registro` e `Ações`.
- `Novo Registro` usa `?novo=true` e abre o formulário real existente da Gestão, sem duplicar CRUD.
- Calendário mantém largura legível e scroll horizontal em telas estreitas.
- Visão anual é navegável por mês.
- Importação possui migration de fluxo atômico.

### Tema e shell
- Claro/Escuro/Auto sincronizam `data-theme`, classe `.dark` e `color-scheme`.
- Tema é aplicado antes do primeiro paint para reduzir flash visual.
- Sidebar permanece escura de propósito; conteúdo usa tokens semânticos.
- Dashboard usa texto explicitamente claro em hero de fundo permanentemente escuro.
- Drawer mobile, bottom nav do Operador e espaçamento inferior foram revisados.
- Logout só limpa cache/redireciona após `supabase.auth.signOut()` bem-sucedido.
- 404 e error boundary estão em português e seguem o tema.

### Integridade final
Última bateria ampla: **12/12 com zero problemas**.
- zero duplicidade crítica no Cronograma;
- zero tentativa órfã de prova;
- zero tentativa órfã de perfil;
- zero aprovação sem código;
- zero assinatura incompleta marcada como válida;
- zero certificado formal inconsistente;
- zero Inspetor ativo sem admin;
- zero admin funcional indevido;
- zero código de ativação salvo como texto puro;
- zero prova publicada sem questões;
- zero tabela pública auditada sem RLS;
- zero privilégio de tabela pública para `anon`.

### Migrations
- Histórico do Supabase conferido e sincronizado até `20260901031000_admin_exam_question_crud_rpcs`.
- Sem drift conhecido no momento desta atualização.

## Pendências que dependem de homologação manual/operacional

- Primeiro acesso com um Operador real usando código de ativação emitido pela Inspetoria.
- Fluxo real de uma prova em navegador autenticado de Operador.
- Assinatura com dedo em touchscreen.
- Teste físico em iPhone e Android.
- Conferência de PDFs e impressão no navegador/impressora operacional.
- Teste de navegação Claro → Escuro → Auto nas principais telas em dispositivo real.
- Teste do Cronograma com volume operacional real e usuários reais.
- Backup imediatamente antes da publicação.
- Configuração final de domínio/URLs de autenticação.
- Decisão operacional sobre restrição por IP/VPN.

## Melhoria conhecida de baixo risco

A visão premium do Cronograma usa queries separadas para Lista/Calendário/Ano. O núcleo está funcional e responsivo, mas ainda é desejável adicionar um fallback visual explícito de erro/retry no componente `CronogramaSourceParityV2` para evitar que uma falha de rede seja interpretada como lista vazia. Essa melhoria deve ser feita de forma cirúrgica, sem reescrever o componente central.

## Critério de conclusão

O SEGEMPAT pode ser considerado tecnicamente pronto para homologação operacional quando CI, banco, migrations e preview permanecem verdes/consistentes — estado já alcançado. A classificação de 100% homologado para produção só deve ocorrer após concluir os testes manuais acima em contas e dispositivos reais.
