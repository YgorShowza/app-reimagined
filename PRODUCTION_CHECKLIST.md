# SEGEMPAT · Checklist de Produção — MySQL Corporativo

> `[x]` = comprovado no código/CI. `[ ]` = depende do ambiente real da empresa, dados reais ou validação operacional.

## 1. Código, build e artefatos

- [x] frontend passa por typecheck, lint e build de produção no CI;
- [x] build corporativo usa `VITE_SEGEMPAT_REQUIRE_API=true`;
- [x] ausência da API corporativa em modo obrigatório falha explicitamente;
- [x] API Node.js possui validação de configuração de produção;
- [x] imagem Docker da API é construída no CI;
- [x] container roda como usuário não-root;
- [x] Docker healthcheck usa `/health/ready`;
- [x] Nginx e systemd de referência possuem hardening validado pelo CI;
- [x] `smoke` e `cutover:audit` incluem auditoria dedicada da geração recorrente de Avaliação Prática, slots, FK, histórico e vínculo 1:1 com o Cronograma;
- [ ] HEAD final do deploy registrado pela TI.

## 2. MySQL corporativo

- [ ] versão exata MySQL 8.x registrada;
- [ ] host/porta/database confirmados;
- [ ] usuário de aplicação criado com privilégio mínimo;
- [ ] MySQL acessível somente pela rede necessária;
- [ ] TLS negociado de verdade;
- [ ] CA corporativa instalada quando aplicável;
- [ ] `npm run preflight` aprovado;
- [ ] `npm run migrate` aprovado;
- [ ] migrations `001` a `005` registradas com histórico/checksums coerentes;
- [ ] `npm run smoke` aprovado, incluindo auditoria de Avaliação Prática/Cronograma;
- [ ] `FOREIGN_KEY_CHECKS=1`, UTC, modo SQL estrito, InnoDB e `utf8mb4` confirmados.

## 3. Migração/carga de dados

- [ ] fonte oficial dos dados definida;
- [ ] backup da fonte realizado antes da migração;
- [ ] UUIDs, matrículas e vínculos preservados;
- [ ] contas/perfis tratados conforme plano aprovado;
- [ ] provas, tentativas, certificados, treinamentos, Cronograma e demais históricos migrados;
- [ ] assinaturas/evidências copiadas para storage corporativo;
- [ ] contagens antes/depois registradas por entidade crítica;
- [ ] amostras históricas conferidas;
- [ ] não existem slots recorrentes duplicados nem marcadores `[PRACTICAL:*]` órfãos no Cronograma;
- [ ] `npm run cutover:audit` aprovado sem inconsistência crítica.

## 4. Sessão, autenticação e autorização

- [x] cookie HTTP-only;
- [x] `Secure=true` obrigatório em produção;
- [x] CORS por allowlist HTTPS explícita;
- [x] operações de escrita exigem `Origin` autorizada;
- [x] login/ativação possuem limitação de tentativas na aplicação;
- [x] contexto do usuário é reconstruído do MySQL em toda requisição protegida;
- [x] conta/colaborador inativo perde acesso;
- [x] Inspetor exige role `admin` + perfil funcional `Inspetor`;
- [x] troca de senha invalida sessões antigas e rotaciona a sessão atual;
- [ ] login real de Inspetor validado no domínio final;
- [ ] login real de Operador validado no domínio final;
- [ ] primeiro acesso real validado;
- [ ] troca de senha real validada;
- [ ] logout real validado;
- [ ] política de TTL de sessão aprovada pela TI/gestão.

## 5. Frontend corporativo

- [ ] URL HTTPS final do frontend definida;
- [ ] URL HTTPS final da API definida;
- [ ] build publicado com:

```text
VITE_SEGEMPAT_API_URL=https://<api-corporativa>
VITE_SEGEMPAT_REQUIRE_API=true
```

- [ ] `SEGEMPAT_ALLOWED_ORIGINS` contém exatamente a origem do frontend;
- [ ] nenhuma credencial MySQL foi colocada em variável `VITE_*`;
- [ ] preview legado não é usado como backend da publicação corporativa.

## 6. API, proxy e rede

- [ ] API executando no host corporativo;
- [ ] `/health` responde;
- [ ] `/health/ready` permanece verde e reconhece a migration MySQL mais recente;
- [ ] proxy reverso HTTPS configurado;
- [ ] HTTP redireciona para HTTPS;
- [ ] TLS 1.2/1.3 conforme política corporativa;
- [ ] firewall/VPN/allowlist aplicados conforme decisão da TI;
- [ ] `trust proxy` revisado contra a topologia real; o código padrão assume um proxy confiável;
- [ ] rate limiting central do proxy/WAF configurado se houver múltiplas réplicas da API;
- [ ] logs e monitoramento ativos.

## 7. Storage e evidências

