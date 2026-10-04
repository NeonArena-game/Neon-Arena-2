NEON ARENA 2 — v5.28 HALLOWEEN UPDATE
====================================

v5.28 — HALLOWEEN SEASONAL THEME
- Tema sazonal automático de Halloween ativo de 01/10 a 31/10.
- A cor primária da interface e dos elementos neon passa para laranja durante outubro.
- O tema usa a data local do dispositivo e não depende de preferência salva no localStorage.
- Painéis Phaser e elementos HTML/DOM recebem a adaptação de cor quando são criados.
- Fora de outubro, o visual normal do Neon Arena 2 permanece inalterado.
- Baseada na v5.27 GUI Size.

NEON ARENA 2 — v5.25 BETTER DETAILS
===================================

v5.25 — BETTER DETAILS + LOCALIZAÇÃO
- Novo sistema Better Details independente do Visual FX: OFF, LOW, MEDIUM, HIGH e ULTRA.
- Novo armazenamento da preferência em localStorage (neon_better_details_mode).
- Detalhes adicionais da arena, moldura, grade neon, indicadores de jogadores/inimigos e trails de projéteis, com atualização limitada para reduzir custo.
- Nova subpágina ?better-details-requisits com requisitos MÍNIMOS, IDEAIS, RECOMENDADOS e MÁXIMOS.
- Página de requisitos adaptada aos idiomas PT-BR, PT-PT, EN e ES.
- Expansão das traduções da interface principal para reduzir textos que permaneciam em PT-BR.
- Base preservada a partir da v5.24 Portable Save Data.

NEON ARENA 2 — v5.16 BUGFIX
=============================

v5.16 — CORREÇÕES DE BUGS
- Serviços são opcionais: o encerramento em 01/01/2027 não bloqueia mais o jogo.
- Daily/Monthly deixam de progredir ou recompensar após o encerramento dos serviços.
- A tela de encerramento aparece apenas ao acessar um serviço encerrado, com retorno à tela inicial.
- Projéteis guardam a arma usada no disparo; trocar de arma no meio do voo não altera dano/tipo do tiro já lançado.
- Vortex Launcher agora possui homing funcional.
- Chain Blaster agora encadeia corretamente os alvos até o limite configurado.
- Sintaxe JavaScript verificada com Node.js.

NEON ARENA 2 — v5.8
====================

v5.8 — DAILY + STATS UPDATE
- Desafio diário rotativo com 3 objetivos e recompensa de 1.000 pontos.
- Estatísticas persistentes: partidas, abates totais, melhor score, melhor partida e maior nível.
- Indicador rápido do desafio diário no menu.
- Painel de estatísticas e painel do desafio integrados ao menu e ao Modo TV.
- Sem LAN Arena: nenhuma dependência de Node.js/WebSocket foi adicionada.
- O Modo TV da v5.7 continua disponível, incluindo D-Pad, OK/Enter e Back.

NEON ARENA 2 — v5.0.3
=======================

NEON ARENA 2 — CHANGELOG COMPLETO
==================================
Versão do pacote: v5.0.2 BugFix + Changelog

Este README reúne as principais atualizações registradas nesta conversa do projeto Neon Arena 2.
A regra para os cenários/imagens permanece: os PNGs originais devem ser mantidos sem edição.
Este pacote de código não recria nem altera o conteúdo visual dos arquivos de imagem.

--------------------------------------------------
BASE / VERSÕES INICIAIS
--------------------------------------------------

v1.2 — Base Neon Arena 2
- Base inicial do Neon Arena 2 em HTML/Phaser.
- Sistema de jogador, inimigos, tiros, XP, níveis e pontuação.
- Sistema inicial de HP.
- Suporte a controles de teclado/mouse e touch.
- Loja, armas e sistemas iniciais de progressão.

v1.3 Enhanced
- Evolução da base com melhorias de interface e sistemas.
- Preparação para as grandes atualizações posteriores.

--------------------------------------------------
v3.0 / v3.1 — PERFORMANCE, INPUT E SKINS/DEBUG
--------------------------------------------------
- Melhorias de desempenho e tratamento de entrada.
- Ajustes para PC, touch e gamepad.
- Sistemas de debug e ajustes internos.
- Melhorias gerais de estabilidade.

