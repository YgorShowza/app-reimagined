# SEGEMPAT · Status de Homologação

Atualizado em 01/09/2026.

Este documento separa o que já foi comprovado por código, banco e CI do que ainda depende de uso real em navegador, dispositivo ou ambiente de produção.

## Automaticamente homologado

### Build e execução
- CI do GitHub verde com `bun install --frozen-lockfile`, typecheck e build de produção.
- Build SSR validado.
- CI também falha automaticamente se existirem migrations com versão/timestamp duplicado.
- Lovable em estado `ready` no mesmo HEAD validado pelo CI.
- `bun.lock` alinhado ao `package.json`.

### Segurança e identidade
- RLS habilitada em todas as tabelas públicas auditadas.
- `anon` sem privilégios diretos nas tabelas públicas do SEGEMPAT.
- Nenhuma função `SECURITY DEFINER` pública auditada é executável por `anon`.
- Primeiro acesso restrito a colaborador ativo + código de ativação de uso único.
- Código de ativação com RNG criptográfico, validade de 24h e bcrypt com salt.
- `profiles` e `user_roles` somente leitura para o cliente.
- Role administrativa reconciliada com colaborador `Ativo + Inspetor`.
- Colaborador inativo bloqueado no guard, RLS, RPCs e Storage.

### Provas e certificados
- Operador não possui acesso à coluna `exams.questions`.
- Metadados não sensíveis de prova possuem leitura controlada por coluna quando necessária.
- Prova operacional é entregue por RPC sem `correct_index` e sem `model_answer`.
- Nota e aprovação são calculadas no servidor pela RPC `submit_exam_attempt`.
- `authenticated` não possui `INSERT` direto em `exam_attempts`.
- Assinatura exige arquivo real no bucket privado e pertencente ao próprio usuário.
- Certificado formal só é emitido após aprovação + assinatura eletrônica completa.
- Fluxo legado de certificados foi alinhado à mesma regra.
- Validação de certificado é administrativa e exige tentativa formalmente assinada.

### Homologação transacional da prova
Fluxo completo aprovado com rollback integral:
1. prova publicada criada temporariamente;
2. correção server-side de questão objetiva + discursiva retornou nota 10 e aprovação;
3. Cronograma foi sincronizado para `Realizado`;
4. zero certificado antes da assinatura;
5. assinatura eletrônica validada pela RPC com objeto temporário no bucket privado;
6. exatamente um certificado formal após assinatura;
7. validação administrativa retornou certificado válido.

Após o teste: zero prova, tentativa, lançamento, certificado, objeto de assinatura ou log fictício residual.

### Banco de Questões e atividades rápidas
- Operador não possui `SELECT` direto no Banco de Questões nem acesso às colunas de gabarito.
- RPC `list_operational_questions` omite `correct_index`, resposta correta e explicação.
- Teste Rápido, Simulador, Stress Test e Desafio Diário são corrigidos no servidor.
- `p_score` enviado pelo navegador não possui autoridade.
- Proteções de setor, tipo, dificuldade, quantidade e IDs são server-side.
- Teste Rápido, Simulador e Stress Test não permitem farm de XP diário.
- Desafio Diário é limitado a uma execução por dia.

### Homologação transacional das atividades
Fluxo aprovado com rollback integral:
1. Teste Rápido: score server-side 10 e 10 XP;
2. segunda execução do Teste Rápido no mesmo dia: 0 XP;
3. Desafio Diário: score 10 e 15 XP;
4. segunda execução do Desafio Diário bloqueada;
5. Simulador: score 10 e 20 XP;
6. Stress Test recebeu `p_score=10` falso, servidor recalculou 8,0 e concedeu 25 XP;
7. tipo genérico `Treinamento` foi bloqueado;
8. delta total de XP dentro da transação igual ao esperado.

Após o teste: zero questão, tentativa, log ou alteração de pontos fictícia residual.

### Homologação de autorização como Operador
Como ainda não existe conta Operador real ativa no banco de homologação, foi executada simulação transacional usando a identidade ativa existente, com remoção temporária da role admin e mudança temporária para perfil Operacional. Todo o bloco terminou em rollback.

Resultado aprovado:
- role administrativa removida durante a simulação;
- provas entregues somente para `Todos`/setor permitido;
- questões operacionais entregues somente para `Todos`/setor permitido;
- RPC administrativa de provas bloqueada;
- geração de código de primeiro acesso bloqueada para não-admin;
- zero resíduo após rollback.

### Cronograma
- Visões Lista, Calendário e Ano existentes.
- Cabeçalho integrado com `Novo Registro` e `Ações`.
- `Novo Registro` usa `?novo=true` e abre o formulário real existente da Gestão, sem duplicar CRUD.
- Calendário mantém largura legível e scroll horizontal em telas estreitas.
- Visão anual é navegável por mês.
- Importação possui fluxo atômico server-side.
- Conclusão de prova sincroniza o Cronograma no servidor.

### Tema e shell
- Claro/Escuro/Auto sincronizam `data-theme`, classe `.dark` e `color-scheme`.
- Tema é aplicado antes do primeiro paint para reduzir flash visual.
- Sidebar permanece escura de propósito; conteúdo usa tokens semânticos.
- Heroes de fundo permanentemente escuro usam texto explicitamente claro, inclusive no tema claro.
- Drawer mobile, bottom nav do Operador e espaçamento inferior foram revisados.
- Logout só limpa cache/redireciona após `supabase.auth.signOut()` bem-sucedido.
- 404 e error boundary estão em português e seguem o tema.

### Integridade final
Última bateria: **14/14 com zero problemas**.
- zero duplicidade crítica no Cronograma;
- zero tentativa órfã de prova;
- zero tentativa órfã de perfil;
- zero aprovação sem código;
- zero assinatura incompleta marcada como válida;
- zero certificado formal inconsistente;
- zero Inspetor ativo sem admin;
- zero código de ativação em texto puro;
- zero prova publicada sem questões;
- zero tabela pública auditada sem RLS;
- zero privilégio de tabela pública para `anon`;
- zero função `SECURITY DEFINER` executável por `anon`;
- zero acesso autenticado ao JSON de gabarito das provas;
- zero acesso autenticado ao gabarito/explicação do Banco de Questões.

### Migrations
- Histórico do Supabase reconciliado até `20260901036000_safe_exam_metadata_columns`.
- A colisão de versão `20260901034000` foi eliminada; os dois arquivos foram renumerados para `035000` e `036000`.
- O CI agora valida padrão de nome e unicidade das versões de todas as migrations.
- Sem drift conhecido entre os objetos auditados do schema e as migrations registradas.

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

## Melhorias conhecidas de baixo risco

- `CronogramaSourceParityV2` ainda pode ganhar um fallback visual explícito de erro/retry para falhas de rede nas queries de Lista/Calendário/Ano. O núcleo e os dados estão protegidos; trata-se de UX de recuperação.
- Simulador e Stress Test já tratam falha de carregamento inicial, mas ainda é desejável mostrar feedback visual explícito caso a submissão final da atividade falhe e substituir o retorno via `window.location.assign` por navegação interna do TanStack Router.

Esses itens são melhorias de UX e não alteram a autoridade server-side, RLS, cálculo de nota ou integridade dos dados.

## Critério de conclusão

O SEGEMPAT está tecnicamente pronto para homologação operacional: CI, banco, migrations e preview permanecem verdes/consistentes, e os fluxos sensíveis foram validados por testes transacionais com rollback. A classificação de 100% homologado para produção só deve ocorrer após concluir os testes manuais acima em contas e dispositivos reais.
