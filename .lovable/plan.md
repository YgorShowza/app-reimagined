# Plano: Recriar o app do Base44 neste projeto

## Objetivo

Reproduzir neste projeto Lovable o design do app criado no Base44, usando o código-fonte do GitHub como base principal e prints das telas como conferência visual.

## O que você precisa me enviar

1. **Link do repositório no GitHub** (ou conectar a conta do GitHub aqui, se o repositório for privado).
2. **Prints de cada tela do app** rodando no Base44 — para comparar o resultado final com o original.

## Etapas

### 1. Ler e analisar o código do repositório
- Clonar/ler o repositório (somente leitura, nada é alterado nele).
- Extrair: paleta de cores, tipografia (fontes, pesos, tamanhos), espaçamentos, bordas/raios, sombras e estrutura de layout de cada tela.
- Identificar as telas/rotas existentes no app original e os componentes usados em cada uma.

### 2. Migrar o design para este projeto
- Criar os tokens de design (cores, fontes, raios, sombras) em `src/styles.css` espelhando o original.
- Recriar cada tela como rota do TanStack Start, com os mesmos componentes e composição.
- Trocar o título/metadata padrão pelos do app original.

### 3. Conferência com os prints
- Comparar cada tela recriada com os prints enviados, ajustando divergências visuais (cores exatas, espaçamentos, alinhamentos).
- Capturar screenshots do preview e validar lado a lado antes de finalizar.

## Observações

- O código do Base44 não será copiado 1:1 (as stacks são diferentes) — o que será reproduzido é o **design e a experiência visual**, reimplementados com React + Tailwind + shadcn nesta stack.
- Funcionalidades de backend do app original (banco de dados, autenticação etc.) não estão neste plano; se o app original as tiver e você quiser, fazemos numa etapa seguinte.

## Detalhes técnicos

- Stack: TanStack Start v1 + React 19 + Tailwind CSS v4 + shadcn.
- Tokens de cor em formato oklch em `src/styles.css`.
- Cada tela vira uma rota em `src/routes/`, começando pela rota `/`.
