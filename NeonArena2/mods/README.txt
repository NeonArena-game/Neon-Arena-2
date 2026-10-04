NEON ARENA 2 — PASTA DE MODS (v5.5)

Esta pasta aceita MODS NÃO OFICIAIS em JavaScript.
Também pode ser usada para mods de 1º de abril, protótipos e atualizações experimentais.

COMO ATIVAR:
1. Coloque um arquivo .js dentro desta pasta.
2. Abra mods.json.
3. Adicione o nome do arquivo à lista "mods".

Exemplo:
{
  "mods": ["meu_mod.js", "abril_fools.js"]
}

IMPORTANTE:
- O navegador não permite que uma página liste automaticamente todos os arquivos de uma pasta.
  Por isso, mods.json funciona como o índice oficial dos mods.
- O carregamento automático do manifesto funciona quando o jogo é aberto por HTTP/HTTPS
  (por exemplo, usando Live Server). Em file:// alguns navegadores bloqueiam a leitura do JSON.
- Os mods são código JavaScript e podem alterar o jogo. Use apenas mods em que você confia.
- Mods não são oficiais da Neon Arena 2 e não fazem parte do jogo base.

API disponível em window.NeonArena2Mods:
- NeonArena2Mods.register(nome, { beforeGameStart, afterGameStart, sceneCreate, sceneUpdate })
- NeonArena2Mods.on(hook, funcao, nome)
- NeonArena2Mods.getGame()
- NeonArena2Mods.getPhaser()
- NeonArena2Mods.getConfig()
- NeonArena2Mods.getState()
- NeonArena2Mods.getLoadedMods()
- NeonArena2Mods.notify(scene, texto, tipo)
- NeonArena2Mods.log(...args)

Exemplo de mod:

NeonArena2Mods.register('Meu Mod', {
  afterGameStart(scene) {
    NeonArena2Mods.log('Meu mod foi carregado!');
  },
  sceneCreate(scene) {
    scene.add.text(20, 20, 'MOD ATIVO!', {
      fontSize: '18px',
      color: '#00ffff'
    }).setDepth(9000);
  }
});


DROP UPDATE #1
--------------
Drop1.js é a primeira Drop Update do Neon Arena 2.
Inclui o inimigo DROPper, Drop Core, Drop Fever, conquistas, efeitos, sons e os ícones SVG em drop1/icons/.