--------------------------------------------------
v3.2 — NOVOS INIMIGOS
--------------------------------------------------
- Adição de novos tipos de inimigos.
- Expansão do sistema de combate.

--------------------------------------------------
v3.3 — SEGUNDA IA
--------------------------------------------------
- Segunda camada de IA.
- Inteligência de grupo.
- Evasão de projéteis.
- Previsão de movimento.
- Seleção de alvo em CO-OP.
- Flanqueamento e separação entre inimigos.

--------------------------------------------------
v4.0 — GIANT UPDATE
--------------------------------------------------
- Grande expansão do jogo.
- Diversos sistemas novos foram integrados.
- Esta versão apresentou um crash de runtime e serviu de base para a correção seguinte.

--------------------------------------------------
v4.0.1 — CORREÇÃO DE RUNTIME
--------------------------------------------------
- Correção baseada na estabilidade da v3.3.
- Restauração dos sistemas que estavam causando o crash da v4.0.

--------------------------------------------------
v4.0.2 — ACESSIBILIDADE
--------------------------------------------------
- Legendas adicionadas ao sistema de acessibilidade.
- Legendas passaram a ficar DESATIVADAS por padrão.

--------------------------------------------------
v4.0.3 — LIMPEZA DE ACESSIBILIDADE
--------------------------------------------------
- Limpeza do botão/sistema de acessibilidade.
- Ajustes para evitar elementos desnecessários no menu.

--------------------------------------------------
v4.1 — INVASÃO
--------------------------------------------------
- Criação do Modo Invasão.
- Sistema de ondas.
- Preparação para a conquista das 10 ondas.

--------------------------------------------------
v4.1.1 — SPAWN / ONDAS
--------------------------------------------------
- Spawn básico de inimigos na Invasão.
- Conquista por completar 10 ondas.
- Ajustes no fluxo das ondas.

--------------------------------------------------
v4.2 — PACOTÃO DE SISTEMAS
--------------------------------------------------
- Grande pacote de sistemas novos.
- Combo e melhor combo.
- Missões da partida.
- Overdrive.
- Estatísticas de execução.
- Kills e tiros da rodada.
- Mastery de armas.
- HUD adicional.
- Melhorias de progressão.

--------------------------------------------------
v4.3 — BOSSES
--------------------------------------------------
- Sistema de bosses.
- NEON KING.
- VOLT TITAN.
- VOID WALKER.
- AI OVERLORD.
- Barra de vida e nome do boss.
- Recompensas e conquistas relacionadas.

--------------------------------------------------
v4.3.1 — DEBUG DOS BOSSES
--------------------------------------------------
- Correções e ajustes de estabilidade do sistema de bosses.
- Melhorias no tratamento de estados de boss.

--------------------------------------------------
v4.4 — POLISH / PERFORMANCE
--------------------------------------------------
- Limites de entidades para reduzir sobrecarga.
- Limites de inimigos, projéteis e tornados.
- Sistema de replay com limite de frames.
- Modos de desempenho.
- Performance automática baseada no FPS.
- Indicador de entrada.
- Ferramentas de debug/polish.
- Controle opcional da análise de áudio.

--------------------------------------------------
v4.5 — DOIS MODOS / EXPANSÃO DE MODOS
--------------------------------------------------
- Expansão do sistema de modos de jogo.
- Preparação para modos especiais.
- Melhorias no fluxo de seleção de modos.

--------------------------------------------------
v4.5.1 — SWORD KEEPER
--------------------------------------------------
- Adição do Sword Keeper.
- Sistema de espada com cargas.
- Espada pode ser coletada após o inimigo deixar o drop.

--------------------------------------------------
v4.5.1 — BUGFIX DO DROP DA ESPADA
--------------------------------------------------
- Correção do bug em que o Sword Keeper/drop da espada podia falhar.
- Proteções adicionais para tweens e objetos da espada.

