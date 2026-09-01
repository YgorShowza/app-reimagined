# SEGEMPAT · Relatório consolidado de homologação técnica

Data: 01/09/2026

Este documento registra somente verificações efetivamente executadas no código, CI, Lovable e banco conectado. Itens que dependem de dispositivo, conta real de Operador, impressão ou publicação continuam marcados como pendentes.

## Estado do build e preview

- GitHub `main`: CI `SEGEMPAT CI` aprovado com `bun install --frozen-lockfile` e `bun run build`.
- Lovable: preview em estado `ready` e sincronizado com o mesmo commit do `main` na última verificação.
- Build SSR de produção aprovado.
- `jspdf` isolado como client-only para não quebrar SSR.
- `recharts` removido do bundle após substituição dos gráficos críticos por renderização mais leve.

## Autenticação e identidade

- Primeiro acesso limitado a matrícula de colaborador ativo.
- Código de ativação de 8 dígitos, uso único e validade de 24 horas.
- Geração com RNG criptográfico e armazenamento dos novos códigos com bcrypt/pgcrypto + salt.
- Sem concessão automática de `admin` por matrícula informada pelo usuário.
- Perfil administrativo sincronizado com colaborador `Ativo + Inspetor`.
- Colaborador inativo bloqueado no guard, RLS, RPCs e Storage operacional.
- `profiles` e `user_roles` sem escrita direta pelo cliente autenticado.

## Provas

Fluxo transacional completo executado com rollback automático:

1. prova publicada criada temporariamente;
2. Cronograma pendente criado temporariamente;
3. prova entregue pela RPC operacional sem `correct_index` e sem `model_answer`;
4. respostas submetidas à RPC `submit_exam_attempt`;
5. nota calculada no servidor: **10,0**;
6. aprovação definida no servidor: **true**;
7. Cronograma atualizado para **Realizado**;
8. confirmado **zero certificado formal antes da assinatura**;
9. objeto temporário de assinatura criado no bucket privado;
10. `sign_exam_attempt` confirmou assinatura apenas após localizar o objeto real;
11. certificado formal criado após assinatura;
12. validação administrativa retornou certificado válido;
13. subtransação revertida;
14. verificação posterior confirmou **zero resíduos** em prova, Cronograma, tentativa, certificado e Storage.

Proteções confirmadas:

- `authenticated` sem `SELECT` direto em `exams`;
- `authenticated` sem `INSERT` direto em `exam_attempts`;
- Operador recebe prova sanitizada por RPC;
- Inspetor recebe prova completa somente por RPC administrativa;
- assinatura exige tentativa própria, usuário ativo e arquivo real no diretório do próprio usuário;
- certificado formal exige aprovação + assinatura eletrônica completa;
- fluxo legado de `certificates/validate_certificate` alinhado à mesma regra.

## Banco de Questões e gamificação

- `authenticated` sem CRUD direto em `question_bank`.
- Entrega operacional por `list_operational_questions()` sem `correct_index`, `correct_answer` ou `explanation`.
- Administração do banco de questões por RPCs administrativas.

Homologação transacional com rollback:

### Teste Rápido
- valor adulterado de `p_score` ignorado pelo servidor;
- resultado oficial calculado a partir das respostas: **8,0**;
- primeira conclusão: **+10 XP**;
- repetição no mesmo dia: **0 XP**.

### Desafio Diário
- resultado oficial: **6,7**;
- primeira execução: **+15 XP**;
- segunda execução no mesmo dia: **bloqueada**.

### Simulador
- resultado oficial: **7,5**;
- primeira conclusão: **+20 XP**;
- repetição no mesmo dia: **0 XP**.

### Stress Test
- resultado oficial: **8,0**;
- primeira conclusão: **+25 XP**;
- repetição no mesmo dia: **0 XP**.

Após rollback, verificação confirmou **zero questões e zero atividades fictícias residuais**.

## Banco e permissões

Bateria final executada no banco conectado: **12/12 verificações com zero problemas**.

- RLS desabilitada em tabela pública: 0
- privilégios de tabela para `anon`: 0
- `anon` com `EXECUTE` em função `SECURITY DEFINER`: 0
- `authenticated` com SELECT direto em `exams`: 0
- duplicidade crítica no Cronograma: 0
- tentativa com prova órfã: 0
- aprovação sem código: 0
- assinatura inconsistente: 0
- certificado formal inconsistente: 0
- Desafio Diário duplicado: 0
- Inspetor ativo sem role administrativa: 0
- colaborador inativo mantendo admin funcional: 0

## Migrations

O histórico `supabase_migrations.schema_migrations` foi conferido e contém as migrations recentes de hardening, incluindo:

- hash adaptativo do código de ativação;
- correção server-side de provas;
- menor privilégio em tabelas;
- correção server-side de atividades rápidas;
- entrega segura de provas;
- bloqueio das chaves de respostas;
- formalização de certificados;
- hardening de `EXECUTE`;
- proteção do Storage de assinatura;
- entrega segura do Banco de Questões;
- bloqueio das chaves do Banco de Questões;
- importação atômica do Cronograma;
- sincronização server-side do Cronograma após prova.

## Cronograma

Validado tecnicamente:

- índice/constraint contra duplicidade crítica;
- consultas por mês/ano e índices de escala;
- conclusão de prova atualizando apenas prova/colaborador envolvidos;
- `Novo Registro` usa `?novo=true`, e `CronogramaWorkspace` abre o modal existente automaticamente sem duplicar CRUD;
- Lista/Calendário/Ano permanecem no mesmo núcleo de dados;
- layout mobile refinado;
- teste de carga anterior com 12.000 registros sintéticos em tabela temporária e consulta mensal indexada em aproximadamente 2,2 ms no banco testado.

Ainda precisa de homologação manual com massa operacional real para lançamento em massa, importação Excel, recorrências, suspensões e PDFs.

## Tema e interface

- ThemeProvider sincroniza `data-theme`, classe `.dark`, `color-scheme` e modo Auto.
- tema aplicado antes do primeiro paint para reduzir flash visual.
- Dashboard, Cronograma, Análise Individual, Equipe, Provas, Banco de Questões, Avaliação Prática, Relatórios, Certificados, Assinaturas, Painel do Operador, Progresso e Pendências receberam refinamentos visuais/estados de erro.
- telas legadas `Em breve` foram removidas da navegação ou redirecionadas para módulos reais.
- error boundary global foi substituído por experiência SEGEMPAT em português.

## Pendências que exigem homologação real

- primeiro acesso com uma conta real de Operador;
- login real de Inspetor e Operador no domínio final;
- prova completa clicada em navegador real;
- assinatura com mouse e principalmente touchscreen;
- Android e iPhone/iOS;
- PDF e impressão no navegador usado pela operação;
- massa operacional real no Cronograma;
- domínio, URLs finais do Supabase e variáveis do ambiente de produção;
- backup imediatamente antes da publicação;
- decisão operacional sobre restrição por IP/VPN.

## Conclusão

No estado desta homologação, não há erro conhecido nas verificações automáticas de integridade, segurança ou build executadas. A barreira restante para declarar o SEGEMPAT homologado para operação é principalmente a validação manual em contas/dispositivos reais e a etapa final de publicação/infraestrutura.