- [ ] caminho absoluto persistente configurado;
- [ ] usuário do processo possui somente as permissões necessárias;
- [ ] `preflight` confirma criar/ler/remover arquivo de teste;
- [ ] storage incluído em backup;
- [ ] restauração do storage testada;
- [ ] assinaturas migradas conferidas pelo `cutover:audit`;
- [ ] evidência de assinatura real validada em navegador.

## 8. Teste funcional ponta a ponta

### Inspetor

- [ ] Dashboard/Analytics;
- [ ] Equipe/Colaboradores;
- [ ] geração/revogação de primeiro acesso;
- [ ] Cronograma individual e em massa;
- [ ] Banco de Questões;
- [ ] criação/publicação de Provas;
- [ ] Treinamentos;
- [ ] Avaliação Prática manual;
- [ ] geração recorrente de Avaliação Prática cria os slots esperados no mês;
- [ ] repetir a geração recorrente não duplica os mesmos slots;
- [ ] mês suspenso impede geração e ausência do operador desloca/impede a data conforme disponibilidade no mesmo mês;
- [ ] cada avaliação recorrente mantém exatamente um lançamento próprio no Cronograma;
- [ ] conclusão da Avaliação Prática transforma o lançamento vinculado em `Realizado` e preserva o histórico;
- [ ] resultado do Cronograma sincronizado aparece em Dashboard, Analytics, Relatórios, Relatório Mensal e Análise Individual conforme os filtros aplicáveis;
- [ ] Ocorrências;
- [ ] Certificados/validação;
- [ ] Auditoria administrativa.

### Operador

- [ ] primeiro acesso;
- [ ] login/logout;
- [ ] visualização de conteúdo permitido pelo setor;
- [ ] realização de Prova;
- [ ] correção server-side conferida;
- [ ] assinatura real;
- [ ] certificado após aprovação + assinatura;
- [ ] Teste Rápido;
- [ ] Simulador;
- [ ] Stress Test;
- [ ] Desafio Diário;
- [ ] Meu Perfil/progresso;
- [ ] Avaliação Prática mostra somente registros do próprio colaborador autenticado;
- [ ] lançamento sincronizado da própria Avaliação Prática aparece no Cronograma/pendências do Operador quando aplicável.

## 9. Navegadores, dispositivos e impressão

- [ ] desktop corporativo;
- [ ] Android real;
- [ ] iPhone/iOS real, quando aplicável;
- [ ] assinatura por mouse;
- [ ] assinatura por touchscreen;
- [ ] PDFs conferidos visualmente;
- [ ] impressão conferida na impressora/navegador operacional;
- [ ] tema Claro/Escuro/Auto revisado nas telas principais.

## 10. Backup, restauração e rollback

- [ ] backup do MySQL imediatamente antes do cutover;
- [ ] backup do storage imediatamente antes do cutover;
- [ ] procedimento de restauração documentado;
- [ ] teste de restore executado em ambiente seguro;
- [ ] commit anterior estável registrado;
- [ ] commit de produção registrado;
- [ ] plano de retorno do frontend/API definido;
- [ ] impacto de rollback de schema avaliado antes de qualquer reversão;
- [ ] responsável técnico pelo rollback definido.

## 11. Bootstrap do primeiro Inspetor

Executar somente se a carga de dados não trouxer uma conta administrativa válida e depois de schema/dados estarem coerentes. Preferir senha via `stdin`, sem digitá-la na linha de comando/histórico:

```bash
read -rsp 'Senha temporária: ' SENHA_TMP; echo
printf '%s' "$SENHA_TMP" | \
  CONFIRM_BOOTSTRAP_ADMIN=SIM SENHA_STDIN=SIM \
  MATRICULA=<MATRICULA> NOME="<NOME>" SETOR=Administrativo \
  npm run bootstrap-admin
unset SENHA_TMP
```

- [ ] necessidade do bootstrap confirmada;
- [ ] execução registrada como evidência sem guardar senha;
- [ ] senha temporária trocada no primeiro acesso.

## 12. Ordem oficial do cutover

1. receber dados da TI e preparar secrets/rede/storage;
2. `npm ci`;
3. `npm run preflight`;
4. `npm run migrate`;
5. `npm run smoke`;
6. migrar dados e evidências;
7. `npm run cutover:audit`;
8. bootstrap do primeiro Inspetor somente se necessário;
9. subir API e manter `/health/ready` verde;
10. publicar frontend com `VITE_SEGEMPAT_REQUIRE_API=true`;
11. executar E2E Inspetor + Operador;
12. validar backup, restore e rollback;
13. aprovar o cutover.

## 13. Critério final

Antes de todos os itens corporativos obrigatórios acima estarem aprovados, o status permanece:

**PARTE DO MYSQL NO CÓDIGO CONCLUÍDA — PRONTO PARA CONECTAR AO BANCO DA EMPRESA.**

Somente após os gates e testes reais:

**SEGEMPAT HOMOLOGADO NO MYSQL DA EMPRESA.**