--------------------------------------------------
v4.6 — SISTEMA DE SKINS
--------------------------------------------------
- Skins oficiais do jogador.
- NEON CLASSIC.
- CYBER.
- PLASMA.
- TOXIC.
- GOLD.
- SHADOW.
- ICE.
- RAINBOW.
- Seletor de skins.
- Suporte a skin personalizada.
- Persistência da skin escolhida.

--------------------------------------------------
v4.7 — NEON LEGACY
--------------------------------------------------
- Neon Legacy integrado como modo interno.
- Baseado no Neon Arena 1 fornecido durante o projeto.
- Sem abrir outra página.
- Sem redirecionar o navegador.
- Sistema legado de inimigos, gemas, aura e dash.
- Legacy mantido separado dos sistemas modernos.

--------------------------------------------------
v4.7.1 — NEON LEGACY D-PAD FIX
--------------------------------------------------
- Correção do D-Pad do Neon Legacy.
- Restauração da textura/botão necessária para os controles.
- Correção da ausência dos controles direcionais no modo Legacy.

--------------------------------------------------
v4.8 — ESPIONER
--------------------------------------------------
- Adição do inimigo Espioner ao Neon Arena 2 moderno.
- Espioner é um protótipo antigo que não fazia parte da versão pública do Neon Arena 1.
- Evento pode gerar exatamente 5 Espioners.
- IA de investigação com movimento de varredura lateral.
- 4 HP base.
- 250 pontos por derrota.
- Dano de contato de 7 HP no modo moderno.
- Cooldown e chance separada de ativação do evento.
- Espioner NÃO entra no Neon Legacy.

--------------------------------------------------
v4.9 — AFK / ENERGY
--------------------------------------------------
- Sistema AFK após 5 minutos sem interação.
- Redução do loop para 5 FPS durante AFK.
- Detecção de teclado, mouse, touch e gamepad para acordar o jogo.
- Sistema de notificação preparado para avisos do navegador.
- O pedido de permissão de notificação ocorre ao iniciar o jogo quando suportado.

--------------------------------------------------
v4.9.1 — AFK / ENERGY FIX
--------------------------------------------------
- Correção do sistema AFK/Energy.
- Melhor tratamento do retorno após inatividade.
- Mantida a compatibilidade com HTTPS e a API de Notification quando disponível.

--------------------------------------------------
v5.0 — BIG SYSTEM UPDATE
--------------------------------------------------
- Desafios diários.
- Estatísticas persistentes.
- Títulos de progressão:
  * Novato
  * Caçador
  * Veterano
  * Mestre
  * Lendário
- Sistema de combo.
- Eventos aleatórios:
  * Sobrecarga
  * Invasão Fantasma
  * Chuva de Gemas
  * Investigação
  * Boss surpresa
- AI Director para ajustar a pressão da partida.
- Novas arenas:
  * Neon Grid
  * Cyber City
  * Cyber Lab
  * Void
  * Factory
- Save 2.0 com exportação/importação.
- Sandbox para testes/debug.
- Estrutura preparada para música.
- Integração dos sistemas sem remover o Neon Legacy.

--------------------------------------------------
v5.0.1 — BACKGROUNDS + PRACTICE RESTORE
--------------------------------------------------
- Restauração do Modo Prática.
- Modo Prática 2.1.
- Seletor de velocidade:
  * 3.0x — super lento
  * 5.0x — normal
  * 7.2x — velocidade de corrida
  * 10.0x — insano
- Controle de inimigos.
- Invulnerabilidade opcional.
- Controle de obstáculos.
- Desafios de distância:
  * Livre
  * 500 m
  * 1000 m
  * 2500 m
- Estatísticas da sessão de treino.
- Contador de distância, colisões, tiros e dash.
- HUD do treino.
- Restauração do sistema de backgrounds.
- Backgrounds PNG esperados em assets/img/:
  * a.png — vermelho
  * b.png — ciano
  * c.png — azul
  * d.png — azul
- Desbloqueios dos backgrounds:
  * A = 5 abates
  * B = 10 abates
  * C = 15 abates
  * D = 20 abates
- Background especial Windows 10 para a condição administrativa já existente.
- Importante: os PNGs originais NÃO devem ser editados, recomprimidos ou recriados.

