# CINAPSE — Catálogo Pessoal de Cinema

App web para gerenciar seu catálogo pessoal de filmes, com busca integrada ao TMDb, watchlists temáticas, listas com checklist, e dados de streaming.

## Features

- **Busca dual**: banco local curado (214 filmes) + busca ilimitada via TMDb API
- **Catálogo pessoal**: notas, tags, status (quero ver / assistido / abandonado), rating 1-5
- **Onde assistir**: dados de streaming no Brasil (Netflix, Mubi, Prime Video, etc.)
- **Watchlists temáticas**: crie listas como "Maratona Gaspar Noé" com barra de progresso
- **Checklists**: monte listas de filmes e risque conforme assiste
- **Estatísticas**: top gêneros, diretores, nota média
- **Adição manual**: para filmes fora do banco
- **Persistência**: tudo salvo em localStorage

## Setup rápido

```bash
# Instalar dependências
npm install

# Rodar em dev
npm run dev

# Build para produção
npm run build
```

## TMDb API Key (opcional mas recomendado)

A busca local funciona sem chave. Para busca ilimitada com pôsteres e streaming:

1. Crie conta gratuita em [themoviedb.org](https://www.themoviedb.org/signup)
2. Vá em Settings > API > Request an API Key
3. Cole a key na aba ⚙ do app

## Deploy na Vercel

1. Suba o projeto no GitHub
2. Conecte em [vercel.com](https://vercel.com)
3. Deploy automático — sem configuração extra

Ou via CLI:
```bash
npm i -g vercel
vercel
```

## Deploy no Netlify

```bash
npm run build
# Arraste a pasta `dist/` para netlify.com/drop
```

## Stack

- Vite + React 18
- TMDb API v3
- localStorage para persistência
- Zero dependências externas além do React

## PWA (opcional)

Para usar como app no celular, adicione um `manifest.json` no `public/` e registre um service worker. O app já tem meta `theme-color` configurado.
