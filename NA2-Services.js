/*
 * NEON ARENA 2 — NA2 Services
 * Serviço opcional do NA2.
 * O jogo principal funciona sem este arquivo; ele fornece apenas recursos de serviço.
 * Daily Tasks + Monthly Tasks vivem neste serviço.
 * Encerramento oficial: 01/01/2027 às 00:00 (horário local do navegador).
 */
(function () {
    'use strict';

    const SHUTDOWN_AT = new Date('2027-01-01T00:00:00');
    const DAILY_DEFINITIONS = [
        { id:'kills', title:'CAÇADA DIÁRIA', desc:'Derrote 25 inimigos', target:25, unit:'abates' },
        { id:'score', title:'PONTUAÇÃO DIÁRIA', desc:'Alcance 5.000 pontos', target:5000, unit:'pts' },
        { id:'level', title:'NÍVEL DIÁRIO', desc:'Chegue ao nível 7', target:7, unit:'nível' }
    ];
    const MONTHLY_DEFINITIONS = [
        { id:'kills', title:'CAÇADOR DO MÊS', desc:'Derrote 250 inimigos', target:250, unit:'abates', reward:2500 },
        { id:'games', title:'VETERANO DO MÊS', desc:'Jogue 20 partidas', target:20, unit:'partidas', reward:2000 },
        { id:'score', title:'PONTUAÇÃO DO MÊS', desc:'Some 50.000 pontos', target:50000, unit:'pts', reward:3000 },
        { id:'level', title:'NÍVEL DO MÊS', desc:'Alcance o nível 15 em uma partida', target:15, unit:'nível', reward:4000 },
        { id:'combo', title:'COMBO DO MÊS', desc:'Alcance combo de 25', target:25, unit:'combo', reward:3500 }
    ];

    function isAvailable() {
        return new Date() < SHUTDOWN_AT;
    }

    function getStatus() {
        return isAvailable() ? 'active' : 'ended';
    }

    function getDailyDefinition() {
        const d = new Date();
        const seed = d.getFullYear() + d.getMonth() + 1 + d.getDate();
        return { ...DAILY_DEFINITIONS[seed % DAILY_DEFINITIONS.length] };
    }

    function getMonthlyDefinitions() {
        return MONTHLY_DEFINITIONS.map(x => ({ ...x }));
    }

    function showUnavailable(reason) {
        if (document.getElementById('na2-services-overlay')) return;
        const ended = reason === 'ended' || !isAvailable();
        const message = ended
            ? 'Os serviços do Neon Arena 2 foram encerrados.'
            : 'Os serviços do Neon Arena 2 não estão disponíveis.';
        const overlay = document.createElement('div');
        overlay.id = 'na2-services-overlay';
        overlay.style.cssText = [
            'position:fixed','inset:0','display:flex','align-items:center','justify-content:center',
            'background:rgba(5,5,5,.97)','color:#fff','font-family:Arial,sans-serif','text-align:center',
            'padding:24px','box-sizing:border-box','z-index:999999'
        ].join(';');
        overlay.innerHTML = `
            <div style="max-width:720px">
                <div style="font-size:34px;font-weight:700;color:#00ff99;margin-bottom:18px">NEON ARENA 2</div>
                <div style="font-size:22px;line-height:1.4">${message}</div>
                <div style="margin-top:14px;color:#9aa">Daily Tasks, Monthly Tasks e outros serviços não estão mais disponíveis.</div>
                <button id="na2-services-home" style="margin-top:28px;padding:12px 22px;border:0;border-radius:8px;background:#00ff99;color:#00140d;font-size:16px;font-weight:700;cursor:pointer">IR PARA A TELA INICIAL</button>
            </div>`;
        document.body.appendChild(overlay);
        const btn = document.getElementById('na2-services-home');
        if (btn) btn.addEventListener('click', () => {
            overlay.remove();
            try {
                const active = window.game && window.game.scene && window.game.scene.scenes && window.game.scene.scenes[0];
                if (active && active.scene) active.scene.restart();
                else if (typeof location !== 'undefined') location.reload();
            } catch (_) { if (typeof location !== 'undefined') location.reload(); }
        });
    }

    function onGameBoot() {
        // Não abre overlay no boot. O jogo principal continua jogável;
        // a tela de encerramento aparece somente quando um serviço é acessado.
    }

    const api = Object.freeze({
        version: '1.1.0',
        shutdownAt: SHUTDOWN_AT.toISOString(),
        isAvailable,
        getStatus,
        getDailyDefinition,
        getMonthlyDefinitions,
        showUnavailable,
        onGameBoot
    });

    window.NA2Services = api;

    if (!isAvailable()) {
        showUnavailable('ended');
    }
})();
