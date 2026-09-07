# SEGEMPAT — Governança LGPD e segregação de responsabilidades

Este documento descreve a divisão de responsabilidades e os controles esperados para operação do SEGEMPAT no ambiente corporativo.

> Este documento é uma especificação técnica e de governança do sistema. A definição final de base legal, prazos de retenção, atendimento aos titulares e responsabilidades institucionais deve ser aprovada pelo controlador dos dados e, quando aplicável, pelo Encarregado/DPO e áreas jurídica/compliance da empresa.

## 1. Princípio de menor privilégio

O SEGEMPAT deve operar com separação entre administração técnica e gestão operacional.

### TI / Administração técnica

Responsável por:

- infraestrutura da API, MySQL, proxy, certificados, DNS e Cloudflare;
- secrets, credenciais do MySQL e chaves de sessão;
- grants do usuário MySQL da aplicação;
- firewall, VPN, allowlists e segmentação de rede;
- backup, restauração e plano de rollback;
- logs técnicos, disponibilidade e tratamento de incidentes de infraestrutura;
- implantação e atualização do backend corporativo;
- concessão e revogação do privilégio funcional de Inspetor;
- bootstrap do primeiro Inspetor quando necessário;
- preservação de evidências técnicas de mudanças privilegiadas.

A TI não necessita de acesso rotineiro ao conteúdo operacional de avaliações, ocorrências, notas ou análises individuais para executar essas funções.

### Inspetor

Responsável por gestão operacional do SEGEMPAT:

- cadastro e manutenção de colaboradores operacionais;
- emissão/revogação de códigos de primeiro acesso para colaboradores previamente autorizados;
- Cronograma;
- banco de questões e provas;
- treinamentos;
- avaliações práticas;
- ocorrências;
- certificados e evidências funcionais;
- relatórios, dashboards e análises operacionais;
- acompanhamento de desempenho como apoio à decisão humana.

O Inspetor não pode, pela API operacional:

- criar outro Inspetor;
- promover Operacional para Inspetor;
- rebaixar Inspetor;
- alterar matrícula ou status de uma identidade privilegiada de Inspetor;
- excluir cadastro de Inspetor.

Essas alterações exigem ação explícita da TI no servidor.

### Operador

Responsável apenas pelo próprio uso funcional autorizado, incluindo suas provas, treinamentos, avaliações, certificados, pendências e demais recursos pessoais previstos pelo sistema.

O Operador não recebe acesso administrativo a registros de outros colaboradores.

### Encarregado/DPO / Controlador

Responsável por definir e aprovar, fora do código do sistema:

- finalidades do tratamento;
- bases legais aplicáveis;
- política de retenção e descarte;
- procedimento de atendimento aos direitos dos titulares;
- resposta e comunicação de incidentes de dados pessoais;
- critérios para compartilhamento e acesso excepcional;
- revisão periódica dos controles de privacidade e segurança.

## 2. Gestão técnica do privilégio de Inspetor

A API operacional bloqueia alteração de privilégio de Inspetor.

A TI deve executar, na pasta `server/`, o comando controlado:

```bash
CONFIRM_PRIVILEGED_ACCESS=SIM \
ACTION=GRANT \
MATRICULA=<MATRICULA> \
TI_OPERATOR="<NOME_DO_RESPONSAVEL_TI>" \
npm run manage-inspector-access
```

Para revogar:

```bash
CONFIRM_PRIVILEGED_ACCESS=SIM \
ACTION=REVOKE \
MATRICULA=<MATRICULA> \
TI_OPERATOR="<NOME_DO_RESPONSAVEL_TI>" \
npm run manage-inspector-access
```

O comando:

- exige confirmação explícita;
- exige identificação do responsável da TI;
- opera dentro de transação;
- sincroniza perfil funcional e role administrativa;
- registra `TI_GRANT_INSPECTOR` ou `TI_REVOKE_INSPECTOR` em `audit_logs`;
- não recebe nem manipula senha do usuário.

## 3. Dados pessoais tratados pelo SEGEMPAT

O sistema pode armazenar, conforme os módulos utilizados:

- nome e matrícula funcional;
- setor e perfil de acesso;
- histórico de provas, notas e aprovações;
- respostas e tentativas;
- certificados;
- assinatura/evidência funcional quando aplicável;
- treinamentos;
- avaliações práticas;
- Cronograma e histórico de execução;
- ocorrências operacionais associadas a colaborador;
- logs de auditoria e identidade do responsável por alterações.