--------------------------------------------------
v5.0.2 — BUGFIX DESTA ATUALIZAÇÃO
--------------------------------------------------
Correções aplicadas ao código atual:

1. ESTATÍSTICAS DE TIROS
- Corrigido o contador de tiros do v5.
- Pressionar o botão de tiro durante o cooldown não aumenta mais artificialmente o número de tiros.
- Evita contagem duplicada com o HUD do Modo Prática.

2. ESTATÍSTICAS DE ACERTOS
- O contador de acertos do v5 agora é atualizado quando um inimigo realmente recebe um hit.
- Dano causado passa a ser calculado a partir da diferença de HP do inimigo quando possível.

3. ESTATÍSTICAS DE DANO/COLISÕES
- Evitada contagem duplicada de colisões entre o sistema de treino e o sistema de estatísticas persistentes.
- Dano recebido continua sendo contabilizado separadamente.

4. ESTATÍSTICAS POR PARTIDA
- Tiros, acertos, dano causado, dano recebido e colisões do perfil v5 são reiniciados ao começar uma nova partida, evitando que uma partida nova herde as estatísticas da anterior.

5. DESEMPENHO DO MODO PRÁTICA
- O seletor de desempenho do Modo Prática agora conversa com o sistema de performance da v4.4.
- As opções são sincronizadas com o mecanismo de limites de entidades existente.

6. PROTEÇÃO DE HIT
- O wrapper de hit do v5 agora ignora chamadas com inimigos inexistentes/inativos antes de processar estatísticas.

--------------------------------------------------
CONTROLES E SISTEMAS MANTIDOS
--------------------------------------------------
- PC: WASD/setas + mouse.
- Touch: controles móveis detectados automaticamente.
- Gamepad: analógico para movimento e X para abrir a loja.
- Loja e armas.
- Dash.
- Aura.
- Tiro duplo.
- Laser.
- Bomba.
- Time Slow.
- Torreta.
- Armadilha tática.
- Espada.
- CO-OP.
- Hardcore.
- Invasão.
- Time Attack.
- Boss Rush.
- Neon Legacy.

--------------------------------------------------
OBSERVAÇÃO SOBRE AS IMAGENS
--------------------------------------------------
O projeto foi organizado para preservar os PNGs originais.
Nenhuma alteração artística, redimensionamento, recompressão ou recriação dos backgrounds deve ser feita.
Se o ZIP completo original for usado como base, somente arquivos de código/documentação devem ser alterados para manter as imagens byte a byte idênticas.

