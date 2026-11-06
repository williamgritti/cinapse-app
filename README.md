# Cinapse — catálogo pessoal de cinema

O Cinapse combina uma base curada distribuída com o app, busca no TMDb e cadastro manual. Os filmes que você adiciona formam um catálogo pessoal com notas, avaliações, status, watchlists e checklists.

Além do catálogo, você pode consultar onde assistir no Brasil, criar watchlists temáticas, marcar filmes vistos em checklists e acompanhar estatísticas de gêneros, diretores e avaliações.

## Usar o mesmo catálogo no Mac e no iPhone

1. Abra o Cinapse no navegador que já tem seu catálogo. Em **Configurações → Exportar JSON**, guarde uma cópia. Se houver filmes em vários navegadores, exporte cada um separadamente.
2. Depois que a sincronização estiver configurada e publicada, volte ao **mesmo endereço** e navegador do primeiro passo. Em **Configurações → Sincronizar catálogo**, informe a senha e aguarde a confirmação de sincronização.
3. Acesse o mesmo site no outro aparelho e conecte com a mesma senha. Um navegador novo carrega o catálogo existente. Nos próximos acessos, o Cinapse retoma a sincronização com a sessão salva.
4. Se o único acervo disponível estiver em um backup antigo, importe o JSON em um navegador vazio **antes de conectar**. Backups antigos podem conter a chave do TMDb em texto legível. As novas exportações contêm apenas o catálogo e as listas.

Ao conectar, o Cinapse combina registros com base nos seus identificadores, preservando os vínculos das listas. Se dois aparelhos alteraram o mesmo registro de formas incompatíveis, Configurações permite escolher qual edição prevalece. Filmes cadastrados de forma independente nos dois aparelhos podem ter IDs diferentes. Uma **importação de arquivo** em um navegador já conectado substitui as coleções atuais após confirmação.

A cópia local permite continuar editando uma página já aberta durante uma falha de conexão. O Cinapse confere as alterações ao voltar à aba, ao recuperar a conexão e periodicamente enquanto a aba está visível. Ao desconectar, a cópia continua no navegador. Use um perfil pessoal.

## Configurar sincronização na Vercel

O backend atende **um catálogo particular por banco dedicado**. As funções em `api/` usam Redis via REST. Cada gravação verifica a revisão dentro do Redis. A base curada continua disponível em todos os aparelhos mesmo sem login.

1. Crie um banco **Upstash Redis** dedicado ao Cinapse com persistência habilitada e sem descarte automático de chaves por falta de espaço. Copie o endpoint REST e o token com permissão de escrita. [Documentação do Redis REST](https://upstash.com/docs/redis/features/restapi).
2. Nas configurações do projeto na Vercel, adicione as variáveis abaixo ao ambiente desejado. Use outro banco e outra senha para testar um Preview separado dos dados de produção.
3. Faça um novo deploy no ambiente configurado. Abra **Configurações**, conecte o primeiro navegador e confirme o resultado no segundo. [Variáveis de ambiente da Vercel](https://vercel.com/docs/environment-variables).

| Variável do servidor | Valor |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | URL HTTPS da API REST do banco |
| `UPSTASH_REDIS_REST_TOKEN` | Token de leitura e escrita |
| `CINAPSE_PASSWORD` | Senha exclusiva de pelo menos 16 caracteres, usada em cada aparelho |
| `TMDB_API_KEY` | Chave de API **v3** do TMDb, opcional. Com ela, a busca funciona para o proprietário conectado em todos os aparelhos. [Obter chave](https://www.themoviedb.org/settings/api) |

Mantenha os valores apenas no servidor, sem prefixo `VITE_`. As sessões usam um cookie HttpOnly. A troca da senha do catálogo invalida as sessões anteriores. O catálogo sincronizado aceita até 3 MiB por gravação. As mudanças no TMDb são consultadas ao buscar um filme. Os dados da ficha adicionada ficam salvos com o catálogo.

## Desenvolvimento

```sh
npm ci
npm run dev
npm test
npm run build
```

O servidor do Vite e hospedagens de arquivos estáticos oferecem o modo local. Para executar também as funções, use `vercel dev` com um banco dedicado de desenvolvimento e as variáveis acima. No modo local, é possível informar a chave do TMDb nas Configurações para uso naquele navegador.
