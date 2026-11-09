# Roteiro para publicar o Cinapse na App Store

Este documento é um plano para uma publicação futura. Ele não altera o app. O alvo é um app gratuito, sem receita, sem compra dentro do app e sem anúncio, enviado com a conta do Apple Developer Program que o dono já possui.

As páginas oficiais foram lidas em 7 de novembro de 2026. Diretrizes, questionários e contratos mudam. Onde a decisão depende da Apple, do TMDB, da JustWatch, da ANPD ou de um dado que o repositório não registra, o item está marcado com **[confirmar]**.

Seguir esta lista não garante aprovação. A [diretriz 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality) deixa a utilidade do app a critério da revisão, e os [termos da API do TMDB](https://www.themoviedb.org/api-terms-of-use) reservam ao TMDB a palavra final sobre uso comercial e sobre conteúdo.

## Estado atual, lido no código

O Cinapse é um app web pessoal. `package.json` declara React 18 e Vite 6, com `react` e `react-dom` como únicas dependências de produção. Os scripts são `dev`, `build`, `preview`, `populate-db` e `test` (`node --test`). Não há Capacitor, projeto Xcode, `Info.plist`, ícone, manifest, service worker nem workflow de CI no repositório.

A interface está em `src/App.jsx`. As abas são Catálogo, Watchlists, Listas, Stats e Configurações. Dá para buscar, cadastrar filme à mão, guardar nota de 0 a 5, status (`quero_ver`, `assistido`, `abandonado`), tags, anotações, watchlists e checklists. Configurações exporta e importa um JSON do catálogo e das listas. A mesma tela abre o plano de marketing (`src/MarketingPlan.jsx`).

### Catálogo curado e busca

`src/db.js` embute 263 filmes. A busca local (`searchLocal`) roda nesse array, no aparelho, a partir de duas letras, e devolve até 12 resultados. Ela cobre título, título original, diretor, gêneros e elenco. Esses filmes aparecem sem senha. O README diz que a base curada continua disponível sem login.

A busca no TMDB usa `src/tmdb.js` e, com sessão autenticada, o proxy `api/tmdb.js`. Os dois caminhos pedem `language=pt-BR`. A busca devolve até 12 resultados. O detalhe pede `append_to_response=credits,watch/providers`. O código não envia `include_adult`. A referência oficial de [Search Movies](https://developer.themoviedb.org/reference/search-movie) documenta `include_adult` com padrão `false`.

Há dois modos de chave:

- Com sessão e `TMDB_API_KEY` no servidor, o navegador chama `/api/tmdb`. A chave fica no servidor.
- Sem isso, a chave v3 digitada em Configurações fica em `localStorage` (`cinapse-tmdb-key`) e o navegador chama `https://api.themoviedb.org` direto. O README avisa que backups antigos podem trazer essa chave; a importação ainda grava a chave se o arquivo a contiver e o modo nuvem estiver desligado. As exportações novas, em `handleExport`, gravam catálogo, watchlists e checklists.

Pôsteres vêm de `https://image.tmdb.org/t/p`. `index.html` carrega Fraunces, Space Mono e Inter de `fonts.googleapis.com`. O CSS tem fontes de reserva.

### Onde assistir

`extractStreamingBR` lê `watch/providers.results.BR`: assinatura (`flatrate`, tipo `sub`), até 3 aluguéis (`rent`), até 2 compras (`buy`) e o que estiver em `free`. A interface chama isso de “Onde Assistir (Brasil)”. Não há logo nem texto de atribuição do TMDB ou da JustWatch.

128 dos 263 filmes curados já trazem um array `streaming` com nome de serviço e tipo (`sub`, `rent`, `buy`). O repositório não diz de onde esses nomes saíram nem quando foram conferidos. Quando `movie.streaming` tem itens, a ficha mostra essa lista estática. O botão “Buscar no TMDb” só aparece se a lista embutida estiver vazia.

A documentação de [Watch Providers](https://developer.themoviedb.org/reference/movie-watch-providers) diz que a disponibilidade vem da parceria com a JustWatch e que o uso exige atribuição à JustWatch, sob pena de revogação da API. O app não chama `apis.justwatch.com`.

### Conta, sessão e dados

Existe uma senha compartilhada, `CINAPSE_PASSWORD`, com no mínimo 16 caracteres. Não há cadastro, e-mail, nome nem identificador de usuário. Quem tem a senha entra no mesmo catálogo.

`api/catalog.js` grava um único hash Redis, `cinapse:catalog:v1`, com `revision` e `data`. A gravação usa um script Lua de compare-and-swap. O corpo aceita até 3 MiB. O README pede um banco Upstash Redis dedicado, com persistência e sem descarte automático de chaves.

A sessão é o cookie `cinapse_session`, HttpOnly, `SameSite=Strict`, `Path=/api`, validade de 30 dias (`server/cloud.js`). Em HTTPS, ou em `VERCEL_ENV` `preview`/`production`, o cookie também leva `Secure`. O valor é um HMAC-SHA256 que inclui o token do Redis e a senha. Trocar a senha invalida as sessões, como o README descreve. “Desconectar” envia `DELETE /api/session`, zera o cookie e deixa o catálogo no Redis e a cópia no navegador.

Erros de senha: no máximo 10 tentativas em 15 minutos por endereço, contadas num script Lua. A chave Redis é `cinapse:login:` seguido de um HMAC-SHA256. A mensagem desse HMAC inclui o rótulo `rate`, a senha do catálogo e o IP; a chave do HMAC é o token do Redis. O valor guardado é o contador, com expiração de 900 segundos. O IP vem de `x-vercel-forwarded-for` na Vercel, ou do endereço do socket.

`server/http.js` recusa mutação cuja origem não seja exatamente o protocolo e o host do pedido. Também recusa `Sec-Fetch-Site: cross-site`. Um WebView em outra origem, como o app empacotado, não passa nessa checagem com o código de hoje.

### Cópia local

`src/storage.js` guarda o catálogo em `localStorage` (`cinapse-data-v1`) e um rascunho de aba em `sessionStorage` (`cinapse-pending-tab-v1`). Com sessão, edições locais entram em estado `pending` e a sincronização tenta de novo ao focar, ao voltar a rede, ao exibir a aba e a cada 60 segundos com a aba visível. O README descreve isso como continuar editando uma página já aberta se a conexão cair. Não há service worker: a primeira carga do site na Vercel depende da rede. O aviso “offline-first” do plano de marketing não corresponde a um cache de aplicativo.

O aviso `notif` em `App.jsx` é uma faixa dentro da página, por cerca de 2,5 segundos. Não há API de notificação do navegador, push nem widget. Não há folha de compartilhamento.

### O que a interface já deixa acessível

`index.html` usa `lang="pt-BR"`, `viewport-fit=cover` e as metas `apple-mobile-web-app-*`. Não há `apple-touch-icon`. O CSS respeita `safe-area-inset`. Há rótulos em “Senha do catálogo”, na chave local do TMDB, no botão de Configurações e em dois `role="status"`. Pôsteres usam `alt=""`. Várias ações são `div` com `onClick`. A nota em estrelas é um SVG sem nome acessível. Não há auditoria de contraste, foco ou VoiceOver no repositório.

Os testes cobrem sincronização (`tests/catalog-sync.test.js`), o cliente TMDB (`tests/tmdb.test.js`) e a API (`server/api.test.js`). Não há teste de interface, de acessibilidade nem de aparelho.

### Conteúdo do cofre

As tags fixas incluem “Novo Extremismo Francês”, “Body Horror”, “Asiático Extremo”, “Exploitation” e “Transgressor”. O cofre inclui, entre outros, *A Serbian Film*, *Salò ou os 120 Dias de Sodoma*, *Irreversível*, *Cannibal Holocaust*, *August Underground*, *Nekromantik*, *Aftermath* e *Ninfomaníaca*. As sinopses são texto curto. A de *Aftermath* fala em necrofilia; a de *A Serbian Film* fala em um ator pornô e depravação. Não há aviso de idade, filtro nem modo restrito. Os pôsteres, quando existem, vêm do TMDB sem triagem no código.

O plano de marketing dentro do app descreve, na fase 4, um “modelo freemium para features premium”.

## Fase 1 — Empacotar com Capacitor e cumprir a diretriz 4.2

A [diretriz 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality) pede funções, conteúdo e interface que elevem o app acima de um site reempacotado. A [4.2.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality) abre exceção de forma para catálogos: o texto diz que, fora catálogos, o app não deve ser sobretudo material de marketing, recorte de web, agregador ou coleção de links. Essa frase descreve o gênero. Ela não dispensa a 4.2.

A [diretriz 2.5.2](https://developer.apple.com/app-store/review/guidelines/#software-requirements) exige o app contido no próprio pacote e proíbe baixar ou executar código que introduza ou mude funções. O binário precisa levar o build do Vite. Carregar o site da Vercel dentro do WebView fica fora desse desenho.

A [diretriz 4.2.3 (ii)](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality) pede avisar o tamanho e pedir confirmação se o app precisar baixar recursos extras para funcionar no primeiro lançamento.

Guia de empacotamento: [Capacitor iOS](https://capacitorjs.com/docs/ios). A documentação descreve a origem local do app iOS como `capacitor://localhost`, salvo outra configuração. **[confirmar]** o esquema na versão do Capacitor que for instalada.

### Checklist

- [ ] Gerar o build estático (`npm run build`) e apontar o `webDir` do Capacitor para `dist`, de modo que catálogo, busca local e interface abram sem a Vercel.
- [ ] Embutir Fraunces, Space Mono e Inter no pacote. O CSS já declara reserva (`Georgia`, `ui-monospace`, sistema).
- [ ] Criar o projeto iOS no Xcode, com o bundle ID escolhido pelo dono. **[confirmar]** o identificador, o nome da equipe e se a conta do programa é de pessoa física ou organização. O repositório não tem esses dados.
- [ ] Declarar só iPhone, ou iPhone e iPad. Essa escolha muda as capturas obrigatórias da fase 4.
- [ ] Tratar rede ausente na interface: busca local e catálogo pessoal continuam; busca TMDB, pôster remoto e disponibilidade ao vivo explicam que precisam de rede.
- [ ] Guardar o catálogo pessoal num armazenamento que sobreviva à limpeza do WebView. Hoje ele está em `localStorage` e `sessionStorage`. **[confirmar]** no aparelho se o WebView do Capacitor mantém esse armazenamento e copiar para um depósito durável se a limpeza do sistema o apagar.
- [ ] Manter a fila que já existe (`pending`, evento `online`, nova tentativa). Ela só sincroniza depois que a sessão do app nativo for aceita pelo servidor.
- [ ] Ajustar `server/http.js` e o cookie de sessão para a origem real do app. Do jeito que está, mutação com `Origin` diferente do host da API recebe 403, e o cookie `SameSite=Strict` em `Path=/api` não segue um pedido cross-site vindo de `capacitor://localhost`. **[confirmar]** no aparelho o desenho: origem permitida de forma explícita, ou sessão por cabeçalho guardada na Keychain. O site na Vercel pode continuar com o cookie atual.
- [ ] Deixar pôsteres já vistos disponíveis offline quando o filme está no catálogo pessoal, com prazo alinhado ao limite de cache do TMDB (fase 3).

### Offline que a diretriz consegue ver

O revisor precisa abrir o app sem rede e usar o catálogo. O cofre de 263 filmes já está no JavaScript. O que falta é o pacote local, a cópia durável do catálogo da pessoa e uma interface que não dependa de um documento servido pela Vercel.

### Notificações

O aviso atual é só visual, dentro da página. Para a 4.2, a notificação tem de ser uma função do sistema, com motivo ligado ao catálogo.

- [ ] Notificação local, agendada pela pessoa, para um filme em “quero ver” ou numa watchlist. Funciona offline e não exige conta. API: [User Notifications](https://developer.apple.com/documentation/usernotifications). Plugin a avaliar na implementação: [Push Notifications do Capacitor](https://capacitorjs.com/docs/apis/push-notifications) cobre o registro remoto; lembrete local tem guia próprio em [Local Notifications](https://capacitorjs.com/docs/apis/local-notifications). **[confirmar]** os pacotes na data da implementação.
- [ ] Pedir autorização de notificação no momento em que a pessoa liga o lembrete. A [diretriz 5.1.2 (i)](https://developer.apple.com/app-store/review/guidelines/#data-use-and-sharing) proíbe condicionar o uso do app à autorização de push.
- [ ] Push só se houver um fato novo para avisar, por exemplo uma disponibilidade no Brasil que a pessoa pediu para acompanhar. Isso exige chave APNs, capability e um envio no servidor. O código não atualiza `streaming` sozinho: a lista ao vivo entra na ficha na hora da busca. **[confirmar]** se o lembrete local basta para a primeira versão. Push sem um evento real não acrescenta função.

### Widget e compartilhamento

- [ ] Widget de catálogo, por exemplo a contagem de “quero ver” ou o próximo título de uma watchlist. WidgetKit é extensão nativa no Xcode: [WidgetKit](https://developer.apple.com/documentation/widgetkit). A [diretriz 4.4](https://developer.apple.com/app-store/review/guidelines/#extensions) pede que a extensão siga o guia de App Extensions e tenha função própria. **[confirmar]** se algum plugin Capacitor ainda mantido cobre WidgetKit; o caminho estável é a extensão Swift lendo uma cópia pequena do catálogo no App Group.
- [ ] Compartilhar um título pelo share sheet do sistema, com o texto que a pessoa escolhe enviar. Guia: [Sharing](https://developer.apple.com/design/human-interface-guidelines/sharing). A [diretriz 5.1.1 (iii)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) prefere o share sheet a pedir acesso amplo a Fotos ou Contatos. Plugin a avaliar: [Share](https://capacitorjs.com/docs/apis/share).
- [ ] Limitar o que sai no compartilhamento e no widget a dados que o TMDB e a JustWatch permitem redistribuir. Pôster e sinopse são conteúdo TMDB. **[confirmar]** com os termos se a imagem pode ir para um widget ou para outro app. Na dúvida, o widget mostra título e status gravados pela pessoa, sem pôster.

## Fase 2 — Conta por pessoa e exclusão dentro do app

Hoje qualquer aparelho com a mesma senha lê e grava `cinapse:catalog:v1`. Isso serve a um catálogo particular. Num app público, cada pessoa precisa do próprio acervo, e a senha de uma não pode abrir o acervo de outra.

A [diretriz 5.1.1 (v)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) diz: se o app não tem função relevante ligada a conta, a pessoa usa sem login; se o app permite criar conta, também oferece exclusão da conta dentro do app. O cofre curado e um catálogo só neste aparelho já funcionam sem senha. A conta fica restrita a sincronizar o catálogo pessoal. O detalhe operacional está em [Offering account deletion in your app](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/).

A [diretriz 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services) exige um login equivalente ao Sign in with Apple quando a conta principal usa login de terceiro (Facebook, Google, X e os outros citados). A exceção do próprio texto cobre o app que usa só o cadastro e o login do próprio desenvolvedor. O plano usa e-mail e senha do Cinapse. **[confirmar]** essa leitura se, no futuro, entrar algum login de terceiro: nesse caso o Sign in with Apple passa a ser obrigatório, e a exclusão da conta tem de revogar o token pela API da Apple, como no [aviso de 2022](https://developer.apple.com/news/?id=12m75xbj).

### Checklist

- [ ] Cadastro com identificador da pessoa (e-mail) e segredo só dela. A senha única `CINAPSE_PASSWORD` deixa de ser a chave de todos os catálogos.
- [ ] Chave Redis por conta, no lugar do hash único `cinapse:catalog:v1`. Sessão, limite de tentativas e catálogo de uma conta não leem dados de outra.
- [ ] Migrar o hash atual para a conta do dono antes de abrir o cadastro público. **[confirmar]** o procedimento com um backup JSON exportado antes da migração.
- [ ] Manter busca no cofre, cadastro manual e catálogo local sem conta, como a 5.1.1 (v) descreve para função que não depende de conta.
- [ ] Pedir em Configurações só o dado necessário para sincronizar. A 5.1.1 (x) permite nome e e-mail quando o pedido é opcional e o resto do app não depende disso. E-mail para a conta de sincronização é o identificador da conta; o cofre local continua sem ele.
- [ ] Exclusão da conta dentro de Configurações, fácil de achar, com confirmação. O fluxo apaga o registro da conta e o catálogo dessa conta no Redis, invalida a sessão e limpa a cópia local daquela conta neste aparelho.
- [ ] Oferecer o JSON que a exportação já gera antes de apagar, para a pessoa guardar o acervo.
- [ ] Dizer na hora se algo permanece e por quê. O contador de senha errada expira em 15 minutos pelo `EXPIRE` do script atual. Logs de infraestrutura da Vercel e do Upstash ficam com esses provedores. **[confirmar]** o prazo real de cada provedor e escrever isso na política e na tela de exclusão.
- [ ] Desativar a conta, sozinha, não cumpre o pedido da Apple. A página de exclusão diz que desativar ou desabilitar de forma temporária é insuficiente.
- [ ] Se a conclusão levar tempo, avisar na tela. Para este catálogo, a exclusão pode ser imediata no Redis; **[confirmar]** se algum backup do Upstash retém o documento depois do `DEL` e por quanto tempo.
- [ ] Conta de demonstração para a revisão, com catálogo de exemplo, como pede a [diretriz 2.1 (a)](https://developer.apple.com/app-store/review/guidelines/#app-completeness). As notas de revisão explicam onde fica a exclusão.
- [ ] Teste de isolamento: duas contas não veem filmes, notas nem listas uma da outra; a exclusão de uma deixa a outra intacta.

A diretriz [1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content) trata de conteúdo que as pessoas criam e disponibilizam no app (filtro, denúncia, bloqueio e contato publicado). Notas e listas deste plano ficam na conta de quem as escreveu. O código atual não publica esse texto para outras pessoas. **[confirmar]** com a App Review se anotações privadas entram na 1.2. Se o compartilhamento da fase 1 publicar nota ou lista para terceiros, os quatro mecanismos da 1.2 passam a fazer parte do envio.

## Fase 3 — TMDB, JustWatch, privacidade, LGPD e idade

### TMDB

Termos lidos: [API Terms of Use](https://www.themoviedb.org/api-terms-of-use), atualizados em 20 de outubro de 2023 no próprio texto. O uso também depende dos [Terms of Use](https://www.themoviedb.org/terms-of-use).

- [ ] Colocar o logo do TMDB menos em destaque que a marca do Cinapse, deixando claro que não há endosso. O parágrafo 3 pede este aviso, em destaque: “This [website, program, service, application, product] uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.”
- [ ] Atribuir a JustWatch em toda tela que mostre disponibilidade vinda de `watch/providers`. A [referência do endpoint](https://developer.themoviedb.org/reference/movie-watch-providers) exige a atribuição e avisa que o descumprimento revoga a API. Uma [resposta de funcionário do TMDB](https://www.themoviedb.org/talk/60355e30a284eb003da676f2) pede referência ou logo em cada obra, como no site do TMDB. A página do endpoint, no trecho lido, não fixa o lugar do crédito. **[confirmar]** o formato com o TMDB antes de depender só da resposta no fórum.
- [ ] Decidir a origem dos 128 registros `streaming` embutidos em `src/db.js`. O código não cita fonte nem data. Se vieram do TMDB ou da JustWatch, valem atribuição e o prazo de cache. Se forem anotação própria do dono, a ficha precisa deixar isso visível e separar esses nomes da disponibilidade ao vivo. **[confirmar]** a origem com o dono. Até lá, o roteiro não trata essa lista como dado JustWatch.
- [ ] Cumprir o limite de cache de 6 meses do parágrafo 1.C para informação obtida do TMDB. O catálogo guarda `poster_path`, sinopse, elenco, gêneros e `streaming` sem validade. **[confirmar]** com o TMDB se a ficha que a pessoa salvou no catálogo pessoal conta como cache. O plano prevê data de obtenção e renovação ou remoção dos campos vindos da API.
- [ ] Manter o app gratuito, sem anúncio e sem cobrança pelo conteúdo do TMDB. O parágrafo 2 trata como uso comercial vender, alugar, sublicenciar ou obter receita, direta ou indireta, e diz que o TMDB decide se o uso é comercial. Um [comentário de funcionário](https://www.themoviedb.org/talk/6abd0df8de4482c46644287e) afirma que um app sem receita pode usar a chave de desenvolvedor. Esse comentário não substitui o contrato. **[confirmar]** por escrito com o TMDB que um app gratuito na App Store, aberto ao público, continua coberto pela chave não comercial.
- [ ] Tirar do app o texto de “modelo freemium” em `src/MarketingPlan.jsx` antes do envio. A [diretriz 2.3.1 (a)](https://developer.apple.com/app-store/review/guidelines/#accurate-metadata) trata como problema promover função ou preço que o app não oferece. Cobrar também mudaria o enquadramento do parágrafo 2 do TMDB.
- [ ] Olhar a restrição do parágrafo 1.C a aplicativo que, a critério do TMDB, seja usado com conteúdo obsceno, pornográfico, abusivo ou ofensivo. O cofre é de cinema extremo e a busca TMDB traz sinopses e pôsteres de filmes gerais. **[confirmar]** com o TMDB se esse catálogo pode usar a API.
- [ ] Identificar o aplicativo nas requisições, como o mesmo parágrafo pede ao proibir ocultar a identidade do aplicativo. **[confirmar]** o `User-Agent` ou o registro que o TMDB exige na data do envio.
- [ ] Não usar o TMDB para treinar modelo de máquina. O app não faz isso hoje. O plano permanece assim.
- [ ] Guardar a chave só no servidor para o app da loja. A chave no `localStorage` cabe no uso pessoal no navegador; no binário público ela vaza com o tráfego. O proxy `api/tmdb.js` já existe para a sessão autenticada.

### JustWatch

O Cinapse não é cliente da [Partner API da JustWatch](https://apis.justwatch.com/docs/api/). Essa API pede contrato e token de parceiro. Os dados ao vivo entram pela parceria que o TMDB declara na referência de watch providers.

- [ ] Atribuição da JustWatch junto de cada lista ao vivo, no formato que o TMDB confirmar.
- [ ] **[confirmar]** com a JustWatch se redistribuir esses dados num app da App Store exige contrato direto além da atribuição exigida pelo TMDB. A [página de content partner](https://apis.justwatch.com/docs/content_partner/) descreve a integração sob contrato; ela não diz, no trecho público lido, qual regra vale para quem só consome o endpoint do TMDB.
- [ ] Mostrar a lista estática do cofre com a procedência definida no item do TMDB, sem apresentá-la como disponibilidade atual.

### Política de privacidade e rótulos

A [diretriz 5.1.1 (i)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) exige o link da política no App Store Connect e dentro do app, em lugar fácil. A política precisa dizer o que é coletado, como, para que, com quem é compartilhado, por quanto tempo fica guardada e como a pessoa revoga ou pede exclusão.

Os [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/) são obrigatórios para app novo. “Coletar”, nessa página, é transmitir o dado para fora do aparelho de um jeito que o desenvolvedor ou um terceiro consiga acessá-lo por mais tempo do que o necessário para atender o pedido em tempo real. Dado de rastreio para publicidade entra noutra regra: este plano não inclui rastreio nem o App Tracking Transparency, porque o app não cruza dado com publicidade de terceiro.

Mapear na hora do envio, sem preencher o rótulo neste roteiro:

| Dado que o código trata | Para onde vai | Uso |
| --- | --- | --- |
| Filmes, notas, status, tags, anotações, watchlists, checklists | `localStorage` hoje; Redis quando há sessão | Funcionamento do catálogo. Com conta, fica ligado à pessoa. |
| E-mail e segredo da conta | Ainda não existem. Fase 2. | Identificar a conta de sincronização. |
| Cookie de sessão | Navegador, 30 dias | Manter a sessão. |
| Contador de senha errada, sob chave HMAC que inclui o IP | Redis, 15 minutos | Conter tentativa de senha. O IP em claro não é o valor gravado. |
| Consulta e id de filme | TMDB, direto ou via proxy | Busca e ficha. |
| Pedido de fonte | Google, enquanto `index.html` apontar para `fonts.googleapis.com` | Carregar a fonte. Some se a fonte for embutida na fase 1. |
| Pôster | `image.tmdb.org` | Exibir a imagem. |

- [ ] Escrever a política em português, com a URL pública que a ficha da loja vai usar.
- [ ] Ligar essa URL em Configurações.
- [ ] Declarar no App Store Connect cada tipo da lista oficial que de fato for coletado, se está ligado à identidade e se o uso é funcionalidade do app. Tipos a comparar com a tabela acima, pelas definições da própria página: User ID, Email Address, Other User Content e, se o texto livre for enquadrado assim, Sensitive Info. **[confirmar]** o enquadramento de anotações livres e da chave de limite que inclui o IP. A página não lista “endereço IP” como tipo com esse nome.
- [ ] Incluir no rótulo o que os parceiros coletam. Parceiros deste desenho: Vercel (funções e logs), Upstash (Redis), TMDB (consulta) e, se a fonte remota continuar, Google. **[confirmar]** retenção e subprocessadores no contrato de cada um.
- [ ] Deixar o rótulo alinhado à política. A diretriz 2.3 pede metadados de privacidade fiéis ao app.

### LGPD

Lei [nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm). A diretriz 5.1 diz que o desenvolvedor cumpre a lei de cada lugar em que o app é oferecido. Este roteiro não substitui assessoria jurídica.

- [ ] Tratar o dono do app como controlador quando a conta e o catálogo de outras pessoas passarem a ser operados por ele. Base legal no art. 7º. Execução de contrato (art. 7º, V) é a candidata para a sincronização pedida pela pessoa; consentimento (art. 7º, I) cabe a tratamento opcional. **[confirmar]** a base de cada operação com quem assina o jurídico. O art. 9º exige informação clara quando a base for consentimento.
- [ ] Atender o art. 18 no produto: confirmação, acesso, correção, eliminação e informação sobre compartilhamento. A exportação JSON já entrega uma cópia do catálogo e das listas. A exclusão da fase 2 cobre a eliminação da conta. **[confirmar]** se o formato do JSON atende portabilidade na regulamentação vigente da ANPD.
- [ ] Nomear operadores na política: Vercel, Upstash e TMDB, mais Google se as fontes continuarem remotas.
- [ ] Art. 41 exige encarregado, com a flexibilização da [Resolução CD/ANPD nº 2, de 27 de janeiro de 2022](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022), art. 11: agente de tratamento de pequeno porte não é obrigado a indicar encarregado e, se não indicar, disponibiliza canal com o titular. A [Resolução CD/ANPD nº 18, de 16 de julho de 2024](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-18-de-16-de-julho-de-2024-572632074), no regulamento do encarregado, repete esse canal. **[confirmar]** se o dono se enquadra como agente de pequeno porte e se o tratamento é de alto risco. A resolução não dispensa quem faz tratamento de alto risco, e a ANPD pode repor a obrigação (art. 16 da Resolução nº 2).
- [ ] Art. 14, dados de crianças e adolescentes. O app não entra na [Kids Category](https://developer.apple.com/app-store/review/guidelines/#kids-category). A classificação etária da loja não substitui o art. 14. **[confirmar]** o tratamento se um adolescente criar conta.
- [ ] Canal publicado para o titular, o mesmo contato da política e da ficha da loja.

### Classificação etária

O questionário do App Store Connect gera a classificação. Valores e descritores: [Age ratings values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/). Como definir: [Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/).

No texto lido em 7 de novembro de 2026, a classificação global inclui 4+, 9+, 13+, 16+ e 18+. Horror ou medo frequente aparece no 13+. Conteúdo sexual ou nudez frequente, e violência realista frequente, aparecem no 18+. A faixa **Unrated** cobre conteúdo sexual gráfico e nudez, e violência realista gráfica ou sádica prolongada, em frequência infrequente ou frequente. O mesmo texto diz que Unrated não pode ser publicado na App Store.

Para o Brasil, a mesma página diz que a App Store mostra pictogramas regionais. Apps sem classificação oficial do Ministério da Justiça e Segurança Pública usam a escala autodeclarada (AL, A6, A10, A12, A14, A16, A18). Se o MJSP emitir classificação, a Apple atualiza o pictograma. A18 autodeclarado, na tabela lida, inclui temas maduros ou sugestivos frequentes, conteúdo sexual ou nudez frequente e violência realista frequente.

A [diretriz 1.1](https://developer.apple.com/app-store/review/guidelines/#objectionable-content) pede que o app não traga conteúdo ofensivo, insensível, perturbador, feito para causar nojo ou de mau gosto. A 1.1.2 cita representações realistas de pessoas ou animais mortos, mutilados, torturados ou abusados. A 1.1.4 define material sexual ou pornográfico explícito como “explicit descriptions or displays of sexual organs or activities intended to stimulate erotic rather than aesthetic or emotional feelings.”

- [ ] Inventariar o que a build de loja realmente mostra: sinopses curtas, tags, pôsteres do TMDB e títulos do cofre. O app não exibe o filme.
- [ ] Responder o questionário a partir desse inventário. **[confirmar]** com a App Review se as sinopses e os pôsteres deste cofre caem em “graphic sexual content and nudity” ou “prolonged graphic or sadistic realistic violence”. Se caírem, a tabela oficial os trata como Unrated e a App Store não publica o app. Este roteiro não escolhe a faixa.
- [ ] Se a build permanecer publicável, responder horror, violência, sexo, drogas e temas maduros na frequência que o conteúdo exibido sustenta. Várias sinopses citam drogas, violência e sexo. A busca TMDB acrescenta o que a API devolver com `include_adult` no padrão `false`.
- [ ] Aviso dentro do app, antes do cofre e da ficha, deixando claro que o acervo inclui terror extremo. A página de idades descreve “Age Assurance” e “Parental Controls” como controles que o questionário pergunta se existem. **[confirmar]** se a Apple exige esse controle dentro do app ou se o limite da conta Apple basta. Não marcar no questionário um controle que o app não tenha.
- [ ] Fora da Kids Category. A diretriz 2.3.8 reserva “For Kids” e “For Children” a essa categoria.
- [ ] A partir de 16 de novembro de 2026 o questionário ganha os descritores Shared Location e Dating and Relationships, obrigatórios em todo app até 12 de janeiro de 2027 ([aviso da Apple](https://developer.apple.com/news/?id=yxkh08us)). O Cinapse não tem esses recursos. Declarar a ausência quando o formulário pedir. Dating and Relationships, se existisse, teria mínimo 18+.
- [ ] **[confirmar]** se vale pedir classificação indicativa oficial ao MJSP. A página da Apple diferencia o pictograma oficial do autodeclarado e não obriga, no trecho lido, o selo do MJSP para um app que não é aposta.

## Fase 4 — Testes, acessibilidade, ícone e capturas

### Testes

- [ ] Manter `npm test` verde. Ele cobre sincronização, cliente TMDB e API HTTP.
- [ ] Acrescentar testes das contas da fase 2: isolamento, sessão expirada, exclusão e o limite de tamanho que já existe.
- [ ] Testar no aparelho os fluxos da fase 1: abrir sem rede, lembrete local, widget, compartilhar, sincronizar e apagar a conta. A Apple pede teste em aparelho real antes da revisão: [Test your app on compatible devices](https://developer.apple.com/help/app-review/before-submitting-for-review/test-compatible-devices/).
- [ ] **[confirmar]** um CI que rode `npm test` no pull request. O repositório não tem workflow.

### Acessibilidade

Guia: [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility). O que o código mostra hoje entra na lista abaixo.

- [ ] Nome acessível em pôsteres que forem informativos, nas estrelas de nota, nos cartões clicáveis e nos botões que só têm ícone ou “×”.
- [ ] Foco visível e ordem de teclado na busca, nas abas, no conflito de sincronização e na exclusão de conta.
- [ ] Alvos de toque folgados nas abas e nos controles da ficha.
- [ ] Contraste do texto dourado (`#d4a853`) e do texto apagado (`#8d8779`, `#5a564e`) sobre `#0a0a0b` e `#121116`. **[confirmar]** as razões de contraste na build final.
- [ ] Estado de filme que não dependa só da cor. “VISTO” e “LISTA” já levam texto; a nota em estrelas, não.
- [ ] VoiceOver em português nas telas de catálogo, ficha, configurações, conta e exclusão.
- [ ] Tipo dinâmico e redução de movimento. Há animações CSS (`fadeUp`, `spin`) sem alternativa.
- [ ] O plano de marketing deixa de ocupar a configuração do app de loja, ou passa a descrever só o que a build faz. A fase 3 já pede a retirada do freemium.

### Ícone

Não há arquivo de ícone no repositório. O ícone entra no asset catalog do Xcode e segue para o TestFlight e a loja: [Add an app icon](https://developer.apple.com/help/app-store-connect/manage-app-information/add-an-app-icon/) e [App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons).

- [ ] Ícone do Cinapse, sem marca de terceiro (diretriz 4.1 (c)).
- [ ] Adequado a público geral. A [diretriz 2.3.8](https://developer.apple.com/app-store/review/guidelines/#accurate-metadata) pede que ícone, capturas e previews sigam o patamar 4+ mesmo quando o app tem classificação maior.
- [ ] Direitos da arte com o dono (diretriz 2.3.9).

### Capturas e texto da ficha

Especificação: [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/). Em 7 de novembro de 2026 a página pede ao menos uma captura de iPhone com Dynamic Island (tela média) e, se o app roda no iPad, uma de iPad de 13 polegadas. Até 10 imagens por tamanho, JPEG ou PNG, sem canal alfa. A mesma página avisa que, a partir de abril de 2027, apps com o SDK iOS 27.1 passam a precisar de capturas do iPhone Duo. **[confirmar]** os pixels na tabela vigente no dia do envio.

- [ ] Capturas com o app em uso: catálogo, ficha, watchlist, estatística. A [diretriz 2.3.3](https://developer.apple.com/app-store/review/guidelines/#accurate-metadata) recusa captura que seja só a abertura, o título ou a tela de login.
- [ ] Imagens no patamar 4+ da diretriz 2.3.8: sem pôster gráfico, sem sinopse extrema e sem título que a página de metadados trataria como impróprio para qualquer público.
- [ ] **[confirmar]** o direito de usar pôsteres do TMDB nas capturas. Se o direito não estiver claro, as capturas mostram a interface com fichas sem pôster de terceiro.
- [ ] Nome com até 30 caracteres (diretriz 2.3.7). “Cinapse” cabe. Subtítulo e descrição falam do catálogo pessoal e do cofre curado, sem “definitivo” e sem o freemium do plano de marketing.
- [ ] Sem nome, ícone ou imagem de outra plataforma (diretriz 2.3.10).
- [ ] Dados de exemplo fictícios nas capturas (diretriz 2.3.9).
- [ ] URL de suporte e URL da política de privacidade, ambas públicas. **[confirmar]** os endereços. O repositório não os define.
- [ ] Preço gratuito e nenhuma compra dentro do app. A [diretriz 3.2.2 (iv)](https://developer.apple.com/app-store/review/guidelines/#other-business-model-issues) restringe coleta de doação dentro do app. Este plano não inclui doação, anúncio nem pagamento.
- [ ] Categoria. **[confirmar]** entre as categorias do App Store Connect. Fica fora da Kids Category.

## Fase 5 — TestFlight e App Review

Conta do programa: já existe, segundo o pedido deste roteiro. App gratuito continua sujeito às diretrizes e à taxa do programa. **[confirmar]** no App Store Connect se essa conta está ativa e com os acordos pagos em dia. O repositório não mostra o estado da conta.

### Criptografia e exportação

O servidor usa HMAC-SHA256 e SHA-256 de `node:crypto` para sessão e senha. O app iOS, neste plano, fala com a API por HTTPS e não leva cifra própria além do que o sistema oferece. O TestFlight aponta para a declaração de criptografia: [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/) e [complying with encryption export regulations](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations).

- [ ] Responder o questionário de export compliance da build. **[confirmar]** se o uso de HTTPS e do HMAC no servidor se enquadra na isenção documentada. Não marcar isenção sem ler o questionário da build.

### TestFlight

Visão geral: [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/). Limites lidos nessa página e em [Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/): até 100 testadores internos (usuários do App Store Connect com acesso ao conteúdo) e até 10.000 externos. Cada build fica disponível para teste por até 90 dias. A primeira build de um grupo externo vai à revisão; builds seguintes podem dispensar revisão completa. A [diretriz 2.2](https://developer.apple.com/app-store/review/guidelines/#beta-testing) manda usar o TestFlight para beta, e o beta também segue as diretrizes. TestFlight não pode ser distribuído em troca de pagamento.

- [ ] Ficha de teste: o que exercitar (offline, conta, exclusão, onde assistir, widget) e um e-mail de retorno.
- [ ] Grupo interno com o dono, num iPhone real, antes de qualquer convite externo.
- [ ] Grupo externo só com a build que já cumpre atribuição, política, exclusão de conta e a classificação respondida. A primeira build externa passa por revisão.
- [ ] Corrigir o que o feedback do TestFlight mostrar e subir outra build. Build antiga expira em 90 dias.

### Envio para revisão

- [ ] Notas de revisão específicas (diretriz 2.3.1): app gratuito e sem fins lucrativos, onde está a exclusão da conta, conta de demonstração, atribuição TMDB e JustWatch, e o que funciona offline.
- [ ] Serviço de nuvem ligado durante a revisão (diretriz 2.1).
- [ ] Questionário de idade, rótulos de privacidade, política, suporte, capturas e ícone conferidos contra a build enviada.
- [ ] “What’s New” descrevendo as funções reais (diretriz 2.3.12).
- [ ] Marcar Content Rights no App Store Connect: o app mostra conteúdo de terceiro (TMDB e, na disponibilidade ao vivo, JustWatch). A [ficha de App Information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/) exige os direitos desse conteúdo em cada país em que o app for oferecido.
- [ ] Disponibilidade no Brasil, onde o cofre e a disponibilidade de streaming estão escritos. **[confirmar]** outros países. A interface e as sinopses do cofre estão em português; a busca TMDB pede `pt-BR`. A mesma ficha de App Information diz que, na Coreia, app nas categorias Games ou Entertainment com frequência alta de conteúdo sexual, drogas ou violência realista pode exigir número de classificação do GRAC para permanecer à venda lá. **[confirmar]** a categoria e se a Coreia entra na disponibilidade.

## Ordem

1. Empacotar o build e provar o uso offline no simulador e num iPhone.
2. Sessão que o servidor aceita a partir da origem do app, ainda com o catálogo do dono.
3. Contas isoladas, migração do hash atual e exclusão dentro do app.
4. Atribuição, política, rótulos e questionário de idade, com as confirmações do TMDB, da JustWatch e da ANPD.
5. Ícone, capturas no patamar 4+, testes de aparelho.
6. TestFlight interno, depois externo, depois revisão de produção.

## Confirmações reunidas

- [ ] Bundle ID, equipe Apple e tipo da conta (pessoa ou organização).
- [ ] Esquema de origem do Capacitor na versão instalada e o desenho da sessão (cookie ou Keychain) provado num iPhone.
- [ ] Se o lembrete local dispensa push na primeira versão.
- [ ] Se o widget pode mostrar pôster do TMDB.
- [ ] Procedência dos 128 `streaming` estáticos em `src/db.js`.
- [ ] Resposta por escrito do TMDB: app gratuito na loja, cache de 6 meses na ficha salva, conteúdo extremo do cofre, texto e lugar da atribuição JustWatch.
- [ ] Resposta da JustWatch sobre contrato direto para quem só usa `watch/providers` do TMDB.
- [ ] Enquadramento dos rótulos (anotação livre, chave de limite que inclui o IP, logs da Vercel e do Upstash) e prazos de retenção.
- [ ] Base legal da LGPD, portabilidade do JSON, art. 14 e enquadramento como agente de pequeno porte.
- [ ] Se sinopses e pôsteres deste cofre produzem classificação Unrated.
- [ ] Se a Apple exige controle de idade dentro do app.
- [ ] Classificação oficial do MJSP, se for pedida.
- [ ] Pixels das capturas na data do envio e direito de usar pôsteres nelas.
- [ ] URLs públicas de suporte e de privacidade.
- [ ] Categoria da ficha, países além do Brasil e, se for Entertainment ou Games com descritor frequente de sexo, drogas ou violência realista, o número do GRAC para vender na Coreia.
- [ ] Isenção de exportação de criptografia no questionário da build.
- [ ] Contratos do Apple Developer Program em dia.

## Fontes

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.5.2, 3.2.2, 4.1, 4.2, 4.4, 4.8, 5.1.1, 5.1.2
- [Exclusão de conta, 5.1.1 (v)](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/)
- [Aviso de exclusão de conta](https://developer.apple.com/news/?id=12m75xbj)
- [Novos descritores de idade](https://developer.apple.com/news/?id=yxkh08us)
- [Valores de classificação etária](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/)
- [Definir a classificação](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/)
- [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- [Testadores internos](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/)
- [Teste em aparelhos compatíveis](https://developer.apple.com/help/app-review/before-submitting-for-review/test-compatible-devices/)
- [App Information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/), inclusive Content Rights e exigência do GRAC na Coreia
- [Especificação de capturas](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [Ícone](https://developer.apple.com/help/app-store-connect/manage-app-information/add-an-app-icon/) e [HIG App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) e [HIG Sharing](https://developer.apple.com/design/human-interface-guidelines/sharing)
- [User Notifications](https://developer.apple.com/documentation/usernotifications), [WidgetKit](https://developer.apple.com/documentation/widgetkit)
- [Exportação de criptografia](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations)
- [Capacitor iOS](https://capacitorjs.com/docs/ios), [Share](https://capacitorjs.com/docs/apis/share), [Local Notifications](https://capacitorjs.com/docs/apis/local-notifications), [Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Termos da API do TMDB](https://www.themoviedb.org/api-terms-of-use) e [Terms of Use](https://www.themoviedb.org/terms-of-use)
- [Search Movies](https://developer.themoviedb.org/reference/search-movie) e [Watch Providers](https://developer.themoviedb.org/reference/movie-watch-providers)
- [Atribuição JustWatch no fórum do TMDB](https://www.themoviedb.org/talk/60355e30a284eb003da676f2) e [comentário sobre app sem receita](https://www.themoviedb.org/talk/6abd0df8de4482c46644287e)
- [JustWatch Partner API](https://apis.justwatch.com/docs/api/) e [Content Partner](https://apis.justwatch.com/docs/content_partner/)
- [LGPD, Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Resolução CD/ANPD nº 2/2022](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)
- [Resolução CD/ANPD nº 18/2024](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-18-de-16-de-julho-de-2024-572632074)