--------------------------------------------------
VALIDAÇÃO
--------------------------------------------------
- game.js foi validado com o verificador de sintaxe do Node.js.
- Esta versão não altera o conteúdo dos backgrounds; ela apenas mantém as referências de código para assets/img/*.png.


5.0.3 — NOVOS RECURSOS
-----------------------
- Sistema de idioma com Português (Brasil), Português (Portugal), English e Español.
- Idioma selecionado é salvo localmente e permanece após reiniciar o jogo.
- Pequenos ajustes de interface do menu para acomodar o seletor de idioma.

v5.0.4 — HOTFIX
- Corrigido o bloqueio do botão JOGAR causado por uma referência inexistente a btnPractice.
- Restaurado o botão MODO PRÁTICA no menu e conectado ao painel de Prática 2.1.
- Nenhum sistema de gameplay existente foi removido.

v5.1 — WINDOWS + AERO UPDATE
-----------------------------
- Detecção local do sistema operacional no menu.
- Windows 7, Windows 8, Windows 8.1 e Windows 10/11 podem ser identificados pelo User-Agent quando o navegador fornece essa informação.
- Em navegadores Chromium compatíveis, a versão do Windows 10/11 pode ser refinada usando User-Agent Client Hints.
- Novo tema secreto WINDOWS AERO.
- Windows Aero é desbloqueado com 67 abates globais.
- O tema Aero usa elementos translúcidos e acabamento inspirado na interface Aero, sem adicionar ou modificar os PNGs existentes.
- Estado do Aero é salvo localmente.
- O jogo continua funcionando normalmente com Aero desativado.
- Comando de console: neonOS() retorna o sistema detectado; neonAero() informa se o Aero está ativo.
- Regra de preservação: assets/img/*.png permanecem intocados.


v5.6 — LAN ARENA
- Added 🌐 LAN ARENA as a selectable game mode.
- Includes a small bundled Node.js server under server/.
- The host runs: node server/server.js
- Open the printed LAN URL on other devices.
- VPNs that provide LAN-like connectivity can be used to connect players outside the home network.
- The LAN mode synchronizes connected player presence and movement/state while retaining the existing arena gameplay.


v5.6.1 — LAN ARENA LOBBY FIX
- LAN ARENA now waits in a synchronized lobby instead of starting as solo.
- First player is the host.
- The host gets INICIAR PARTIDA when 2+ players are connected.
- All connected players start together.


============================================================
v5.7 — MODO TV
============================================================

O v5.7 é focado em jogar Neon Arena 2 em TVs e navegadores de TV.

• Detecção automática de Smart TVs, Google TV, Apple TV, Fire TV,
  Roku, webOS, Tizen e outras plataformas compatíveis.
• Navegação por controle remoto:
  - D-Pad / setas: mover o foco nos menus.
  - OK / Enter / Select: ativar o botão selecionado.
  - Voltar / Back / Escape: voltar ou pausar durante a partida.
• Durante a partida, as setas continuam controlando o jogador.
• OK durante a partida dispara contra o inimigo mais próximo.
• Destaque neon mostra qual botão está selecionado.
• Interface de texto fica maior no Modo TV para leitura à distância.
• Teste manual no PC:
    ?tv=true
  Exemplo:
    index.html?tv=true
• Para desligar manualmente:
    ?tv=false
• Também existe a API:
    NeonArena2TV.mode()
    NeonArena2TV.enabled()
    NeonArena2TV.detected()
    NeonArena2TV.setMode('auto' | 'on' | 'off')

O modo salvo usa:
    auto = detectar automaticamente
    on   = forçar Modo TV
    off  = impedir Modo TV

LAN ARENA / WebSocket foi removido do v5.7. O projeto não depende mais
de Node.js nem possui servidor LAN.

============================================================

v5.8.1 — ENEMY FRIENDLY FIRE
- Projéteis disparados por inimigos agora podem atingir outros inimigos.
- Tiros de sniper, stalker, bomber e bosses causam dano em inimigos atingidos.
- O inimigo atingido perde HP e pode morrer antes de chegar ao jogador.
- O projétil não acerta o próprio inimigo que o disparou.


============================================================
NEON ARENA 2 v5.9 — DROP UPDATE #1
============================================================

A primeira Drop Update oficial do Neon Arena 2.

CONTEÚDO:
- Novo inimigo: DROPper
  - 3 HP
  - movimento orbital
  - projéteis próprios
- Nova mecânica: DROP FEVER
  - 5 eliminações rápidas ativam 6 segundos de Drop Fever
- Novo power-up: DROP CORE
  - aparece durante a partida
  - ao coletar, libera um pulso de dano de 1 HP nos inimigos ativos
- 2 conquistas persistentes:
  - PRIMEIRA QUEDA — 1 Drop Core
  - CAÇADOR DE DROPS — 5 Drop Cores
- Novos efeitos visuais neon
- Novos sons via Web Audio API
- Segredo: DROP//NULL
- Ícones SVG em mods/drop1/icons/
- Bridge de runtime para o mod acessar somente os objetos necessários do jogo.

ATIVAÇÃO:
mods/mods.json já vem configurado para:
{
  "mods": ["Drop1.js"]
}

IMPORTANTE:
- Use HTTP/HTTPS local (por exemplo: python -m http.server 8000).
- Abrir index.html via file:// pode impedir o carregamento do manifest de mods.


NEON ARENA 2 v5.10 — DROP UPDATE #2
- Segunda Drop Update oficial.
- A partir desta Drop, os Drops #1 e #2 são integrados ao jogo base e não dependem de mods.
- Drop #1 foi movido de mods/ para updates/ e continua ativo automaticamente.
- Novo sistema de updates oficiais integrado ao runtime.
- Dois logos SVG oficiais e reutilizáveis:
  - assets/svg/neon-arena-logo-01.svg — marca master.
  - assets/svg/neon-arena-logo-02.svg — marca versionada com o número 2.
- O sistema foi pensado para reaproveitar a mesma identidade em versões futuras com outra numeração.
- Novos SVGs auxiliares: drop2.svg, spark.svg e badge.svg.
- Galeria DROP #2 — LOGO VAULT no menu.
- O Mod Loader continua disponível apenas para mods externos/comunitários; mods/mods.json fica vazio por padrão.
- As PNGs originais permanecem sem alteração.


DROP UPDATE INTEGRATION
Drop #1 e Drop #2 fazem parte diretamente do game.js. Os arquivos updates/Drop1.js e updates/Drop2.js são cópias de referência/histórico e não são carregados pelo index.html.

v5.11 — TAREFAS MENSAIS
- Sistema oficial integrado diretamente ao game.js.
- 5 tarefas mensais com progresso persistente por mês.
- O mês é detectado automaticamente pelo relógio local.
- Tarefas: 250 abates, 20 partidas, 50.000 pontos acumulados, nível 15 e combo 25.
- Recompensas entre 2.000 e 4.000 pontos.
- Painel TAREFAS MENSAIS disponível no menu principal.
- O conteúdo não depende do Mod Loader.

NA2 SERVICES — v5.12
---------------------
NA2-Services.js é uma dependência oficial obrigatória do Neon Arena 2.
Os serviços de Tarefas Diárias e Tarefas Mensais são fornecidos por ele.
O game.js verifica a existência e disponibilidade do serviço antes de iniciar o Phaser.
Se o arquivo for removido ou os serviços estiverem encerrados, o jogo mostra a mensagem de serviço indisponível/encerrado e não inicia.
Encerramento programado: 01/01/2027 às 00:00.


NEON ARENA 2 v5.13 — TEN NEW ENEMIES
- Added 10 new enemies: Leaper, Shield, Mine Layer, Phaser, Swarmer, Turret Guard, Vortex, Mirror, Berserker and Frost.
- Each enemy has distinct movement/attack behavior.
- New enemies are available to normal spawning, Invasion and Sandbox spawning.
- NA2-Services.js is optional for booting the game. Daily/Monthly and other service features depend on it.
- When services reach 01/01/2027 00:00, only the service layer is closed; the game remains playable.
- Service closure screen includes IR PARA A TELA INICIAL.


NEON ARENA 2 v5.16 — SKINS + TEMAS
- 7 skins oficiais novas: PRISM, INFERNO, AURORA, CYBERPUNK, OCEANIC, GHOST e VOLTAGE.
- 8 temas gradientes novos: ARCTIC NEON, BLOOD MOON, MATRIX, DEEP SPACE, CANDY CORE, ELECTRIC STORM, MIDNIGHT CYAN e LAVA CORE.
- Texturas das novas skins são geradas localmente pelo Phaser, sem novos arquivos PNG.


NEON ARENA 2 v5.17 — Menu Scroll + Random Arena Events + SVG Toggle
- Loja de armas/upgrades agora possui rolagem vertical com barra e roda do mouse.
- Eventos aleatórios temporários durante a partida.
- Botão 🚫 DESATIVAR SVGS no menu; a preferência é salva em localStorage.

NEON ARENA 2 v5.27 — TAMANHO DA GUI
------------------------------------
A v5.27 adiciona um seletor de tamanho da interface inspirado no Minecraft:
1 = menor (referência 4K)
2 = referência 1920x1080
3 = referência 1600x900
4 = referência 1280x720

O tamanho 4 só fica disponível quando a resolução do monitor é maior que
1280x800 nos dois eixos. A escolha é salva no localStorage.

v5.29 — Aliado Lendário
- 0,01% de chance por partida de o Aliado Lendário aparecer.
- No máximo um por partida.
- Ajuda o jogador atacando inimigos com projéteis verdes.
- Inimigos podem atacar e derrotar o aliado.
- O jogador não consegue ferir o aliado com seus próprios tiros.
- Ao morrer, exibe “F — O ALIADO LENDÁRIO CAIU.” e não pode reaparecer naquela partida.
