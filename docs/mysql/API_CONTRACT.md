# SEGEMPAT API — contrato para backend MySQL

Base URL configurada no frontend por `VITE_SEGEMPAT_API_URL`.

A sessão deve usar cookie `HttpOnly`, `Secure` e `SameSite=Lax`/`Strict` conforme política da empresa. Não armazenar senha, token de banco ou segredo privilegiado no navegador.

## Auth

### POST `/api/auth/login`

```json
{ "matricula": "000", "password": "..." }
```

Resposta 200:

```json
{ "id":"uuid", "matricula":"000", "nome":"Nome", "setor":"CFTV", "isAdmin":true }
```

### POST `/api/auth/activate`

```json
{ "matricula":"000", "activationCode":"12345678", "password":"..." }
```

O backend valida colaborador ativo, código não usado/não expirado, hash do código e cria a conta em transação.

### GET `/api/auth/me`

Retorna o usuário autenticado e o contexto de autorização.

### POST `/api/auth/logout`

Invalida a sessão no servidor e expira o cookie.

## Employees

- `GET /api/employees`
- `POST /api/employees`
- `PATCH /api/employees/:id`
- `DELETE /api/employees/:id`

Escrita exclusiva de Inspetor. Não permitir excluir cadastro que tenha conta/histórico; usar inativação.

## Access activation

- `GET /api/access/activation-codes`
- `POST /api/access/activation-codes/:employeeId`
- `DELETE /api/access/activation-codes/:employeeId`

Somente Inspetor. Código puro é retornado uma única vez na geração; banco armazena somente hash adaptativo.

## Exams

### Administração

- `GET /api/exams`
- `GET /api/exams/:id`
- `POST /api/exams`
- `PATCH /api/exams/:id`
- `DELETE /api/exams/:id`

Somente Inspetor recebe gabarito/chave de correção.

### Operador

- `GET /api/me/exams` — somente metadados de provas publicadas para `Todos` ou setor do usuário.
- `GET /api/me/exams/:id` — questões sanitizadas, sem `correct_index`/`model_answer`.
- `POST /api/me/exams/:id/attempts` — body contém somente respostas. O servidor recalcula nota/aprovação.
- `POST /api/me/exam-attempts/:attemptId/signature` — upload/evidência da própria tentativa.

## Cronograma

- `GET /api/cronograma?month=YYYY-MM`
- `GET /api/cronograma/year/:year/summary`
- `POST /api/cronograma`
- `PATCH /api/cronograma/:id`
- `DELETE /api/cronograma/:id`
- `POST /api/cronograma/bulk`
- `POST /api/cronograma/import-results`
- `GET/POST/PATCH/DELETE /api/cronograma/recurring-models`
- `GET/POST/PATCH/DELETE /api/cronograma/suspensions`

Escrita administrativa. Operador recebe somente o que for necessário ao próprio painel/progresso.

## Question bank

Admin:

- `GET /api/question-bank`
- `POST /api/question-bank`
- `PATCH /api/question-bank/:id`
- `DELETE /api/question-bank/:id`

Operador nunca recebe gabarito. Atividades rápidas são servidas por endpoints sanitizados.

## Training activities

- `GET /api/me/training-activities/:type/questions`
- `POST /api/me/training-activities/:type/attempts`

O servidor valida IDs, setor, tipo, dificuldade e recalcula score/XP. O valor de score enviado pelo navegador não é autoridade.

## Training modules / cycles

- `GET /api/training-modules`
- CRUD administrativo em `/api/admin/training-modules`
- `GET /api/me/training-schedule`
- CRUD administrativo em `/api/admin/training-schedules`

## Practical evaluations

- `GET /api/me/practical-evaluations`
- CRUD administrativo em `/api/admin/practical-evaluations`
- CRUD de modelos em `/api/admin/practical-evaluation-templates`

## Occurrences

- `GET /api/me/occurrences`
- `POST /api/me/occurrences`
- `GET /api/admin/occurrences`
- `PATCH /api/admin/occurrences/:id`
- `DELETE /api/admin/occurrences/:id`

## Certificates

- `GET /api/me/certificates`
- `GET /api/admin/certificates`
- `GET /api/admin/certificates/validate/:code`

Certificado formal válido exige tentativa aprovada e assinatura completa.

## Reports / analytics

- `GET /api/admin/dashboard`
- `GET /api/admin/analytics`
- `GET /api/admin/risk`
- `GET /api/admin/reports/monthly?month=YYYY-MM`
- `GET /api/admin/employees/:id/analysis`

Preferir agregação SQL no backend para reduzir transferência de coleções grandes ao navegador.

## Audit

- `GET /api/admin/audit?cursor=...`

A escrita de auditoria acontece no backend dentro ou imediatamente após operações críticas; o cliente nunca cria logs confiáveis diretamente.

## Storage

Assinaturas/evidências nunca são públicas.

Opções suportáveis:

1. filesystem privado em servidor corporativo;
2. storage S3 compatível interno;
3. storage aprovado pela TI.

O MySQL guarda apenas metadados/caminho, não blob base64 de assinatura em tabelas operacionais.

## Erros

Formato comum:

```json
{ "error":"Mensagem segura", "code":"SOME_CODE", "details":null }
```

Não retornar stack trace, SQL, host, usuário do banco ou detalhes de infraestrutura ao navegador.