A empresa deve documentar a finalidade e o prazo de retenção de cada categoria. O código não deve definir sozinho prazos jurídicos de retenção sem aprovação institucional.

## 4. Minimização e acesso

- credenciais do MySQL nunca são entregues ao navegador;
- secrets permanecem no servidor/secrets manager;
- Operadores recebem somente escopo pessoal ou funcional autorizado;
- Inspetores recebem escopo operacional necessário à atividade;
- TI administra infraestrutura e privilégios sem necessidade de consulta rotineira ao conteúdo operacional;
- relatórios e exportações devem ser usados apenas para finalidade institucional autorizada;
- compartilhamentos fora do ambiente corporativo devem obedecer política interna do controlador.

## 5. Análises de desempenho

Recursos como `Evolução de Desempenho`, `Precisa Melhorar`, indicadores de risco e análises individuais devem funcionar como apoio ao trabalho do Inspetor.

O SEGEMPAT não deve ser tratado como mecanismo autônomo de punição, promoção, afastamento ou outra decisão trabalhista exclusivamente automatizada. Decisões com impacto relevante devem possuir análise humana e possibilidade de revisão conforme a política da empresa e a legislação aplicável.

## 6. Segurança e rastreabilidade

O ambiente corporativo deve manter:

- HTTPS para frontend e API;
- TLS entre API e MySQL em produção;
- cookies de sessão `HttpOnly` e `Secure`;
- CORS e origem de escrita em allowlist;
- storage privado para evidências;
- usuário MySQL da aplicação com privilégio mínimo;
- backups protegidos e restauração testada;
- logs técnicos e auditoria funcional;
- revisão periódica de usuários e privilégios;
- inativação imediata de contas quando perderem autorização;
- monitoramento e processo de resposta a incidentes.

## 7. Retenção e descarte

Antes da produção, o controlador deve preencher uma matriz de retenção contendo, no mínimo:

| Categoria | Finalidade | Base legal definida pela empresa | Prazo | Evento de descarte | Responsável |
| --- | --- | --- | --- | --- | --- |
| Cadastro funcional | A definir | A definir | A definir | A definir | A definir |
| Provas e tentativas | A definir | A definir | A definir | A definir | A definir |
| Certificados | A definir | A definir | A definir | A definir | A definir |
| Avaliações práticas | A definir | A definir | A definir | A definir | A definir |
| Ocorrências | A definir | A definir | A definir | A definir | A definir |
| Evidências/assinaturas | A definir | A definir | A definir | A definir | A definir |
| Auditoria | A definir | A definir | A definir | A definir | A definir |

Nenhum prazo deve ser inventado pelo aplicativo sem aprovação do controlador.

## 8. Direitos dos titulares

A empresa deve definir canal e procedimento para solicitações relacionadas a dados pessoais. Quando uma solicitação exigir correção, bloqueio, exportação ou outra providência no SEGEMPAT, a execução deve preservar integridade, histórico obrigatório e evidência de quem realizou a ação.

Solicitações de exclusão não devem apagar automaticamente histórico cuja manutenção seja necessária por obrigação legal, regulatória, contratual ou para exercício regular de direitos; essa decisão pertence ao controlador, com orientação jurídica/DPO quando necessário.

## 9. Incidentes

A TI deve possuir procedimento para:

1. identificar e conter o incidente;
2. preservar logs e evidências;
3. avaliar dados, titulares e sistemas afetados;
4. comunicar imediatamente o responsável interno por privacidade/Encarregado;
5. executar o procedimento corporativo de notificação quando aplicável;
6. documentar causa, impacto, correção e medidas preventivas.

## 10. Critério de aceite LGPD

O SEGEMPAT só deve ser descrito institucionalmente como adequado à governança de proteção de dados após, no mínimo:

- segregação de responsabilidades validada;
- matriz de retenção aprovada;
- finalidades e bases legais documentadas;
- responsável/controlador e Encarregado/canal definidos;
- política de acesso privilegiado aprovada;
- backup/restauração testados;
- resposta a incidentes definida;
- ambiente corporativo homologado;
- revisão pela área responsável por privacidade/compliance da empresa.

A aprovação técnica do código, isoladamente, não constitui certificação jurídica de conformidade com a LGPD.
