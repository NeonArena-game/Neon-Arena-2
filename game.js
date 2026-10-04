
// NEON ARENA 2 — v5.28 HALLOWEEN SEASONAL THEME UPDATE
// Base: v5.17 Expanded Skins + Gradient Themes
// v5.7: Modo TV com navegação por controle remoto + remoção completa do LAN Arena
// v5.5: suporte a mods não oficiais via pasta mods/ + mods/mods.json
// Base: v5.8.1 Enemy Friendly Fire + Drop Updates #1/#2 integradas
// v5.1: Windows/OS detection + Windows Aero theme (67 global kills) + v5.0.4 base fixes
// =========================================================
// NEON ARENA 2 — MOD LOADER v5.5
// Mods são NÃO OFICIAIS e podem alterar qualquer parte exposta pela API.
// O navegador não permite listar automaticamente arquivos de uma pasta.
// Por isso, a pasta mods/ usa mods/mods.json como índice dos .js ativos.
// =========================================================
const NA_MODS_MANIFEST = 'mods/mods.json';
const NA_MOD_STATE = {
    loading: true,
    available: true,
    loaded: [],
    failed: [],
    hooks: {
        beforeGameStart: [],
        afterGameStart: [],
        sceneCreate: [],
        sceneUpdate: []
    }
};

function neonModRegister(name, handlers = {}) {
    const safeName = String(name || 'Mod sem nome');
    const entry = { name: safeName, handlers };
    Object.keys(NA_MOD_STATE.hooks).forEach(hook => {
        if (typeof handlers[hook] === 'function') NA_MOD_STATE.hooks[hook].push({ name: safeName, fn: handlers[hook] });
    });
    return entry;
}

function neonModRunHook(hook, ...args) {
    const list = NA_MOD_STATE.hooks[hook] || [];
    list.slice().forEach(item => {
        try { item.fn(...args); }
        catch (error) {
            console.error('[Neon Arena 2][Mod]', item.name, 'falhou em', hook, error);
            if (!NA_MOD_STATE.failed.some(x => x.name === item.name)) {
                NA_MOD_STATE.failed.push({ name: item.name, error: String(error && error.message || error) });
            }
        }
    });
}

// =========================================================
// NEON ARENA 2 — BUILT-IN OFFICIAL UPDATE HOOKS
// Conteúdo oficial (Drops) não depende do Mod Loader.
// =========================================================
const NA_BUILTIN_UPDATES = {
    loaded: [],
    hooks: { afterGameStart: [], sceneCreate: [], sceneUpdate: [] }
};
function neonBuiltinRegister(name, handlers = {}) {
    const safeName = String(name || 'Atualização oficial');
    Object.keys(NA_BUILTIN_UPDATES.hooks).forEach(hook => {
        if (typeof handlers[hook] === 'function') {
            NA_BUILTIN_UPDATES.hooks[hook].push({ name: safeName, fn: handlers[hook] });
        }
    });
    NA_BUILTIN_UPDATES.loaded.push(safeName);
    return true;
}
function neonBuiltinRunHook(hook, ...args) {
    (NA_BUILTIN_UPDATES.hooks[hook] || []).slice().forEach(item => {
        try { item.fn(...args); }
        catch (error) { console.error('[Neon Arena 2][Official Update]', item.name, 'falhou em', hook, error); }
    });
}
const NeonArena2Builtin = {
    register: neonBuiltinRegister,
    getState: () => ({ loaded: [...NA_BUILTIN_UPDATES.loaded] })
};
if (typeof window !== 'undefined') window.NeonArena2Builtin = NeonArena2Builtin;


const NeonArena2Mods = {
    version: '5.7',
    register: neonModRegister,
    on(hook, fn, name = 'Mod anônimo') {
        if (!NA_MOD_STATE.hooks[hook] || typeof fn !== 'function') return false;
        NA_MOD_STATE.hooks[hook].push({ name, fn });
        return true;
    },
    getGame: () => (typeof game !== 'undefined' ? game : null),
    getPhaser: () => (typeof Phaser !== 'undefined' ? Phaser : null),
    getConfig: () => (typeof config !== 'undefined' ? config : null),
    getState: () => ({
        loading: NA_MOD_STATE.loading,
        available: NA_MOD_STATE.available,
        loaded: NA_MOD_STATE.loaded.map(x => x.name),
        failed: NA_MOD_STATE.failed.map(x => x.name)
    }),
    getLoadedMods: () => NA_MOD_STATE.loaded.map(x => ({ ...x })),
    notify(scene, text, type = 'info') {
        if (typeof showNotification === 'function') showNotification(scene, String(text), type);
    },
    log(...args) { console.log('[Neon Arena 2][Mod]', ...args); }
};

if (typeof window !== 'undefined') window.NeonArena2Mods = NeonArena2Mods;

function neonLoadScript(src, name) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src + (src.includes('?') ? '&' : '?') + 'v=' + Date.now();
        script.async = false;
        script.dataset.neonMod = name;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Não foi possível carregar ' + src));
        document.head.appendChild(script);
    });
}

async function neonLoadMods() {
    NA_MOD_STATE.loading = true;
    let manifest;
    try {
        const response = await fetch(NA_MODS_MANIFEST, { cache: 'no-store' });
        if (!response.ok) throw new Error('Manifesto HTTP ' + response.status);
        manifest = await response.json();
    } catch (error) {
        // Em file:// navegadores normalmente bloqueiam fetch local. O jogo segue normalmente.
        NA_MOD_STATE.available = false;
        NA_MOD_STATE.loading = false;
        console.warn('[Neon Arena 2] Mods não carregados:', error.message || error);
        return false;
    }

    const files = Array.isArray(manifest) ? manifest : (Array.isArray(manifest.mods) ? manifest.mods : []);
    for (const item of files) {
        const file = typeof item === 'string' ? item : item && item.file;
        if (!file || !/\.js$/i.test(file)) continue;
        // Impede caminhos absolutos/fora da pasta mods.
        const clean = String(file).replace(/\\/g, '/').replace(/^\.\//, '');
        if (clean.includes('..') || clean.startsWith('/') || clean.startsWith('http:') || clean.startsWith('https:')) {
            NA_MOD_STATE.failed.push({ name: clean, error: 'Caminho de mod inválido.' });
            continue;
        }
        const src = 'mods/' + clean;
        try {
            await neonLoadScript(src, clean);
            NA_MOD_STATE.loaded.push({ name: clean, src });
        } catch (error) {
            NA_MOD_STATE.failed.push({ name: clean, error: String(error.message || error) });
            console.error('[Neon Arena 2] Falha ao carregar mod:', clean, error);
        }
    }
    NA_MOD_STATE.loading = false;
    return true;
}

// =========================================================
// NEON ARENA 2 v5.0.3 — IDIOMAS
// =========================================================
const NA_LANG_KEY = 'neon_language';
const NA_LANGUAGES = {
    'pt-BR': { label: 'Português (Brasil)', short: '🇧🇷 PT-BR' },
    'pt-PT': { label: 'Português (Portugal)', short: '🇵🇹 PT-PT' },
    'en':    { label: 'English', short: '🇺🇸 EN' },
    'es':    { label: 'Español', short: '🇪🇸 ES' }
};
let neonLanguage = localStorage.getItem(NA_LANG_KEY) || 'pt-BR';
if (!NA_LANGUAGES[neonLanguage]) neonLanguage = 'pt-BR';

const NA_I18N = {
    'pt-BR': {
        play: 'JOGAR', solo: 'SOLO', coop: 'CO-OP', hardcore: 'HARDCORE', invasion: 'INVASÃO',
        timeattack: 'TIME ATTACK', bossrush: 'BOSS RUSH', legacy: 'NEON LEGACY',
        skins: 'SKINS', settings: 'CONFIGURAÇÕES', accessibility: 'ACESSIBILIDADE',
        captionsOn: 'LEGENDAS: ATIVADAS', captionsOff: 'LEGENDAS: DESATIVADAS',
        themes: 'SELETOR DE CORES / TEMAS', achievements: 'VER CONQUISTAS',
        language: '🌎 IDIOMA', close: 'FECHAR', languageSaved: 'Idioma alterado para', animations: 'ANIMAÇÕES', animationOn: 'ATIVADAS', animationOff: 'DESATIVADAS', animationBlocked: 'BLOQUEADAS PELO SISTEMA',
        offlineTitle: '🌐 Parece que Você está Sem Internet 🌐',
        offlineBody: 'Alguns serviços não funcionam\nOffline',
        continue: 'Continuar mesmo assim',
        endedTitle: '🎮 Neon Arena 2 não receberá mais atualizações 🎮',
        endedBody: 'Obrigado a todos que jogaram ❤️\nOs serviços não funcionarão em 01/01/2027.',
        recommend: 'Recomendamos que você atualize para o Neon Arena 3',
        update: 'Clique aqui para atualizar',
        finalBody: 'Os serviços foram encerrados em 01/01/2027.',
        modeLabel: 'MODO', skinOpen: 'ABRIR', lightMode: '☀️ MODO CLARO', darkMode: '🌙 MODO ESCURO',
        audio: '🔊 ÁUDIO', audioOn: 'ATIVO', audioOff: 'MUDO', practice: '🧪 MODO PRÁTICA', stats: '📊 ESTATÍSTICAS',
        daily: '📅 DESAFIO DIÁRIO', monthly: '📅 TAREFAS MENSAIS', svgDisable: '🚫 DESATIVAR SVGS', svgEnable: '✅ ATIVAR SVGS',
        visualFX: '✨ EFEITOS VISUAIS', betterDetails: '✨ DETALHES MELHORADOS', betterDetailsChanged: 'Detalhes melhorados',
        achievementsTitle: 'CONQUISTAS', unlocked: 'DESBLOQUEADA', close: 'FECHAR',
        betterDetailsOff: 'DESATIVADOS', betterDetailsLow: 'LOW', betterDetailsMedium: 'MEDIUM', betterDetailsHigh: 'HIGH', betterDetailsUltra: 'ULTRA',
        guiSize: '🖥️ TAMANHO DA GUI',
        languageNames: 'Português (Brasil)'
    },
    'pt-PT': {
        play: 'JOGAR', solo: 'SOLO', coop: 'CO-OP', hardcore: 'HARDCORE', invasion: 'INVASÃO',
        timeattack: 'TIME ATTACK', bossrush: 'BOSS RUSH', legacy: 'NEON LEGACY',
        skins: 'SKINS', settings: 'DEFINIÇÕES', accessibility: 'ACESSIBILIDADE',
        captionsOn: 'LEGENDAS: ATIVADAS', captionsOff: 'LEGENDAS: DESATIVADAS',
        themes: 'SELETOR DE CORES / TEMAS', achievements: 'VER CONQUISTAS',
        language: '🌎 IDIOMA', close: 'FECHAR', languageSaved: 'Idioma alterado para', animations: 'ANIMAÇÕES', animationOn: 'ATIVADAS', animationOff: 'DESATIVADAS', animationBlocked: 'BLOQUEADAS PELO SISTEMA',
        offlineTitle: '🌐 Parece que está Sem Internet 🌐',
        offlineBody: 'Alguns serviços não funcionam\nOffline',
        continue: 'Continuar mesmo assim',
        endedTitle: '🎮 O Neon Arena 2 não receberá mais atualizações 🎮',
        endedBody: 'Obrigado a todos os que jogaram ❤️\nOs serviços não funcionarão em 01/01/2027.',
        recommend: 'Recomendamos que atualize para o Neon Arena 3',
        update: 'Clique aqui para atualizar',
        finalBody: 'Os serviços foram encerrados em 01/01/2027.',
        modeLabel: 'MODO', skinOpen: 'ABRIR', lightMode: '☀️ MODO CLARO', darkMode: '🌙 MODO ESCURO',
        audio: '🔊 ÁUDIO', audioOn: 'ATIVO', audioOff: 'MUDO', practice: '🧪 MODO PRÁTICA', stats: '📊 ESTATÍSTICAS',
        daily: '📅 DESAFIO DIÁRIO', monthly: '📅 TAREFAS MENSAIS', svgDisable: '🚫 DESATIVAR SVGS', svgEnable: '✅ ATIVAR SVGS',
        visualFX: '✨ EFEITOS VISUAIS', betterDetails: '✨ DETALHES MELHORADOS', betterDetailsChanged: 'Detalhes melhorados',
        achievementsTitle: 'CONQUISTAS', unlocked: 'DESBLOQUEADA', close: 'FECHAR',
        betterDetailsOff: 'DESATIVADOS', betterDetailsLow: 'LOW', betterDetailsMedium: 'MEDIUM', betterDetailsHigh: 'HIGH', betterDetailsUltra: 'ULTRA',
        guiSize: '🖥️ TAMANHO DA GUI',
        languageNames: 'Português (Portugal)'
    },
    'en': {
        play: 'PLAY', solo: 'SOLO', coop: 'CO-OP', hardcore: 'HARDCORE', invasion: 'INVASION',
        timeattack: 'TIME ATTACK', bossrush: 'BOSS RUSH', legacy: 'NEON LEGACY',
        skins: 'SKINS', settings: 'COLOR / THEME SELECTOR', accessibility: 'ACCESSIBILITY',
        captionsOn: 'CAPTIONS: ON', captionsOff: 'CAPTIONS: OFF',
        themes: 'COLOR / THEME SELECTOR', achievements: 'VIEW ACHIEVEMENTS',
        language: '🌎 LANGUAGE', close: 'CLOSE', languageSaved: 'Language changed to', animations: 'ANIMATIONS', animationOn: 'ON', animationOff: 'OFF', animationBlocked: 'BLOCKED BY SYSTEM',
        offlineTitle: '🌐 You Appear to Be Offline 🌐',
        offlineBody: 'Some services are unavailable\nOffline',
        continue: 'Continue anyway',
        endedTitle: '🎮 Neon Arena 2 will receive no more updates 🎮',
        endedBody: 'Thank you to everyone who played ❤️\nServices will stop working on 01/01/2027.',
        recommend: 'We recommend updating to Neon Arena 3',
        update: 'Click here to update',
        finalBody: 'Services were discontinued on 01/01/2027.',
        modeLabel: 'MODE', skinOpen: 'OPEN', lightMode: '☀️ LIGHT MODE', darkMode: '🌙 DARK MODE',
        audio: '🔊 AUDIO', audioOn: 'ON', audioOff: 'MUTED', practice: '🧪 PRACTICE MODE', stats: '📊 STATISTICS',
        daily: '📅 DAILY CHALLENGE', monthly: '📅 MONTHLY TASKS', svgDisable: '🚫 DISABLE SVGS', svgEnable: '✅ ENABLE SVGS',
        visualFX: '✨ VISUAL EFFECTS', betterDetails: '✨ BETTER DETAILS', betterDetailsChanged: 'Better Details',
        achievementsTitle: 'ACHIEVEMENTS', unlocked: 'UNLOCKED', close: 'CLOSE',
        betterDetailsOff: 'OFF', betterDetailsLow: 'LOW', betterDetailsMedium: 'MEDIUM', betterDetailsHigh: 'HIGH', betterDetailsUltra: 'ULTRA',
        guiSize: '🖥️ GUI SIZE',
        languageNames: 'English'
    },
    'es': {
        play: 'JUGAR', solo: 'SOLO', coop: 'CO-OP', hardcore: 'HARDCORE', invasion: 'INVASIÓN',
        timeattack: 'TIME ATTACK', bossrush: 'BOSS RUSH', legacy: 'NEON LEGACY',
        skins: 'SKINS', settings: 'AJUSTES', accessibility: 'ACCESIBILIDAD',
        captionsOn: 'SUBTÍTULOS: ACTIVADOS', captionsOff: 'SUBTÍTULOS: DESACTIVADOS',
        themes: 'SELECTOR DE COLORES / TEMAS', achievements: 'VER LOGROS',
        language: '🌎 IDIOMA', close: 'CERRAR', languageSaved: 'Idioma cambiado a', animations: 'ANIMACIONES', animationOn: 'ACTIVADAS', animationOff: 'DESACTIVADAS', animationBlocked: 'BLOQUEADAS POR EL SISTEMA',
        offlineTitle: '🌐 Parece que Estás Sin Internet 🌐',
        offlineBody: 'Algunos servicios no funcionan\nSin conexión',
        continue: 'Continuar de todos modos',
        endedTitle: '🎮 Neon Arena 2 no recibirá más actualizaciones 🎮',
        endedBody: 'Gracias a todos los que jugaron ❤️\nLos servicios dejarán de funcionar el 01/01/2027.',
        recommend: 'Recomendamos actualizar a Neon Arena 3',
        update: 'Haz clic aquí para actualizar',
        finalBody: 'Los servicios fueron suspendidos el 01/01/2027.',
        modeLabel: 'MODO', skinOpen: 'ABRIR', lightMode: '☀️ MODO CLARO', darkMode: '🌙 MODO OSCURO',
        audio: '🔊 AUDIO', audioOn: 'ACTIVO', audioOff: 'SILENCIADO', practice: '🧪 MODO PRÁCTICA', stats: '📊 ESTADÍSTICAS',
        daily: '📅 DESAFÍO DIARIO', monthly: '📅 TAREAS MENSUALES', svgDisable: '🚫 DESACTIVAR SVGS', svgEnable: '✅ ACTIVAR SVGS',
        visualFX: '✨ EFECTOS VISUALES', betterDetails: '✨ DETALLES MEJORADOS', betterDetailsChanged: 'Detalles mejorados',
        achievementsTitle: 'LOGROS', unlocked: 'DESBLOQUEADO', close: 'CERRAR',
        betterDetailsOff: 'DESACTIVADOS', betterDetailsLow: 'LOW', betterDetailsMedium: 'MEDIUM', betterDetailsHigh: 'HIGH', betterDetailsUltra: 'ULTRA',
        guiSize: '🖥️ TAMAÑO DE LA GUI',
        languageNames: 'Español'
    }
};
function naT(key) { return (NA_I18N[neonLanguage] && NA_I18N[neonLanguage][key]) || NA_I18N['pt-BR'][key] || key; }

// =========================================================
// NEON ARENA 2 — SISTEMA DE ANIMAÇÕES v5.4
// O jogo respeita o sinal do sistema/navegador (prefers-reduced-motion).
// Se o sistema NÃO permitir movimento, as animações ficam FORÇADAMENTE
// desativadas e a opção interna não pode reativá-las.
// Quando o sistema permite, o jogador pode desligá-las manualmente.
// =========================================================
const NA_ANIMATIONS_KEY = 'neon_animations_enabled';

function neonSystemMotionAllowed() {
    try {
        if (!window.matchMedia) return false;
        return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
        return false;
    }
}

function neonAnimationsEnabled() {
    if (!neonSystemMotionAllowed()) return false; // bloqueio forçado pelo sistema
    return localStorage.getItem(NA_ANIMATIONS_KEY) !== 'false';
}

// Mantido como alias de compatibilidade com o sistema v5.2.
function neonMotionEnabled() { return neonAnimationsEnabled(); }

function neonAnimationStatusText() {
    if (!neonSystemMotionAllowed()) return '🚫 ' + naT('animations') + ': ' + naT('animationBlocked');
    return '✨ ' + naT('animations') + ': ' + (neonAnimationsEnabled() ? naT('animationOn') : naT('animationOff'));
}

function toggleNeonAnimations() {
    // Nunca permite ligar manualmente se o sistema estiver bloqueando movimento.
    if (!neonSystemMotionAllowed()) {
        localStorage.setItem(NA_ANIMATIONS_KEY, 'false');
        return false;
    }
    const next = !neonAnimationsEnabled();
    localStorage.setItem(NA_ANIMATIONS_KEY, next ? 'true' : 'false');
    return next;
}

function neonFadeIn(scene, targets, options = {}) {
    const list = Array.isArray(targets) ? targets.filter(o => o && o.active) : [targets].filter(o => o && o.active);
    if (!list.length) return null;
    if (!neonAnimationsEnabled()) {
        list.forEach(o => { if (o.setAlpha) o.setAlpha(1); });
        return null;
    }
    const duration = options.duration || 260;
    const from = options.fromAlpha == null ? 0 : options.fromAlpha;
    const yOffset = options.yOffset || 0;
    list.forEach(o => {
        if (o.setAlpha) o.setAlpha(from);
        if (yOffset && o.y != null) o.setData('__naFadeY', o.y), o.y += yOffset;
    });
    return scene.tweens.add({
        targets: list, alpha: 1, y: '+=0', duration, ease: options.ease || 'Quad.easeOut',
        onComplete: () => list.forEach(o => {
            if (o.active && o.getData('__naFadeY') != null) { o.y = o.getData('__naFadeY'); o.setData('__naFadeY', null); }
        })
    });
}

function neonFadeOut(scene, targets, onComplete, options = {}) {
    const list = Array.isArray(targets) ? targets.filter(o => o && o.active) : [targets].filter(o => o && o.active);
    if (!list.length || !neonAnimationsEnabled()) {
        if (typeof onComplete === 'function') onComplete();
        return null;
    }
    return scene.tweens.add({
        targets: list, alpha: 0, scaleX: options.scaleX || 0.98, scaleY: options.scaleY || 0.98,
        duration: options.duration || 180, ease: 'Quad.easeIn', onComplete
    });
}

function neonAnimateMenuButton(scene, button, options = {}) {
    if (!scene || !button || !button.active) return;
    const hoverScale = options.hoverScale || 1.06;
    let hoverTween = null;

    button.on('pointerover', () => {
        if (!button.active) return;
        SoundFX.hover();
        if (!neonAnimationsEnabled()) return;
        if (hoverTween) hoverTween.stop();
        hoverTween = scene.tweens.add({ targets: button, scaleX: hoverScale, scaleY: hoverScale, duration: 120, ease: 'Quad.easeOut' });
    });

    button.on('pointerdown', () => SoundFX.click());

    button.on('pointerout', () => {
        if (!button.active || !neonAnimationsEnabled()) return;
        if (hoverTween) hoverTween.stop();
        hoverTween = scene.tweens.add({ targets: button, scaleX: 1, scaleY: 1, duration: 120, ease: 'Quad.easeOut' });
    });
}

function neonPlayAnimation(scene, button, onComplete) {
    SoundFX.playStart();
    if (!neonAnimationsEnabled()) { onComplete(); return; }

    // O botão JOGAR faz uma volta completa de 360º antes de iniciar.
    scene.tweens.add({
        targets: button, angle: button.angle + 360, scaleX: 1.12, scaleY: 1.12,
        duration: 450, ease: 'Cubic.easeInOut',
        onComplete: () => {
            if (button && button.active) button.setAngle(0).setScale(1);
            onComplete();
        }
    });
}

function neonAnimateMenuOpen(scene, elements) {
    const list = elements.filter(e => e && e.active);
    if (!neonAnimationsEnabled()) { list.forEach(e => e.setAlpha && e.setAlpha(1)); return; }
    list.forEach((e, i) => {
        if (e.setAlpha) e.setAlpha(0);
        if (e.y != null) e.y += 10;
        scene.tweens.add({ targets:e, alpha:1, y:'+=0', duration:220, delay:Math.min(i*25,250), ease:'Quad.easeOut' });
    });
}
// =========================================================
// MENU OVERLAY MANAGER + SCROLL
// Mantém apenas um painel aberto por vez e permite navegar em
// resoluções baixas sem deixar botões/conquistas fora da tela.
// =========================================================
let neonActiveOverlay = null;

function neonDestroyElements(elements) {
    if (!Array.isArray(elements)) return;
    elements.forEach(e => { try { if (e && e.active) e.destroy(); } catch (_) {} });
}

function neonCloseActiveOverlay() {
    const current = neonActiveOverlay;
    if (!current) return;
    neonActiveOverlay = null;
    try { if (typeof current.cleanup === 'function') current.cleanup(); } catch (_) {}
    neonDestroyElements(current.elements);
}

function neonOpenOverlay(scene, elements, cleanup) {
    neonCloseActiveOverlay();
    neonActiveOverlay = { scene, elements, cleanup: typeof cleanup === 'function' ? cleanup : null };
    return elements;
}

function neonCloseOverlay(elements) {
    if (neonActiveOverlay && neonActiveOverlay.elements === elements) {
        const current = neonActiveOverlay;
        neonActiveOverlay = null;
        try { if (typeof current.cleanup === 'function') current.cleanup(); } catch (_) {}
    }
    neonDestroyElements(elements);
}

function attachMenuVerticalScroll(scene, items, options = {}) {
    if (!scene || !Array.isArray(items) || !items.length) return () => {};
    const viewportTop = Number.isFinite(options.viewportTop) ? options.viewportTop : 8;
    const viewportBottom = Number.isFinite(options.viewportBottom) ? options.viewportBottom : config.height - 8;
    const scrollbarX = Number.isFinite(options.scrollbarX) ? options.scrollbarX : config.width - 10;
    const step = Number.isFinite(options.step) ? options.step : 55;
    const trackH = Math.max(1, viewportBottom - viewportTop);

    items.forEach(item => {
        if (!item || !item.active) return;
        item.__naMenuBaseY = item.y;
    });
    const maxBottom = Math.max(...items.filter(Boolean).map(item => {
        try { return item.getBounds().bottom; } catch (_) { return item.y || 0; }
    }));
    const max = Math.max(0, maxBottom - viewportBottom);
    if (max <= 0) return () => {};

    let offset = 0;
    let dragging = false;
    let dragStartY = 0;
    let dragStartOffset = 0;

    const track = scene.add.rectangle(scrollbarX, (viewportTop + viewportBottom) / 2, 7, trackH, 0x222222, 0.75)
        .setDepth(5);
    const thumbH = Math.max(38, trackH * (trackH / (trackH + max)));
    const thumb = scene.add.rectangle(scrollbarX, viewportTop + thumbH / 2, 7, thumbH, 0x00eaff, 0.95)
        .setDepth(6);

    const clamp = value => Phaser.Math.Clamp(value, 0, max);
    const apply = () => {
        items.forEach(item => {
            if (!item || !item.active) return;
            const y = item.__naMenuBaseY - offset;
            item.setY(y);
            const b = item.getBounds ? item.getBounds() : { top:y, bottom:y };
            const visible = b.bottom >= viewportTop && b.top <= viewportBottom;
            item.setVisible(visible);
            if (visible) {
                if (item.input) item.input.enabled = true;
            } else if (item.input) {
                item.input.enabled = false;
            }
        });
        const travel = Math.max(0, trackH - thumbH);
        thumb.setY(viewportTop + thumbH / 2 + (offset / max) * travel);
    };

    const scrollBy = amount => {
        const next = clamp(offset + amount);
        if (next === offset) return;
        offset = next;
        apply();
    };

    const onWheel = (pointer, currentlyOver, deltaX, deltaY) => {
        if (!scene.sys.isActive() || isPlaying || isShopOpen || neonActiveOverlay) return;
        scrollBy(deltaY * 0.85);
    };
    const onKeyDown = event => {
        if (!scene.sys.isActive() || isPlaying || isShopOpen || neonActiveOverlay) return;
        if (event.key === 'ArrowDown') scrollBy(step);
        else if (event.key === 'ArrowUp') scrollBy(-step);
        else if (event.key === 'PageDown') scrollBy(trackH * 0.8);
        else if (event.key === 'PageUp') scrollBy(-trackH * 0.8);
        else if (event.key === 'Home') scrollBy(-max);
        else if (event.key === 'End') scrollBy(max);
    };

    scene.input.on('wheel', onWheel);
    scene.input.keyboard.on('keydown', onKeyDown);
    thumb.setInteractive({ useHandCursor: true, draggable: true });
    thumb.on('dragstart', pointer => { dragging = true; dragStartY = pointer.y; dragStartOffset = offset; });
    thumb.on('drag', pointer => {
        if (!dragging) return;
        const travel = Math.max(1, trackH - thumbH);
        offset = clamp(dragStartOffset + ((pointer.y - dragStartY) / travel) * max);
        apply();
    });
    thumb.on('dragend', () => { dragging = false; });
    track.setInteractive({ useHandCursor: true });
    track.on('pointerdown', pointer => {
        scrollBy(pointer.y < thumb.y ? -trackH * 0.75 : trackH * 0.75);
    });
    apply();

    return () => {
        try { scene.input.off('wheel', onWheel); } catch (_) {}
        try { scene.input.keyboard.off('keydown', onKeyDown); } catch (_) {}
        try { thumb.off('dragstart'); thumb.off('drag'); thumb.off('dragend'); } catch (_) {}
        try { track.off('pointerdown'); } catch (_) {}
        if (thumb.active) thumb.destroy();
        if (track.active) track.destroy();
    };
}

function cycleNeonLanguage(scene) {
    const keys = Object.keys(NA_LANGUAGES);
    const next = (keys.indexOf(neonLanguage) + 1) % keys.length;
    neonLanguage = keys[next];
    localStorage.setItem(NA_LANG_KEY, neonLanguage);
    if (scene && scene.scene) scene.scene.restart();
}

// =========================================================
// NEON ARENA 2 — CICLO DE VIDA SILENCIOSO
// Data oficial de encerramento: 01/01/2027 00:00 (hora local)
// O jogo local continua; apenas serviços dependentes de serviço
// podem ser bloqueados após a data.
// =========================================================
const NA_SERVICE_END = new Date(2027, 0, 1, 0, 0, 0, 0);
function neonServicesEnded(date = new Date()) { return date >= NA_SERVICE_END; }
function neonDaysUntilServiceEnd(date = new Date()) {
    return Math.ceil((NA_SERVICE_END.getTime() - date.getTime()) / 86400000);
}
function neonServiceAvailable() {
    return !neonServicesEnded();
}
function neonServiceUnavailableMessage(scene) {
    if (scene && typeof showNotification === 'function') {
        showNotification(scene, '⚠️ ' + (neonServicesEnded() ? naT('finalBody') : 'Não foi possível se conectar aos serviços. Tente novamente mais tarde.'), 'warning');
    }
}
// =========================================================
// NEON ARENA 2 v5.3 — AUDIO & JUICE UPDATE
// Detecção é somente local: nenhum dado do sistema é enviado para servidor.
// =========================================================
const NA_AERO_KEY = 'neon_aero_unlocked';
let aeroUnlocked = localStorage.getItem(NA_AERO_KEY) === 'true' || (parseInt(localStorage.getItem('neon_total_kills')) || 0) >= 67;
if (aeroUnlocked) localStorage.setItem(NA_AERO_KEY, 'true');

function neonDetectOS() {
    const ua = (navigator.userAgent || '').toLowerCase();
    if (/android/.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/.test(ua)) return 'iOS';
    if (/cros/.test(ua)) return 'ChromeOS';
    if (/mac os x/.test(ua)) return 'macOS';
    if (/linux/.test(ua)) return 'Linux';
    if (/windows nt/.test(ua)) {
        // Browsers normalmente reportam Windows 10 e 11 como NT 10.0.
        return 'Windows 10/11';
    }
    return 'Sistema desconhecido';
}

function neonOSLabel() { return '💻 SO: ' + neonDetectOS(); }

async function neonRefineWindowsVersion(labelObj) {
    try {
        if (!navigator.userAgentData || !navigator.userAgentData.getHighEntropyValues) return;
        const data = await navigator.userAgentData.getHighEntropyValues(['platformVersion']);
        const v = String(data.platformVersion || '');
        if (!/windows/i.test(navigator.userAgentData.platform || '')) return;
        // Windows 11 normalmente usa platformVersion 13.x+; versões anteriores indicam Windows 10.
        const major = parseInt(v.split('.')[0], 10);
        if (!Number.isFinite(major)) return;
        const detected = major >= 13 ? 'Windows 11' : 'Windows 10';
        if (labelObj && labelObj.active) labelObj.setText('💻 SO: ' + detected);
    } catch (e) {}
}

function neonAeroIsUnlocked() {
    return aeroUnlocked || totalGlobalKills >= 67;
}

function neonUnlockAero(scene) {
    if (aeroUnlocked || totalGlobalKills < 67) return false;
    aeroUnlocked = true;
    localStorage.setItem(NA_AERO_KEY, 'true');
    if (scene && typeof showNotification === 'function') {
        showNotification(scene, '🪟 WINDOWS AERO DESBLOQUEADO! — 67 ABATES', 'achievement');
    }
    return true;
}

function drawAeroBackground(scene, container, menuMode=false) {
    const w = config.width, h = config.height;
    const add = (obj) => { if (container && container.add) container.add(obj); return obj; };
    const base = add(scene.add.rectangle(w/2, h/2, w*2, h*2, 0x0b1724, 1));
    if (base && base.setDepth) base.setDepth(-1000);
    // Camadas translúcidas para um efeito de vidro sem alterar nenhum PNG original.
    const glow1 = add(scene.add.ellipse(w*0.20, h*0.22, Math.max(300,w*0.55), Math.max(180,h*0.38), 0x4fd9ff, 0.20));
    const glow2 = add(scene.add.ellipse(w*0.78, h*0.72, Math.max(340,w*0.65), Math.max(220,h*0.44), 0x5a7dff, 0.16));
    const glass = add(scene.add.rectangle(w/2, h/2, w*1.1, h*1.1, 0x14324a, 0.30).setStrokeStyle(1, 0xb8f3ff, 0.18));
    const grid = add(scene.add.grid(w/2,h/2,5000,5000,50,50,0x9beaff).setAlpha(menuMode ? 0.045 : 0.06));
    if (glow1) glow1.setBlendMode(Phaser.BlendModes.SCREEN);
    if (glow2) glow2.setBlendMode(Phaser.BlendModes.SCREEN);
    return {base,glow1,glow2,glass,grid};
}

function showNeonLifecycleNotice(scene) {
    if (!scene || !scene.add) return;
    const now = new Date();
    const ended = neonServicesEnded(now);
    const days = neonDaysUntilServiceEnd(now);
    const nearEnd = !ended && days >= 0 && days <= 5;
    const offline = !ended && !navigator.onLine;
    if (!ended && !nearEnd && !offline) return;

    const w = Math.min(760, config.width - 36), h = ended || nearEnd ? 340 : 270;
    const bg = scene.add.rectangle(config.width/2, config.height/2, w, h, 0x05070d, 0.97).setStrokeStyle(2, ended || nearEnd ? 0xff3366 : 0x00ccff).setDepth(5000);
    const titleText = ended || nearEnd ? naT('endedTitle') : naT('offlineTitle');
    const bodyText = ended ? naT('finalBody') : (nearEnd ? naT('endedBody') + (days === 0 ? '\n\nÚltimo dia de funcionamento dos serviços.' : `\n\nFaltam ${days} dias para o encerramento dos serviços.`) : naT('offlineBody'));
    const title = scene.add.text(config.width/2, config.height/2 - h/2 + 55, titleText, {fontSize: Math.min(24, w/22)+'px', color: ended || nearEnd ? '#ff6688' : '#00ffff', fontStyle:'bold', align:'center', wordWrap:{width:w-50}}).setOrigin(.5).setDepth(5001);
    const body = scene.add.text(config.width/2, config.height/2 - 10, bodyText, {fontSize:'16px', color:'#fff', align:'center', wordWrap:{width:w-60}}).setOrigin(.5).setDepth(5001);
    const elements=[bg,title,body];
    if (ended || nearEnd) {
        const rec = scene.add.text(config.width/2, config.height/2 + 55, naT('recommend'), {fontSize:'15px', color:'#ffdd66', align:'center', wordWrap:{width:w-60}}).setOrigin(.5).setDepth(5001);
        elements.push(rec);
        const cont = scene.add.text(config.width/2 - 125, config.height/2 + 120, '▶️ ' + naT('continue'), {fontSize:'16px', backgroundColor:'#222', color:'#fff', padding:{left:12,right:12,top:10,bottom:10}}).setOrigin(.5).setInteractive().setDepth(5002);
        elements.push(cont);
        cont.on('pointerdown',()=>elements.forEach(e=>{if(e&&e.active)e.destroy();}));
        if (ended) {
            const upd = scene.add.text(config.width/2 + 135, config.height/2 + 120, '⬇️ ' + naT('update'), {fontSize:'14px', backgroundColor:'#063b3b', color:'#66ffff', padding:{left:10,right:10,top:10,bottom:10}}).setOrigin(.5).setInteractive().setDepth(5002);
            elements.push(upd);
            // URL real do NA3 pode ser configurada futuramente. Sem link fictício por enquanto.
            upd.on('pointerdown',()=>showNotification(scene,'ℹ️ O download do Neon Arena 3 ainda não foi configurado.','info'));
        }
    } else {
        const cont = scene.add.text(config.width/2, config.height/2 + 75, '▶️ ' + naT('continue'), {fontSize:'17px', backgroundColor:'#123', color:'#66ffff', padding:{left:14,right:14,top:10,bottom:10}}).setOrigin(.5).setInteractive().setDepth(5002);
        elements.push(cont);
        cont.on('pointerdown',()=>elements.forEach(e=>{if(e&&e.active)e.destroy();}));
    }
}

const EMOJI_ASSETS_ENABLED = false;
const EMOJI_ASSETS_PATH = 'assets/emjs/';

// ==========================================================
// NEON ARENA 2 v5.7 — TV MODE
// Controle por controle remoto (Fire TV / Roku / Smart TV)
// ==========================================================
const NA_TV_MODE_KEY = 'neon_tv_mode'; // auto | on | off
const naTVQuery = new URLSearchParams(location.search).get('tv');
const naTVSaved = localStorage.getItem(NA_TV_MODE_KEY) || 'auto';

function neonTVDetectDevice() {
    if (naTVQuery === 'true' || naTVQuery === '1') return true;
    if (naTVQuery === 'false' || naTVQuery === '0') return false;
    if (naTVSaved === 'on') return true;
    if (naTVSaved === 'off') return false;

    const ua = String(navigator.userAgent || '').toLowerCase();
    const platform = String(navigator.platform || '').toLowerCase();
    const tvTokens = [
        'smart-tv','smarttv','hbbtv','googletv','google tv','appletv','apple tv',
        'aftb','aftm','aftt','aft','fire tv','firetv','silk/',
        'roku','web0s','webos','netcast','viera','tizen','tvos',
        'bravia','aquos','dtv','inettv','maple','hisense','vidaa'
    ];
    if (tvTokens.some(token => ua.includes(token))) return true;

    // Alguns navegadores de TV não expõem o modelo no UA, mas deixam
    // a plataforma como TV/CE. É um sinal secundário para evitar falsos positivos.
    if (/\b(tv|ce|smarttv)\b/.test(platform) && !/win|mac|linux|android|iphone|ipad/.test(platform)) {
        return true;
    }
    return false;
}

const NA_TV = {
    enabled: neonTVDetectDevice(),
    focusables: [],
    focusIndex: 0,
    focusBox: null,
    scene: null,
    overlay: null,
    lastScan: 0,
    scaledObjects: new WeakSet()
};

function neonTVSetMode(mode) {
    mode = mode === 'on' || mode === 'off' ? mode : 'auto';
    localStorage.setItem(NA_TV_MODE_KEY, mode);
    location.reload();
}

function neonTVIsActive() {
    return !!NA_TV.enabled;
}

function neonTVGetKey(event) {
    const key = String(event.key || '');
    const code = Number(event.keyCode || event.which || 0);
    if (/^Arrow(Up|Down|Left|Right)$/.test(key)) return key;
    if (key === 'Enter' || key === 'NumpadEnter' || key === 'Accept' || key === 'Select') return 'Enter';
    if (key === 'Escape' || key === 'BrowserBack' || key === 'GoBack' || key === 'Backspace' || key === 'XF86Back') return 'Back';
    if (key === ' ' || key === 'Spacebar') return 'Enter';
    if (code === 37) return 'ArrowLeft';
    if (code === 38) return 'ArrowUp';
    if (code === 39) return 'ArrowRight';
    if (code === 40) return 'ArrowDown';
    if (code === 13) return 'Enter';
    // Roku / webOS / Tizen back buttons.
    if (code === 461 || code === 10009 || code === 4) return 'Back';
    return '';
}

function neonTVTextScale(scene) {
    if (!scene || !scene.children) return;
    scene.children.getAll().forEach(obj => {
        if (!obj || !obj.active || typeof obj.text !== 'string' || NA_TV.scaledObjects.has(obj)) return;
        // Deixa a interface de TV mais legível à distância sem mexer nos sprites.
        const current = parseFloat(obj.style && obj.style.fontSize);
        if (Number.isFinite(current) && current >= 12 && current <= 54) {
            obj.setFontSize(Math.round(current * 1.22));
            NA_TV.scaledObjects.add(obj);
        }
    });
}

function neonTVScan(scene, force = false) {
    if (!NA_TV.enabled || !scene || !scene.children) return;
    const now = performance.now();
    if (!force && now - NA_TV.lastScan < 180) return;
    NA_TV.lastScan = now;
    const old = NA_TV.focusables[NA_TV.focusIndex];
    const items = scene.children.getAll().filter(obj =>
        obj && obj.active &&
        typeof obj.text === 'string' &&
        obj.input && obj.input.enabled !== false &&
        obj.visible !== false &&
        obj.depth >= 0
    );
    items.sort((a,b) => {
        const ay = Number(a.y)||0, by = Number(b.y)||0;
        if (Math.abs(ay-by) > 28) return ay-by;
        return (Number(a.x)||0) - (Number(b.x)||0);
    });
    NA_TV.focusables = items;
    let idx = old ? items.indexOf(old) : -1;
    if (idx < 0) idx = Math.max(0, Math.min(NA_TV.focusIndex, items.length - 1));
    NA_TV.focusIndex = idx;
    neonTVUpdateFocus(scene);
}

function neonTVUpdateFocus(scene) {
    if (!NA_TV.enabled || !scene) return;
    const target = NA_TV.focusables[NA_TV.focusIndex];
    if (!target || !target.active) {
        if (NA_TV.focusBox && NA_TV.focusBox.active) NA_TV.focusBox.setVisible(false);
        return;
    }
    const b = target.getBounds ? target.getBounds() : null;
    if (!b) return;
    if (!NA_TV.focusBox || !NA_TV.focusBox.active) {
        NA_TV.focusBox = scene.add.rectangle(0,0,10,10,0x00ffff,0)
            .setStrokeStyle(4,0x00ffff,1).setDepth(99999);
    }
    NA_TV.focusBox.setPosition(b.centerX,b.centerY)
        .setSize(b.width + 18,b.height + 14)
        .setVisible(true);
}

function neonTVActivate(scene) {
    const target = NA_TV.focusables[NA_TV.focusIndex];
    if (!target || !target.active || !target.input) return false;
    try {
        target.emit('pointerdown', { isDown: true, target });
        target.emit('pointerup', { isDown: false, target });
        return true;
    } catch (e) {
        console.warn('[Neon Arena 2][TV] Falha ao ativar controle:', e);
        return false;
    }
}

function neonTVMove(scene, direction) {
    neonTVScan(scene, true);
    const list = NA_TV.focusables;
    if (!list.length) return;
    const current = list[NA_TV.focusIndex];
    if (!current) return;
    const cx = Number(current.x)||0, cy = Number(current.y)||0;
    const candidates = list.map((obj,i) => {
        if (i === NA_TV.focusIndex) return null;
        const x = Number(obj.x)||0, y = Number(obj.y)||0;
        const dx = x-cx, dy = y-cy;
        let primary, secondary;
        if (direction === 'ArrowUp' || direction === 'ArrowDown') {
            primary = direction === 'ArrowUp' ? -dy : dy;
            secondary = Math.abs(dx);
        } else {
            primary = direction === 'ArrowLeft' ? -dx : dx;
            secondary = Math.abs(dy);
        }
        if (primary < 8) return null;
        return {i, score: primary * 4 + secondary};
    }).filter(Boolean).sort((a,b)=>a.score-b.score);
    if (candidates.length) {
        NA_TV.focusIndex = candidates[0].i;
        neonTVUpdateFocus(scene);
    }
}

function neonTVShootNearest(scene) {
    if (!scene || !player1 || isGameOver || isPaused || isShopOpen) return;
    let best = null, bestD = Infinity;
    if (enemies && enemies.getChildren) {
        enemies.getChildren().forEach(e => {
            if (!e || !e.active) return;
            const d = Phaser.Math.Distance.Between(player1.x,player1.y,e.x,e.y);
            if (d < bestD) { bestD=d; best=e; }
        });
    }
    if (best) shootPlayer1(scene, {x:best.x,y:best.y}, (themeColors[currentBackground] || themeColors.grid).num);
}

function neonTVHandleKey(event) {
    if (!NA_TV.enabled) return;
    const key = neonTVGetKey(event);
    if (!key) return;
    const scene = NA_TV.scene;
    if (!scene || !scene.scene || !scene.scene.isActive()) return;

    // Durante a partida, setas continuam sendo movimento normal do jogador.
    if (isPlaying) {
        if (key === 'Back') {
            event.preventDefault();
            if (typeof togglePauseMenu === 'function') togglePauseMenu(scene);
            return;
        }
        if (key === 'Enter') {
            event.preventDefault();
            neonTVShootNearest(scene);
            return;
        }
        // O jogo já lê as setas via Phaser CursorKeys.
        if (/^Arrow/.test(key)) event.preventDefault();
        return;
    }

    event.preventDefault();
    if (key === 'Enter') {
        neonTVActivate(scene);
    } else if (key === 'Back') {
        const close = NA_TV.focusables.find(o => /FECHAR|CLOSE|VOLTAR|BACK|SAIR/i.test(String(o.text)));
        if (close) {
            NA_TV.focusIndex = NA_TV.focusables.indexOf(close);
            neonTVActivate(scene);
        } else {
            // No menu principal, Back não fecha a página; apenas mantém o jogo.
            neonTVScan(scene, true);
        }
    } else {
        neonTVMove(scene, key);
    }
}

function neonTVInstallScene(scene) {
    if (!NA_TV.enabled || !scene) return;
    NA_TV.scene = scene;
    document.body.classList.add('neon-tv-mode');
    neonTVTextScale(scene);
    neonTVScan(scene, true);
    if (!NA_TV.overlay || !NA_TV.overlay.active) {
        NA_TV.overlay = scene.add.text(config.width - 20, 18, '📺 MODO TV • D-PAD + OK • VOLTAR', {
            fontSize: '14px', color: '#00ffff', backgroundColor: '#061b22',
            padding: {left:10,right:10,top:7,bottom:7}
        }).setOrigin(1,0).setDepth(99998).setScrollFactor(0);
    }
}

window.addEventListener('keydown', neonTVHandleKey, { passive: false });
if (typeof window !== 'undefined') {
    window.NeonArena2TV = {
        enabled: () => neonTVIsActive(),
        detected: () => neonTVDetectDevice(),
        setMode: neonTVSetMode,
        mode: () => localStorage.getItem(NA_TV_MODE_KEY) || 'auto'
    };
}


// O v5.7 instala o suporte TV depois das camadas existentes (v5.5).
// O wrapper fica pronto antes de config.scene ser criado.
const neonTVBaseCreate = create;
create = function() {
    neonTVBaseCreate.call(this);
    if (neonTVIsActive()) {
        setTimeout(() => neonTVInstallScene(this), 60);
    }
};

const neonTVBaseUpdate = update;
update = function(time) {
    const result = neonTVBaseUpdate.call(this, time);
    if (isPlaying && !isGameOver && frameCounter % 30 === 0) neonCheckDaily(this);
    if (neonTVIsActive()) {
        neonTVScan(this);
        if (NA_TV.overlay && NA_TV.overlay.active) {
            NA_TV.overlay.setPosition(config.width - 20, 18);
        }
    }
    return result;
};

const config = { 
    type: Phaser.AUTO, 
    width: window.innerWidth, 
    height: window.innerHeight, 
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: { default: 'arcade' }, 
    scene: { preload: preload, create: create, update: update } 
};

let game;
const ENGINE_LIMITS = {
    maxEnemies: 42,
    maxEnemyBullets: 70,
    maxBullets: 90,
    maxTurretBullets: 60,
    maxTornados: 3,
    replayMaxFrames: 3600,
    replaySampleEvery: 2,
    projectileLifetime: 2600,
    maintenanceInterval: 250,
    homingThinkInterval: 100,
    dustInterval: 90,
    audioSampleInterval: 100
};

let notificationQueue = [];
let notificationBusy = false;
let notificationSerial = 0;
let engineMaintenanceNext = 0;
let nextDustEffectAt = 0;
let nextAudioSampleAt = 0;

// ==========================================
// AFK / ECONOMIA DE ENERGIA — v5.26
// O modo oficial agora usa a subpágina ?economy-mode=true.
// Estas funções permanecem como compatibilidade com chamadas antigas.
// ==========================================
const AFK_TIMEOUT_MS = 5 * 60 * 1000;
let afkLastActivity = Date.now();
let afkEnergyMode = false;
let afkTimer = null;

function enterAFKEnergyMode() {}
function exitAFKEnergyMode() {}
function registerAFKActivity() { afkLastActivity = Date.now(); }
function startAFKMonitor() { afkLastActivity = Date.now(); afkEnergyMode = false; }
function stopAFKMonitor() { afkEnergyMode = false; afkLastActivity = Date.now(); }

// Acessibilidade: legendas/notificações flutuantes ficam DESATIVADAS por padrão.
// O jogador pode ativá-las no menu de Acessibilidade.
let captionsEnabled = localStorage.getItem('neon_captions_enabled') === 'true';
let svgAssetsEnabled = localStorage.getItem('neon_svg_assets_enabled') !== 'false';
let gameStartTime = 0;
let frameCounter = 0;


window.addEventListener('resize', () => {
    if (game && game.scale) {
        game.scale.resize(window.innerWidth, window.innerHeight);
    }
});

// ==========================================
// SISTEMA DE NOTIFICAÇÕES FLUTUANTES (NOVO)
// ==========================================
function showNotification(scene, message, type = 'info') {
    // As mensagens flutuantes funcionam como legendas/notificações.
    // Por padrão ficam ocultas; só aparecem quando o jogador ativa a opção.
    if (!captionsEnabled) return;
    if (!scene || !scene.add) return;

    notificationQueue.push({ scene, message, type });
    if (notificationQueue.length > 6) notificationQueue.shift();
    processNotificationQueue();
}

function processNotificationQueue() {
    if (notificationBusy || notificationQueue.length === 0) return;

    const item = notificationQueue.shift();
    const { scene, message, type } = item;
    if (!scene || !scene.add || !scene.scene.isActive()) {
        notificationBusy = false;
        processNotificationQueue();
        return;
    }

    notificationBusy = true;

    let bgColor = 0x111111;
    let borderColor = 0x00ffcc;
    let textColor = '#00ffcc';

    if (type === 'success') {
        bgColor = 0x003311;
        borderColor = 0x00ff00;
        textColor = '#00ff00';
    } else if (type === 'warning') {
        bgColor = 0x332200;
        borderColor = 0xffaa00;
        textColor = '#ffaa00';
    } else if (type === 'danger') {
        bgColor = 0x330000;
        borderColor = 0xff2222;
        textColor = '#ff2222';
    } else if (type === 'achievement') {
        bgColor = 0x220033;
        borderColor = 0xff00ff;
        textColor = '#ff00ff';
    }

    const id = ++notificationSerial;
    const x = Math.max(150, config.width - 170);
    const y = 75;

    const notifBg = scene.add.rectangle(x, y, 300, 58, bgColor, 0.94)
        .setStrokeStyle(2, borderColor).setDepth(500);
    const notifText = scene.add.text(x, y, message, {
        fontSize: '14px',
        color: textColor,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 275 }
    }).setOrigin(0.5).setDepth(501);

    notifBg.setAlpha(0);
    notifText.setAlpha(0);

    scene.tweens.add({
        targets: [notifBg, notifText],
        alpha: 1,
        y: y + 12,
        duration: 220,
        ease: 'Power2'
    });

    scene.time.delayedCall(2600, () => {
        if (!notifBg.active || !notifText.active) {
            notificationBusy = false;
            processNotificationQueue();
            return;
        }

        scene.tweens.add({
            targets: [notifBg, notifText],
            alpha: 0,
            y: y - 12,
            duration: 220,
            ease: 'Power2',
            onComplete: () => {
                notifBg.destroy();
                notifText.destroy();
                if (id === notificationSerial || notificationQueue.length) {
                    notificationBusy = false;
                    processNotificationQueue();
                }
            }
        });
    });
}

// SISTEMA DE EFEITOS SONOROS VIA WEB AUDIO API (PROCEDURAL)[cite: 2, 3]
const SoundFX = {
    enabled: localStorage.getItem('neon_sound_enabled') !== 'false',
    volume: Math.max(0, Math.min(1, Number(localStorage.getItem('neon_sound_volume')) || 0.75)),
    getCtx() {
        if (!this.enabled) return null;
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        return audioContext;
    },

    shoot() {
        try {
            let ctx = this.getCtx();
            if (!ctx) return;
            let osc = ctx.createOscillator();
            let gain = ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
            
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch(e) {}
    },

    explosion() {
        try {
            let ctx = this.getCtx();
            if (!ctx) return;
            let bufferSize = ctx.sampleRate * 0.3;
            let buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            let output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            let whiteNoise = ctx.createBufferSource();
            whiteNoise.buffer = buffer;

            let filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, ctx.currentTime);
            filter.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.3);

            let gain = ctx.createGain();
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);

            whiteNoise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            whiteNoise.start();
            whiteNoise.stop(ctx.currentTime + 0.3);
        } catch(e) {}
    },

    gem() {
        try {
            let ctx = this.getCtx();
            if (!ctx) return;
            let osc = ctx.createOscillator();
            let gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        } catch(e) {}
    },

    hit() {
        try {
            let ctx = this.getCtx();
            if (!ctx) return;
            let osc = ctx.createOscillator();
            let gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.2);

            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch(e) {}
    }
};

// v5.3 — NOVOS SONS PROCEDURAIS + CONTROLE DE ÁUDIO
// Nenhum arquivo de áudio externo é necessário: os efeitos são sintetizados
// pela Web Audio API, mantendo o projeto leve e offline-friendly.
Object.assign(SoundFX, {
    _beep(freq, duration=0.12, type='sine', gainValue=0.12, endFreq=null, delay=0) {
        try {
            const ctx = this.getCtx(); if (!ctx) return;
            const t = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(Math.max(20, freq), t);
            if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
            gain.gain.setValueAtTime(gainValue * this.volume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(t); osc.stop(t + duration + 0.02);
        } catch(e) {}
    },
    hover() { this._beep(520, 0.06, 'sine', 0.055, 680); },
    click() { this._beep(260, 0.08, 'square', 0.07, 420); },
    playStart() {
        this._beep(260, 0.09, 'sine', 0.09, 520);
        this._beep(520, 0.13, 'sine', 0.08, 1040, 0.07);
    },
    levelUp() {
        [523, 659, 784, 1047].forEach((f,i)=>this._beep(f,0.11,'triangle',0.09,null,i*0.07));
    },
    dash() { this._beep(900, 0.18, 'sawtooth', 0.08, 180); },
    powerup() {
        this._beep(440,0.09,'triangle',0.08,660);
        this._beep(660,0.12,'triangle',0.08,990,0.08);
    },
    critical() { this._beep(950,0.09,'square',0.09,1450); },
    bossIncoming() {
        [110,110,165,220].forEach((f,i)=>this._beep(f,0.16,'sawtooth',0.1,null,i*0.14));
    },
    gameOver() {
        [440,330,220,110].forEach((f,i)=>this._beep(f,0.22,'sine',0.09,null,i*0.12));
    },
    revive() { this._beep(220,0.12,'sine',0.08,440); this._beep(440,0.15,'sine',0.08,880,0.1); },
    achievement() {
        [784,988,1175,1568].forEach((f,i)=>this._beep(f,0.10,'triangle',0.09,null,i*0.06));
    },
    combo(n) {
        const f = 300 + Math.min(900, Number(n||0)*24);
        this._beep(f,0.10,'square',0.075,f*1.35);
    },
    toggle() { this._beep(this.enabled ? 760 : 180,0.1,'sine',0.08); },
    setEnabled(value) {
        this.enabled = !!value;
        localStorage.setItem('neon_sound_enabled', String(this.enabled));
        if (this.enabled) this.toggle();
    },
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, Number(value)||0));
        localStorage.setItem('neon_sound_volume', String(this.volume));
    }
});

// SISTEMA DE CONQUISTAS EXPANDIDO[cite: 2, 3]
let achievements = {
    firstBlood: { title: 'Primeiro Sangue', desc: 'Derrote seu primeiro inimigo', target: 1, current: 0, unlocked: localStorage.getItem('neon_ach_firstBlood') === 'true', reward: 100 },
    masterSlayer: { title: 'Caçador de Neon', desc: 'Derrote 50 inimigos no total', target: 50, current: parseInt(localStorage.getItem('neon_ach_master_curr')) || 0, unlocked: localStorage.getItem('neon_ach_masterSlayer') === 'true', reward: 300 },
    highLevel: { title: 'Veterano', desc: 'Chegue ao Nível 3', target: 3, current: 1, unlocked: localStorage.getItem('neon_ach_highLevel') === 'true', reward: 250 },
    levelTen: { title: 'Mestre da Arena', desc: 'Chegue ao Nível 10', target: 10, current: 1, unlocked: localStorage.getItem('neon_ach_levelTen') === 'true', reward: 500 },
    colossusSlayer: { title: 'Destruidor de Colossos', desc: 'Derrote 1 Colossus', target: 1, current: parseInt(localStorage.getItem('neon_ach_colossus_curr')) || 0, unlocked: localStorage.getItem('neon_ach_colossusSlayer') === 'true', reward: 400 },
    richPlayer: { title: 'Milionário Neon', desc: 'Alcance 5.000 pontos', target: 5000, current: 0, unlocked: localStorage.getItem('neon_ach_richPlayer') === 'true', reward: 600 },
    builderPro: { title: 'Arsenal Completo', desc: 'Construa 5 torres de defesa', target: 5, current: parseInt(localStorage.getItem('neon_ach_builder_curr')) || 0, unlocked: localStorage.getItem('neon_ach_builderPro') === 'true', reward: 350 },
    dashMaster: { title: 'Velocidade da Luz', desc: 'Ative o Dash 10 vezes', target: 10, current: parseInt(localStorage.getItem('neon_ach_dash_curr')) || 0, unlocked: localStorage.getItem('neon_ach_dashMaster') === 'true', reward: 300 },
    marathoner: { title: 'Maratonista Neon', desc: 'Mova-se por uma longa distância na arena', target: 300, current: parseInt(localStorage.getItem('neon_ach_marathoner_curr')) || 0, unlocked: localStorage.getItem('neon_ach_marathoner') === 'true', reward: 350 },
    furyStriker: { title: 'Fúria Desenfreada', desc: 'Ative o bônus de dano 3 vezes', target: 3, current: parseInt(localStorage.getItem('neon_ach_fury_curr')) || 0, unlocked: localStorage.getItem('neon_ach_furyStriker') === 'true', reward: 450 },
    hardcoreSurvivor: { title: 'Sobrevivente Extremo', desc: 'Fique vivo por mais de 20 segundos no Modo Hardcore', target: 20, current: 0, unlocked: localStorage.getItem('neon_ach_hardcoreSurvivor') === 'true', reward: 1000 },
    invasionMaster: { title: 'Mestre da Invasão', desc: 'Conclua as 10 ondas do Modo Invasão', target: 1, current: 0, unlocked: localStorage.getItem('neon_ach_invasionMaster') === 'true', reward: 1500 },
    giantCombo: { title: 'Combo Gigante', desc: 'Alcance um combo de 25 abates', target: 25, current: Number(localStorage.getItem('neon_ach_giantCombo_curr')) || 0, unlocked: localStorage.getItem('neon_ach_giantCombo') === 'true', reward: 1000 },
    giantArsenal: { title: 'Mestre do Arsenal', desc: 'Consiga abates com 10 armas diferentes', target: 10, current: Number(localStorage.getItem('neon_ach_giantArsenal_curr')) || 0, unlocked: localStorage.getItem('neon_ach_giantArsenal') === 'true', reward: 1200 }
    ,bossSlayer: { title: 'Caçador de Chefes', desc: 'Derrote 4 bosses diferentes', target: 4, current: Number(localStorage.getItem('neon_ach_bossSlayer_curr')) || 0, unlocked: localStorage.getItem('neon_ach_bossSlayer') === 'true', reward: 2000 },
    timeAttackAce: { title: 'Cronômetro Neon', desc: 'Conclua uma partida de Time Attack', target: 1, current: 0, unlocked: localStorage.getItem('neon_ach_timeAttackAce') === 'true', reward: 750 },
    bossRushChampion: { title: 'Campeão dos Chefes', desc: 'Conclua o BOSS RUSH', target: 1, current: 0, unlocked: localStorage.getItem('neon_ach_bossRushChampion') === 'true', reward: 2500 },
    windowsAero: { title: 'Aero Neon', desc: 'Derrote 67 inimigos no total e desbloqueie o Windows Aero', target: 67, current: Number(localStorage.getItem('neon_ach_windowsAero_curr')) || Math.min(67, parseInt(localStorage.getItem('neon_total_kills')) || 0), unlocked: localStorage.getItem('neon_ach_windowsAero') === 'true', reward: 1000 }
};

// ==========================================
// SISTEMA DE ARMAS & REBIRTH (PRESTÍGIO)[cite: 2, 3]
// ==========================================
const weapons = {
    basic: { name: "Cuspe Natural", damage: 1, cost: 0, fireRate: 300, color: 0xffffff, unlocked: true, type: "single" },
    slingshot: { name: "Estilingue Veloz", damage: 2, cost: 150, fireRate: 200, color: 0xcccccc, unlocked: false, type: "single" },
    shotgun: { name: "Espingarda Rustica", damage: 3.5, cost: 400, fireRate: 500, color: 0xffaa00, unlocked: false, type: "spread", pellets: 5, spread: 0.22 },
    plasma: { name: "Lancador Plasma", damage: 6, cost: 1000, fireRate: 250, color: 0x00ffff, unlocked: false, type: "pierce", pierce: 2 },
    ak47: { name: "AK-47 Tatica", damage: 10, cost: 2500, fireRate: 100, color: 0xff0000, unlocked: false, type: "burst", burst: 3, spread: 0.05 },
    railgun: { name: "Railgun Neon", damage: 18, cost: 4500, fireRate: 850, color: 0xffffff, unlocked: false, type: "pierce", pierce: 5 },
    pulse: { name: "Canhao de Pulso", damage: 9, cost: 6000, fireRate: 420, color: 0x00ffcc, unlocked: false, type: "explosive", radius: 75 },
    dual: { name: "Dual Blasters", damage: 7, cost: 8000, fireRate: 180, color: 0xff66ff, unlocked: false, type: "dual" },
    frost: { name: "Cryo Blaster", damage: 5, cost: 9500, fireRate: 240, color: 0x66ddff, unlocked: false, type: "slow", slow: 0.45 },
    vortex: { name: "Vortex Launcher", damage: 12, cost: 12000, fireRate: 600, color: 0xaa55ff, unlocked: false, type: "homing" },
    nova: { name: "Nova Cannon", damage: 22, cost: 18000, fireRate: 1100, color: 0xffdd55, unlocked: false, type: "nova", radius: 115 },
    minigun: { name: "Neon Minigun", damage: 5, cost: 25000, fireRate: 55, color: 0xff5555, unlocked: false, type: "burst", burst: 2, spread: 0.08 },
    boomerang: { name: "Boomerang Neon", damage: 15, cost: 32000, fireRate: 700, color: 0x55ff99, unlocked: false, type: "boomerang" },
    chain: { name: "Chain Blaster", damage: 8, cost: 38000, fireRate: 360, color: 0xff66cc, unlocked: false, type: "chain", chain: 3 },
    lightning: { name: "Raio Arc", damage: 13, cost: 45000, fireRate: 800, color: 0xffff55, unlocked: false, type: "lightning", radius: 135 },
    prism: { name: "Prisma Cannon", damage: 11, cost: 52000, fireRate: 430, color: 0x66ffff, unlocked: false, type: "prism", pellets: 6 },
    singularity: { name: "Singularidade", damage: 28, cost: 70000, fireRate: 1400, color: 0x9955ff, unlocked: false, type: "singularity", radius: 155 }
};

// Persistencia segura: dados corrompidos no localStorage nunca devem impedir o jogo de iniciar.
let weaponMastery = {};
try {
    const rawMastery = localStorage.getItem('neon_weapon_mastery');
    const parsedMastery = rawMastery ? JSON.parse(rawMastery) : {};
    weaponMastery = (parsedMastery && typeof parsedMastery === 'object' && !Array.isArray(parsedMastery)) ? parsedMastery : {};
} catch (err) {
    weaponMastery = {};
}

const savedWeaponUnlocks = {};
for (const key of Object.keys(weapons)) {
    const w = weapons[key];
    w.mastery = Math.max(0, Math.min(100, Number(weaponMastery[key] && weaponMastery[key].mastery) || Number(weaponMastery[w.name]) || 0));
    savedWeaponUnlocks[key] = localStorage.getItem('neon_weapon_' + key) === 'true' || w.unlocked;
    w.unlocked = savedWeaponUnlocks[key];
}

let currentWeapon = weapons.basic;
let rebirthLevel = parseInt(localStorage.getItem('neon_rebirth_level')) || 0;
// ==========================================

let player1, player2, enemies, bullets, enemyBullets, gems, swordDrops, goldenHeartDrops, turrets, turretBullets, traps, chaosTornados, ui = {};
let legendaryAlly = null;
let legendaryAllyEligible = false;
let legendaryAllySpawned = false;


const NeonArena2Runtime = {
    get game() { return game; },
    get player1() { return player1; },
    get player2() { return player2; },
    get enemies() { return enemies; },
    get bullets() { return bullets; },
    get enemyBullets() { return enemyBullets; },
    get gems() { return gems; },
    get goldenHeartDrops() { return goldenHeartDrops; },
    get isPlaying() { return isPlaying; },
    get isGameOver() { return isGameOver; },
    get isPaused() { return isPaused; },
    get isShopOpen() { return isShopOpen; },
    get hitEnemy() { return hitEnemy; },
    get hitEnemyByEnemyBullet() { return hitEnemyByEnemyBullet; },
    get showNotification() { return showNotification; },
    get config() { return config; }
};
if (typeof window !== 'undefined') window.NeonArena2Runtime = NeonArena2Runtime;

let score = 0, level = 1, xp = 0, nextLevelXp = 100;

// v5.21 — DEBUG MODE (somente quando ?debug-mode=true e autenticado)
const NA2_DEBUG = {
    requested: new URLSearchParams(location.search).get('debug-mode') === 'true',
    authenticated: !!window.__NA2_DEBUG_AUTHENTICATED__,
    open: false,
    options: {
        goldenHeartDrops: false,
        invulnerable: false,
        infiniteHp: false,
        xpBoost: false,
        scoreBoost: false,
        damageBoost: false,
        noCooldown: false
    }
};
window.NA2_DEBUG = NA2_DEBUG;

function isDebugEnabled(option = null) {
    if (!NA2_DEBUG.requested || !NA2_DEBUG.authenticated) return false;
    return option ? !!NA2_DEBUG.options[option] : true;
}

function getDebugScene() {
    return getSafeGameScene(null);
}

function debugSetOption(option, value) {
    if (!NA2_DEBUG.options || !(option in NA2_DEBUG.options)) return;
    NA2_DEBUG.options[option] = !!value;
    updateDebugButtonState();
    if (typeof updateUI === 'function') updateUI();
}

function debugAddLevel(scene) {
    if (!isDebugEnabled()) return;
    level = Math.max(1, Number(level) || 1) + 1;
    xp = 0;
    nextLevelXp = Math.max(100, 100 + (level - 1) * 120);
    hp1 = 3;
    if (gameMode === 'coop') hp2 = 3;
    SoundFX.levelUp();
    if (scene) naVisualLevelUp(scene);
    if (scene) showNotification(scene, `🛠️ DEBUG: Nível ${level}!`, 'achievement');
    updateUI();
}

function debugSpawnGoldenHeart() {
    const scene = getDebugScene();
    if (!isDebugEnabled() || !scene || !goldenHeartDrops) return;
    const item = spawnGoldenHeartItem(scene);
    if (item) showNotification(scene, '🛠️ DEBUG: Coração Dourado criado!', 'success');
}

function debugForceRandomEvent() {
    const scene = getDebugScene();
    if (!isDebugEnabled() || !scene || typeof triggerRandomEvent !== 'function') return;
    triggerRandomEvent(scene);
}

function debugKillAllEnemies() {
    if (!isDebugEnabled() || !enemies) return;
    enemies.getChildren().slice().forEach(e => {
        if (e && e.active) e.destroy();
    });
    if (typeof updateUI === 'function') updateUI();
    const scene = getDebugScene();
    if (scene) showNotification(scene, '🛠️ DEBUG: Inimigos removidos!', 'info');
}

function updateDebugButtonState() {
    const panel = document.getElementById('na2-debug-panel');
    if (!panel) return;
    panel.querySelectorAll('[data-debug-option]').forEach(el => {
        const key = el.getAttribute('data-debug-option');
        el.checked = !!NA2_DEBUG.options[key];
    });
}

function toggleDebugPanel() {
    if (!isDebugEnabled()) return;
    const panel = document.getElementById('na2-debug-panel');
    if (!panel) return;
    NA2_DEBUG.open = !NA2_DEBUG.open;
    panel.style.display = NA2_DEBUG.open ? 'block' : 'none';
    updateDebugButtonState();
}

function setupDebugKeyboard() {
    if (!NA2_DEBUG.requested) return;
    window.addEventListener('keydown', (event) => {
        if (event.key && event.key.toLowerCase() === 'h' && !event.repeat) {
            const tag = document.activeElement && document.activeElement.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (NA2_DEBUG.authenticated) {
                event.preventDefault();
                toggleDebugPanel();
            }
        }
    }, true);
}
setupDebugKeyboard();

// v5.19.1 — XP/Level safety: NaN nunca deve entrar na progressão.
// Alguns drops antigos não recebiam xpValue, fazendo `xp += undefined` virar NaN.
function normalizeProgressionState() {
    if (!Number.isFinite(level) || level < 1) level = 1;
    level = Math.floor(level);
    if (!Number.isFinite(xp) || xp < 0) xp = 0;
    if (!Number.isFinite(nextLevelXp) || nextLevelXp <= 0) {
        nextLevelXp = 100 + Math.max(0, level - 1) * 120;
    }
    return { level, xp, nextLevelXp };
}

function addPlayerXP(amount, scene = null) {
    normalizeProgressionState();
    const gained = Number(amount);
    if (!Number.isFinite(gained) || gained <= 0) return;
    xp += gained * (isDebugEnabled('xpBoost') ? 10 : 1);

    // Permite subir vários níveis se um drop/evento conceder XP suficiente.
    while (xp >= nextLevelXp && Number.isFinite(nextLevelXp) && nextLevelXp > 0) {
        xp -= nextLevelXp;
        level++;
        SoundFX.levelUp();
        if (scene) naVisualLevelUp(scene);
        if (level % 3 === 0 && scene) triggerLevelUpPowerUpSelection(scene);
        hp1 = 3;
        fireRate = Math.max(80, fireRate - 25);
        nextLevelXp += 120;

        if (scene) {
            showNotification(scene, `🎉 Nível ${level} Alcançado!`, 'achievement');
            if (level >= 3) checkAchievement(scene, 'highLevel');
            if (level >= 10) {
                skinDUnlocked = true;
                localStorage.setItem('neon_skin_d', 'true');
                checkAchievement(scene, 'levelTen');
            }
        }
    }
    normalizeProgressionState();
}
let runStatsRecorded = false;
let lastFired1 = 0, lastFired2 = 0;
let hp1 = 3, hp2 = 3;
// v5.20 — Corações dourados: cada coração suporta exatamente 2 golpes antes de desaparecer.
let goldenHearts1 = 0, goldenHearts2 = 0;
let goldenHeartHits1 = 0, goldenHeartHits2 = 0;
let goldenHeartSpawnTimer = null;
let lastEspionerSquadSpawn = 0;
let purpleSouls = 0, blueSouls = 0, zipaSouls = 0, auraActive = false, auraTime = 0, auraCircle;
let dashActive = false, dashTime = 0, damageMultiplier = 1, killCount = 0, isGameOver = false;
let doubleShotActive = false, doubleShotTime = 0;
let swordCharges = 0, swordSwingUntil = 0, swordSwingCooldown = 0, swordVisual = null;

// v5.17 — EVENTOS ALEATÓRIOS DURANTE A PARTIDA
let randomEventScoreMultiplier = 1;
let randomEventUntil = 0;
let randomEventTimer = null;
let randomEventLabel = null;
let randomEventOriginalFireRate = null;
let randomEventName = '';

let shieldActive = false;
let shieldSprite;

let laserActive = false, laserTime = 0, laserBeam;
let timeSlowActive = false, timeSlowTime = 0;
let customSkinLoaded = false;
let customSkinActive = localStorage.getItem('neon_player_skin_custom_active') === 'true';
// BUILT-IN PLAYER SKINS — v4.6
const BUILTIN_SKINS = {
    classic: { name: 'NEON CLASSIC', desc: 'O visual original do jogador.', color: '#00ff00' },
    cyber:   { name: 'CYBER', desc: 'Circuitos neon e visual tecnológico.', color: '#00ffff' },
    plasma:  { name: 'PLASMA', desc: 'Energia roxa concentrada.', color: '#bb55ff' },
    toxic:   { name: 'TOXIC', desc: 'Núcleo verde radioativo.', color: '#66ff33' },
    gold:    { name: 'GOLD', desc: 'Revestimento dourado.', color: '#ffd43b' },
    shadow:  { name: 'SHADOW', desc: 'Visual escuro com núcleo neon.', color: '#aa66ff' },
    ice:     { name: 'ICE', desc: 'Cristal azul congelado.', color: '#66ddff' },
    rainbow: { name: 'RAINBOW', desc: 'Núcleo com espectro neon.', color: '#ff66cc' },
    magma:   { name: 'MAGMA', desc: 'Energia vulcânica em alta temperatura.', color: '#ff5a36' },
    emerald: { name: 'EMERALD', desc: 'Núcleo verde esmeralda.', color: '#38ff9b' },
    void:    { name: 'VOID', desc: 'Energia escura de uma singularidade.', color: '#9b5cff' },
    solar:   { name: 'SOLAR', desc: 'Núcleo dourado com energia solar.', color: '#ffe066' },
    synth:   { name: 'SYNTHWAVE', desc: 'Visual retrô neon com duas cores.', color: '#ff4fd8' },
    prism:   { name: 'PRISM', desc: 'Cristal multicolorido com brilho prismático.', color: '#7df9ff' },
    inferno: { name: 'INFERNO', desc: 'Núcleo incandescente em tons de fogo.', color: '#ff6a00' },
    aurora:  { name: 'AURORA', desc: 'Ondas luminosas inspiradas na aurora polar.', color: '#72ffcf' },
    cyberpunk: { name: 'CYBERPUNK', desc: 'Magenta elétrico e azul digital.', color: '#ff2bd6' },
    oceanic: { name: 'OCEANIC', desc: 'Energia azul profunda com núcleo aquático.', color: '#27bfff' },
    ghost:   { name: 'GHOST', desc: 'Visual espectral quase transparente.', color: '#d9f7ff' },
    voltage: { name: 'VOLTAGE', desc: 'Descarga elétrica concentrada.', color: '#f7ff38' }
};
let currentPlayerSkin = localStorage.getItem('neon_player_skin') || 'classic';
let skinPopupWindow = null;


let joystick1 = { up: false, down: false, left: false, right: false };
let joystick2 = { up: false, down: false, left: false, right: false };
let isReplaying = false, isPlaying = false, isPaused = false, isShopOpen = false;
let replayData = [];

let audioContext, analyser, dataArray, microphoneLevel = 0, soundBar;
let totalGlobalKills = parseInt(localStorage.getItem('neon_total_kills')) || 0;

let skinAUnlocked = (totalGlobalKills >= 5) || (localStorage.getItem('neon_skin_a') === 'true');
let skinBUnlocked = (totalGlobalKills >= 10) || (localStorage.getItem('neon_skin_b') === 'true');
let skinCUnlocked = (totalGlobalKills >= 15) || (localStorage.getItem('neon_skin_c') === 'true');
let skinDUnlocked = (totalGlobalKills >= 20) || (localStorage.getItem('neon_skin_d') === 'true');

let adminWin10Unlocked = localStorage.getItem('neon_admin_win10_unlocked') === 'true';

// MODO PRÁTICA 2.1 — restaurado na v5.0.1
let isPracticeMode = false;
let practiceSettings = { speed: 5.0, enemies: true, invulnerable: true, obstacles: true, target: 0 };
let practiceStats = { distance: 0, collisions: 0, shots: 0, dashes: 0, trainingTime: 0, lastX: 0, lastY: 0 };
let practiceHudTimer = 0;
let performanceMode = localStorage.getItem('neon_performance_mode') || 'auto';
const NA_VISUAL_FX_KEY = 'neon_visual_fx_mode';
let visualFXMode = localStorage.getItem(NA_VISUAL_FX_KEY) || 'auto';
if (!['auto','low','medium','high','ultra','off'].includes(visualFXMode)) visualFXMode = 'auto';
function savePerformanceMode(){ localStorage.setItem('neon_performance_mode', performanceMode); }
function saveVisualFXMode(){ localStorage.setItem(NA_VISUAL_FX_KEY, visualFXMode); }
function getVisualFXLevel(){
    if (visualFXMode === 'off') return 0;
    if (visualFXMode === 'low') return 1;
    if (visualFXMode === 'medium') return 2;
    if (visualFXMode === 'high') return 3;
    if (visualFXMode === 'ultra') return 4;
    if (performanceMode === 'low') return 1;
    if (performanceMode === 'medium') return 2;
    return 3;
}

// =========================================================
// NEON ARENA 2 v5.25 — BETTER DETAILS
// Qualidade visual independente do pacote de Visual FX.
// =========================================================
const NA_BETTER_DETAILS_KEY = 'neon_better_details_mode';
let betterDetailsMode = localStorage.getItem(NA_BETTER_DETAILS_KEY) || 'off';
if (!['off','low','medium','high','ultra'].includes(betterDetailsMode)) betterDetailsMode = 'off';
function saveBetterDetailsMode(){ localStorage.setItem(NA_BETTER_DETAILS_KEY, betterDetailsMode); }
function getBetterDetailsLevel(){
    if (betterDetailsMode === 'low') return 1;
    if (betterDetailsMode === 'medium') return 2;
    if (betterDetailsMode === 'high') return 3;
    if (betterDetailsMode === 'ultra') return 4;
    return 0;
}
function betterDetailsLabel(){
    const key = 'betterDetails' + (betterDetailsMode === 'off' ? 'Off' : betterDetailsMode.charAt(0).toUpperCase()+betterDetailsMode.slice(1));
    return naT(key);
}
let naBetterDetailsGraphics = null;
let naBetterDetailsLastDraw = 0;
function naBetterDetailsReset(scene){
    if (naBetterDetailsGraphics && naBetterDetailsGraphics.destroy) naBetterDetailsGraphics.destroy();
    naBetterDetailsGraphics = null;
    naBetterDetailsLastDraw = 0;
    if (!scene || getBetterDetailsLevel() <= 0 || !scene.add) return;
    naBetterDetailsGraphics = scene.add.graphics().setDepth(3);
    naBetterDetailsGraphics.setAlpha(getBetterDetailsLevel() === 1 ? 0.42 : getBetterDetailsLevel() === 2 ? 0.52 : getBetterDetailsLevel() === 3 ? 0.62 : 0.72);
}
function naBetterDetailsUpdate(scene,time){
    const level=getBetterDetailsLevel();
    if (!scene || !scene.add || !isPlaying || isGameOver || isPaused || level<=0) return;
    if (!naBetterDetailsGraphics || !naBetterDetailsGraphics.active) naBetterDetailsReset(scene);
    if (!naBetterDetailsGraphics || time < naBetterDetailsLastDraw) return;
    naBetterDetailsLastDraw=time+(level>=4?70:level>=3?95:level>=2?125:170);
    const g=naBetterDetailsGraphics; g.clear();
    const w=config.width,h=config.height;
    // Moldura e grade neon: dá mais definição à arena sem criar sprites por frame.
    g.lineStyle(level>=4?2:1,0x1fe7ff,level>=3?.18:.12);
    const step=level>=4?36:48;
    for(let x=0;x<=w;x+=step) g.lineBetween(x,70,x,h);
    for(let y=70;y<=h;y+=step) g.lineBetween(0,y,w,y);
    g.lineStyle(level>=3?3:2,0x00ffff,level>=4?.42:.28);
    g.strokeRect(8,72,w-16,h-80);
    // Cantos detalhados.
    const c=level>=4?42:28;
    g.lineBetween(10,74,10+c,74); g.lineBetween(10,74,10,74+c);
    g.lineBetween(w-10,74,w-10-c,74); g.lineBetween(w-10,74,w-10,74+c);
    g.lineBetween(10,h-10,10+c,h-10); g.lineBetween(10,h-10,10,h-10-c);
    g.lineBetween(w-10,h-10,w-10-c,h-10); g.lineBetween(w-10,h-10,w-10,h-10-c);
    if(level>=2 && player1 && player1.active){
        g.lineStyle(2,0x66ffff,level>=4?.28:.18);
        g.strokeCircle(player1.x,player1.y,level>=4?28:22);
        if(level>=3) g.strokeCircle(player1.x,player1.y,level>=4?35:29);
    }
    if(level>=3 && typeof enemies!=='undefined' && enemies){
        const max=level>=4?36:18; let count=0;
        enemies.getChildren().forEach(e=>{
            if(count>=max || !e || !e.active) return;
            const boss=!!(e.getData&&e.getData('isBoss'));
            g.lineStyle(boss?2:1,boss?0xff4f9a:0xff55dd,boss?.55:.25);
            g.strokeCircle(e.x,e.y,(boss?18:11)+(level>=4?3:0)); count++;
        });
    }
    if(level>=3 && typeof bullets!=='undefined' && bullets){
        const max=level>=4?70:28; let count=0;
        bullets.getChildren().forEach(b=>{
            if(count>=max || !b || !b.active || !b.body) return;
            const vx=b.body.velocity.x||0,vy=b.body.velocity.y||0,len=Math.min(level>=4?13:8,Math.hypot(vx,vy)*0.02);
            if(len>1){ g.lineStyle(level>=4?2:1,0x66ffff,level>=4?.34:.22); g.lineBetween(b.x-vx*0.01*len,b.y-vy*0.01*len,b.x,b.y); } count++;
        });
    }
    if(level>=4){
        const scan=(time*0.12)%Math.max(1,h-90)+75;
        g.lineStyle(1,0xff44dd,.18); g.lineBetween(12,scan,w-12,scan);
    }
}

let currentBackground = localStorage.getItem('neon_selected_bg') || 'grid';
let solidThemeColor = localStorage.getItem('neon_solid_color') || 'grid';
let isLightMode = localStorage.getItem('neon_light_mode') === 'true';
let gameMode = localStorage.getItem('neon_game_mode') || 'solo';
let legacyLastFired = 0;
let legacyAuraActive = false, legacyAuraUntil = 0;
let legacyDashActive = false, legacyDashUntil = 0;
let legacyJoystick = { up:false, down:false, left:false, right:false };
let legacyModeStarted = false;
let timeAttackTimeLeft = 90;
let timeAttackTimerEvent = null;
let bossRushIndex = 0;
let bossRushTotal = 4;
let bossRushActive = false;
let waveNumber = 0, waveTotal = 0, waveActive = false, waveTransition = false;
let waveSpawnTimer = null, waveCheckTimer = null, waveSpawningDone = false;

// ==========================================
// BOSS SYSTEM v4.3
// ==========================================
let activeBoss = null;
let bossHpBar = null;
let bossHpFill = null;
let bossNameText = null;
let bossDefeatedSet = {};
let bossAttackTimers = {};
const BOSS_TYPES = {
    neon_king: { name: 'NEON KING', maxHp: 120, speed: 82, color: 0xff00ff, reward: 2500 },
    volt_titan: { name: 'VOLT TITAN', maxHp: 155, speed: 68, color: 0xffff00, reward: 3000 },
    void_walker: { name: 'VOID WALKER', maxHp: 105, speed: 120, color: 0xaa55ff, reward: 2800 },
    ai_overlord: { name: 'AI OVERLORD', maxHp: 190, speed: 76, color: 0x00ffff, reward: 4000 }
};

Object.keys(BOSS_TYPES).forEach(k => { bossDefeatedSet[k] = localStorage.getItem('neon_boss_defeated_' + k) === 'true'; });

// ==========================================
// GIANT UPDATE v4.2 — PACOTÃO DE SISTEMAS
// ==========================================
let giantCombo = 0;
let giantComboBest = Number(localStorage.getItem('neon_giant_combo_best')) || 0;
let giantComboUntil = 0;
let giantOverdriveUntil = 0;
let giantRunKills = 0;
let giantRunShots = 0;
let giantRunStart = 0;
let giantWeaponKills = {};
let giantMission = null;
let giantMissionRewarded = false;
let giantHud = null;
let giantMissionText = null;
let giantComboText = null;
let giantOverdriveText = null;
let giantLastInputTime = 0;

const giantMissions = [
    { id:'kills', name:'Caçador', target:25, reward:750 },
    { id:'score', name:'Pontuação Neon', target:2500, reward:800 },
    { id:'combo', name:'Combo Insano', target:12, reward:900 },
    { id:'weapon', name:'Arsenal em Ação', target:3, reward:850 }
];



let hardcoreStartTime = 0;
let hardcoreTimerEvent = null;
let chaosEventTimer = null;

const solidColorsMap = {
    'grid': { name: 'Verde Clássico', hex: 0x111111, code: '#00ff00' },
    'blue': { name: 'Modo Azul', hex: 0x050b1a, code: '#0088ff' },
    'red': { name: 'Modo Vermelho', hex: 0x1a0505, code: '#ff2222' },
    'purple': { name: 'Modo Roxo', hex: 0x12051a, code: '#aa00ff' },
    'orange': { name: 'Modo Laranja Neon', hex: 0x1a0f00, code: '#ffaa00' }
};

const gradientThemes = {
    neon_sunset: { name: 'NEON SUNSET', topLeft: 0xff335f, topRight: 0xffa63d, bottomLeft: 0x6b2cff, bottomRight: 0x170b3d, code: '#ff6b8a' },
    cyber_ocean: { name: 'CYBER OCEAN', topLeft: 0x00eaff, topRight: 0x0066ff, bottomLeft: 0x04142f, bottomRight: 0x001b3d, code: '#00eaff' },
    toxic_wave: { name: 'TOXIC WAVE', topLeft: 0x8cff33, topRight: 0x00ff99, bottomLeft: 0x062d1b, bottomRight: 0x00150c, code: '#66ff55' },
    purple_void: { name: 'PURPLE VOID', topLeft: 0xc45cff, topRight: 0x5b2cff, bottomLeft: 0x10051f, bottomRight: 0x020006, code: '#b06cff' },
    solar_flare: { name: 'SOLAR FLARE', topLeft: 0xfff06a, topRight: 0xff7a2e, bottomLeft: 0x451003, bottomRight: 0x100400, code: '#ffd84a' },
    synthwave: { name: 'SYNTHWAVE', topLeft: 0xff38d1, topRight: 0x5c5cff, bottomLeft: 0x12052b, bottomRight: 0x03010b, code: '#ff55dd' },
    arctic_neon: { name: 'ARCTIC NEON', topLeft: 0xd7ffff, topRight: 0x48cfff, bottomLeft: 0x092844, bottomRight: 0x020b18, code: '#7df9ff' },
    blood_moon: { name: 'BLOOD MOON', topLeft: 0xff315a, topRight: 0x7d102b, bottomLeft: 0x23030d, bottomRight: 0x050105, code: '#ff4768' },
    matrix: { name: 'MATRIX', topLeft: 0x39ff88, topRight: 0x00a84f, bottomLeft: 0x021b12, bottomRight: 0x000804, code: '#39ff88' },
    deep_space: { name: 'DEEP SPACE', topLeft: 0x713cff, topRight: 0x1b6cff, bottomLeft: 0x08031c, bottomRight: 0x010106, code: '#8b6cff' },
    candy_core: { name: 'CANDY CORE', topLeft: 0xff77c8, topRight: 0x7c7cff, bottomLeft: 0x35104d, bottomRight: 0x10051e, code: '#ff8ad8' },
    electric_storm: { name: 'ELECTRIC STORM', topLeft: 0xf7ff38, topRight: 0x31d8ff, bottomLeft: 0x061c3a, bottomRight: 0x020712, code: '#f7ff38' },
    midnight_cyan: { name: 'MIDNIGHT CYAN', topLeft: 0x00fff0, topRight: 0x007d91, bottomLeft: 0x02131d, bottomRight: 0x00060b, code: '#00fff0' },
    lava_core: { name: 'LAVA CORE', topLeft: 0xffd13d, topRight: 0xff4d00, bottomLeft: 0x4b0d02, bottomRight: 0x100100, code: '#ff8a24' }
};

// v5.25 BugFix 2 — lista única de cenários selecionáveis.
// Antes, o botão de cenário mudava de ciclo ao entrar nos gradientes,
// deixando os fundos A/B/C/D inacessíveis sem limpar o localStorage.
function getSelectableBackgrounds() {
    const list = ['grid'];
    if (skinAUnlocked) list.push('skin_a');
    if (skinBUnlocked) list.push('skin_b');
    if (skinCUnlocked) list.push('skin_c');
    if (skinDUnlocked) list.push('skin_d');
    // Win10 só entra na lista quando o asset realmente existe; a v5.25 distribuída não o contém.
    if (neonAeroIsUnlocked()) list.push('aero');
    Object.keys(gradientThemes).forEach(k => list.push(k));
    return list;
}

function cycleBackgroundSelection() {
    const list = getSelectableBackgrounds();
    const current = list.indexOf(currentBackground);
    return list[(current < 0 ? 0 : current + 1) % list.length];
}

const themeColors = {
    'grid': { hex: '#00ff00', num: 0x00ff00 },
    'skin_a': { hex: '#ff2222', num: 0xff2222 },
    'skin_b': { hex: '#00ffff', num: 0x00ffff },
    'skin_c': { hex: '#0066ff', num: 0x0066ff },
    'skin_d': { hex: '#0066ff', num: 0x0066ff },
    'win10': { hex: '#0078d7', num: 0x0078d7 },
    'aero': { hex: '#8feaff', num: 0x8feaff },
    'blue': { hex: '#0088ff', num: 0x0088ff },
    'red': { hex: '#ff2222', num: 0xff2222 },
    'purple': { hex: '#aa00ff', num: 0xaa00ff },
    'orange': { hex: '#ffaa00', num: 0xffaa00 },
    'neon_sunset': { hex: '#ff6b8a', num: 0xff6b8a },
    'cyber_ocean': { hex: '#00eaff', num: 0x00eaff },
    'toxic_wave': { hex: '#66ff55', num: 0x66ff55 },
    'purple_void': { hex: '#b06cff', num: 0xb06cff },
    'solar_flare': { hex: '#ffd84a', num: 0xffd84a },
    'synthwave': { hex: '#ff55dd', num: 0xff55dd },
    'arctic_neon': { hex: '#7df9ff', num: 0x7df9ff },
    'blood_moon': { hex: '#ff4768', num: 0xff4768 },
    'matrix': { hex: '#39ff88', num: 0x39ff88 },
    'deep_space': { hex: '#8b6cff', num: 0x8b6cff },
    'candy_core': { hex: '#ff8ad8', num: 0xff8ad8 },
    'electric_storm': { hex: '#f7ff38', num: 0xf7ff38 },
    'midnight_cyan': { hex: '#00fff0', num: 0x00fff0 },
    'lava_core': { hex: '#ff8a24', num: 0xff8a24 }
};

let cursors, wasdKeys;

// ==========================================
// ENTRADAS: TOUCH / TECLADO / CONTROLE
// ==========================================
const INPUT_MODE = { KEYBOARD: 'keyboard', TOUCH: 'touch', GAMEPAD: 'gamepad' };
let inputMode = INPUT_MODE.KEYBOARD;
let touchDetected = false;
let activeGamepadIndex = null;
let previousGamepadButtons = [];
let gamepadLastSeen = 0;
let gamepadHint = null;
let mobileControlElements = [];
let desktopShopButton = null;

function detectTouchSupport() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

function findActiveGamepad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    if (activeGamepadIndex !== null && pads[activeGamepadIndex]) return pads[activeGamepadIndex];
    for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i].connected) {
            activeGamepadIndex = i;
            return pads[i];
        }
    }
    activeGamepadIndex = null;
    return null;
}

function gamepadButtonPressed(gp, index) {
    return !!(gp && gp.buttons && gp.buttons[index] && gp.buttons[index].pressed);
}

function gamepadButtonJustPressed(gp, index) {
    const now = gamepadButtonPressed(gp, index);
    const was = !!previousGamepadButtons[index];
    previousGamepadButtons[index] = now;
    return now && !was;
}

function setMobileControlsVisible(visible) {
    mobileControlElements.forEach(el => {
        if (el && el.active) el.setVisible(visible).setInteractive(visible);
    });
}

function updateInputHint(scene, mode) {
    if (!scene || !scene.add) return;
    if (gamepadHint && gamepadHint.active) gamepadHint.destroy();

    let text = '';
    setMobileControlsVisible(mode !== INPUT_MODE.GAMEPAD);

    if (mode === INPUT_MODE.GAMEPAD) {
        text = '🎮 CONTROLE: ANALÓGICO = ANDAR  |  X = LOJA';
    } else if (mode === INPUT_MODE.TOUCH) {
        text = '📱 TOUCH: BOTÕES = MOVER / HABILIDADES';
    } else {
        text = '⌨️ PC: WASD/SETAS = MOVER  |  🖱️ = ATIRAR  |  🛒 = LOJA';
    }
    gamepadHint = scene.add.text(config.width - 12, config.height - 14, text, {
        fontSize: '13px', color: '#ffffff', backgroundColor: '#000000',
        padding: { left: 7, right: 7, top: 5, bottom: 5 }, align: 'right'
    }).setOrigin(1, 1).setAlpha(0.82).setDepth(305);
}

window.addEventListener('touchstart', () => {
    touchDetected = true;
}, { passive: true });

window.addEventListener('gamepadconnected', (event) => {
    activeGamepadIndex = event.gamepad.index;
    previousGamepadButtons = [];
    gamepadLastSeen = performance.now();
});

window.addEventListener('gamepaddisconnected', (event) => {
    if (activeGamepadIndex === event.gamepad.index) {
        activeGamepadIndex = null;
        previousGamepadButtons = [];
    }
});

window.neonAdminUnlock = function(senhaSecreta) {
    const senhaMestra = "Admin_Neon_Override_9999_Windows10";
    if (senhaSecreta === senhaMestra) {
        localStorage.setItem('neon_admin_win10_unlocked', 'true');
        adminWin10Unlocked = true;
        if (typeof game !== 'undefined' && game.scene && game.scene.scenes[0]) {
            game.scene.scenes[0].scene.restart();
        }
    }
};

window.spawnColossusForce = function() {
    let scene = game.scene.scenes[0];
    if (scene && isPlaying && !isGameOver) {
        let enemyObj = enemies.create(Math.random() > 0.5 ? -100 : config.width + 100, Math.random() * config.height, 'colossus');
        enemyObj.health = 8;
        showNotification(scene, '⚠️ ALERTA: Colossus invadiu a arena!', 'danger');
    }
};

function getActivePlayerTextureKey(scene) {
    if (customSkinActive && customSkinLoaded && scene && scene.textures.exists('custom_player')) return 'custom_player';
    const key = 'player_skin_' + (BUILTIN_SKINS[currentPlayerSkin] ? currentPlayerSkin : 'classic');
    return scene && scene.textures.exists(key) ? key : 'player';
}

function setBuiltInPlayerSkin(key) {
    if (!BUILTIN_SKINS[key]) return false;
    currentPlayerSkin = key;
    localStorage.setItem('neon_player_skin', key);
    customSkinActive = false;
    localStorage.setItem('neon_player_skin_custom_active', 'false');
    if (typeof game !== 'undefined' && game.scene && game.scene.scenes[0]) {
        game.scene.scenes[0].scene.restart();
    }
    return true;
}

function createSkinUploadInput() {
    let input = document.getElementById('skin-file-input');
    if (input) return input;
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'skin-file-input';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', (event) => {
        if (!neonServiceAvailable()) {
            neonServiceUnavailableMessage(game && game.scene ? game.scene.scenes[0] : null);
            input.value = '';
            return;
        }
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                localStorage.setItem('neon_custom_skin_data', String(reader.result));
                customSkinLoaded = true;
                customSkinActive = true;
                localStorage.setItem('neon_player_skin_custom_active', 'true');
                if (typeof skinPopupWindow !== 'undefined' && skinPopupWindow && !skinPopupWindow.closed) skinPopupWindow.close();
                if (typeof game !== 'undefined' && game.scene && game.scene.scenes[0]) game.scene.scenes[0].scene.restart();
            } catch (err) {
                console.warn('Não foi possível salvar a skin personalizada.', err);
            }
        };
        reader.readAsDataURL(file);
        input.value = '';
    });
    return input;
}

function openSkinSelectorWindow() {
    createSkinUploadInput();
    if (skinPopupWindow && !skinPopupWindow.closed) {
        skinPopupWindow.focus();
        return;
    }

    const features = 'popup=yes,width=620,height=700,resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no';
    skinPopupWindow = window.open('', 'NeonArena2SkinSelector', features);

    // Browsers can block popups; if that happens, keep the existing upload path available.
    if (!skinPopupWindow) {
        createSkinUploadInput().click();
        return;
    }

    const customEntry = customSkinLoaded ? `<button class="skin" data-custom="true" style="--c:#00ffff"><span class="preview custom"></span><span><b>PERSONALIZADA</b><small>Skin enviada por arquivo.</small></span><strong>${customSkinActive ? 'ATIVA' : 'USAR'}</strong></button>` : '';
    const skinEntries = Object.entries(BUILTIN_SKINS).map(([key, data]) => `
        <button class="skin" data-skin="${key}" style="--c:${data.color}">
            <span class="preview ${key}"></span>
            <span><b>${data.name}</b><small>${data.desc}</small></span>
            <strong>${currentPlayerSkin === key && !customSkinLoaded ? 'ATIVA' : 'USAR'}</strong>
        </button>`).join('');

    skinPopupWindow.document.open();
    skinPopupWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Neon Arena 2 — Skins</title>
    <style>
      *{box-sizing:border-box} body{margin:0;background:#090b12;color:#fff;font-family:Arial,sans-serif;padding:22px} h1{margin:0 0 5px;color:#00ffff;font-size:28px} p{margin:0 0 18px;color:#aab3c4} .grid{display:grid;gap:10px}.skin{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border:1px solid #263044;border-radius:10px;background:#111725;color:#fff;text-align:left;cursor:pointer}.skin:hover{border-color:var(--c);box-shadow:0 0 14px color-mix(in srgb,var(--c),transparent 55%)} .skin strong{margin-left:auto;color:var(--c);font-size:12px}.skin small{display:block;color:#9aa4b7;margin-top:3px}.preview{width:42px;height:42px;border-radius:10px;display:block;position:relative;background:var(--c);box-shadow:0 0 12px var(--c)} .preview:after{content:'';position:absolute;width:13px;height:13px;left:14px;top:14px;border-radius:50%;background:#10131d;box-shadow:0 0 5px #fff}.preview.cyber{background:linear-gradient(135deg,#00ffff 0 20%,#062d38 20% 80%,#00ffff 80%)} .preview.plasma{background:radial-gradient(circle,#fff 0 12%,#cc55ff 13% 45%,#551177 46%)} .preview.toxic{background:radial-gradient(circle,#eaffcc 0 12%,#66ff33 13% 45%,#174d12 46%)} .preview.gold{background:linear-gradient(135deg,#fff0a0,#ffd43b 45%,#9b6d00)} .preview.shadow{background:linear-gradient(135deg,#080912,#16172c 55%,#aa66ff)} .preview.ice{background:linear-gradient(135deg,#eaffff,#66ddff 45%,#257da0)} .preview.rainbow{background:conic-gradient(#ff4d6d,#ffd43b,#66ff66,#55ccff,#aa66ff,#ff4d6d)} .preview.custom{background:linear-gradient(135deg,#00ffff,#aa66ff,#ff66cc)} .preview.prism{background:conic-gradient(#ff4df3,#7df9ff,#fff35c,#72ffcf,#7d7cff,#ff4df3)} .preview.inferno{background:radial-gradient(circle,#fff06a 0 12%,#ff8a00 13% 48%,#ff2b00 49% 100%)} .preview.aurora{background:linear-gradient(135deg,#72ffcf,#8b7dff,#163b57)} .preview.cyberpunk{background:linear-gradient(135deg,#ff2bd6 0 38%,#201034 38% 62%,#22d9ff 62%)} .preview.oceanic{background:radial-gradient(circle,#a8f4ff 0 10%,#27bfff 11% 52%,#073b63 53%)} .preview.ghost{background:linear-gradient(135deg,#ffffff,#d9f7ff 45%,#56748a)} .preview.voltage{background:linear-gradient(135deg,#464b08 0 42%,#f7ff38 43% 57%,#464b08 58%)} .actions{display:flex;gap:10px;margin-top:16px}.action{flex:1;padding:12px;border:0;border-radius:9px;background:#20283a;color:#fff;cursor:pointer}.upload{background:#00a8a8;color:#001516}.hint{font-size:12px;color:#718099;margin-top:14px}</style></head><body>
    <h1>SKINS DO NEON ARENA 2</h1><p>Escolha uma skin oficial ou use sua skin personalizada.</p><div class="grid">${customEntry}${skinEntries}</div>
    <div class="actions"><button class="action upload" id="upload">ESCOLHER ARQUIVO</button><button class="action" id="close">FECHAR</button></div>
    <div class="hint">Esta é uma janela separada do jogo. A seleção é salva automaticamente.</div>
    <script>
      document.querySelectorAll('.skin').forEach(btn=>btn.addEventListener('click',()=>{ if(window.opener && !window.opener.closed){ if(btn.dataset.custom){ window.opener.neonUseCustomSkin(); } else { window.opener.setBuiltInPlayerSkin(btn.dataset.skin); } window.close(); }}));
      document.getElementById('upload').onclick=()=>{ if(window.opener && !window.opener.closed){ window.opener.neonOpenSkinUpload(); } };
      document.getElementById('close').onclick=()=>window.close();
    <\/script></body></html>`);
    skinPopupWindow.document.close();
    skinPopupWindow.focus();
}

window.neonOpenSkinUpload = function() {
    if (!neonServiceAvailable()) { neonServiceUnavailableMessage(game && game.scene ? game.scene.scenes[0] : null); return; }
    createSkinUploadInput().click();
};
window.neonSelectBuiltInSkin = setBuiltInPlayerSkin;
window.neonUseCustomSkin = function() {
    if (!customSkinLoaded && !localStorage.getItem('neon_custom_skin_data')) return false;
    customSkinActive = true;
    localStorage.setItem('neon_player_skin_custom_active', 'true');
    if (typeof game !== 'undefined' && game.scene && game.scene.scenes[0]) game.scene.scenes[0].scene.restart();
    return true;
};

function preload() {
    // Emoji assets permanecem no código, mas estao DESATIVADOS nesta versao.
    // Para reativar no futuro: EMOJI_ASSETS_ENABLED = true e carregar assets/emjs/<codepoint>.*
    if (EMOJI_ASSETS_ENABLED) {
        // Reservado para a próxima versão; nenhum asset é carregado enquanto false.
    }
    this.load.image('skin_a', 'assets/img/a.png');
    this.load.image('skin_b', 'assets/img/b.png');
    this.load.image('skin_c', 'assets/img/c.png');
    this.load.image('skin_d', 'assets/img/d.png');
    this.load.image('win10', 'assets/img/Win10.png');
    // v5.17 — SVGs podem ser desligados pelo jogador para evitar bugs visuais.
    if (svgAssetsEnabled) {
        this.load.svg('na_logo_01', 'assets/svg/neon-arena-logo-01.svg', { width: 420, height: 120 });
        this.load.svg('na_logo_02', 'assets/svg/neon-arena-logo-02.svg', { width: 520, height: 150 });
        this.load.svg('drop2_icon', 'assets/svg/drop2.svg', { width: 64, height: 64 });
        this.load.svg('drop2_spark', 'assets/svg/spark.svg', { width: 64, height: 64 });
        this.load.svg('drop2_badge', 'assets/svg/badge.svg', { width: 96, height: 96 });
    }

    this.load.audio('win10_damage', 'assets/win10_error.mp3');
    this.load.audio('win10_shoot', 'assets/win10_click.mp3');
     
    this.load.on('loaderror', (file) => {});

    let savedSkinBase64 = localStorage.getItem('neon_custom_skin_data');
    if (savedSkinBase64) {
        let img = new Image();
        img.src = savedSkinBase64;
        img.onload = () => {
            this.textures.addImage('custom_player', img);
            customSkinLoaded = true;
            if (customSkinActive && typeof player1 !== 'undefined' && player1 && player1.active) {
                player1.setTexture('custom_player');
                player1.setDisplaySize(32, 32);
            }
        };
    }

    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x00ff00).fillCircle(15, 15, 15); g.generateTexture('player', 30, 30);
    g.fillStyle(0x0055ff).fillCircle(15, 15, 15); g.generateTexture('player2', 30, 30);

    // Neon Legacy — texturas do Neon Arena 1 (JS original integrado no modo, sem redirecionamento).
    g.clear().fillStyle(0x00ffff).fillCircle(5, 5, 5); g.generateTexture('legacy_gem_blue', 10, 10);
    g.clear().fillStyle(0xff00ff).fillRect(0, 0, 15, 15); g.generateTexture('legacy_gem_pink', 15, 15);
    g.clear().fillStyle(0x888888).fillTriangle(0, 16, 8, 0, 16, 16); g.generateTexture('legacy_gem_grey', 16, 16);
    g.clear().fillStyle(0xffa500).fillTriangle(10, 0, 20, 10, 10, 20); g.generateTexture('legacy_gem_132', 20, 20);
    g.clear().fillStyle(0x8b0000).fillRect(0, 0, 15, 15); g.generateTexture('legacy_gem_225', 15, 15);

    // Neon Legacy — botão base do D-Pad original.
    g.clear().lineStyle(2, 0xffffff).strokeRect(0, 0, 60, 60); g.generateTexture('btn', 60, 60);

    // Skins oficiais do jogador — geradas localmente, sem arquivos externos.
    const skinDefs = [
        ['classic', 0x00ff00, 0x102010],
        ['cyber', 0x00ffff, 0x082b33],
        ['plasma', 0xbb55ff, 0x2b103d],
        ['toxic', 0x66ff33, 0x163b10],
        ['gold', 0xffd43b, 0x4a3506],
        ['shadow', 0xaa66ff, 0x090914],
        ['ice', 0x66ddff, 0x0b3444],
        ['rainbow', 0xff66cc, 0x28112a],
        ['magma', 0xff5a36, 0x4a1208],
        ['emerald', 0x38ff9b, 0x0b3d2b],
        ['void', 0x9b5cff, 0x160b38],
        ['solar', 0xffe066, 0x4a3908],
        ['synth', 0xff4fd8, 0x24103f],
        ['prism', 0x7df9ff, 0x173c55],
        ['inferno', 0xff6a00, 0x4d1705],
        ['aurora', 0x72ffcf, 0x123f38],
        ['cyberpunk', 0xff2bd6, 0x3b0b35],
        ['oceanic', 0x27bfff, 0x08344d],
        ['ghost', 0xd9f7ff, 0x38506a],
        ['voltage', 0xf7ff38, 0x464b08]
    ];
    skinDefs.forEach(([name, core, dark]) => {
        g.clear();
        if (name === 'rainbow') {
            g.fillStyle(0xff4d6d); g.fillRect(0,0,30,7);
            g.fillStyle(0xffd43b); g.fillRect(0,7,30,7);
            g.fillStyle(0x66ff66); g.fillRect(0,14,30,7);
            g.fillStyle(0x55ccff); g.fillRect(0,21,30,9);
        } else if (name === 'synth') {
            g.fillStyle(0xff4fd8); g.fillRect(0,0,15,30);
            g.fillStyle(0x55ddff); g.fillRect(15,0,15,30);
            g.lineStyle(3, 0x26103f, 1); g.strokeCircle(15,15,12);
        } else if (name === 'prism') {
            g.fillStyle(0xff5cf0); g.fillTriangle(0,30,15,0,30,30);
            g.fillStyle(0x5cf6ff); g.fillTriangle(0,0,15,30,30,0);
            g.lineStyle(2, 0xffffff, 0.75); g.strokeCircle(15,15,12);
        } else if (name === 'inferno') {
            g.fillStyle(0xff3b00); g.fillCircle(15,15,15);
            g.fillStyle(0xffa000); g.fillCircle(15,15,11);
            g.fillStyle(0xfff06a); g.fillCircle(15,15,6);
        } else if (name === 'aurora') {
            g.fillStyle(0x2bff9d); g.fillCircle(15,15,15);
            g.fillStyle(0x8b7dff); g.fillTriangle(2,25,15,2,28,25);
            g.lineStyle(2, 0xeaffff, 0.8); g.strokeCircle(15,15,12);
        } else if (name === 'cyberpunk') {
            g.fillStyle(0x21102f); g.fillRect(0,0,30,30);
            g.fillStyle(0xff2bd6); g.fillRect(2,2,26,7);
            g.fillStyle(0x22d9ff); g.fillRect(2,11,26,5);
            g.fillStyle(0xff2bd6); g.fillRect(2,18,26,10);
        } else if (name === 'oceanic') {
            g.fillStyle(0x073b63); g.fillCircle(15,15,15);
            g.fillStyle(0x27bfff); g.fillCircle(15,15,11);
            g.lineStyle(2, 0xa8f4ff, 0.8); g.strokeCircle(15,15,12);
        } else if (name === 'ghost') {
            g.fillStyle(0xd9f7ff, 0.7); g.fillCircle(15,15,15);
            g.fillStyle(0x8bb6c9, 0.5); g.fillCircle(15,15,11);
            g.lineStyle(2, 0xffffff, 0.9); g.strokeCircle(15,15,12);
        } else if (name === 'voltage') {
            g.fillStyle(0x464b08); g.fillCircle(15,15,15);
            g.fillStyle(0xf7ff38); g.fillTriangle(17,1,7,17,14,17);
            g.fillTriangle(14,17,23,13,13,29);
        } else {
            g.fillStyle(core); g.fillCircle(15,15,15);
            g.lineStyle(3, dark, 1); g.strokeCircle(15,15,12);
        }
        g.fillStyle(0x10131d); g.fillCircle(15,15,5);
        g.fillStyle(0xffffff); g.fillCircle(13,13,2);
        g.generateTexture('player_skin_' + name, 30, 30);
    });
    g.clear().fillStyle(0xff0000).fillRect(0, 0, 30, 30); g.generateTexture('enemy', 30, 30);
    // v5.29 — Aliado Lendário: extremamente raro, luta ao lado do jogador.
    g.clear().fillStyle(0x062b22).fillCircle(22, 22, 22);
    g.lineStyle(5, 0x66ff99, 1).strokeCircle(22, 22, 17);
    g.fillStyle(0x66ffcc).fillCircle(22, 22, 8);
    g.fillStyle(0xffffff).fillCircle(19, 19, 3);
    g.generateTexture('legendary_ally', 44, 44);
    // v4.5.1 — Sword Keeper: inimigo que dropa uma espada de 5 golpes.
    // O sistema de assets/emjs continua presente e desativado; estes ícones são apenas UI nativa.
    g.clear().fillStyle(0x5b2a86).fillRect(0, 0, 34, 46);
    g.fillStyle(0xd9d9d9).fillTriangle(17, 2, 28, 23, 17, 44);
    g.fillStyle(0x7a4a20).fillRect(13, 27, 8, 16);
    g.generateTexture('sword_keeper', 34, 46);
    // Pickup da espada.
    g.clear().fillStyle(0xffdd55).fillCircle(18, 18, 18);
    g.lineStyle(4, 0xffffff, 1).strokeCircle(18, 18, 13);
    g.generateTexture('sword_drop', 36, 36);
    g.clear().fillStyle(0xaa00ff).fillRect(0, 0, 50, 50); g.generateTexture('tank', 50, 50);
    g.clear().fillStyle(0x0000ff).fillRect(0, 0, 40, 40); g.generateTexture('elite', 40, 40);
    g.clear().fillStyle(0xffff00).fillTriangle(0, 60, 30, 0, 60, 60); g.generateTexture('fast', 60, 60);
    g.clear().fillStyle(0xffa500).fillRect(0, 0, 45, 45); g.generateTexture('stalker', 45, 45);
    g.clear().fillStyle(0xffffff).fillCircle(20, 20, 20); g.generateTexture('ghost', 40, 40);
    g.clear().fillStyle(0x8b0000).fillRect(0, 0, 70, 70); g.generateTexture('miniboss', 70, 70);
    
    g.clear().fillStyle(0x550000).fillRect(0, 0, 65, 65); 
    g.fillStyle(0xff0033).fillRect(10, 10, 45, 45); 
    g.generateTexture('colossus', 65, 65);

    g.clear().fillStyle(0xff5500).beginPath();
    g.moveTo(20, 0); g.lineTo(40, 20); g.lineTo(20, 40); g.lineTo(0, 20); g.closePath(); g.fill();
    g.generateTexture('zipa', 40, 40);

    g.clear().fillStyle(0x004400).fillRect(5, 15, 30, 10); g.fillRect(15, 5, 10, 30);
    g.generateTexture('sniper', 40, 40);

    g.clear().fillStyle(0xff66cc).fillCircle(20, 20, 20);
    g.generateTexture('splitter', 40, 40);

    // Espioner — inimigo experimental descartado das primeiras versões do Neon Arena.
    // Ele aparece em esquadrões de 5 e persegue/investiga o jogador.
    g.clear().fillStyle(0x101820).fillCircle(20, 20, 20);
    g.lineStyle(4, 0x00ffff, 1).strokeCircle(20, 20, 16);
    g.fillStyle(0x00ffff).fillEllipse(20, 20, 22, 12);
    g.fillStyle(0x05070a).fillCircle(20, 20, 5);
    g.fillStyle(0xffffff).fillCircle(18, 18, 2);
    g.generateTexture('espioner', 40, 40);

    // v3.2 — novos inimigos
    // Charger: investida rápida
    g.clear().fillStyle(0xff2222).fillTriangle(0, 36, 36, 18, 0, 0); 
    g.fillStyle(0xffff00).fillCircle(10, 18, 5);
    g.generateTexture('charger', 36, 36);

    // Bomber: aproxima-se e dispara uma bomba/projétil pesado
    g.clear().fillStyle(0xff8800).fillCircle(22, 22, 22);
    g.fillStyle(0x330000).fillCircle(22, 22, 9);
    g.fillStyle(0xffff00).fillRect(18, 2, 8, 8);
    g.generateTexture('bomber', 44, 44);

    // Orbit: mantém distância e orbita o jogador
    g.clear().fillStyle(0x00aaff).fillCircle(20, 20, 20);
    g.lineStyle(4, 0xffffff, 1).strokeCircle(20, 20, 10);
    g.generateTexture('orbiter', 40, 40);

    // Medic: inimigo de suporte que cura aliados próximos
    g.clear().fillStyle(0x22cc66).fillCircle(20, 20, 20);
    g.fillStyle(0xffffff).fillRect(16, 7, 8, 26);
    g.fillRect(7, 16, 26, 8);
    g.generateTexture('medic', 40, 40);

    // v5.13 — Dez novos inimigos
    // Cada um possui uma função de IA diferente; texturas são geradas localmente para manter o build leve.
    g.clear().fillStyle(0xff3366).fillTriangle(20, 0, 40, 40, 0, 40); g.fillStyle(0xffffff).fillCircle(20, 25, 5);
    g.generateTexture('leaper', 40, 40);
    g.clear().fillStyle(0x3355ff).fillCircle(22, 22, 22); g.lineStyle(5, 0x99ccff, 1).strokeCircle(22, 22, 15);
    g.generateTexture('shield', 44, 44);
    g.clear().fillStyle(0x663300).fillRect(4, 4, 32, 32); g.fillStyle(0xffcc33).fillCircle(20,20,7);
    g.generateTexture('mine_layer', 40, 40);
    g.clear().fillStyle(0xcc33ff).fillCircle(20,20,20); g.fillStyle(0xffffff).fillCircle(20,20,6);
    g.generateTexture('phaser', 40, 40);
    g.clear().fillStyle(0xff6699).fillCircle(14,14,14); g.fillStyle(0xffccff).fillCircle(10,10,4);
    g.generateTexture('swarmer', 28, 28);
    g.clear().fillStyle(0x33ccff).fillRect(2,2,44,44); g.fillStyle(0x002233).fillCircle(24,24,9);
    g.generateTexture('turret_guard', 48, 48);
    g.clear().fillStyle(0x7722aa).fillCircle(24,24,24); g.lineStyle(4,0xff55ff,1).strokeCircle(24,24,16);
    g.generateTexture('vortex', 48, 48);
    g.clear().fillStyle(0x999999).fillRect(2,2,36,36); g.lineStyle(4,0xffffff,1).strokeRect(7,7,26,26);
    g.generateTexture('mirror', 40, 40);
    g.clear().fillStyle(0xff3300).fillCircle(22,22,22); g.fillStyle(0xffff00).fillTriangle(22,5,39,38,5,38);
    g.generateTexture('berserker', 44, 44);
    g.clear().fillStyle(0x66ffff).fillCircle(21,21,21); g.fillStyle(0x003366).fillRect(8,8,26,26);
    g.generateTexture('frost', 42, 42);

    // v4.3 — bosses
    g.clear().fillStyle(0x440044).fillCircle(48, 48, 48);
    g.lineStyle(7, 0xff00ff, 1).strokeCircle(48, 48, 36);
    g.fillStyle(0xff00ff).fillTriangle(24, 30, 48, 8, 72, 30);
    g.fillStyle(0x111111).fillCircle(36, 48, 7); g.fillCircle(60, 48, 7);
    g.generateTexture('boss_neon_king', 96, 96);

    g.clear().fillStyle(0x555500).fillRect(8, 8, 84, 84);
    g.lineStyle(5, 0xffff00, 1).strokeRect(12, 12, 76, 76);
    g.fillStyle(0xffff00).fillCircle(48, 48, 20);
    g.fillStyle(0x222222).fillCircle(48, 48, 8);
    g.generateTexture('boss_volt_titan', 96, 96);

    g.clear().fillStyle(0x16002b).fillCircle(48, 48, 48);
    g.lineStyle(5, 0xaa55ff, 1).strokeCircle(48, 48, 38);
    g.fillStyle(0x000000).fillCircle(48, 48, 18);
    g.generateTexture('boss_void_walker', 96, 96);

    g.clear().fillStyle(0x003333).fillCircle(48, 48, 48);
    g.lineStyle(6, 0x00ffff, 1).strokeCircle(48, 48, 40);
    g.fillStyle(0x00ffff).fillRect(28, 34, 14, 8); g.fillRect(54, 34, 14, 8);
    g.fillStyle(0xffffff).fillRect(35, 58, 26, 7);
    g.generateTexture('boss_ai_overlord', 96, 96);

    // Fragmento usado pelo bomber
    g.clear().fillStyle(0xffaa00).fillCircle(7, 7, 7);
    g.fillStyle(0xff3333).fillCircle(7, 7, 3);
    g.generateTexture('bomber_bullet', 14, 14);

    g.clear().fillStyle(0x00ffff).fillCircle(15, 15, 15);
    g.fillStyle(0x003333).fillCircle(15, 15, 8);
    g.generateTexture('trap', 30, 30);

    g.clear().fillStyle(0xff8800).fillCircle(25, 25, 25);
    g.fillStyle(0xffff00).fillCircle(25, 25, 14);
    g.fillStyle(0x330000).fillCircle(25, 25, 6);
    g.generateTexture('chaos_tornado', 50, 50);

    g.clear().fillStyle(0x00ffff).fillCircle(5, 5, 5); g.generateTexture('gem_blue', 10, 10);
    g.clear().fillStyle(0xff00ff).fillRect(0, 0, 15, 15); g.generateTexture('gem_pink', 15, 15);
    g.clear().fillStyle(0x00ffff).fillCircle(8, 8, 8); g.generateTexture('gem_shield', 16, 16);
    // v5.20 — item Coração Dourado. Cada pickup adiciona 1 coração; cada coração absorve 2 golpes.
    g.clear().fillStyle(0xffd43b).fillCircle(16, 16, 11);
    g.fillStyle(0xfff4a3).fillCircle(12, 11, 4);
    g.fillStyle(0xc28a00).fillTriangle(5, 17, 27, 17, 16, 31);
    g.lineStyle(3, 0xffffff, 0.9).strokeCircle(16, 16, 13);
    g.generateTexture('golden_heart_item', 32, 32);
    g.clear().fillStyle(0xffffff).fillCircle(4, 4, 4); g.generateTexture('bullet', 8, 8);
    g.clear().fillStyle(0x66ff99).fillCircle(6, 6, 6); g.lineStyle(2, 0xffffff, 0.9).strokeCircle(6, 6, 5); g.generateTexture('legendary_ally_bullet', 12, 12);
    g.clear().fillStyle(0xff5500).fillCircle(6, 6, 6); g.generateTexture('stalker_bullet', 12, 12);
    g.clear().fillStyle(0x00ff00).fillCircle(6, 6, 6); g.generateTexture('sniper_bullet', 12, 12);
    
    g.clear().fillStyle(0x00ffcc).fillRect(0, 0, 36, 36); g.fillStyle(0x333333).fillCircle(18, 18, 10); g.generateTexture('turret', 36, 36);
    g.clear().fillStyle(0x00ffcc).fillCircle(4, 4, 4); g.generateTexture('turret_bullet', 8, 8);
    g.clear().fillStyle(0xffffff).fillCircle(3, 3, 3); g.generateTexture('particle_dust', 6, 6);
}

async function initMicrophone() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {}
}

function cycleWeapon(scene) {
    const keys = Object.keys(weapons).filter(k => weapons[k].unlocked);
    if (keys.length < 2) return;
    const currentKey = Object.keys(weapons).find(k => weapons[k] === currentWeapon);
    const idx = Math.max(0, keys.indexOf(currentKey));
    currentWeapon = weapons[keys[(idx + 1) % keys.length]];
    updateUI();
    if (scene) showNotification(scene, 'Arma equipada: ' + currentWeapon.name, 'info');
}


// ==========================================================
// v5.8 — DAILY CHALLENGES + RUN STATISTICS
// Sistemas leves, offline e persistentes via localStorage.
// ==========================================================
const NA_STATS_KEY = 'neon_arena_stats_v58';
const NA_DAILY_KEY = 'neon_arena_daily_v58';

function neonLoadJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        const data = raw ? JSON.parse(raw) : null;
        return data && typeof data === 'object' ? data : fallback;
    } catch (e) { return fallback; }
}

function neonGetStats() {
    const d = neonLoadJSON(NA_STATS_KEY, {});
    return {
        games: Number(d.games) || 0,
        totalKills: Number(d.totalKills) || 0,
        bestScore: Number(d.bestScore) || 0,
        bestKills: Number(d.bestKills) || 0,
        bestLevel: Number(d.bestLevel) || 1,
        bestMode: String(d.bestMode || '—')
    };
}

function neonSaveStats(s) {
    try { localStorage.setItem(NA_STATS_KEY, JSON.stringify(s)); } catch (e) {}
}

function neonRecordGameStart() {
    const s = neonGetStats();
    s.games++;
    neonSaveStats(s);
    neonMonthlyRecordGameStart();
}

function neonRecordRunEnd() {
    if (typeof runStatsRecorded !== 'undefined' && runStatsRecorded) return;
    runStatsRecorded = true;
    const s = neonGetStats();
    s.totalKills += Math.max(0, Number(killCount) || 0);
    if (score > s.bestScore) {
        s.bestScore = Math.max(0, Number(score) || 0);
        s.bestMode = String(gameMode || 'solo').toUpperCase();
    }
    if (killCount > s.bestKills) s.bestKills = killCount;
    if (level > s.bestLevel) s.bestLevel = level;
    neonSaveStats(s);
    neonMonthlyRecordRunEnd(typeof scene !== 'undefined' ? scene : null);
}

function neonDailyDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function neonDailyDefinition() {
    if (typeof window !== 'undefined' && window.NA2Services && typeof window.NA2Services.getDailyDefinition === 'function') {
        return window.NA2Services.getDailyDefinition();
    }
    const seed = neonDailyDate().split('-').reduce((a,b)=>a + Number(b), 0);
    const defs = [
        { id:'kills', title:'CAÇADA DIÁRIA', desc:'Derrote 25 inimigos', target:25, unit:'abates' },
        { id:'score', title:'PONTUAÇÃO DIÁRIA', desc:'Alcance 5.000 pontos', target:5000, unit:'pts' },
        { id:'level', title:'NÍVEL DIÁRIO', desc:'Chegue ao nível 7', target:7, unit:'nível' }
    ];
    return defs[seed % defs.length];
}

function neonGetDaily() {
    const today = neonDailyDate();
    const def = neonDailyDefinition();
    let d = neonLoadJSON(NA_DAILY_KEY, {});
    if (d.date !== today || d.id !== def.id) {
        d = { date: today, id: def.id, progress: 0, claimed: false };
    }
    return { data:d, def };
}

function neonDailyProgress() {
    const { data, def } = neonGetDaily();
    const current = def.id === 'kills' ? killCount : def.id === 'score' ? score : level;
    data.progress = Math.max(Number(data.progress)||0, Math.min(def.target, Number(current)||0));
    return { data, def };
}

function neonCheckDaily(scene) {
    if (!neonServiceAvailable()) return;
    const { data, def } = neonDailyProgress();
    if (data.claimed) return;
    if (data.progress >= def.target) {
        data.claimed = true;
        try { localStorage.setItem(NA_DAILY_KEY, JSON.stringify(data)); } catch (e) {}
        score += 1000;
        if (scene) {
            SoundFX.achievement();
            showNotification(scene, `📅 DESAFIO DIÁRIO CONCLUÍDO! +1000 PTS`, 'achievement');
        }
    } else {
        try { localStorage.setItem(NA_DAILY_KEY, JSON.stringify(data)); } catch (e) {}
    }
}

// ==========================================================
// v5.11 — TAREFAS MENSAIS
// Progresso offline, separado por mês e persistente via localStorage.
// ==========================================================
const NA_MONTHLY_KEY = 'neon_arena_monthly_v511';

function neonMonthlyKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function neonMonthlyMonthLabel() {
    const d = new Date();
    return d.toLocaleDateString(neonLanguage === 'pt-BR' ? 'pt-BR' : 'en-US', { month:'long', year:'numeric' });
}

function neonMonthlyDefinitions() {
    if (typeof window !== 'undefined' && window.NA2Services && typeof window.NA2Services.getMonthlyDefinitions === 'function') {
        return window.NA2Services.getMonthlyDefinitions();
    }
    return [
        { id:'kills', title:'CAÇADOR DO MÊS', desc:'Derrote 250 inimigos', target:250, unit:'abates', reward:2500 },
        { id:'games', title:'VETERANO DO MÊS', desc:'Jogue 20 partidas', target:20, unit:'partidas', reward:2000 },
        { id:'score', title:'PONTUAÇÃO DO MÊS', desc:'Some 50.000 pontos', target:50000, unit:'pts', reward:3000 },
        { id:'level', title:'NÍVEL DO MÊS', desc:'Alcance o nível 15 em uma partida', target:15, unit:'nível', reward:4000 },
        { id:'combo', title:'COMBO DO MÊS', desc:'Alcance combo de 25', target:25, unit:'combo', reward:3500 }
    ];
}

function neonGetMonthly() {
    const month = neonMonthlyKey();
    const defs = neonMonthlyDefinitions();
    let d = neonLoadJSON(NA_MONTHLY_KEY, {});
    if (d.month !== month) {
        d = {
            month,
            progress: Object.fromEntries(defs.map(x => [x.id, 0])),
            claimed: Object.fromEntries(defs.map(x => [x.id, false]))
        };
    }
    d.progress = d.progress && typeof d.progress === 'object' ? d.progress : {};
    d.claimed = d.claimed && typeof d.claimed === 'object' ? d.claimed : {};
    defs.forEach(x => {
        if (!Number.isFinite(Number(d.progress[x.id]))) d.progress[x.id] = 0;
        if (typeof d.claimed[x.id] !== 'boolean') d.claimed[x.id] = false;
    });
    return { data:d, defs };
}

function neonSaveMonthly(data) {
    try { localStorage.setItem(NA_MONTHLY_KEY, JSON.stringify(data)); } catch (e) {}
}

function neonMonthlyRecordGameStart() {
    if (!neonServiceAvailable()) return;
    const { data } = neonGetMonthly();
    data.progress.games = Math.min(20, (Number(data.progress.games)||0) + 1);
    neonSaveMonthly(data);
}

function neonMonthlyRecordRunEnd(scene) {
    if (!neonServiceAvailable()) return;
    const { data, defs } = neonGetMonthly();
    data.progress.kills = Math.min(250, (Number(data.progress.kills)||0) + Math.max(0, Number(killCount)||0));
    data.progress.score = Math.min(50000, (Number(data.progress.score)||0) + Math.max(0, Number(score)||0));
    data.progress.level = Math.max(Number(data.progress.level)||0, Math.min(15, Number(level)||0));
    data.progress.combo = Math.max(Number(data.progress.combo)||0, Math.min(25, Number(typeof combo !== 'undefined' ? combo : 0)||0));

    let newlyCompleted = 0;
    defs.forEach(def => {
        if (!data.claimed[def.id] && Number(data.progress[def.id]) >= def.target) {
            data.claimed[def.id] = true;
            score += def.reward;
            newlyCompleted++;
            if (scene) showNotification(scene, `📅 TAREFA MENSAL: ${def.title} +${def.reward} PTS`, 'achievement');
        }
    });
    neonSaveMonthly(data);
    if (newlyCompleted && scene) SoundFX.achievement();
}

function neonShowMonthlyPanel(scene) {
    neonCloseActiveOverlay();
    if (!neonServiceAvailable()) {
        if (window.NA2Services && typeof window.NA2Services.showUnavailable === 'function') window.NA2Services.showUnavailable('ended');
        else neonServiceUnavailableMessage(scene);
        return;
    }
    const { data, defs } = neonGetMonthly();
    const width = Math.min(760, config.width - 24);
    const height = Math.min(650, config.height - 24);
    const els = [];
    neonOpenOverlay(scene, els);
    const bg = scene.add.rectangle(config.width/2, config.height/2, width, height, 0x050505, 0.98)
        .setStrokeStyle(2, 0x00ff99).setDepth(6000);
    const title = scene.add.text(config.width/2, config.height/2-height/2+35, '📅 TAREFAS MENSAIS', {
        fontSize:'27px', color:'#00ff99', fontStyle:'bold'
    }).setOrigin(.5).setDepth(6001);
    const month = scene.add.text(config.width/2, config.height/2-height/2+75, neonMonthlyMonthLabel().toUpperCase(), {
        fontSize:'14px', color:'#baffea'
    }).setOrigin(.5).setDepth(6001);
    els.push(bg,title,month);

    let y = config.height/2-height/2+125;
    defs.forEach((def, i) => {
        const progress = Math.min(def.target, Number(data.progress[def.id])||0);
        const done = !!data.claimed[def.id];
        const row = scene.add.rectangle(config.width/2, y+25, width-50, 72, done ? 0x062d1f : 0x101018, 0.96)
            .setStrokeStyle(1, done ? 0x00ff99 : 0x225566).setDepth(6001);
        const text = scene.add.text(config.width/2-(width-50)/2+16, y+8,
            `${done ? '✅' : '⬜'} ${def.title}\n${def.desc}  •  ${progress}/${def.target} ${def.unit}  •  +${def.reward} pts`,
            {fontSize:'14px', color:done ? '#8affc9' : '#fff', lineSpacing:5}
        ).setDepth(6002);
        els.push(row,text);
        y += 82;
    });
    const close = scene.add.text(config.width/2, config.height/2+height/2-38, 'FECHAR', {
        fontSize:'17px', backgroundColor:'#123', color:'#00ff99', padding:{left:18,right:18,top:9,bottom:9}
    }).setOrigin(.5).setInteractive().setDepth(6002);
    close.on('pointerdown',()=>neonCloseOverlay(els));
    els.push(close);
    if (NA_TV && NA_TV.enabled) setTimeout(()=>neonTVScan(scene,true),50);
}

function neonShowStatsPanel(scene) {
    neonCloseActiveOverlay();
    const s = neonGetStats();
    const els = [];
    neonOpenOverlay(scene, els);
    const bg = scene.add.rectangle(config.width/2, config.height/2, Math.min(650,config.width-30), Math.min(520,config.height-30), 0x050505, 0.97)
        .setStrokeStyle(2,0x00ffff).setDepth(6000);
    const title = scene.add.text(config.width/2, config.height/2-205, '📊 ESTATÍSTICAS', {
        fontSize:'28px', color:'#00ffff', fontStyle:'bold'
    }).setOrigin(.5).setDepth(6001);
    const body = scene.add.text(config.width/2, config.height/2-100,
        `PARTIDAS: ${s.games}\nABATES TOTAIS: ${s.totalKills}\n\nMELHOR SCORE: ${s.bestScore}\nMELHOR PARTIDA: ${s.bestKills} abates\nMAIOR NÍVEL: ${s.bestLevel}\nMODO DO RECORDE: ${s.bestMode}`,
        {fontSize:'20px',color:'#fff',align:'center',lineSpacing:8}
    ).setOrigin(.5).setDepth(6001);
    const close = scene.add.text(config.width/2, config.height/2+190, 'FECHAR', {
        fontSize:'18px',backgroundColor:'#123',color:'#00ffcc',padding:{left:18,right:18,top:10,bottom:10}
    }).setOrigin(.5).setInteractive().setDepth(6001);
    els.push(bg,title,body,close);
    close.on('pointerdown',()=>neonCloseOverlay(els));
    if (NA_TV && NA_TV.enabled) setTimeout(()=>neonTVScan(scene,true),50);
}

function neonShowDailyPanel(scene) {
    neonCloseActiveOverlay();
    if (!neonServiceAvailable()) {
        if (window.NA2Services && typeof window.NA2Services.showUnavailable === 'function') window.NA2Services.showUnavailable('ended');
        else neonServiceUnavailableMessage(scene);
        return;
    }
    const { data, def } = neonDailyProgress();
    const progress = Math.min(def.target, Number(data.progress)||0);
    const els = [];
    neonOpenOverlay(scene, els);
    const bg = scene.add.rectangle(config.width/2, config.height/2, Math.min(650,config.width-30), Math.min(460,config.height-30), 0x050505, 0.97)
        .setStrokeStyle(2,0xff00ff).setDepth(6000);
    const title = scene.add.text(config.width/2, config.height/2-175, '📅 DESAFIO DIÁRIO', {
        fontSize:'28px',color:'#ff66ff',fontStyle:'bold'
    }).setOrigin(.5).setDepth(6001);
    const status = data.claimed ? '✅ CONCLUÍDO HOJE!' : `${progress} / ${def.target} ${def.unit}`;
    const body = scene.add.text(config.width/2, config.height/2-65,
        `${def.title}\n\n${def.desc}\n\n${status}${data.claimed ? '\n\nRecompensa: 1.000 pontos' : ''}`,
        {fontSize:'21px',color:'#fff',align:'center',lineSpacing:8}
    ).setOrigin(.5).setDepth(6001);
    const close = scene.add.text(config.width/2, config.height/2+155, 'FECHAR', {
        fontSize:'18px',backgroundColor:'#123',color:'#ff66ff',padding:{left:18,right:18,top:10,bottom:10}
    }).setOrigin(.5).setInteractive().setDepth(6001);
    els.push(bg,title,body,close);
    close.on('pointerdown',()=>neonCloseOverlay(els));
    if (NA_TV && NA_TV.enabled) setTimeout(()=>neonTVScan(scene,true),50);
}


// =========================================================
// NEON ARENA 2 — GUI SCALE / TAMANHO DA INTERFACE
// Inspirado no seletor de GUI do Minecraft.
// 1 = menor (referência 4K), 2 = 1080p, 3 = 1600x900, 4 = 1280x720.
// O tamanho 4 só fica disponível quando a resolução do monitor é maior
// que 1280x800 nos dois eixos.
// =========================================================
const NA_GUI_SIZE_KEY = 'neon_gui_size';
const NA_GUI_SIZE_PROFILES = {
    1: { scale: 0.75, label: '4K' },
    2: { scale: 1.00, label: '1920×1080' },
    3: { scale: 1.20, label: '1600×900' },
    4: { scale: 1.50, label: '1280×720' }
};
function neonGuiSize4Allowed(){
    return Number(window.screen && window.screen.width || 0) > 1280 && Number(window.screen && window.screen.height || 0) > 800;
}
function neonGuiMaxSize(){ return neonGuiSize4Allowed() ? 4 : 3; }
let neonGuiSize = Number(localStorage.getItem(NA_GUI_SIZE_KEY)) || 2;
if (!NA_GUI_SIZE_PROFILES[neonGuiSize]) neonGuiSize = 2;
if (neonGuiSize > neonGuiMaxSize()) neonGuiSize = neonGuiMaxSize();
function neonGuiScale(){ return NA_GUI_SIZE_PROFILES[neonGuiSize].scale; }
function neonGuiSizeLabel(){
    const profile = NA_GUI_SIZE_PROFILES[neonGuiSize];
    return `${neonGuiSize} — ${profile.label}`;
}
function neonGuiSaveSize(){ localStorage.setItem(NA_GUI_SIZE_KEY, String(neonGuiSize)); }
function neonGuiCycleSize(){
    const max = neonGuiMaxSize();
    neonGuiSize = neonGuiSize >= max ? 1 : neonGuiSize + 1;
    neonGuiSaveSize();
}
function neonGuiScaleStyle(style){
    const factor = neonGuiScale();
    if (!style || typeof style !== 'object' || factor === 1) return style;
    const out = { ...style };
    if (out.fontSize != null) {
        const n = parseFloat(out.fontSize);
        if (Number.isFinite(n)) out.fontSize = `${n * factor}px`;
    }
    if (out.padding != null) {
        if (typeof out.padding === 'number') out.padding = out.padding * factor;
        else if (typeof out.padding === 'object') {
            out.padding = { ...out.padding };
            ['left','right','top','bottom','x','y'].forEach(k => {
                if (Number.isFinite(Number(out.padding[k]))) out.padding[k] = Number(out.padding[k]) * factor;
            });
        }
    }
    if (out.wordWrap && typeof out.wordWrap === 'object') {
        out.wordWrap = { ...out.wordWrap };
        if (Number.isFinite(Number(out.wordWrap.width))) out.wordWrap.width = Number(out.wordWrap.width) * factor;
        if (Number.isFinite(Number(out.wordWrap.maxLines))) out.wordWrap.maxLines = out.wordWrap.maxLines;
    }
    if (Number.isFinite(Number(out.fixedWidth))) out.fixedWidth = Number(out.fixedWidth) * factor;
    if (Number.isFinite(Number(out.fixedHeight))) out.fixedHeight = Number(out.fixedHeight) * factor;
    if (out.shadow && typeof out.shadow === 'object') {
        out.shadow = { ...out.shadow };
        ['offsetX','offsetY','blur','stroke'].forEach(k => {
            if (Number.isFinite(Number(out.shadow[k]))) out.shadow[k] = Number(out.shadow[k]) * factor;
        });
    }
    if (Number.isFinite(Number(out.stroke))) out.stroke = Number(out.stroke) * factor;
    return out;
}
function neonInstallGuiTextScale(scene){
    if (!scene || !scene.add || scene.__naGuiTextScaleInstalled) return;
    const factory = scene.add;
    const originalText = factory.text.bind(factory);
    factory.text = function(x, y, text, style){
        return originalText(x, y, text, neonGuiScaleStyle(style));
    };
    scene.__naGuiTextScaleInstalled = true;
}

// =========================================================
// NEON ARENA 2 — HALLOWEEN SEASONAL THEME v5.28
// Ativo automaticamente de 01/10 a 31/10 pelo relógio local.
// =========================================================
const NA_HALLOWEEN_PRIMARY_HEX = '#ff7a00';
const NA_HALLOWEEN_PRIMARY_NUM = 0xff7a00;
const NA_HALLOWEEN_PRIMARY_LIGHT = '#ffb347';
const NA_HALLOWEEN_PRIMARY_DARK = '#4a2100';

function naIsHalloweenSeason(date = new Date()) {
    const month = date.getMonth(); // Outubro = 9
    const day = date.getDate();
    return month === 9 && day >= 1 && day <= 31;
}

function naHalloweenMapHex(value) {
    if (!naIsHalloweenSeason()) return value;
    if (typeof value !== 'string') return value;
    const v = value.trim().toLowerCase();
    const map = {
        '#00ffff': NA_HALLOWEEN_PRIMARY_HEX,
        '#00ffcc': NA_HALLOWEEN_PRIMARY_HEX,
        '#00ff99': NA_HALLOWEEN_PRIMARY_HEX,
        '#00eaff': NA_HALLOWEEN_PRIMARY_HEX,
        '#00f6ff': NA_HALLOWEEN_PRIMARY_HEX,
        '#66ffff': NA_HALLOWEEN_PRIMARY_LIGHT,
        '#bfefff': '#ffd7a3',
        '#baffea': '#ffd7a3',
        '#8affc9': '#ffc078',
        '#00ff00': '#ff9d00'
    };
    return map[v] || value;
}

function naHalloweenMapNum(value) {
    if (!naIsHalloweenSeason() || typeof value !== 'number') return value;
    const map = {
        0x00ffff: NA_HALLOWEEN_PRIMARY_NUM,
        0x00ffcc: NA_HALLOWEEN_PRIMARY_NUM,
        0x00ff99: NA_HALLOWEEN_PRIMARY_NUM,
        0x00eaff: NA_HALLOWEEN_PRIMARY_NUM,
        0x00f6ff: NA_HALLOWEEN_PRIMARY_NUM,
        0x66ffff: 0xffb347,
        0x00ff00: 0xff9d00
    };
    return Object.prototype.hasOwnProperty.call(map, value) ? map[value] : value;
}

function naApplyHalloweenTheme(scene) {
    if (!scene || !naIsHalloweenSeason()) return;
    if (!scene.__naHalloweenThemeNext) scene.__naHalloweenThemeNext = 0;
    const now = Number(scene.time && scene.time.now) || 0;
    if (now < scene.__naHalloweenThemeNext) return;
    scene.__naHalloweenThemeNext = now + 700;

    const children = scene.children && scene.children.list ? scene.children.list : [];
    children.forEach(obj => {
        if (!obj || !obj.active) return;
        try {
            if (obj.style) {
                if (typeof obj.style.color === 'string') obj.setColor(naHalloweenMapHex(obj.style.color));
                if (typeof obj.style.backgroundColor === 'string') obj.setBackgroundColor(naHalloweenMapHex(obj.style.backgroundColor));
            }
            if (typeof obj.fillColor === 'number') obj.fillColor = naHalloweenMapNum(obj.fillColor);
            if (typeof obj.strokeColor === 'number') obj.strokeColor = naHalloweenMapNum(obj.strokeColor);
            if (obj.input && obj.input.enabled && typeof obj.setTint === 'function' && obj.getData && obj.getData('naHalloweenTint')) {
                obj.setTint(NA_HALLOWEEN_PRIMARY_NUM);
            }
        } catch (_) {}
    });

    // Painéis HTML/DOM criados por menus e ferramentas também recebem a cor sazonal.
    if (typeof document !== 'undefined' && document.body) {
        document.body.dataset.naHalloween = 'true';
        const nodes = document.querySelectorAll('[style]');
        nodes.forEach(el => {
            const st = el.getAttribute('style');
            if (!st) return;
            let next = st;
            const replacements = [
                ['#00ffff', NA_HALLOWEEN_PRIMARY_HEX], ['#00ffcc', NA_HALLOWEEN_PRIMARY_HEX],
                ['#00ff99', NA_HALLOWEEN_PRIMARY_HEX], ['#00eaff', NA_HALLOWEEN_PRIMARY_HEX],
                ['#00f6ff', NA_HALLOWEEN_PRIMARY_HEX], ['#66ffff', NA_HALLOWEEN_PRIMARY_LIGHT]
            ];
            replacements.forEach(([a,b]) => { next = next.replaceAll(a,b); });
            if (next !== st) el.setAttribute('style', next);
        });
    }
}

function create() {
    neonInstallGuiTextScale(this);
    neonModRunHook('afterGameStart', this, NeonArena2Mods);
    neonModRunHook('sceneCreate', this, NeonArena2Mods);
    neonBuiltinRunHook('afterGameStart', this);
    neonBuiltinRunHook('sceneCreate', this);
    naApplyHalloweenTheme(this);
    setTimeout(() => showNeonLifecycleNotice(this), 120);
    let bgColorHex = isLightMode ? 0xf0f0f0 : (solidColorsMap[solidThemeColor] ? solidColorsMap[solidThemeColor].hex : 0x111111);

    let bgList = ['skin_a', 'skin_b', 'skin_c', 'skin_d'];
    if (adminWin10Unlocked && this.textures.exists('win10')) bgList.push('win10');
    if (neonAeroIsUnlocked()) bgList.push('aero');

    if (currentBackground === 'aero' && neonAeroIsUnlocked()) {
        drawAeroBackground(this, null, true);
    } else if (currentBackground === 'solid') {
        this.add.rectangle(config.width/2, config.height/2, config.width, config.height, bgColorHex).setDepth(-1000);
        let gridColor = isLightMode ? 0xcccccc : 0x222222;
        this.add.grid(config.width/2, config.height/2, 5000, 5000, 40, 40, gridColor).setAlpha(0.2).setDepth(-999);
    } else if (gradientThemes[currentBackground]) {
        const gt = gradientThemes[currentBackground];
        const menuGradient = this.add.graphics().setDepth(-1000);
        menuGradient.fillGradientStyle(gt.topLeft, gt.topRight, gt.bottomLeft, gt.bottomRight, 1);
        menuGradient.fillRect(0, 0, config.width, config.height);
        const menuGrid = this.add.grid(config.width/2, config.height/2, 5000, 5000, 40, 40, isLightMode ? 0xcccccc : 0xffffff)
            .setAlpha(0.09).setDepth(-999);
    } else if (bgList.includes(currentBackground) && this.textures.exists(currentBackground)) {
        let menuBg = this.add.image(config.width/2, config.height/2, currentBackground).setDepth(-1000);
        menuBg.setDisplaySize(config.width, config.height);
        this.add.rectangle(config.width/2, config.height/2, config.width, config.height, isLightMode ? 0xffffff : 0x000000, 0.4).setDepth(-999);
    } else {
        this.add.rectangle(config.width/2, config.height/2, config.width, config.height, bgColorHex).setDepth(-1000);
    }
     
    let titleColor = isLightMode ? '#0a0' : '#0f0';
    let title = this.add.text(config.width/2, config.height/4 - 150, 'NEON ARENA 2', { fontSize: '50px', color: titleColor }).setOrigin(0.5).setDepth(1);
    let osLabel = this.add.text(config.width/2, config.height/4 - 112, neonOSLabel(), { fontSize:'13px', color: isLightMode ? '#345' : '#bfefff', backgroundColor: isLightMode ? '#e8f4ff' : '#102333', padding:{left:8,right:8,top:5,bottom:5} }).setOrigin(0.5).setDepth(1);
    neonRefineWindowsVersion(osLabel);
    const dailyQuick = neonDailyProgress();
    let dailyBadge = this.add.text(config.width - 18, 62, `📅 ${dailyQuick.data.claimed ? 'DIÁRIO ✓' : `DIÁRIO ${dailyQuick.data.progress}/${dailyQuick.def.target}`}`, { fontSize:'14px', color: dailyQuick.data.claimed ? '#00ff66' : '#ff66ff', backgroundColor:'#101018', padding:{left:8,right:8,top:5,bottom:5} }).setOrigin(1,0).setInteractive().setDepth(2);
    dailyBadge.on('pointerdown', () => neonShowDailyPanel(this));
    
    const naModeName = (mode) => ({solo:naT('solo'), coop:naT('coop'), hardcore:naT('hardcore'), invasion:naT('invasion'), timeattack:naT('timeattack'), bossrush:naT('bossrush'), legacy:naT('legacy')})[mode] || mode;
    let btnPlayText = naT('play') + ' (' + naModeName(gameMode) + ')';
    /* Legacy label expression retained only as historical reference. */
    let btn = this.add.text(config.width/2, config.height/4 - 80, btnPlayText, { fontSize: '28px', backgroundColor: gameMode === 'hardcore' ? '#500' : (isLightMode ? '#ddd' : '#333'), color: gameMode === 'hardcore' ? '#ff3333' : (isLightMode ? '#000' : '#fff') }).setPadding(15).setOrigin(0.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btn, { hoverScale: 1.08 });
     
    let btnModeText = naT('modeLabel') + ': ' + naModeName(gameMode);
    let btnMode = this.add.text(config.width/2, config.height/4 - 10, btnModeText, { fontSize: '15px', backgroundColor: isLightMode ? '#ddd' : '#222', color: gameMode === 'hardcore' ? '#ff3333' : '#00ffff' }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnMode);
    
    btnMode.on('pointerdown', () => {
        if (gameMode === 'solo') gameMode = 'coop';
        else if (gameMode === 'coop') gameMode = 'hardcore';
        else if (gameMode === 'hardcore') gameMode = 'invasion';
        else if (gameMode === 'invasion') gameMode = 'timeattack';
        else if (gameMode === 'timeattack') gameMode = 'bossrush';
        else if (gameMode === 'bossrush') gameMode = 'legacy';
        else gameMode = 'solo';
        
        localStorage.setItem('neon_game_mode', gameMode);
        this.scene.restart();
    });

    let skinStatusText = 'CENÁRIO: PADRÃO';
    let btnColor = '#888';

    if (currentBackground === 'solid') {
        skinStatusText = `MODO COR: ${solidColorsMap[solidThemeColor].name.toUpperCase()}`;
        btnColor = solidColorsMap[solidThemeColor].code;
    } else if (currentBackground === 'skin_a') skinStatusText = '🖼️ FUNDO A — 5 ABATES', btnColor = '#ff2222';
    else if (currentBackground === 'skin_b') skinStatusText = '🖼️ FUNDO B — 10 ABATES', btnColor = '#00ffff';
    else if (currentBackground === 'skin_c') skinStatusText = '🖼️ FUNDO C — 15 ABATES', btnColor = '#0066ff';
    else if (currentBackground === 'skin_d') skinStatusText = '🖼️ FUNDO D — 20 ABATES', btnColor = '#0066ff';
    else if (currentBackground === 'win10') skinStatusText = 'CENÁRIO: 🖥️ ADMIN WINDOWS 10', btnColor = '#0078d7';
    else if (currentBackground === 'aero') skinStatusText = '🪟 WINDOWS AERO — 67 ABATES', btnColor = '#8feaff';
    else if (gradientThemes[currentBackground]) skinStatusText = '🌈 GRADIENTE: ' + gradientThemes[currentBackground].name, btnColor = gradientThemes[currentBackground].code;

    let btnSkin = this.add.text(config.width/2, config.height/4 + 45, '🖼️ ' + skinStatusText, { fontSize: '16px', backgroundColor: isLightMode ? '#ddd' : '#222', color: btnColor }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnSkin);
     
    btnSkin.on('pointerdown', () => {
        const nextBackground = cycleBackgroundSelection();
        currentBackground = nextBackground;
        localStorage.setItem('neon_selected_bg', currentBackground);
        neonFadeOut(this, mainMenuElements, () => this.scene.restart(), { duration: 140, scaleX: 0.98, scaleY: 0.98 });
    });

    createSkinUploadInput();
    let activeSkinName = customSkinActive && customSkinLoaded ? 'PERSONALIZADA' : (BUILTIN_SKINS[currentPlayerSkin] ? BUILTIN_SKINS[currentPlayerSkin].name : 'NEON CLASSIC');
    let skinBtnText = '🎨 ' + naT('skins') + ': ' + activeSkinName + ' (' + naT('skinOpen') + ')';
    let btnCustomSkin = this.add.text(config.width/2, config.height/4 + 100, skinBtnText, { fontSize: '16px', backgroundColor: isLightMode ? '#ddd' : '#222', color: isLightMode ? '#333' : '#00ffff' }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnCustomSkin);
    
    btnCustomSkin.on('pointerdown', () => {
        openSkinSelectorWindow();
    });

    let btnThemeText = isLightMode ? naT('lightMode') : naT('darkMode');
    let btnTheme = this.add.text(config.width/2, config.height/4 + 155, btnThemeText, { fontSize: '16px', backgroundColor: isLightMode ? '#ddd' : '#222', color: isLightMode ? '#333' : '#ff0' }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnTheme);
    
    btnTheme.on('pointerdown', () => {
        isLightMode = !isLightMode;
        localStorage.setItem('neon_light_mode', isLightMode);
        neonFadeOut(this, mainMenuElements, () => this.scene.restart(), { duration: 140, scaleX: 0.98, scaleY: 0.98 });
    });

    // O controle de legendas pertence apenas ao menu e deve ser destruído ao iniciar a partida.
    let captionsLabel = captionsEnabled ? naT('captionsOn') : naT('captionsOff');
    let btnAccessibility = this.add.text(config.width/2, config.height/4 + 200, '♿ ' + naT('accessibility') + ' — ' + captionsLabel, {
        fontSize: '16px',
        backgroundColor: isLightMode ? '#ddd' : '#222',
        color: captionsEnabled ? '#00ff00' : (isLightMode ? '#333' : '#aaa')
    }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnAccessibility);

    btnAccessibility.on('pointerdown', () => {
        captionsEnabled = !captionsEnabled;
        localStorage.setItem('neon_captions_enabled', captionsEnabled ? 'true' : 'false');
        neonFadeOut(this, mainMenuElements, () => this.scene.restart(), { duration: 140, scaleX: 0.98, scaleY: 0.98 });
    });

    let btnLanguage = this.add.text(config.width/2, config.height/4 + 335, naT('language') + ': ' + NA_LANGUAGES[neonLanguage].short, { fontSize: '16px', backgroundColor: isLightMode ? '#ddd' : '#222', color: isLightMode ? '#333' : '#66ffff' }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnLanguage);
    btnLanguage.on('pointerdown', () => cycleNeonLanguage(this));

    let btnAudio = this.add.text(config.width/2, config.height/4 + 290, naT('audio') + ': ' + (SoundFX.enabled ? naT('audioOn') : naT('audioOff')), { fontSize: '16px', backgroundColor: isLightMode ? '#ddd' : '#222', color: isLightMode ? '#333' : '#66ffff' }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnAudio);
    btnAudio.on('pointerdown', () => {
        SoundFX.setEnabled(!SoundFX.enabled);
        neonFadeOut(this, mainMenuElements, () => this.scene.restart(), { duration: 140, scaleX: 0.98, scaleY: 0.98 });
    });

    if (!neonSystemMotionAllowed()) localStorage.setItem(NA_ANIMATIONS_KEY, 'false');
    let btnAnimations = this.add.text(config.width/2, config.height/4 + 245, neonAnimationStatusText(), { fontSize: '16px', backgroundColor: isLightMode ? '#ddd' : '#222', color: neonSystemMotionAllowed() ? (isLightMode ? '#333' : '#66ffff') : '#888' }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnAnimations);
    btnAnimations.on('pointerdown', () => {
        if (!neonSystemMotionAllowed()) {
            showNotification(this, '🚫 As animações estão desativadas pelo sistema.', 'warning');
            return;
        }
        toggleNeonAnimations();
        this.scene.restart();
    });

    // MODO PRÁTICA — botão restaurado no menu.
    // A v5.0.3 destruía uma referência chamada btnPractice ao iniciar o jogo,
    // mas essa variável não existia no menu, causando ReferenceError e bloqueando JOGAR.
    let btnPractice = this.add.text(config.width/2, config.height/4 + 425, naT('practice'), { fontSize: '16px', backgroundColor: isLightMode ? '#ddd' : '#222', color: isLightMode ? '#333' : '#00ffcc' }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnPractice);
    btnPractice.on('pointerdown', () => {
        openPracticeMenu(this, mainMenuElements);
    });

    let btnSettings = this.add.text(config.width/2, config.height/4 + 380, '🎨 ' + naT('themes'), { fontSize: '16px', backgroundColor: isLightMode ? '#ddd' : '#222', color: isLightMode ? '#333' : '#00ffff' }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnSettings);
    
    btnSettings.on('pointerdown', () => {
        neonCloseActiveOverlay();
        const panelH = Math.min(690, config.height - 24);
        const panelTop = config.height/2 - panelH/2;
        const panelBottom = config.height/2 + panelH/2;
        let panelBg = this.add.rectangle(config.width/2, config.height/2, Math.min(650, config.width - 24), panelH, 0x000000, 0.96).setDepth(100);
        let panelTitle = this.add.text(config.width/2, panelTop + 32, '🎨 CORES E GRADIENTES', { fontSize: '22px', color: '#00ffff' }).setOrigin(0.5).setDepth(101);
        let colorKeys = Object.keys(solidColorsMap);
        let gradientKeys = Object.keys(gradientThemes);
        let colorElements = [panelBg, panelTitle];
        let colorScrollItems = [];
        neonOpenOverlay(this, colorElements, () => { if (this.__naSettingsDetachScroll) { this.__naSettingsDetachScroll(); this.__naSettingsDetachScroll = null; } });
        let yPos = panelTop + 88;
        colorKeys.forEach(k => {
            let colData = solidColorsMap[k];
            let isSelected = (currentBackground === 'solid' && solidThemeColor === k);
            let btnText = isSelected ? `🟢 ${colData.name} (ATIVO)` : `⚪ ${colData.name}`;
            let colorOptBtn = this.add.text(config.width/2, yPos, btnText, { fontSize: '15px', backgroundColor: '#222', color: colData.code }).setPadding(7).setOrigin(0.5).setInteractive().setDepth(101);
            colorOptBtn.on('pointerdown', () => {
                currentBackground = 'solid';
                solidThemeColor = k;
                localStorage.setItem('neon_selected_bg', 'solid');
                localStorage.setItem('neon_solid_color', k);
                this.scene.restart();
            });
            colorElements.push(colorOptBtn); colorScrollItems.push(colorOptBtn); yPos += 42;
        });
        gradientKeys.forEach(k => {
            const gt = gradientThemes[k];
            const isSelected = currentBackground === k;
            const gradientBtn = this.add.text(config.width/2, yPos, isSelected ? `🌈 ${gt.name} (ATIVO)` : `✨ ${gt.name}`, { fontSize: '15px', backgroundColor: '#161122', color: gt.code }).setPadding(7).setOrigin(0.5).setInteractive().setDepth(101);
            gradientBtn.on('pointerdown', () => { currentBackground = k; localStorage.setItem('neon_selected_bg', k); this.scene.restart(); });
            colorElements.push(gradientBtn); colorScrollItems.push(gradientBtn); yPos += 42;
        });

        // Fundos com imagem também ficam disponíveis diretamente neste painel.
        const builtInBackgrounds = [
            ['skin_a', '🖼️ FUNDO A', 5, skinAUnlocked, '#ff2222'],
            ['skin_b', '🖼️ FUNDO B', 10, skinBUnlocked, '#00ffff'],
            ['skin_c', '🖼️ FUNDO C', 15, skinCUnlocked, '#0066ff'],
            ['skin_d', '🖼️ FUNDO D', 20, skinDUnlocked, '#6699ff']
        ];
        if (adminWin10Unlocked && this.textures.exists('win10')) builtInBackgrounds.push(['win10', '🖥️ WINDOWS 10', 0, true, '#0078d7']);
        if (neonAeroIsUnlocked()) builtInBackgrounds.push(['aero', '🪟 WINDOWS AERO', 67, true, '#8feaff']);

        builtInBackgrounds.forEach(([key, label, unlockAt, unlocked, code]) => {
            const isSelected = currentBackground === key;
            const lockText = unlocked ? '' : ` 🔒 ${unlockAt} ABATES`;
            const backgroundBtn = this.add.text(config.width/2, yPos, isSelected ? `🟢 ${label} (ATIVO)` : `${unlocked ? '🖼️' : '🔒'} ${label}${lockText}`, { fontSize: '15px', backgroundColor: '#121a24', color: unlocked ? code : '#777' }).setPadding(7).setOrigin(0.5).setInteractive().setDepth(101);
            backgroundBtn.on('pointerdown', () => {
                if (!unlocked) { showNotification(this, `🔒 ${label}: derrote ${unlockAt} inimigos!`, 'warning'); return; }
                currentBackground = key;
                localStorage.setItem('neon_selected_bg', key);
                this.scene.restart();
            });
            colorElements.push(backgroundBtn); colorScrollItems.push(backgroundBtn); yPos += 42;
        });

        let closeSettingsBtn = this.add.text(config.width/2, panelBottom - 32, 'FECHAR', { fontSize: '16px', backgroundColor: '#f00', color: '#fff' }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(103);
        
        closeSettingsBtn.on('pointerdown', () => {
            neonFadeOut(this, colorElements, () => neonCloseOverlay(colorElements));
        });
        colorElements.push(closeSettingsBtn);
        this.__naSettingsDetachScroll = attachMenuVerticalScroll(this, colorScrollItems, {
            viewportTop: panelTop + 70,
            viewportBottom: panelBottom - 62,
            scrollbarX: Math.min(config.width - 14, config.width/2 + 306),
            depth: 102,
            step: 42
        });
        neonFadeIn(this, colorElements, { duration: 220 });
    });

    let btnAch = this.add.text(config.width/2, config.height/4 + 470, '🏆 ' + naT('achievements'), { fontSize: '16px', backgroundColor: isLightMode ? '#ddd' : '#222', color: isLightMode ? '#333' : '#ffaa00' }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnAch);
    btnAch.on('pointerdown', () => {
        neonCloseActiveOverlay();
        const panelH = Math.min(500, config.height - 24);
        const panelTop = config.height/2 - panelH/2;
        const panelBottom = config.height/2 + panelH/2;
        let panelBg = this.add.rectangle(config.width/2, config.height/2, Math.min(600, config.width - 24), panelH, 0x000000, 0.95).setDepth(100);
        let panelTitle = this.add.text(config.width/2, panelTop + 34, 'CONQUISTAS', { fontSize: '26px', color: '#ffaa00' }).setOrigin(0.5).setDepth(101);
        
        let yOffset = panelTop + 92;
        let achElements = [panelBg, panelTitle];
        let achScrollItems = [];
        neonOpenOverlay(this, achElements, () => { if (this.__naAchDetachScroll) { this.__naAchDetachScroll(); this.__naAchDetachScroll = null; } });

        Object.keys(achievements).forEach(key => {
            let a = achievements[key];
            let statusText = a.unlocked ? '✅ DESBLOQUEADA' : `🔒 (${a.current}/${a.target})`;
            let line = this.add.text(config.width/2, yOffset, `${a.title}: ${a.desc} [${statusText}]`, { fontSize: '13px', color: '#fff', align: 'center', wordWrap: { width: Math.min(500, config.width - 90) } }).setOrigin(0.5).setDepth(101);
            achElements.push(line);
            achScrollItems.push(line);
            yOffset += 35;
        });

        let closeBtn = this.add.text(config.width/2, panelBottom - 34, 'FECHAR', { fontSize: '16px', backgroundColor: '#f00', color: '#fff' }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(103);
        closeBtn.on('pointerdown', () => {
            neonFadeOut(this, achElements, () => neonCloseOverlay(achElements));
        });
        achElements.push(closeBtn);
        this.__naAchDetachScroll = attachMenuVerticalScroll(this, achScrollItems, {
            viewportTop: panelTop + 76,
            viewportBottom: panelBottom - 66,
            scrollbarX: Math.min(config.width - 14, config.width/2 + 286),
            depth: 102,
            step: 40
        });
        neonFadeIn(this, achElements, { duration: 240 });
    });
     

    let btnSvg = this.add.text(config.width/2 + 250, config.height/4 + 515, svgAssetsEnabled ? naT('svgDisable') : naT('svgEnable'), {
        fontSize:'15px', backgroundColor:isLightMode ? '#ddd' : '#222', color:svgAssetsEnabled ? (isLightMode ? '#333' : '#ff6666') : '#00ff99'
    }).setPadding(9).setOrigin(.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnSvg);
    btnSvg.on('pointerdown', () => {
        svgAssetsEnabled = !svgAssetsEnabled;
        localStorage.setItem('neon_svg_assets_enabled', svgAssetsEnabled ? 'true' : 'false');
        showNotification(this, svgAssetsEnabled ? 'SVGs ativados. O jogo será reiniciado.' : 'SVGs desativados. O jogo será reiniciado.', svgAssetsEnabled ? 'success' : 'warning');
        this.scene.restart();
    });

    let btnVisualFX = this.add.text(config.width/2, config.height/4 + 560, naT('visualFX') + ': ' + visualFXMode.toUpperCase(), {fontSize:'14px', backgroundColor:isLightMode ? '#ddd' : '#222', color:visualFXMode==='off' ? '#ff6666' : '#66ffff'}).setPadding(8).setOrigin(.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnVisualFX);
    btnVisualFX.on('pointerdown',()=>{const order=['auto','low','medium','high','ultra','off'];visualFXMode=order[(order.indexOf(visualFXMode)+1)%order.length];saveVisualFXMode();showNotification(this,naT('visualFX')+': '+visualFXMode.toUpperCase(),visualFXMode==='off'?'warning':'success');this.scene.restart();});

    let btnBetterDetails = this.add.text(config.width/2, config.height/4 + 605, naT('betterDetails') + ': ' + betterDetailsLabel(), {fontSize:'14px', backgroundColor:isLightMode ? '#ddd' : '#222', color:betterDetailsMode==='off' ? '#ff7777' : '#d88cff'}).setPadding(8).setOrigin(.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnBetterDetails);
    btnBetterDetails.on('pointerdown',()=>{const order=['off','low','medium','high','ultra'];betterDetailsMode=order[(order.indexOf(betterDetailsMode)+1)%order.length];saveBetterDetailsMode();showNotification(this,naT('betterDetails')+': '+betterDetailsLabel(),betterDetailsMode==='off'?'warning':'success');this.scene.restart();});

    let btnGuiSize = this.add.text(config.width/2, config.height/4 + 650, naT('guiSize') + ': ' + neonGuiSizeLabel(), {fontSize:'14px', backgroundColor:isLightMode ? '#ddd' : '#222', color:isLightMode ? '#333' : '#66ffff'}).setPadding(8).setOrigin(.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnGuiSize);
    btnGuiSize.on('pointerdown',()=>{ neonGuiCycleSize(); showNotification(this, naT('guiSize') + ': ' + neonGuiSizeLabel(), 'success'); this.scene.restart(); });

    let btnStats = this.add.text(config.width/2 - 250, config.height/4 + 515, naT('stats'), {
        fontSize:'15px', backgroundColor:isLightMode ? '#ddd' : '#222', color:isLightMode ? '#333' : '#00ffff'
    }).setPadding(9).setOrigin(.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnStats);
    btnStats.on('pointerdown', () => neonShowStatsPanel(this));

    let btnDaily = this.add.text(config.width/2 - 80, config.height/4 + 515, naT('daily'), {
        fontSize:'15px', backgroundColor:isLightMode ? '#ddd' : '#222', color:isLightMode ? '#333' : '#ff66ff'
    }).setPadding(9).setOrigin(.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnDaily);
    btnDaily.on('pointerdown', () => neonShowDailyPanel(this));

    let btnMonthly = this.add.text(config.width/2 + 80, config.height/4 + 515, naT('monthly'), {
        fontSize:'15px', backgroundColor:isLightMode ? '#ddd' : '#222', color:isLightMode ? '#333' : '#00ff99'
    }).setPadding(9).setOrigin(.5).setInteractive().setDepth(1);
    neonAnimateMenuButton(this, btnMonthly);
    btnMonthly.on('pointerdown', () => neonShowMonthlyPanel(this));

    const mainMenuElements = [title, osLabel, btn, btnMode, btnSkin, btnCustomSkin, btnTheme, btnAccessibility, btnPractice, btnSettings, btnLanguage, btnAudio, btnAnimations, btnAch, btnStats, btnDaily, btnMonthly, btnSvg, btnVisualFX, btnBetterDetails, btnGuiSize, dailyBadge];
    this.__naMainMenuDetachScroll = attachMenuVerticalScroll(this, mainMenuElements, {
        viewportTop: 8,
        viewportBottom: config.height - 8,
        scrollbarX: config.width - 10,
        depth: 7,
        step: 55
    });

    soundBar = this.add.graphics().setDepth(2);
    this.add.text(config.width - 150, 10, 'RUÍDO:', { fontSize: '16px', color: '#f00' }).setDepth(2);

    cursors = this.input.keyboard.createCursorKeys();
    wasdKeys = this.input.keyboard.addKeys('W,A,S,D');

    btn.on('pointerdown', () => {
        btn.disableInteractive();
        neonCloseActiveOverlay();
        if (this.__naMainMenuDetachScroll) { this.__naMainMenuDetachScroll(); this.__naMainMenuDetachScroll = null; }
        // Se animações estiverem habilitadas, o JOGAR gira 360º antes de fechar o menu.
        neonPlayAnimation(this, btn, () => {
            const allMenu = mainMenuElements;
            neonFadeOut(this, allMenu, () => {
                allMenu.forEach(el => { if (el && el.active) el.destroy(); });
                isPracticeMode = false;
                initMicrophone();
                startGame(this);
            }, { duration: 160, scaleX: 0.97, scaleY: 0.97 });
        });
    });

    neonAnimateMenuOpen(this, mainMenuElements);
}

function openPracticeMenu(scene, menuElements) {
    neonCloseActiveOverlay();
    const elements = [];
    neonOpenOverlay(scene, elements);
    const panel = scene.add.rectangle(config.width/2, config.height/2, Math.min(650, config.width-30), Math.min(520, config.height-30), 0x050505, 0.97).setStrokeStyle(2, 0x00ffcc).setDepth(1000);
    const title = scene.add.text(config.width/2, config.height/2-220, '🧪 MODO PRÁTICA 2.1', {fontSize:'28px', color:'#00ffcc', fontStyle:'bold'}).setOrigin(0.5).setDepth(1001);
    elements.push(panel,title);
    let speedIndex=[3,5,7.2,10].indexOf(practiceSettings.speed); if(speedIndex<0) speedIndex=1;
    let targetIndex=[0,500,1000,2500].indexOf(practiceSettings.target); if(targetIndex<0) targetIndex=0;
    const make=(y,label,action)=>{const b=scene.add.text(config.width/2,y,label(),{fontSize:'17px',backgroundColor:'#222',color:'#fff',padding:{left:12,right:12,top:8,bottom:8},align:'center'}).setOrigin(.5).setInteractive().setDepth(1001);b.on('pointerdown',()=>{action();b.setText(label())});elements.push(b);};
    make(config.height/2-160,()=>`🎯 VELOCIDADE: ${practiceSettings.speed.toFixed(1)}x`,()=>{speedIndex=(speedIndex+1)%4;practiceSettings.speed=[3,5,7.2,10][speedIndex]});
    make(config.height/2-105,()=>`👾 INIMIGOS: ${practiceSettings.enemies?'ATIVOS':'DESLIGADOS'}`,()=>practiceSettings.enemies=!practiceSettings.enemies);
    make(config.height/2-50,()=>`🛡️ INVULNERABILIDADE: ${practiceSettings.invulnerable?'ATIVA':'DESATIVADA'}`,()=>practiceSettings.invulnerable=!practiceSettings.invulnerable);
    make(config.height/2+5,()=>`🚧 OBSTÁCULOS: ${practiceSettings.obstacles?'ATIVOS':'DESLIGADOS'}`,()=>practiceSettings.obstacles=!practiceSettings.obstacles);
    make(config.height/2+60,()=>`📏 DESAFIO: ${practiceSettings.target?practiceSettings.target+' m':'LIVRE'}`,()=>{targetIndex=(targetIndex+1)%4;practiceSettings.target=[0,500,1000,2500][targetIndex]});
    make(config.height/2+115,()=>`⚙️ DESEMPENHO: ${performanceMode.toUpperCase()}`,()=>{
        performanceMode=performanceMode==='auto'?'low':performanceMode==='low'?'medium':performanceMode==='medium'?'high':'auto';
        savePerformanceMode();
        if(typeof na44Perf!=='undefined'){
            na44Perf=performanceMode==='medium'?'auto':performanceMode;
            na44ApplyPerformance();
            if(typeof na44SaveSettings==='function') na44SaveSettings();
        }
    });
    const start=scene.add.text(config.width/2-100,config.height/2+165,'▶️ INICIAR TREINO',{fontSize:'20px',backgroundColor:'#006633',color:'#fff',fontStyle:'bold',padding:{left:14,right:14,top:10,bottom:10}}).setOrigin(.5).setInteractive().setDepth(1001);
    const cancel=scene.add.text(config.width/2+105,config.height/2+165,'✖ CANCELAR',{fontSize:'18px',backgroundColor:'#660000',color:'#fff',padding:{left:14,right:14,top:10,bottom:10}}).setOrigin(.5).setInteractive().setDepth(1001); elements.push(start,cancel);
    const close=()=>{
        [start,cancel].forEach(b=>b.disableInteractive());
        neonFadeOut(scene, elements, ()=>neonCloseOverlay(elements));
    };
    cancel.on('pointerdown',close);
    start.on('pointerdown',()=>{
        [start,cancel].forEach(b=>b.disableInteractive());
        isPracticeMode=true;
        gameMode='solo';
        neonFadeOut(scene, elements, ()=>neonCloseOverlay(elements));
        neonFadeOut(scene, menuElements, ()=>{
            menuElements.forEach(e=>{if(e&&e.active)e.destroy()});
            initMicrophone();
            startGame(scene);
        });
    });
    neonFadeIn(scene, elements, { duration: 260 });
}

function resetRunState() {
    swordCharges = 0; swordSwingUntil = 0; swordSwingCooldown = 0; swordVisual = null;
    score = 0;
    runStatsRecorded = false;
    level = 1;
    xp = 0;
    nextLevelXp = 100;
    lastFired1 = 0;
    lastFired2 = 0;
    hp1 = gameMode === 'hardcore' ? 1 : 3;
    lastEspionerSquadSpawn = 0;
    legendaryAlly = null;
    legendaryAllySpawned = false;
    legendaryAllyEligible = Math.random() < 0.0001; // 0,01% por partida
    if (gameMode === 'invasion') hp1 = 5;
    if (gameMode === 'bossrush') hp1 = 5;
    hp2 = 3;
    goldenHearts1 = 0;
    goldenHearts2 = 0;
    goldenHeartHits1 = 0;
    goldenHeartHits2 = 0;
    if (goldenHeartSpawnTimer) { goldenHeartSpawnTimer.remove(); goldenHeartSpawnTimer = null; }
    purpleSouls = 0;
    blueSouls = 0;
    zipaSouls = 0;
    auraActive = false;
    auraTime = 0;
    dashActive = false;
    dashTime = 0;
    damageMultiplier = 1;
    killCount = 0;
    isGameOver = false;
    activeBoss = null;
    doubleShotActive = false;
    doubleShotTime = 0;
    shieldActive = false;
    laserActive = false;
    laserTime = 0;
    timeSlowActive = false;
    timeSlowTime = 0;
    isReplaying = false;
    replayData = [];
    frameCounter = 0;
    engineMaintenanceNext = 0;
    nextDustEffectAt = 0;
    nextAudioSampleAt = 0;
    gameStartTime = performance.now();
    practiceStats.distance = 0; practiceStats.collisions = 0; practiceStats.shots = 0; practiceStats.dashes = 0; practiceStats.trainingTime = 0; practiceStats.lastX = 0; practiceStats.lastY = 0; practiceHudTimer = 0;
    timeAttackTimeLeft = 90;
    bossRushIndex = 0;
    bossRushActive = false;
    if (timeAttackTimerEvent) { timeAttackTimerEvent.remove(); timeAttackTimerEvent = null; }
    if (randomEventTimer) { randomEventTimer.remove(); randomEventTimer = null; }
    randomEventScoreMultiplier = 1;
    randomEventUntil = 0;
    randomEventName = '';
    randomEventOriginalFireRate = null;
    if (randomEventLabel) { randomEventLabel.destroy(); randomEventLabel = null; }
}

function pruneGroup(group, maxSize, oldestFirst = true) {
    if (!group || !group.getChildren) return;
    const children = group.getChildren();
    if (children.length <= maxSize) return;

    const excess = children.length - maxSize;
    const victims = oldestFirst ? children.slice(0, excess) : children.slice(-excess);
    victims.forEach(obj => {
        if (obj && obj.active) obj.destroy();
    });
}

function addProjectileLifetime(scene, projectile, lifetime = ENGINE_LIMITS.projectileLifetime) {
    if (!projectile || !scene) return;
    projectile.setData('spawnTime', scene.time.now);
    scene.time.delayedCall(lifetime, () => {
        if (projectile && projectile.active) projectile.destroy();
    });
}


// ==========================================================
// NEON LEGACY — Neon Arena 1 integrado como modo interno.
// Baseado exclusivamente no JavaScript do HTML legado fornecido.
// Não abre outra página e não redireciona o navegador.
// ==========================================================
function legacyUpdateUI() {
    normalizeProgressionState();
    if (ui.legacyScore) ui.legacyScore.setText('SCORE: ' + score);
    if (ui.legacyHp) ui.legacyHp.setText('HP: ' + '❤️'.repeat(Math.max(0, hp1)));
    if (ui.legacyXp) ui.legacyXp.setText(`LVL: ${level} [${xp}/${nextLevelXp}]`);
    if (ui.legacySkills) ui.legacySkills.setText(`💀: ${purpleSouls}/6 | 🏃: ${blueSouls}/8`);
}

function legacyActivateAura(scene) {
    if (purpleSouls >= 6) {
        purpleSouls = 0;
        legacyAuraActive = true;
        legacyAuraUntil = scene.time.now + 5000;
        if (player1) player1.setTint(0xff00ff);
        legacyUpdateUI();
    }
}

function legacyActivateDash(scene) {
    if (blueSouls >= 8) {
        blueSouls = 0;
        legacyDashActive = true;
        legacyDashUntil = scene.time.now + 5000;
        if (player1) player1.setAlpha(0.5).setTint(0x00ffff);
        legacyUpdateUI();
    }
}

function legacyShoot(scene, pointer) {
    if (!player1 || !bullets || scene.time.now < legacyLastFired) return;
    const b = bullets.create(player1.x, player1.y, 'bullet');
    scene.physics.moveTo(b, pointer.x, pointer.y, 900);
    legacyLastFired = scene.time.now + fireRate;
}

function legacySpawnEnemy(scene) {
    if (!enemies || enemies.countActive(true) >= 42) return;
    const r = Math.random();
    let type = 'enemy', h = 1;
    if (r > 0.96) { type = 'miniboss'; h = 20; }
    else if (r > 0.90) { type = 'ghost'; h = 12; }
    else if (r > 0.80) { type = 'elite'; h = 8; }
    else if (r > 0.65) { type = 'fast'; h = 6; }
    else if (r > 0.50) { type = 'tank'; h = 3; }
    const x = Math.random() > 0.5 ? -100 : config.width + 100;
    const e = enemies.create(x, Math.random() * config.height, type);
    e.health = h;
    e.setData('legacyEnemy', true);
}

function legacyHitEnemy(b, e) {
    if (!e || !e.active) return;
    if (b && b.active) b.destroy();
    e.health = (Number(e.health) || 1) - 1;
    if (e.health <= 0) {
        const key = e.texture.key;
        if (key === 'tank' && purpleSouls < 6) purpleSouls++;
        if (key === 'elite' && blueSouls < 8) blueSouls++;
        let drop = 'legacy_gem_blue', value = 10;
        if (key === 'tank') { drop = 'legacy_gem_pink'; value = 50; }
        if (key === 'elite') { drop = 'legacy_gem_grey'; value = 115; }
        if (key === 'stalker') { drop = 'legacy_gem_132'; value = 132; }
        if (key === 'miniboss') { drop = 'legacy_gem_225'; value = 225; }
        const gem = gems.create(e.x, e.y, drop);
        gem.xpValue = value;
        e.destroy();
        score += value;
        legacyUpdateUI();
    }
}

function legacyCollectGem(p, g) {
    if (!g || !g.active) return;
    xp += Number(g.xpValue) || 0;
    g.destroy();
    if (xp >= nextLevelXp) {
        level++;
        SoundFX.levelUp();
        xp = 0;
        nextLevelXp += 120;
        hp1 = 3;
        fireRate = Math.max(80, fireRate - 25);
    }
    legacyUpdateUI();
}

function legacyStartGame(scene) {
    // Estado do Neon Arena 1, preservando a lógica original.
    legacyModeStarted = true;
    isPlaying = true;
    startAFKMonitor();
    legacyLastFired = 0;
    legacyAuraActive = false;
    legacyDashActive = false;
    legacyJoystick = { up:false, down:false, left:false, right:false };
    score = 0; level = 1; xp = 0; nextLevelXp = 100; hp1 = 3; fireRate = 400;
    purpleSouls = 0; blueSouls = 0; isGameOver = false; isReplaying = false;
    gameStartTime = performance.now();
    practiceStats.distance = 0; practiceStats.collisions = 0; practiceStats.shots = 0; practiceStats.dashes = 0; practiceStats.trainingTime = 0; practiceStats.lastX = 0; practiceStats.lastY = 0; practiceHudTimer = 0;

    enemies = scene.physics.add.group();
    bullets = scene.physics.add.group();
    gems = scene.physics.add.group();

    scene.add.grid(config.width/2, config.height/2, 5000, 5000, 40, 40, 0x333333).setAlpha(0.2).setDepth(-10);
    auraCircle = scene.add.circle(0, 0, 130, 0xff00ff, 0.15).setVisible(false).setDepth(0);
    player1 = scene.physics.add.sprite(config.width/2, config.height/2, 'player').setCollideWorldBounds(true).setDepth(1);

    ui.legacyScore = scene.add.text(20, 20, 'SCORE: 0', {fontSize:'20px', color:'#0f0'}).setDepth(5);
    ui.legacyHp = scene.add.text(20, 45, 'HP: ❤️❤️❤️', {fontSize:'20px'}).setDepth(5);
    ui.legacyXp = scene.add.text(20, 70, 'LVL: 1 [0/100]', {fontSize:'16px', color:'#0ff'}).setDepth(5);
    ui.legacySkills = scene.add.text(20, 95, '💀: 0/6 | 🏃: 0/8', {fontSize:'16px', color:'#fff'}).setDepth(5);
    scene.add.text(config.width - 170, 20, 'v4.7 • NEON LEGACY', {fontSize:'17px', color:'#00ffff', fontStyle:'bold'}).setDepth(5);

    scene.input.keyboard.on('keydown-H', () => legacyActivateAura(scene));
    scene.input.keyboard.on('keydown-N', () => legacyActivateDash(scene));
    scene.input.on('pointerdown', p => legacyShoot(scene, p));
    scene.input.mouse.disableContextMenu();

    scene.physics.add.overlap(player1, enemies, (p,e) => {
        if (legacyAuraActive || legacyDashActive || !e.active) return;
        e.destroy(); hp1--; legacyUpdateUI();
        if (hp1 <= 0 && !isGameOver) showDeadScreen(scene);
    }, null, scene);
    scene.physics.add.overlap(bullets, enemies, legacyHitEnemy, null, scene);
    scene.physics.add.overlap(player1, gems, legacyCollectGem, null, scene);

    // O D-Pad é o mesmo conceito de controle do Neon Arena 1.
    const xB=100, yB=config.height-100;
    ['up','down','left','right'].forEach(k=>{
        const x=xB+(k==='left'?-65:k==='right'?65:0), y=yB+(k==='up'?-65:k==='down'?65:0);
        const b=scene.add.image(x,y,'btn').setInteractive().setAlpha(0.3).setDepth(5);
        b.on('pointerdown',()=>legacyJoystick[k]=true);
        b.on('pointerup',()=>legacyJoystick[k]=false);
        b.on('pointerout',()=>legacyJoystick[k]=false);
    });
    scene.add.text(config.width-200, config.height-80, '💀',{fontSize:'50px'}).setInteractive().setDepth(5).on('pointerdown',()=>legacyActivateAura(scene));
    scene.add.text(config.width-100, config.height-80, '🏃‍♂️‍➡️',{fontSize:'50px'}).setInteractive().setDepth(5).on('pointerdown',()=>legacyActivateDash(scene));

    scene.time.addEvent({delay:1200, callback:()=>legacySpawnEnemy(scene), loop:true});
    legacySpawnEnemy(scene);
    legacyUpdateUI();
}

function legacyUpdate(scene, time) {
    if (!isPlaying || isGameOver || isPaused) return;
    if (!player1 || !player1.active) return;

    const wasd = wasdKeys || scene.input.keyboard.addKeys('W,A,S,D');
    const currentSpeed = legacyDashActive ? 800 : 300;
    player1.setVelocity(0);
    if (wasd.A.isDown || legacyJoystick.left) player1.setVelocityX(-currentSpeed);
    else if (wasd.D.isDown || legacyJoystick.right) player1.setVelocityX(currentSpeed);
    if (wasd.W.isDown || legacyJoystick.up) player1.setVelocityY(-currentSpeed);
    else if (wasd.S.isDown || legacyJoystick.down) player1.setVelocityY(currentSpeed);

    if (legacyAuraActive) {
        auraCircle.setPosition(player1.x, player1.y).setVisible(true);
        enemies.getChildren().forEach(e=>{
            if (e.active && Phaser.Math.Distance.Between(player1.x,player1.y,e.x,e.y)<130) legacyHitEnemy(null,e);
        });
        if (time > legacyAuraUntil) {
            legacyAuraActive=false; auraCircle.setVisible(false); player1.clearTint();
        }
    }
    if (legacyDashActive && time > legacyDashUntil) {
        legacyDashActive=false; player1.setAlpha(1).clearTint();
    }

    enemies.getChildren().forEach(e=>{
        if (!e.active) return;
        let speed=140;
        if(e.texture.key==='stalker') speed=100;
        if(e.texture.key==='ghost') speed=220;
        if(e.texture.key==='miniboss') speed=60;
        scene.physics.moveToObject(e,player1,speed+(level*2));
    });
}

function randomEventCleanup(scene) {
    randomEventScoreMultiplier = 1;
    randomEventUntil = 0;
    randomEventName = '';
    if (randomEventOriginalFireRate !== null) {
        fireRate = randomEventOriginalFireRate;
        randomEventOriginalFireRate = null;
    }
    if (randomEventLabel && randomEventLabel.active) randomEventLabel.setText('');
}

function triggerRandomArenaEvent(scene) {
    if (!scene || !isPlaying || isGameOver || isPaused || isShopOpen || gameMode === 'legacy') return;

    randomEventCleanup(scene);
    const events = ['double_score', 'enemy_rush', 'emergency_heal', 'overclock', 'crystal_rain', 'chaos'];
    const type = events[Math.floor(Math.random() * events.length)];
    const now = scene.time.now;

    if (type === 'double_score') {
        randomEventScoreMultiplier = 2;
        randomEventUntil = now + 12000;
        randomEventName = '💰 PONTOS EM DOBRO';
        showNotification(scene, '🎲 EVENTO: Pontos em dobro por 12s!', 'achievement');
    } else if (type === 'enemy_rush') {
        randomEventName = '👾 INVASÃO RELÂMPAGO';
        randomEventUntil = now + 9000;
        const amount = Math.min(8, Math.max(3, 3 + Math.floor(level / 4)));
        for (let i = 0; i < amount; i++) {
            scene.time.delayedCall(i * 170, () => {
                if (isPlaying && !isGameOver && !isPaused && enemies && enemies.countActive(true) < ENGINE_LIMITS.maxEnemies) spawnEnemy(scene);
            });
        }
        showNotification(scene, `🎲 EVENTO: Invasão relâmpago! +${amount} inimigos`, 'danger');
    } else if (type === 'emergency_heal') {
        const before = hp1;
        hp1 += 1;
        if (gameMode === 'coop') hp2 += 1;
        randomEventName = '❤️ CURA DE EMERGÊNCIA';
        randomEventUntil = now + 5000;
        updateUI();
        showNotification(scene, before < hp1 ? '🎲 EVENTO: Cura de emergência! +1 vida' : '🎲 EVENTO: Cura encontrada, mas seu HP já está cheio!', 'success');
    } else if (type === 'overclock') {
        randomEventOriginalFireRate = fireRate;
        fireRate = Math.max(45, Math.floor(fireRate * 0.55));
        randomEventName = '⚡ OVERCLOCK';
        randomEventUntil = now + 10000;
        showNotification(scene, '🎲 EVENTO: OVERCLOCK! Disparos 45% mais rápidos por 10s', 'success');
    } else if (type === 'crystal_rain') {
        randomEventName = '💎 CHUVA DE CRISTAIS';
        randomEventUntil = now + 7000;
        const count = Math.min(8, 3 + Math.floor(level / 3));
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(50, Math.max(51, config.width - 50));
            const y = Phaser.Math.Between(100, Math.max(101, config.height - 100));
            const gem = gems && gems.create(x, y, Math.random() < 0.5 ? 'gem_blue' : 'gem_pink');
            if (gem) gem.xpValue = 75 + level * 5;
        }
        showNotification(scene, `🎲 EVENTO: Chuva de cristais! +${count} cristais`, 'success');
    } else if (type === 'chaos') {
        randomEventName = '🌪️ CAOS NEON';
        randomEventUntil = now + 12000;
        triggerChaosTornadoEvent(scene);
        showNotification(scene, '🎲 EVENTO: CAOS NEON! Um tornado apareceu!', 'danger');
    }

    if (randomEventLabel && randomEventLabel.active) randomEventLabel.setText(randomEventName);
}

function startRandomArenaEvents(scene) {
    if (!scene || gameMode === 'legacy') return;
    if (randomEventTimer) randomEventTimer.remove();
    randomEventTimer = scene.time.addEvent({
        delay: 30000,
        loop: true,
        callback: () => {
            if (!isPlaying || isGameOver || isPaused || isShopOpen) return;
            triggerRandomArenaEvent(scene);
        }
    });
    // Primeiro evento acontece depois de uma pequena espera, evitando surpresa no spawn inicial.
    scene.time.delayedCall(12000, () => {
        if (isPlaying && !isGameOver && !isPaused && !isShopOpen) triggerRandomArenaEvent(scene);
    });
}

function updateRandomArenaEvent(scene, time) {
    if (!randomEventLabel) return;
    if (randomEventUntil > 0 && time >= randomEventUntil) {
        randomEventCleanup(scene);
    }
    if (randomEventUntil > 0 && randomEventName) {
        const left = Math.max(0, (randomEventUntil - time) / 1000);
        randomEventLabel.setText(`${randomEventName}  ${left.toFixed(1)}s`);
    } else {
        randomEventLabel.setText('');
    }
}

// =========================================================
// v5.26.1 — ARENA ARTIFACT CLEANUP
// Remove pequenos retângulos pretos/objetos de textura ausente que
// podem permanecer na camada da arena em algumas reinicializações/renderizações.
// Não toca em UI (depth >= 10), jogadores, inimigos ou projéteis normais.
// =========================================================
let naArenaArtifactCleanupAt = 0;
function naCleanupArenaArtifacts(scene, time = 0){
    if (!scene || !scene.children || !scene.children.list) return;
    if (time < naArenaArtifactCleanupAt) return;
    naArenaArtifactCleanupAt = time + 500;
    const list = scene.children.list.slice();
    for (const obj of list) {
        if (!obj || !obj.active || obj.__naKeepArtifactCleanup) continue;
        const depth = Number(obj.depth);
        if (!Number.isFinite(depth) || depth >= 10) continue;
        if (obj === player1 || obj === player2 || obj === laserBeam || obj === auraCircle || obj === shieldSprite) continue;
        if (enemies && enemies.contains && enemies.contains(obj)) continue;
        if (bullets && bullets.contains && bullets.contains(obj)) continue;
        if (enemyBullets && enemyBullets.contains && enemyBullets.contains(obj)) continue;
        if (turretBullets && turretBullets.contains && turretBullets.contains(obj)) continue;
        if (gems && gems.contains && gems.contains(obj)) continue;
        if (goldenHeartDrops && goldenHeartDrops.contains && goldenHeartDrops.contains(obj)) continue;
        if (turrets && turrets.contains && turrets.contains(obj)) continue;
        if (traps && traps.contains && traps.contains(obj)) continue;
        if (chaosTornados && chaosTornados.contains && chaosTornados.contains(obj)) continue;

        const w = Number(obj.displayWidth || obj.width || 0);
        const h = Number(obj.displayHeight || obj.height || 0);
        const smallEnough = w > 8 && h > 8 && w <= 180 && h <= 180;
        if (!smallEnough) continue;

        // Phaser fallback/missing textures are safe to discard here.
        const key = obj.texture && obj.texture.key ? String(obj.texture.key).toLowerCase() : '';
        if (key === '__missing' || key === '__default' || key === 'missing') {
            obj.destroy();
            continue;
        }

        // A plain black Rectangle at arena depth is not used by the gameplay layer.
        if (typeof obj.fillColor === 'number' && obj.fillColor === 0x000000 && (obj.fillAlpha == null || obj.fillAlpha > 0)) {
            obj.destroy();
        }
    }
}

function startGame(scene) {
    // NA2 Services is optional. Its shutdown only disables service features;
    // it must never prevent the local game from starting.
    if (isPracticeMode) gameMode = 'solo';
    if (gameMode === 'legacy') { legacyStartGame(scene); return; }
    resetRunState();
    neonRecordGameStart();
    isPlaying = true;
    startAFKMonitor();
     
    let bgLayer = scene.add.layer().setDepth(-9999);
    
    let activeThemeKey = currentBackground === 'solid' ? solidThemeColor : currentBackground;
    let activeTheme = themeColors[activeThemeKey] || themeColors['grid'];

    let bgList = ['skin_a', 'skin_b', 'skin_c', 'skin_d'];
    if (scene.textures.exists('win10')) bgList.push('win10');
    if (currentBackground === 'aero' && neonAeroIsUnlocked()) {
        drawAeroBackground(scene, bgLayer, false);
    } else if (currentBackground === 'solid') {
        let solidHex = solidColorsMap[solidThemeColor] ? solidColorsMap[solidThemeColor].hex : 0x111111;
        let bgRect = scene.add.rectangle(config.width/2, config.height/2, config.width * 2, config.height * 2, solidHex);
        let grid = scene.add.grid(config.width/2, config.height/2, 5000, 5000, 40, 40, isLightMode ? 0xcccccc : 0x222222).setAlpha(0.2);
        bgLayer.add([bgRect, grid]);
    } else if (gradientThemes[currentBackground]) {
        const gt = gradientThemes[currentBackground];
        const gradient = scene.add.graphics();
        gradient.fillGradientStyle(gt.topLeft, gt.topRight, gt.bottomLeft, gt.bottomRight, 1);
        gradient.fillRect(0, 0, config.width, config.height);
        gradient.setScrollFactor(0);
        bgLayer.add(gradient);
        const grid = scene.add.grid(config.width/2, config.height/2, 5000, 5000, 40, 40, isLightMode ? 0xcccccc : 0xffffff).setAlpha(0.09);
        bgLayer.add(grid);
    } else if (bgList.includes(currentBackground) && scene.textures.exists(currentBackground)) {
        let bg = scene.add.image(config.width/2, config.height/2, currentBackground);
        bg.setDisplaySize(config.width, config.height);
        bgLayer.add(bg);
    } else {
        let gridColor = isLightMode ? 0xcccccc : 0x333333;
        let gridAlpha = isLightMode ? 0.4 : 0.2;
        let grid = scene.add.grid(config.width/2, config.height/2, 5000, 5000, 40, 40, gridColor).setAlpha(gridAlpha);
        bgLayer.add(grid);
    }

    enemyBullets = scene.physics.add.group();
    turretBullets = scene.physics.add.group();
    turrets = scene.physics.add.group();
    traps = scene.physics.add.group();
    chaosTornados = scene.physics.add.group();
    goldenHeartDrops = scene.physics.add.group();

    let versionColor = isLightMode ? '#333333' : '#ffffff';
    let modeLabel = gameMode === 'solo' ? 'v4.7 SOLO' : (gameMode === 'coop' ? 'v4.7 CO-OP' : (gameMode === 'hardcore' ? 'v4.7 HARDCORE' : (gameMode === 'invasion' ? 'v4.7 INVASÃO' : (gameMode === 'timeattack' ? 'v4.7 TIME ATTACK • NEW' : (gameMode === 'bossrush' ? 'v4.7 BOSS RUSH • NEW' : 'v4.7 NEON LEGACY')))));
    scene.add.text(config.width - 160, 20, modeLabel, { fontSize: '20px', color: gameMode === 'hardcore' ? '#ff3333' : versionColor, fontStyle: 'bold' }).setAlpha(0.8).setDepth(2);
     
    auraCircle = scene.add.circle(0, 0, 130, 0xff00ff, 0.15).setVisible(false).setDepth(0);
    shieldSprite = scene.add.circle(0, 0, 25, 0x00ffff, 0.3).setVisible(false).setDepth(0);
    laserBeam = scene.add.rectangle(0, 0, 10, 10, 0xff0000, 0.8).setVisible(false).setDepth(5);
    
    let p1Texture = getActivePlayerTextureKey(scene);

    if (gameMode === 'coop') {
        player1 = scene.physics.add.sprite(config.width/2 - 40, config.height/2, p1Texture).setCollideWorldBounds(true).setDepth(1);
        player2 = scene.physics.add.sprite(config.width/2 + 40, config.height/2, 'player2').setCollideWorldBounds(true).setDepth(1);
        hp1 = 3;
        hp2 = 3;
    } else {
        player1 = scene.physics.add.sprite(config.width/2, config.height/2, p1Texture).setCollideWorldBounds(true).setDepth(1);
        hp1 = (gameMode === 'hardcore') ? 1 : ((gameMode === 'invasion' || gameMode === 'bossrush') ? 5 : 3);
    }

    if (gameMode === 'hardcore') {
        player1.setTint(0xff2222);
    }

    if (p1Texture === 'custom_player' && gameMode !== 'hardcore') {
        player1.setDisplaySize(32, 32);
        player1.setTint(0xffffff);
    }
    
    enemies = scene.physics.add.group(); bullets = scene.physics.add.group(); gems = scene.physics.add.group(); swordDrops = scene.physics.add.group();
     
    scene.input.keyboard.on('keydown-Z', () => activateAura(scene));
    scene.input.keyboard.on('keydown-F', () => activateDash(scene));
    scene.input.keyboard.on('keydown-Q', () => cycleWeapon(scene));
    scene.input.keyboard.on('keydown-N', () => activateDoubleDamage(scene));
    scene.input.keyboard.on('keydown-V', () => buyHealth());
    scene.input.keyboard.on('keydown-R', () => activateDoubleShot(scene));
    scene.input.keyboard.on('keydown-T', () => placeTurret(scene));
    scene.input.keyboard.on('keydown-L', () => activateLaser(scene));     
    scene.input.keyboard.on('keydown-B', () => activateBomb(scene));      
    scene.input.keyboard.on('keydown-C', () => activateTimeSlow(scene));  
    scene.input.keyboard.on('keydown-E', () => placeTacticalTrap(scene));
    scene.input.keyboard.on('keydown-G', () => swingSword(scene));
    scene.input.keyboard.on('keydown-SPACE', () => swingSword(scene));
    scene.input.keyboard.on('keydown-ESC', () => togglePauseMenu(scene));  

    scene.input.on('pointerdown', (pointer, currentlyOver) => {
        if (!isPlaying || isGameOver || isPaused || isShopOpen) return;
        if (currentlyOver && currentlyOver.length > 0) return;

        if (gameMode === 'coop' && pointer.rightButtonDown()) {
            shootPlayer2(scene, pointer, activeTheme.num);
        } else {
            shootPlayer1(scene, pointer, activeTheme.num);
        }
    });
     
    scene.input.mouse.disableContextMenu();
     
    if (gameMode === 'coop') {
        scene.physics.add.overlap(player1, enemies, (p, e) => { if (e && e.getData && e.getData('isAlly')) return; takeDamage(scene, 1, e); }, null, scene);
        scene.physics.add.overlap(player2, enemies, (p, e) => { if (e && e.getData && e.getData('isAlly')) return; takeDamage(scene, 2, e); }, null, scene);
        scene.physics.add.overlap(player1, enemyBullets, (p, b) => { if (b && b.getData && b.getData('isAllyBullet')) return; takeEnemyBulletDamage(scene, 1, b); }, null, scene);
        scene.physics.add.overlap(player2, enemyBullets, (p, b) => { if (b && b.getData && b.getData('isAllyBullet')) return; takeEnemyBulletDamage(scene, 2, b); }, null, scene);
        scene.physics.add.overlap(player2, gems, collectGem, null, scene);
        scene.physics.add.overlap(player2, goldenHeartDrops, collectGoldenHeart, null, scene);
    } else {
        scene.physics.add.overlap(player1, enemies, (p, e) => takeDamage(scene, 1, e), null, scene);
        scene.physics.add.overlap(player1, enemyBullets, (p, b) => takeEnemyBulletDamage(scene, 1, b), null, scene);
    }
     
    scene.physics.add.overlap(bullets, enemies, hitEnemy, null, scene);
    scene.physics.add.overlap(enemies, enemies, legendaryAllyEnemyContact, (a, b) => {
        return !!(a && b && a !== b && ((a.getData && a.getData('isAlly')) || (b.getData && b.getData('isAlly'))));
    }, scene);
    // Inimigos agora podem acertar outros inimigos com seus próprios projéteis.
    scene.physics.add.overlap(enemyBullets, enemies, hitEnemyByEnemyBullet, (bullet, enemy) => {
        const shooter = bullet && bullet.getData ? bullet.getData('sourceEnemy') : null;
        return enemy && enemy.active && enemy !== shooter;
    }, scene);
    scene.physics.add.overlap(laserBeam, enemies, (laser, e) => hitEnemy(null, e), null, scene);
    scene.physics.add.overlap(turretBullets, enemies, hitEnemyByTurret, null, scene);
    scene.physics.add.overlap(player1, gems, collectGem, null, scene);
    scene.physics.add.overlap(player1, goldenHeartDrops, collectGoldenHeart, null, scene);
    scene.physics.add.overlap(player1, swordDrops, collectSword, null, scene);
    scene.physics.add.overlap(traps, enemies, triggerTacticalTrap, null, scene);

    scene.physics.add.overlap(chaosTornados, enemies, (tornado, enemy) => {
        SoundFX.explosion();
        enemy.health = 0;
        hitEnemy.call({ scene: scene }, null, enemy);
    }, null, scene);

    scene.physics.add.overlap(player1, chaosTornados, (p, tornado) => {
        if (auraActive || dashActive) return;
        hp1 = 0;
        isGameOver = true;
        showDeadScreen(scene);
    }, null, scene);
     
    let uiTextColor = isLightMode ? '#000000' : '#ffffff';
    ui.score = scene.add.text(20, 20, 'SCORE: 0', { fontSize: '20px', color: activeTheme.hex }).setDepth(2);
    
    if (gameMode === 'coop') {
        ui.hp = scene.add.text(20, 45, 'P1: ❤️❤️❤️ | P2: ❤️❤️❤️', { fontSize: '18px' }).setDepth(2);
    } else if (gameMode === 'hardcore') {
        ui.hp = scene.add.text(20, 45, 'HP: ❤️ (HARDCORE)', { fontSize: '20px', color: '#ff3333', fontStyle: 'bold' }).setDepth(2);
    } else {
        ui.hp = scene.add.text(20, 45, 'HP: ❤️❤️❤️', { fontSize: '20px' }).setDepth(2);
    }
    
    ui.xp = scene.add.text(20, 70, 'LVL: 1', { fontSize: '16px', color: activeTheme.hex }).setDepth(2);
    ui.skills = scene.add.text(20, 95, '💀: 0/6 | 🏃: 0/8 | ⚡: 0/3', { fontSize: '16px', color: uiTextColor }).setDepth(2);
    
    let totalDmgCalc = (currentWeapon.damage + (rebirthLevel * 2)) * damageMultiplier;
    ui.weapon = scene.add.text(20, 120, 'ARMA: ' + currentWeapon.name + ' (Dano: ' + totalDmgCalc + 'x | Rebirth: ' + rebirthLevel + ')', { fontSize: '16px', color: uiTextColor }).setDepth(2);
    randomEventLabel = scene.add.text(config.width/2, 82, '', { fontSize: '16px', color: '#ffe66d', fontStyle: 'bold', backgroundColor: '#111018', padding: { left: 9, right: 9, top: 5, bottom: 5 } }).setOrigin(0.5).setDepth(6);
    ui.sword = scene.add.text(20, 142, '', { fontSize: '16px', color: '#ffdd55', fontStyle: 'bold' }).setDepth(2);
    if (isPracticeMode) { ui.practice = scene.add.text(20, 165, '', { fontSize:'14px', color:'#00ffcc', fontStyle:'bold' }).setDepth(3); practiceStats.lastX = player1.x; practiceStats.lastY = player1.y; }
    if (gameMode === 'invasion') ui.wave = scene.add.text(20, 170, 'ONDA: 1/10', { fontSize: '17px', color: activeTheme.hex, fontStyle: 'bold' }).setDepth(2);
    if (gameMode === 'timeattack') ui.wave = scene.add.text(20, 170, 'TEMPO: 90s', { fontSize: '17px', color: activeTheme.hex, fontStyle: 'bold' }).setDepth(2);
    if (gameMode === 'bossrush') ui.wave = scene.add.text(20, 170, 'BOSS: 1/4', { fontSize: '17px', color: activeTheme.hex, fontStyle: 'bold' }).setDepth(2);
    bossHpBar = scene.add.rectangle(config.width/2, 42, Math.min(520, config.width*0.55), 18, 0x220022, 0.9).setDepth(4).setVisible(false);
    bossHpFill = scene.add.rectangle(config.width/2, 42, Math.min(520, config.width*0.55), 18, 0xff00ff, 1).setDepth(5).setVisible(false);
    bossNameText = scene.add.text(config.width/2, 14, '', { fontSize: '18px', color: '#ff00ff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(5).setVisible(false);
    
    // PC: apenas botão da loja. Touch: controles completos de celular.
    touchDetected = detectTouchSupport() || touchDetected;
    if (touchDetected) {
        createMobileControls(scene);
    } else {
        createDesktopControls(scene);
    }
     
    if (gameMode === 'invasion') {
        startInvasionMode(scene);
    } else if (gameMode === 'timeattack') {
        startTimeAttackMode(scene);
    } else if (gameMode === 'bossrush') {
        startBossRushMode(scene);
    } else {
        let spawnDelay = gameMode === 'hardcore' ? 700 : 1100;
        spawnDelay = Math.max(420, spawnDelay - Math.min(420, (level - 1) * 12));
        scene.time.addEvent({ delay: spawnDelay, callback: () => spawnEnemy(scene), loop: true });
    }
    scene.time.addEvent({ delay: 600, callback: () => updateTurrets(scene), loop: true });

    if (gameMode === 'hardcore') {
        hardcoreStartTime = scene.time.now;
        hardcoreTimerEvent = scene.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                if (!isPlaying || isGameOver || isPaused || isShopOpen) return;
                let elapsedSec = Math.floor((scene.time.now - hardcoreStartTime) / 1000);
                if (elapsedSec >= 20) {
                    checkAchievement(scene, 'hardcoreSurvivor');
                    if (hardcoreTimerEvent) hardcoreTimerEvent.remove();
                }
            }
        });

        chaosEventTimer = scene.time.addEvent({
            delay: 90000,
            loop: true,
            callback: () => {
                if (!isPlaying || isGameOver || isPaused || isShopOpen) return;
                triggerChaosTornadoEvent(scene);
            }
        });
    }
    
    startRandomArenaEvents(scene);

    // v5.20 — itens de Coração Dourado aparecem raramente durante a partida.
    goldenHeartSpawnTimer = scene.time.addEvent({
        delay: 18000,
        loop: true,
        callback: () => {
            if (!isPlaying || isGameOver || isPaused || isShopOpen || !goldenHeartDrops) return;
            if (goldenHeartDrops.countActive(true) >= 2 || Math.random() > 0.42) return;
            spawnGoldenHeartItem(scene);
        }
    });

    showNotification(scene, 'Bem-vindo ao Neon Arena 2!', 'success');
}


// ==========================================
// SECOND AI UPDATE — v3.3
// Inteligência de grupo, evasão e previsão de movimento.
// ==========================================
function secondAIChooseTarget(enemy) {
    if (enemy && enemy.getData && enemy.getData('isAlly')) return findLegendaryAllyTarget() || player1;
    let target = player1;
    if (legendaryAlly && legendaryAlly.active && Math.random() < 0.62) return legendaryAlly;
    if (gameMode !== 'coop' || !player2 || !player2.active) return target;

    const d1 = Phaser.Math.Distance.Between(enemy.x, enemy.y, player1.x, player1.y);
    const d2 = Phaser.Math.Distance.Between(enemy.x, enemy.y, player2.x, player2.y);
    const h1 = Math.max(1, hp1);
    const h2 = Math.max(1, hp2);

    // O alvo com menos HP recebe uma leve prioridade, mas distância continua importante.
    const score1 = d1 * (h1 <= h2 ? 0.86 : 1.0);
    const score2 = d2 * (h2 <= h1 ? 0.86 : 1.0);
    return score2 < score1 ? player2 : player1;
}

function secondAIPredictTarget(target, lead = 0.18) {
    const body = target && target.body;
    if (!body) return { x: target.x, y: target.y };
    return {
        x: target.x + Phaser.Math.Clamp(body.velocity.x * lead, -110, 110),
        y: target.y + Phaser.Math.Clamp(body.velocity.y * lead, -110, 110)
    };
}

function secondAIApplyAvoidance(scene, enemy, target, time, speedMultiplier) {
    if (!enemy || !enemy.active || !enemy.body) return;

    let ax = 0, ay = 0;
    const enemyChildren = enemies.getChildren();

    // Separação: inimigos próximos não ficam empilhados uns nos outros.
    for (const ally of enemyChildren) {
        if (ally === enemy || !ally.active) continue;
        const dx = enemy.x - ally.x;
        const dy = enemy.y - ally.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < 70 * 70) {
            const d = Math.sqrt(d2);
            const force = (70 - d) / 70;
            ax += (dx / d) * force * 55;
            ay += (dy / d) * force * 55;
        }
    }

    // Evasão de projéteis do jogador: reage apenas aos mais próximos.
    if (typeof bullets !== 'undefined') {
        let nearest = null, nearestD2 = 125 * 125;
        bullets.getChildren().forEach(b => {
            if (!b.active) return;
            const dx = enemy.x - b.x;
            const dy = enemy.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < nearestD2) { nearestD2 = d2; nearest = b; }
        });
        if (nearest) {
            const dx = enemy.x - nearest.x;
            const dy = enemy.y - nearest.y;
            const d = Math.hypot(dx, dy) || 1;
            const bulletVX = nearest.body ? nearest.body.velocity.x : 0;
            const bulletVY = nearest.body ? nearest.body.velocity.y : 0;
            // Escolhe o lado mais seguro em vez de sempre fugir em linha reta.
            const side = Math.sign((bulletVX * dy) - (bulletVY * dx)) || 1;
            ax += (-dy / d) * side * 95;
            ay += ( dx / d) * side * 95;
        }
    }

    // Flanqueamento: alguns inimigos tentam sair do eixo direto do jogador.
    const flank = enemy.getData('aiFlank') || 1;
    const toTarget = Phaser.Math.Angle.Between(enemy.x, enemy.y, target.x, target.y);
    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);
    if (dist > 120 && dist < 520) {
        ax += Math.cos(toTarget + (Math.PI / 2) * flank) * 18;
        ay += Math.sin(toTarget + (Math.PI / 2) * flank) * 18;
    }

    if (Math.abs(ax) > 0.01 || Math.abs(ay) > 0.01) {
        enemy.body.velocity.x += ax * speedMultiplier;
        enemy.body.velocity.y += ay * speedMultiplier;
        const maxSpeed = 520 * speedMultiplier;
        const len = Math.hypot(enemy.body.velocity.x, enemy.body.velocity.y) || 1;
        if (len > maxSpeed) {
            enemy.body.velocity.x = enemy.body.velocity.x / len * maxSpeed;
            enemy.body.velocity.y = enemy.body.velocity.y / len * maxSpeed;
        }
    }
}

function secondAIThink(enemy, target, time) {
    if (!enemy.getData('aiInit')) {
        enemy.setData('aiInit', true);
        enemy.setData('aiFlank', Math.random() < 0.5 ? -1 : 1);
        enemy.setData('aiNextThink', time + Phaser.Math.Between(80, 220));
        enemy.setData('aiLastTargetX', target.x);
        enemy.setData('aiLastTargetY', target.y);
    }
    if (time >= (enemy.getData('aiNextThink') || 0)) {
        enemy.setData('aiNextThink', time + Phaser.Math.Between(120, 300));
        enemy.setData('aiFlank', Math.random() < 0.5 ? -1 : 1);
        enemy.setData('aiLastTargetX', target.x);
        enemy.setData('aiLastTargetY', target.y);
    }
}

function update(time) {
    naApplyHalloweenTheme(this);
    if (legendaryAllyEligible && !legendaryAllySpawned && isPlaying && !isGameOver && time >= 2500) spawnLegendaryAlly(this);
    naCleanupArenaArtifacts(this, time);
    if (isPlaying && !afkTimer) startAFKMonitor();
    if (isPlaying && gameMode !== 'legacy') updateRandomArenaEvent(this, time);
    if (gameMode === 'legacy' && legacyModeStarted) { legacyUpdate(this, time); return; }
    // O polling do controle fica antes do bloqueio da loja para que X também possa FECHAR a loja.
    updateGamepad(this, time);
    if (isPaused) return;
    if (!isPlaying || (isGameOver && !isReplaying) || isPaused || isShopOpen) return;

    // Manutenção periódica: os limites não precisam ser recalculados em todos os frames.
    if (time >= engineMaintenanceNext) {
        engineMaintenanceNext = time + ENGINE_LIMITS.maintenanceInterval;
        pruneGroup(enemies, ENGINE_LIMITS.maxEnemies);
        pruneGroup(bullets, ENGINE_LIMITS.maxBullets);
        pruneGroup(enemyBullets, ENGINE_LIMITS.maxEnemyBullets);
        pruneGroup(turretBullets, ENGINE_LIMITS.maxTurretBullets);
        pruneGroup(chaosTornados, ENGINE_LIMITS.maxTornados);
    }

    // Vortex Launcher: procura alvo em intervalos curtos e reutiliza o alvo entre buscas.
    // Isso evita uma busca O(projéteis x inimigos) completa em todos os frames.
    if (bullets && enemies) {
        const enemyList = enemies.getChildren();
        bullets.getChildren().forEach(b => {
            if (!b.active || !b.getData('homing') || !b.body) return;
            const nextThink = Number(b.getData('homingNextThink')) || 0;
            let target = b.getData('homingTarget');
            if (time >= nextThink || !target || !target.active || target.getData('defeated')) {
                target = null;
                let bestD2 = Infinity;
                for (let i = 0; i < enemyList.length; i++) {
                    const e = enemyList[i];
                    if (!e || !e.active || e.getData('defeated')) continue;
                    const dx = e.x - b.x, dy = e.y - b.y, d2 = dx * dx + dy * dy;
                    if (d2 < bestD2) { bestD2 = d2; target = e; }
                }
                b.setData('homingTarget', target || null);
                b.setData('homingNextThink', time + ENGINE_LIMITS.homingThinkInterval);
            }
            if (target && target.active) {
                const desired = Phaser.Math.Angle.Between(b.x, b.y, target.x, target.y);
                const speed = Math.max(700, Math.hypot(b.body.velocity.x, b.body.velocity.y));
                const current = Math.atan2(b.body.velocity.y, b.body.velocity.x);
                const delta = Phaser.Math.Angle.Wrap(desired - current);
                const turn = Phaser.Math.Clamp(delta, -0.09, 0.09);
                this.physics.velocityFromRotation(current + turn, speed, b.body.velocity);
            }
        });
    }

    // v5.14 — Boomerang Neon retorna ao jogador depois do primeiro trecho da trajetória.
    if (bullets) bullets.getChildren().forEach(b => {
        if (!b.active || !b.getData('boomerangReturn')) return;
        const ownerRef = b.getData('boomerangOwner');
        const born = Number(b.getData('boomerangBorn')) || 0;
        if (!ownerRef || !ownerRef.active || time - born < 220) return;
        const a = Phaser.Math.Angle.Between(b.x, b.y, ownerRef.x, ownerRef.y);
        this.physics.velocityFromRotation(a, 760, b.body.velocity);
        if (Phaser.Math.Distance.Between(b.x, b.y, ownerRef.x, ownerRef.y) < 35) b.destroy();
    });
     
    // Análise de microfone é opcional e limitada a 10 amostras/segundo.
    // Antes, o FFT era calculado em todos os frames mesmo quando a análise estava desligada.
    if (analyser && dataArray && typeof na44AudioAnalysis !== 'undefined' && na44AudioAnalysis && time >= nextAudioSampleAt) {
        nextAudioSampleAt = time + ENGINE_LIMITS.audioSampleInterval;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        microphoneLevel = sum / dataArray.length;
        if (soundBar) {
            soundBar.clear();
            soundBar.fillStyle(0xff0000);
            soundBar.fillRect(config.width - 150, 30, microphoneLevel * 1.2, 15);
        }
    }

    if (!isReplaying) {
        frameCounter++;
        if (frameCounter % ENGINE_LIMITS.replaySampleEvery === 0) {
            const frame = gameMode === 'coop'
                ? { p1: { x: Math.round(player1.x), y: Math.round(player1.y) },
                    p2: { x: Math.round(player2.x), y: Math.round(player2.y) }, e: [] }
                : { p1: { x: Math.round(player1.x), y: Math.round(player1.y) }, e: [] };

            enemies.getChildren().forEach(e => {
                if (e && e.active) frame.e.push({
                    x: Math.round(e.x),
                    y: Math.round(e.y),
                    key: e.texture.key
                });
            });

            replayData.push(frame);
            if (replayData.length > ENGINE_LIMITS.replayMaxFrames) {
                replayData.splice(0, replayData.length - ENGINE_LIMITS.replayMaxFrames);
            }
        }
    }
     
    let practiceSpeedMultiplier = isPracticeMode ? practiceSettings.speed / 5 : 1;
    let currentSpeed = (dashActive ? 800 : 300) * practiceSpeedMultiplier;
    if (isPracticeMode && !practiceSettings.obstacles) { if (enemyBullets) enemyBullets.clear(true, true); if (chaosTornados) chaosTornados.clear(true, true); }
    if (isPracticeMode && !practiceSettings.enemies && enemies) enemies.clear(true, true);
    
    player1.setVelocity(0);
    let gp = findActiveGamepad();
    let axisX = gp ? (gp.axes[0] || 0) : 0;
    let axisY = gp ? (gp.axes[1] || 0) : 0;
    const deadzone = 0.18;
    if (Math.abs(axisX) < deadzone) axisX = 0;
    if (Math.abs(axisY) < deadzone) axisY = 0;

    let p1Left = cursors.left.isDown || joystick1.left || (gameMode !== 'coop' && wasdKeys.A.isDown);
    let p1Right = cursors.right.isDown || joystick1.right || (gameMode !== 'coop' && wasdKeys.D.isDown);
    let p1Up = cursors.up.isDown || joystick1.up || (gameMode !== 'coop' && wasdKeys.W.isDown);
    let p1Down = cursors.down.isDown || joystick1.down || (gameMode !== 'coop' && wasdKeys.S.isDown);

    let vx1 = (p1Right ? 1 : 0) - (p1Left ? 1 : 0);
    let vy1 = (p1Down ? 1 : 0) - (p1Up ? 1 : 0);

    // Analógico esquerdo do controle assume o movimento do P1.
    if (inputMode === INPUT_MODE.GAMEPAD && (axisX !== 0 || axisY !== 0)) {
        vx1 = axisX;
        vy1 = axisY;
    }

    let isMoving = Math.abs(vx1) > 0.01 || Math.abs(vy1) > 0.01;

    if (isPracticeMode && isMoving && player1.active) {
        practiceStats.distance += Phaser.Math.Distance.Between(practiceStats.lastX, practiceStats.lastY, player1.x, player1.y) / 10;
        practiceStats.lastX = player1.x; practiceStats.lastY = player1.y;
        practiceStats.trainingTime = Math.floor((performance.now()-gameStartTime)/1000);
    }

    if (isMoving) {
        const len1 = Math.hypot(vx1, vy1) || 1;
        const scale = Math.min(1, len1);
        player1.setVelocity((vx1 / len1) * currentSpeed * scale, (vy1 / len1) * currentSpeed * scale);
    }

    if (isMoving && !isReplaying) {
        checkAchievement(this, 'marathoner');
        // Efeito de poeira com cooldown: evita centenas de sprites/tweens por segundo.
        if (time >= nextDustEffectAt && Math.random() < 0.72) {
            nextDustEffectAt = time + ENGINE_LIMITS.dustInterval;
            let dustTint = 0xffffff;
            if (achievements.marathoner.unlocked) dustTint = 0xffd700;
            if (achievements.furyStriker.unlocked) dustTint = 0xff3300;

            const dust = this.add.image(player1.x + (Math.random() * 10 - 5), player1.y + 12, 'particle_dust').setTint(dustTint).setAlpha(0.7).setDepth(0);
            this.tweens.add({
                targets: dust,
                scale: 1.5,
                alpha: 0,
                duration: 400,
                onComplete: () => dust.destroy()
            });
        }
    }

    if (gameMode === 'coop') {
        player2.setVelocity(0);
        const vx2 = ((wasdKeys.D.isDown || joystick2.right) ? 1 : 0) -
            ((wasdKeys.A.isDown || joystick2.left) ? 1 : 0);
        const vy2 = ((wasdKeys.S.isDown || joystick2.down) ? 1 : 0) -
            ((wasdKeys.W.isDown || joystick2.up) ? 1 : 0);
        if (vx2 !== 0 || vy2 !== 0) {
            const len2 = Math.hypot(vx2, vy2) || 1;
            player2.setVelocity((vx2 / len2) * currentSpeed, (vy2 / len2) * currentSpeed);
        }
    }
     
    if (auraActive) { 
        auraCircle.setPosition(player1.x, player1.y).setVisible(true); 
        enemies.getChildren().forEach(e => { if (Phaser.Math.Distance.Between(player1.x, player1.y, e.x, e.y) < 130) hitEnemy.call({time: time}, null, e); }); 
        if (time > auraTime) { auraActive = false; auraCircle.setVisible(false); player1.clearTint(); if(gameMode==='coop') player2.clearTint(); else if(gameMode==='hardcore') player1.setTint(0xff2222); } 
    }
    if (dashActive && time > dashTime) { 
        dashActive = false; player1.setAlpha(1); player1.clearTint(); 
        if(gameMode==='coop') { player2.setAlpha(1); player2.clearTint(); }
        else if(gameMode==='hardcore') player1.setTint(0xff2222);
    }
    if (doubleShotActive && time > doubleShotTime) { doubleShotActive = false; updateUI(); }

    if (laserActive) {
        laserBeam.setPosition(player1.x + 250, player1.y);
        laserBeam.setSize(500, 20);
        if (time > laserTime) { laserActive = false; laserBeam.setVisible(false); }
    }

    if (timeSlowActive && time > timeSlowTime) {
        timeSlowActive = false;
    }

    if (shieldActive) {
        shieldSprite.setPosition(player1.x, player1.y);
    }
    if (swordVisual && swordVisual.active) swordVisual.setPosition(player1.x, player1.y - 28);

    chaosTornados.getChildren().forEach(tornado => {
        if (!tornado.customTarget || !tornado.customTarget.active) {
            tornado.customTarget = { x: Math.random() * config.width, y: Math.random() * config.height };
        }
        this.physics.moveToObject(tornado, tornado.customTarget, 140);
        if (Phaser.Math.Distance.Between(tornado.x, tornado.y, tornado.customTarget.x, tornado.customTarget.y) < 30) {
            tornado.customTarget = { x: Math.random() * config.width, y: Math.random() * config.height };
        }
    });
     
    if (!isReplaying) {
        let slowFactor = timeSlowActive ? 0.4 : 1.0;
        let aiMultiplier = (gameMode === 'hardcore') ? 1.45 : 1.0;
        let soundSpeedMultiplier = (1 + (microphoneLevel / 30)) * slowFactor * aiMultiplier * (typeof v5EventMultiplier === 'function' ? v5EventMultiplier() : 1) * (typeof v5 !== 'undefined' && v5.director ? v5.director : 1);
        
        enemies.getChildren().forEach(e => { 
            if (e && e.active && e.getData && e.getData('isAlly')) {
                updateLegendaryAlly(this, e, time, soundSpeedMultiplier);
                return;
            }
            let target = secondAIChooseTarget(e);
            secondAIThink(e, target, time);
            
            let key = e.texture.key;

            if (e.getData && e.getData('isBoss')) {
                updateBoss(this, e, target, time);
            }
            else if (key === 'colossus') {
                let dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                let colossusSpeed = dist < 250 ? 120 : 85;
                this.physics.moveToObject(e, target, colossusSpeed * soundSpeedMultiplier);
            } 
            else if (key === 'zipa') {
                let angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y) + Math.sin(time * 0.01) * 0.5;
                this.physics.velocityFromRotation(angle, 220 * soundSpeedMultiplier, e.body.velocity);
            } 
            else if (key === 'sniper') {
                let dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                if (dist > 320) {
                    this.physics.moveToObject(e, target, 130 * soundSpeedMultiplier);
                } else if (dist < 220) {
                    this.physics.moveToObject(e, target, -130 * soundSpeedMultiplier);
                } else {
                    e.setVelocity(0);
                }

                if (!e.nextShootTime) e.nextShootTime = 0;
                if (this.time.now > e.nextShootTime) {
                    let sb = enemyBullets.create(e.x, e.y, 'sniper_bullet');
                    sb.setData('sourceEnemy', e).setData('enemyDamage', 2);
                    const predicted = secondAIPredictTarget(target, 0.22);
                    this.physics.moveTo(sb, predicted.x, predicted.y, (gameMode === 'hardcore' ? 850 : 650));
                    e.nextShootTime = this.time.now + (gameMode === 'hardcore' ? 1200 : 2200);
                }
            } 
            else if (key === 'splitter') {
                this.physics.moveToObject(e, target, 160 * soundSpeedMultiplier);
            } 
            else if (key === 'stalker') {
                let angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y) + Math.cos(time * 0.008) * 0.8;
                this.physics.velocityFromRotation(angle, (160 + (level * 2)) * soundSpeedMultiplier, e.body.velocity);
                
                if (!e.nextShootTime) e.nextShootTime = 0;
                if (this.time.now > e.nextShootTime && Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y) < 420) {
                    let eb = enemyBullets.create(e.x, e.y, 'stalker_bullet');
                    eb.setData('sourceEnemy', e).setData('enemyDamage', 1);
                    const predicted = secondAIPredictTarget(target, 0.16);
                    this.physics.moveTo(eb, predicted.x, predicted.y, 420);
                    e.nextShootTime = this.time.now + 1800;
                }
            } 
            else if (key === 'ghost') {
                let dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                if (dist < 150) {
                    e.setAlpha(0.2);
                } else {
                    e.setAlpha(0.8);
                }
                this.physics.moveToObject(e, target, 155 * soundSpeedMultiplier);
            }
            else if (key === 'espioner') {
                // Espioner: investiga o alvo, aproximando-se e fazendo pequenas
                // correções laterais para parecer que está procurando uma abertura.
                const angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y);
                const dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                const scanOffset = Math.sin(time * 0.006 + e.getData('scanSeed')) * 0.65;
                const investigateAngle = angle + scanOffset;
                let speed = dist > 260 ? 185 : 145;
                if (dist < 95) speed = 230;
                this.physics.velocityFromRotation(investigateAngle, speed * soundSpeedMultiplier, e.body.velocity);
                e.setAlpha(0.82 + Math.sin(time * 0.01 + e.getData('scanSeed')) * 0.12);
            }
            else if (key === 'sword_keeper') {
                // Mantém distância curta, mas tenta não ficar exatamente em cima do jogador.
                const dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                if (dist > 210) this.physics.moveToObject(e, target, 105 * soundSpeedMultiplier);
                else if (dist < 135) this.physics.moveToObject(e, target, -90 * soundSpeedMultiplier);
                else e.setVelocity(0);
            }
            else if (key === 'charger') {
                // Faz pequenas pausas e depois investe diretamente no alvo.
                if (!e.chargeUntil) e.chargeUntil = 0;
                if (!e.nextChargeTime) e.nextChargeTime = this.time.now + 900;
                if (this.time.now >= e.nextChargeTime && this.time.now >= e.chargeUntil) {
                    e.chargeUntil = this.time.now + 520;
                    e.nextChargeTime = this.time.now + 1900;
                    e.setData('chargeSpeed', 390 + Math.min(120, level * 4));
                }
                const chargeSpeed = this.time.now < e.chargeUntil ? e.getData('chargeSpeed') : 115;
                this.physics.moveToObject(e, target, chargeSpeed * soundSpeedMultiplier);
            }
            else if (key === 'bomber') {
                const dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                const desired = 300;
                if (dist < desired - 35) this.physics.moveToObject(e, target, -115 * soundSpeedMultiplier);
                else if (dist > desired + 35) this.physics.moveToObject(e, target, 105 * soundSpeedMultiplier);
                else e.setVelocity(0);
                if (!e.nextShootTime) e.nextShootTime = 0;
                if (this.time.now > e.nextShootTime && enemyBullets.countActive(true) < ENGINE_LIMITS.maxEnemyBullets) {
                    const bb = enemyBullets.create(e.x, e.y, 'bomber_bullet');
                    bb.setData('sourceEnemy', e).setData('enemyDamage', 3);
                    const predicted = secondAIPredictTarget(target, 0.28);
                    this.physics.moveTo(bb, predicted.x, predicted.y, 360);
                    bb.setData('bomber', true);
                    e.nextShootTime = this.time.now + 2400;
                }
            }
            else if (key === 'orbiter') {
                const angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y);
                const dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                const tangent = angle + Math.PI / 2;
                const radial = Phaser.Math.Clamp((dist - 260) * 0.9, -100, 100);
                const vx = Math.cos(tangent) * 150 + Math.cos(angle) * radial;
                const vy = Math.sin(tangent) * 150 + Math.sin(angle) * radial;
                e.setVelocity(vx * soundSpeedMultiplier, vy * soundSpeedMultiplier);
            }
            else if (key === 'medic') {
                // Mantém-se atrás e cura aliados próximos em pequenos pulsos.
                const dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                if (dist < 300) this.physics.moveToObject(e, target, -95 * soundSpeedMultiplier);
                else if (dist > 430) this.physics.moveToObject(e, target, 80 * soundSpeedMultiplier);
                else e.setVelocity(0);
                if (!e.nextHealTime) e.nextHealTime = 0;
                if (this.time.now > e.nextHealTime) {
                    enemies.getChildren().forEach(ally => {
                        if (ally !== e && ally.active && Phaser.Math.Distance.Between(e.x, e.y, ally.x, ally.y) < 150) {
                            const maxH = ally.getData('maxHealth') || ally.health || 1;
                            ally.health = Math.min(maxH, ally.health + 1);
                            ally.setTint(0x66ff99);
                            this.time.delayedCall(120, () => { if (ally.active) ally.clearTint(); });
                        }
                    });
                    e.nextHealTime = this.time.now + 1800;
                }
            }
            else if (key === 'leaper') {
                if (!e.nextLeap) e.nextLeap = this.time.now + 900;
                if (this.time.now >= e.nextLeap) {
                    const angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y);
                    this.physics.velocityFromRotation(angle, 420 * soundSpeedMultiplier, e.body.velocity);
                    e.nextLeap = this.time.now + 2200;
                    e.setData('leapingUntil', this.time.now + 380);
                } else if (this.time.now > (e.getData('leapingUntil') || 0)) {
                    this.physics.moveToObject(e, target, 95 * soundSpeedMultiplier);
                }
            }
            else if (key === 'shield') {
                const dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                if (dist > 240) this.physics.moveToObject(e, target, 105 * soundSpeedMultiplier);
                else if (dist < 170) this.physics.moveToObject(e, target, -70 * soundSpeedMultiplier);
                else e.setVelocity(0);
                e.setData('shielded', Math.sin(time * 0.004) > -0.35);
            }
            else if (key === 'mine_layer') {
                const dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                if (dist < 280) this.physics.moveToObject(e, target, -70 * soundSpeedMultiplier);
                else if (dist > 430) this.physics.moveToObject(e, target, 80 * soundSpeedMultiplier);
                else e.setVelocity(0);
                if (!e.nextMine) e.nextMine = this.time.now + 1800;
                if (this.time.now >= e.nextMine && typeof traps !== 'undefined') {
                    const mine = traps.create(e.x, e.y, 'trap');
                    mine.setScale(0.7).setTint(0xff6633);
                    mine.setData('enemyMine', true);
                    e.nextMine = this.time.now + 4200;
                }
            }
            else if (key === 'phaser') {
                if (!e.nextPhase) e.nextPhase = this.time.now + 1800;
                if (this.time.now >= e.nextPhase) {
                    const angle = Phaser.Math.Angle.Between(target.x, target.y, e.x, e.y);
                    const d = Phaser.Math.Between(110, 190);
                    e.x = Phaser.Math.Clamp(target.x + Math.cos(angle) * d, 35, config.width - 35);
                    e.y = Phaser.Math.Clamp(target.y + Math.sin(angle) * d, 65, config.height - 35);
                    e.setAlpha(0.25);
                    e.nextPhase = this.time.now + 3200;
                    this.time.delayedCall(260, () => { if (e.active) e.setAlpha(1); });
                }
                this.physics.moveToObject(e, target, 125 * soundSpeedMultiplier);
            }
            else if (key === 'swarmer') {
                const angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y) + Math.sin(time * 0.015 + e.x) * 0.35;
                this.physics.velocityFromRotation(angle, 250 * soundSpeedMultiplier, e.body.velocity);
            }
            else if (key === 'turret_guard') {
                const dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                if (dist < 330) this.physics.moveToObject(e, target, -65 * soundSpeedMultiplier);
                else if (dist > 500) this.physics.moveToObject(e, target, 65 * soundSpeedMultiplier);
                else e.setVelocity(0);
                if (!e.nextShootTime) e.nextShootTime = 0;
                if (this.time.now > e.nextShootTime) {
                    const b = enemyBullets.create(e.x, e.y, 'turret_bullet');
                    b.setData('sourceEnemy', e).setData('enemyDamage', 2);
                    const predicted = secondAIPredictTarget(target, 0.25);
                    this.physics.moveTo(b, predicted.x, predicted.y, 560);
                    e.nextShootTime = this.time.now + 1450;
                }
            }
            else if (key === 'vortex') {
                const angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y) + (e.getData('aiFlank') || 1) * Math.PI / 2;
                const dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                const radial = dist > 300 ? 70 : (dist < 190 ? -70 : 0);
                this.physics.velocityFromRotation(angle, (155 + radial) * soundSpeedMultiplier, e.body.velocity);
            }
            else if (key === 'mirror') {
                const angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y);
                this.physics.velocityFromRotation(angle + Math.PI, 120 * soundSpeedMultiplier, e.body.velocity);
                if (!e.nextMirror) e.nextMirror = this.time.now + 2600;
                if (this.time.now >= e.nextMirror) {
                    e.x = Phaser.Math.Clamp(config.width - e.x, 30, config.width - 30);
                    e.y = Phaser.Math.Clamp(config.height - e.y, 60, config.height - 30);
                    e.nextMirror = this.time.now + 3600;
                }
            }
            else if (key === 'berserker') {
                const hpRatio = Math.max(0, (Number(e.health) || 1) / Math.max(1, Number(e.getData('maxHealth')) || 1));
                const speed = 120 + (1 - hpRatio) * 280;
                this.physics.moveToObject(e, target, speed * soundSpeedMultiplier);
                e.setTint(hpRatio < 0.5 ? 0xff2200 : 0xffffff);
            }
            else if (key === 'frost') {
                const dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                if (dist > 360) this.physics.moveToObject(e, target, 100 * soundSpeedMultiplier);
                else if (dist < 260) this.physics.moveToObject(e, target, -85 * soundSpeedMultiplier);
                else e.setVelocity(0);
                if (!e.nextShootTime) e.nextShootTime = 0;
                if (this.time.now > e.nextShootTime) {
                    const b = enemyBullets.create(e.x, e.y, 'stalker_bullet');
                    b.setData('sourceEnemy', e).setData('enemyDamage', 1).setData('frostShot', true);
                    const predicted = secondAIPredictTarget(target, 0.2);
                    this.physics.moveTo(b, predicted.x, predicted.y, 500);
                    e.nextShootTime = this.time.now + 1900;
                }
            }
            else {
                this.physics.moveToObject(e, target, (145 + (level * 2)) * soundSpeedMultiplier); 
            }

            // SECOND AI: separação entre aliados + evasão de tiros + flanqueamento.
            secondAIApplyAvoidance(this, e, target, time, soundSpeedMultiplier);
        });
    }
}


    if (isPracticeMode && ui.practice && time > practiceHudTimer) {
        practiceHudTimer = time + 100;
        const target = practiceSettings.target ? ` / ${practiceSettings.target}m` : '';
        ui.practice.setText(`🧪 ${practiceStats.distance.toFixed(1)}m${target} | 💥 ${practiceStats.collisions} | 🎯 ${practiceStats.shots} | 🏃 ${practiceStats.dashes} | ⏱️ ${practiceStats.trainingTime}s`);
        if (practiceSettings.target && practiceStats.distance >= practiceSettings.target) { showNotification(this, `🏁 DESAFIO DE ${practiceSettings.target}m CONCLUÍDO!`, 'achievement'); practiceSettings.target=0; }
    }

function triggerChaosTornadoEvent(scene) {
    showNotification(scene, '⚠️ ALERTA DE CAOS: Tornado na arena!', 'danger');

    if (scene.cameras && scene.cameras.main) {
        scene.cameras.main.shake(400, 0.03);
    }

    let tornado = chaosTornados.create(Math.random() * config.width, Math.random() * config.height, 'chaos_tornado');
    tornado.setCollideWorldBounds(true);
    tornado.setBounce(1);

    scene.time.delayedCall(12000, () => {
        if (tornado && tornado.active) {
            tornado.destroy();
        }
    });
}

function placeTacticalTrap(scene) {
    if (isGameOver || isPaused || isShopOpen) return;
    let trap = traps.create(player1.x, player1.y, 'trap').setImmovable(true);
    trap.setTint(0x00ffff);
    SoundFX.gem();
    showNotification(scene, 'Armadilha tática posicionada!', 'info');
}

function triggerTacticalTrap(trap, enemy) {
    SoundFX.explosion();
    
    let currentScene = trap.scene;
    if (currentScene && currentScene.cameras && currentScene.cameras.main) {
        currentScene.cameras.main.shake(200, 0.02);
    }

    let totalDmg = ((3 + (rebirthLevel * 2)) * currentWeapon.damage);
    enemy.health -= totalDmg;

    if (enemy.health <= 0) {
        hitEnemy.call({ scene: currentScene }, null, enemy);
    } else {
        let originalVel = enemy.body.velocity.clone();
        enemy.setVelocity(0);
        currentScene.time.delayedCall(1500, () => {
            if (enemy && enemy.active) {
                enemy.setVelocity(originalVel.x, originalVel.y);
            }
        });
    }

    trap.destroy();
}

function attachVerticalScroll(scene, items, baseY, minOffset, maxOffset, viewportTop, viewportBottom, scrollbarX) {
    if (!scene || !items || !items.length) return () => {};

    let offset = Phaser.Math.Clamp(minOffset || 0, 0, Math.max(0, maxOffset || 0));
    const max = Math.max(0, maxOffset || 0);
    const trackH = Math.max(1, viewportBottom - viewportTop);
    let dragging = false;
    let dragStartY = 0;
    let dragStartOffset = 0;

    const clampOffset = value => Phaser.Math.Clamp(value, 0, max);

    const apply = () => {
        items.forEach(item => {
            if (!item || !item.active) return;
            const y = item.__naBaseY - offset;
            item.setY(y);
            // Só fica clicável quando está dentro da área visível da loja.
            const visible = y >= viewportTop && y <= viewportBottom;
            item.setVisible(visible);
            item.setInteractive(visible);
        });

        if (scene.__naScrollThumb && scene.__naScrollTrack) {
            const thumbH = max > 0
                ? Math.max(42, trackH * (trackH / (trackH + max)))
                : trackH;
            const thumbTravel = Math.max(0, trackH - thumbH);
            const thumbY = viewportTop + thumbH / 2 + (max ? (offset / max) * thumbTravel : 0);
            scene.__naScrollThumb.setSize(8, thumbH);
            scene.__naScrollThumb.setPosition(scrollbarX, thumbY);
            scene.__naScrollThumb.setVisible(max > 0);
            scene.__naScrollTrack.setVisible(max > 0);
        }
    };

    const scrollBy = amount => {
        if (max <= 0) return;
        const next = clampOffset(offset + amount);
        if (next === offset) return;
        offset = next;
        apply();
    };

    // Phaser entrega: pointer, gameObjects, deltaX, deltaY, deltaZ.
    // Aceitamos a roda em toda a área do painel, não apenas sobre os itens.
    const onWheel = (pointer, currentlyOver, deltaX, deltaY) => {
        if (!scene || !scene.sys.isActive() || !isShopOpen || max <= 0) return;
        const py = pointer && Number.isFinite(pointer.y) ? pointer.y : 0;
        const px = pointer && Number.isFinite(pointer.x) ? pointer.x : 0;
        const panelLeft = scrollbarX - 380;
        const panelRight = scrollbarX + 20;
        if (py < viewportTop - 10 || py > viewportBottom + 10 || px < panelLeft || px > panelRight) return;
        scrollBy(deltaY * 0.85);
    };

    // Roda do mouse.
    scene.input.on('wheel', onWheel);

    // Também permite ↑/↓ e PageUp/PageDown, útil quando o navegador não entrega a roda ao canvas.
    const onKeyDown = event => {
        if (!scene || !scene.sys.isActive() || !isShopOpen || max <= 0) return;
        const key = event && event.key;
        if (key === 'ArrowDown') scrollBy(45);
        else if (key === 'ArrowUp') scrollBy(-45);
        else if (key === 'PageDown') scrollBy(trackH * 0.8);
        else if (key === 'PageUp') scrollBy(-trackH * 0.8);
        else if (key === 'Home') scrollBy(-max);
        else if (key === 'End') scrollBy(max);
    };
    scene.input.keyboard.on('keydown', onKeyDown);

    // Drag real da barra de rolagem.
    const thumb = scene.__naScrollThumb;
    if (thumb && max > 0) {
        thumb.setInteractive({ useHandCursor: true, draggable: true });
        thumb.on('dragstart', pointer => {
            dragging = true;
            dragStartY = pointer.y;
            dragStartOffset = offset;
        });
        thumb.on('drag', (pointer, dragX, dragY) => {
            if (!dragging) return;
            const thumbH = Math.max(42, trackH * (trackH / (trackH + max)));
            const thumbTravel = Math.max(1, trackH - thumbH);
            offset = clampOffset(dragStartOffset + ((pointer.y - dragStartY) / thumbTravel) * max);
            apply();
        });
        thumb.on('dragend', () => { dragging = false; });
    }

    // Clique no trilho: pula uma página para cima/baixo.
    const track = scene.__naScrollTrack;
    if (track && max > 0) {
        track.setInteractive({ useHandCursor: true });
        track.on('pointerdown', pointer => {
            if (thumb && thumb.getBounds().contains(pointer.x, pointer.y)) return;
            scrollBy(pointer.y < thumb.y ? -trackH * 0.75 : trackH * 0.75);
        });
    }

    apply();

    return () => {
        try { scene.input.off('wheel', onWheel); } catch (e) {}
        try { scene.input.keyboard.off('keydown', onKeyDown); } catch (e) {}
        if (thumb) {
            try { thumb.off('dragstart'); thumb.off('drag'); thumb.off('dragend'); } catch (e) {}
        }
        if (track) {
            try { track.off('pointerdown'); } catch (e) {}
        }
        dragging = false;
    };
}
function toggleShop(scene) {
    if (isGameOver || isPaused || gameMode === 'hardcore') return;

    if (isShopOpen) {
        if (scene.shopElementsRef) {
            scene.shopElementsRef.forEach(el => el.destroy());
            scene.shopElementsRef = null;
        }
        isShopOpen = false;
        scene.physics.resume();
        return;
    }

    isShopOpen = true;
    scene.physics.pause();
    renderShopUI(scene);
}

function renderShopUI(scene) {
    if (scene.shopElementsRef) scene.shopElementsRef.forEach(el => { if (el && el.active) el.destroy(); });
    if (scene.__naShopDetachScroll) { scene.__naShopDetachScroll(); scene.__naShopDetachScroll = null; }

    const panelW = Math.min(760, Math.max(520, config.width - 40));
    const panelH = Math.min(720, Math.max(500, config.height - 30));
    const top = config.height / 2 - panelH / 2;
    const bottom = config.height / 2 + panelH / 2;
    const viewportTop = top + 78;
    const viewportBottom = bottom - 72;
    const cx = config.width / 2;

    let shopBg = scene.add.rectangle(cx, config.height/2, panelW, panelH, 0x000000, 0.96).setDepth(150);
    let shopTitle = scene.add.text(cx, top + 32, '🛒 LOJA DE UPGRADES E ARMAS', { fontSize: '26px', color: '#00ffcc', fontStyle: 'bold' }).setOrigin(0.5).setDepth(151);
    let shopHint = scene.add.text(cx, top + 61, '🖱️ Use a roda do mouse para navegar', { fontSize: '12px', color: '#778899' }).setOrigin(0.5).setDepth(151);
    let shopElements = [shopBg, shopTitle, shopHint];

    let items = [
        { name: '❤️ +1 Vida Extra (500 pts)', cost: 500, action: () => { hp1++; if(gameMode==='coop') hp2++; updateUI(); showNotification(scene, 'Vida extra adquirida!', 'success'); } },
        { name: '🔄 Tiro Duplo Temporário (300 pts)', cost: 300, action: () => { doubleShotActive = true; SoundFX.powerup(); doubleShotTime = scene.time.now + 15000; updateUI(); showNotification(scene, 'Tiro Duplo ativado!', 'success'); } },
        { name: '🛡️ Escudo Protetor (250 pts)', cost: 250, action: () => { shieldActive = true; SoundFX.powerup(); shieldSprite.setVisible(true); player1.setTint(0x00ffff); updateUI(); showNotification(scene, 'Escudo protetor ativado!', 'success'); } },
        { name: '🔴 Super Laser de Plasma (400 pts)', cost: 400, action: () => { laserActive = true; SoundFX.powerup(); laserTime = scene.time.now + 3000; laserBeam.setVisible(true); updateUI(); showNotification(scene, 'Super Laser disparado!', 'success'); } },
        { name: '💣 Bomba Limpa-Tela (600 pts)', cost: 600, action: () => { if (scene.cameras && scene.cameras.main) scene.cameras.main.shake(300, 0.02); enemies.getChildren().forEach(e => hitEnemy.call({ scene: scene }, null, e)); updateUI(); showNotification(scene, 'Bomba detonada!', 'danger'); } }
    ];

    if (score >= 20000) {
        items.unshift({ name: `✨ REBIRTH / PRESTÍGIO Nível ${rebirthLevel + 1} (Custo: 20.000 pts)`, cost: 20000, action: () => {
            rebirthLevel++; localStorage.setItem('neon_rebirth_level', rebirthLevel); score = 0; currentWeapon = weapons.basic;
            Object.keys(weapons).forEach(k => { weapons[k].unlocked = (k === 'basic') || localStorage.getItem('neon_weapon_' + k) === 'true'; });
            updateUI(); showNotification(scene, `Rebirth nível ${rebirthLevel} alcançado!`, 'achievement');
        }});
    }

    for (let key in weapons) {
        let w = weapons[key];
        if (!w.unlocked) {
            items.push({ name: `🔫 ${w.name} (Dano: ${w.damage}x) - ${w.cost} pts`, cost: w.cost,
                action: () => { w.unlocked = true; try { localStorage.setItem('neon_weapon_' + key, 'true'); } catch (e) {} currentWeapon = w; updateUI(); showNotification(scene, `Arma ${w.name} desbloqueada!`, 'success'); }
            });
        } else if (currentWeapon !== w) {
            items.push({ name: `✅ Equipar: ${w.name} (GRÁTIS)`, cost: 0,
                action: () => { currentWeapon = w; updateUI(); showNotification(scene, `Arma ${w.name} equipada!`, 'info'); }
            });
        } else {
            items.push({ name: `⭐ ${w.name} [EQUIPADO]`, cost: 0, action: () => {} });
        }
    }

    const rowH = 40;
    const baseStart = viewportTop + 18;
    const maxOffset = Math.max(0, items.length * rowH - (viewportBottom - baseStart - 8));
    const itemButtons = [];

    // Área visual de clipping: fora da janela, os itens simplesmente ficam invisíveis.
    const clipTop = scene.add.rectangle(cx, viewportTop, panelW - 28, 4, 0x000000, 0.01).setDepth(150);
    const clipBottom = scene.add.rectangle(cx, viewportBottom, panelW - 28, 4, 0x000000, 0.01).setDepth(150);
    shopElements.push(clipTop, clipBottom);

    items.forEach((item, index) => {
        const baseY = baseStart + index * rowH;
        const isEquipped = item.name.includes('[EQUIPADO]');
        const isRebirthBtn = item.name.includes('REBIRTH');
        const btnColor = isEquipped ? '#00aa00' : (isRebirthBtn ? '#aa00aa' : '#222');
        const btnItem = scene.add.text(cx, baseY, item.name, { fontSize: '16px', backgroundColor: btnColor, color: '#fff', align: 'center', wordWrap: { width: panelW - 100 } })
            .setPadding(8).setOrigin(0.5).setInteractive().setDepth(151);
        btnItem.__naBaseY = baseY;
        btnItem.on('pointerdown', () => {
            if (isEquipped) return;
            if (score >= item.cost) {
                score -= item.cost;
                item.action();
                renderShopUI(scene);
            } else {
                btnItem.setStyle({ color: '#ff0000' });
                showNotification(scene, 'Pontos insuficientes!', 'warning');
                scene.time.delayedCall(400, () => { if (btnItem.active) btnItem.setStyle({ color: '#fff' }); });
            }
        });
        itemButtons.push(btnItem);
        shopElements.push(btnItem);
    });

    const scrollbarX = cx + panelW / 2 - 18;
    const track = scene.add.rectangle(scrollbarX, (viewportTop + viewportBottom)/2, 8, viewportBottom-viewportTop, 0x222222, 0.9).setDepth(152);
    const thumb = scene.add.rectangle(scrollbarX, viewportTop + 20, 8, 42, 0x00ffcc, 1).setDepth(153);
    scene.__naScrollTrack = track;
    scene.__naScrollThumb = thumb;
    shopElements.push(track, thumb);

    const closeShopBtn = scene.add.text(cx, bottom - 32, 'FECHAR LOJA', { fontSize: '18px', backgroundColor: '#f00', color: '#fff' }).setPadding(10).setOrigin(0.5).setInteractive().setDepth(151);
    closeShopBtn.on('pointerdown', () => {
        if (scene.__naShopDetachScroll) { scene.__naShopDetachScroll(); scene.__naShopDetachScroll = null; }
        shopElements.forEach(el => { if (el && el.active) el.destroy(); });
        scene.shopElementsRef = null;
        scene.__naScrollThumb = null;
        scene.__naScrollTrack = null;
        isShopOpen = false;
        scene.physics.resume();
    });
    shopElements.push(closeShopBtn);
    scene.shopElementsRef = shopElements;
    scene.__naShopDetachScroll = attachVerticalScroll(scene, itemButtons, baseStart, 0, maxOffset, viewportTop, viewportBottom, scrollbarX);
}

function togglePauseMenu(scene) {
    if (isGameOver || isShopOpen) return;
    isPaused = !isPaused;

    if (isPaused) {
        scene.physics.pause();

        let pauseBg = scene.add.rectangle(config.width/2, config.height/2, 500, 350, 0x000000, 0.9).setDepth(200);
        let pauseTitle = scene.add.text(config.width/2, config.height/2 - 120, '⏸️ JOGO PAUSADO', { fontSize: '30px', color: '#ffaa00', fontStyle: 'bold' }).setOrigin(0.5).setDepth(201);
        let pauseElements = [pauseBg, pauseTitle];

        let btnResume = scene.add.text(config.width/2, config.height/2 - 40, '▶️ RETOMAR JOGO', { fontSize: '20px', backgroundColor: '#00aa00', color: '#fff' }).setPadding(12).setOrigin(0.5).setInteractive().setDepth(201);
        
        btnResume.on('pointerdown', () => {
            pauseElements.forEach(el => el.destroy());
            isPaused = false;
            scene.physics.resume();
        });

        let btnRestart = scene.add.text(config.width/2, config.height/2 + 30, '🔄 REINICIAR PARTIDA', { fontSize: '20px', backgroundColor: '#333', color: '#fff' }).setPadding(12).setOrigin(0.5).setInteractive().setDepth(201);
        
        btnRestart.on('pointerdown', () => {
            isPaused = false;
            scene.scene.restart();
        });

        let btnMenu = scene.add.text(config.width/2, config.height/2 + 100, '🏠 SAIR PARA O MENU', { fontSize: '20px', backgroundColor: '#aa0000', color: '#fff' }).setPadding(12).setOrigin(0.5).setInteractive().setDepth(201);
        
        btnMenu.on('pointerdown', () => {
            isPaused = false;
            location.reload();
        });

        pauseElements.push(btnResume, btnRestart, btnMenu);
        scene.pauseElementsRef = pauseElements;
    } else {
        if (scene.pauseElementsRef) {
            scene.pauseElementsRef.forEach(el => el.destroy());
        }
        scene.physics.resume();
    }
}

function placeTurret(scene) {
    if (zipaSouls >= 3) {
        zipaSouls -= 3;
        turrets.create(player1.x, player1.y, 'turret').setImmovable(true);
        checkAchievement(scene, 'builderPro');
        updateUI();
        showNotification(scene, 'Torre de defesa construída!', 'success');
    } else {
        showNotification(scene, 'Almas Zipa insuficientes (Necessário: 3)', 'warning');
    }
}

function updateTurrets(scene) {
    if (!isPlaying || isGameOver || isPaused || isShopOpen) return;
    turrets.getChildren().forEach(turret => {
        let closestEnemy = null;
        let minDist = 350;

        enemies.getChildren().forEach(e => {
            let dist = Phaser.Math.Distance.Between(turret.x, turret.y, e.x, e.y);
            if (dist < minDist) {
                minDist = dist;
                closestEnemy = e;
            }
        });

        if (closestEnemy) {
            let tb = turretBullets.create(turret.x, turret.y, 'turret_bullet');
            scene.physics.moveTo(tb, closestEnemy.x, closestEnemy.y, 600);
        }
    });
}

function hitEnemyByTurret(b, e) {
    b.destroy();
    hitEnemy.call({ scene: b.scene }, null, e);
}

function checkAchievement(scene, achKey) {
    let ach = achievements[achKey];
    if (!ach || ach.unlocked) return;

    if (achKey === 'richPlayer') {
        ach.current = score;
    } else {
        ach.current++;
    }

    if (achKey === 'masterSlayer') localStorage.setItem('neon_ach_master_curr', ach.current);
    if (achKey === 'levelTen') ach.current = level;
    if (achKey === 'colossusSlayer') localStorage.setItem('neon_ach_colossus_curr', ach.current);
    if (achKey === 'builderPro') localStorage.setItem('neon_ach_builder_curr', ach.current);
    if (achKey === 'dashMaster') localStorage.setItem('neon_ach_dash_curr', ach.current);
    if (achKey === 'marathoner') localStorage.setItem('neon_ach_marathoner_curr', ach.current);
    if (achKey === 'furyStriker') localStorage.setItem('neon_ach_fury_curr', ach.current);
    if (achKey === 'hardcoreSurvivor') ach.current = 20;
    if (achKey === 'timeAttackAce') ach.current = 1;
    if (achKey === 'bossRushChampion') ach.current = 1;
    if (achKey === 'bossSlayer') ach.current = Object.keys(bossDefeatedSet).filter(k => bossDefeatedSet[k]).length;
    if (achKey === 'bossSlayer') localStorage.setItem('neon_ach_bossSlayer_curr', ach.current);

    if (ach.current >= ach.target) {
        ach.unlocked = true;
        localStorage.setItem(`neon_ach_${achKey}`, 'true');
        score += ach.reward;

        SoundFX.achievement();
        showNotification(scene, `🏆 CONQUISTA!\n${ach.title} (+${ach.reward} PTS)`, 'achievement');
        updateUI();
    }
}

function showDeadScreen(scene) { 
    neonRecordRunEnd();
    SoundFX.gameOver();
    scene.physics.pause(); 
    isGameOver = true;
    let uiElements = []; 
    let overlay = scene.add.rectangle(config.width/2, config.height/2, config.width, config.height, 0x000000, 0.8).setDepth(10); 
    let deadText = (gameMode === 'hardcore') ? '💀 FIM DE JOGO (HARDCORE) 💀' : (gameMode === 'coop' ? 'TIME DERROTADO!' : 'MORREU!');
    let txt = scene.add.text(config.width/2, config.height/2 - 140, deadText, { fontSize: '35px', fill: '#f00', fontStyle: 'bold' }).setOrigin(0.5).setDepth(11); 
    uiElements.push(overlay, txt); 

    if (gameMode !== 'hardcore') {
        let btnRevive = scene.add.text(config.width/2, config.height/2 - 60, '❤️ REVIVER (1500 PTS)', { fontSize: '24px', backgroundColor: '#00aa00', color: '#fff' }).setPadding(15).setOrigin(0.5).setInteractive().setDepth(11);
        btnRevive.on('pointerdown', () => {
            if (score >= 1500) {
                score -= 1500; 
                hp1 = 3;      
                if (gameMode === 'coop') hp2 = 3; 

                isGameOver = false;
                scene.physics.resume(); 
                uiElements.forEach(el => el.destroy()); 
                updateUI();
                showNotification(scene, 'Jogador revivido com sucesso!', 'success');
            } else {
                showNotification(scene, 'Pontos insuficientes para reviver!', 'warning');
                btnRevive.setText('⚠️ PONTOS INSUFICIENTES! (1500 PTS)');
                scene.time.delayedCall(1000, () => {
                    btnRevive.setText('❤️ REVIVER (1500 PTS)');
                });
            }
        });
        uiElements.push(btnRevive);
    } else {
        let hcMsg = scene.add.text(config.width/2, config.height/2 - 60, 'Sem reviver. Você caiu no Hardcore!', { fontSize: '18px', fill: '#ff8888' }).setOrigin(0.5).setDepth(11);
        uiElements.push(hcMsg);
    }

    let replayLabel = scene.add.text(config.width/2, config.height/2 + 10, 'Assistir Replay:', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5).setDepth(11);
    uiElements.push(replayLabel);

    [1, 2, 5].forEach((s, idx) => { 
        let btn = scene.add.text(config.width/2 - 110 + (idx * 110), config.height/2 + 70, s+'x', { fontSize: '25px', backgroundColor: '#333', color: '#fff' }).setPadding(10).setInteractive().setDepth(11); 
        btn.on('pointerdown', () => { 
            uiElements.forEach(el => el.setVisible(false)); 
            isReplaying = true; 
            let i = 0; 
            scene.time.addEvent({ delay: 16 / s, repeat: replayData.length - 1, callback: () => { 
                let d = replayData[i]; 
                player1.setPosition(d.p1.x, d.p1.y); 
                if(gameMode === 'coop' && d.p2) player2.setPosition(d.p2.x, d.p2.y);
                enemies.clear(true, true); 
                d.e.forEach(eData => enemies.create(eData.x, eData.y, eData.key)); 
                i++; 
                if (i >= replayData.length) location.reload(); 
            }}); 
        }); 
        uiElements.push(btn); 
    }); 
}

function invasionEnemyType(wave) {
    const pool = ['enemy', 'fast', 'elite', 'stalker', 'ghost', 'zipa', 'splitter', 'sword_keeper',
        'leaper','shield','mine_layer','phaser','swarmer','turret_guard','vortex','mirror','berserker','frost'];
    if (wave >= 2) pool.push('sniper', 'charger', 'sword_keeper');
    if (wave >= 3) pool.push('bomber', 'orbiter');
    if (wave >= 4) pool.push('medic', 'tank');
    if (wave >= 6) pool.push('miniboss');
    if (wave >= 8) pool.push('colossus');
    return pool[Math.floor(Math.random() * pool.length)];
}


function getBossTypeForWave(wave) {
    if (wave >= 10) return 'ai_overlord';
    const cycle = ['neon_king', 'volt_titan', 'void_walker'];
    return cycle[(Math.floor(wave / 5) - 1) % cycle.length];
}

function showBossUI(scene, boss) {
    if (!boss || !bossHpBar || !bossHpFill || !bossNameText) return;
    const data = BOSS_TYPES[boss.getData('bossType')];
    if (!data) return;
    bossHpBar.setVisible(true);
    bossHpFill.setVisible(true);
    bossNameText.setVisible(true).setText('BOSS: ' + data.name);
    updateBossUI();
}

function updateBossUI() {
    if (!activeBoss || !activeBoss.active || !bossHpBar || !bossHpFill) {
        if (bossHpBar) bossHpBar.setVisible(false);
        if (bossHpFill) bossHpFill.setVisible(false);
        if (bossNameText) bossNameText.setVisible(false);
        return;
    }
    const data = BOSS_TYPES[activeBoss.getData('bossType')];
    if (!data) return;
    const ratio = Phaser.Math.Clamp(activeBoss.health / activeBoss.getData('maxHealth'), 0, 1);
    bossHpFill.width = bossHpBar.width * ratio;
    bossHpFill.x = bossHpBar.x - (bossHpBar.width - bossHpFill.width) / 2;
    bossHpFill.setVisible(true);
    bossHpBar.setVisible(true);
    bossNameText.setVisible(true).setText('BOSS: ' + data.name + '  [' + Math.ceil(activeBoss.health) + '/' + activeBoss.getData('maxHealth') + ']');
}

function spawnBoss(scene, forcedType = null) {
    if (!scene || !enemies || !isPlaying || isGameOver || activeBoss && activeBoss.active) return null;
    const type = forcedType || Object.keys(BOSS_TYPES)[Math.floor(Math.random() * Object.keys(BOSS_TYPES).length)];
    const data = BOSS_TYPES[type];
    const x = Math.random() < 0.5 ? -120 : config.width + 120;
    const y = Phaser.Math.Between(100, Math.max(100, config.height - 100));
    const boss = enemies.create(x, y, 'boss_' + type);
    const scale = 1 + Math.min(0.75, Math.max(0, level - 5) * 0.035);
    const hp = Math.round(data.maxHp * scale + (rebirthLevel * 10));
    boss.health = hp;
    boss.setData('maxHealth', hp);
    boss.setData('bossType', type);
    boss.setData('isBoss', true);
    boss.setData('defeated', false);
    boss.setData('bossNextAttack', scene.time.now + 1200);
    boss.setData('bossNextTeleport', scene.time.now + 3500);
    boss.setData('bossNextSummon', scene.time.now + 4200);
    boss.setTint(data.color);
    boss.setScale(1.08);
    activeBoss = boss;
    showBossUI(scene, boss);
    if (scene.cameras && scene.cameras.main) scene.cameras.main.shake(450, 0.025);
    SoundFX.bossIncoming();
    showNotification(scene, 'BOSS INCOMING: ' + data.name, 'danger');
    return boss;
}

function bossShoot(scene, boss, target, count = 5, speed = 430) {
    if (!enemyBullets || enemyBullets.countActive(true) >= ENGINE_LIMITS.maxEnemyBullets) return;
    const base = Phaser.Math.Angle.Between(boss.x, boss.y, target.x, target.y);
    for (let i = 0; i < count; i++) {
        if (enemyBullets.countActive(true) >= ENGINE_LIMITS.maxEnemyBullets) break;
        const spread = count === 1 ? 0 : ((i - (count - 1) / 2) * 0.13);
        const b = enemyBullets.create(boss.x, boss.y, 'sniper_bullet');
        b.setData('sourceEnemy', boss).setData('enemyDamage', 5);
        b.setTint(BOSS_TYPES[boss.getData('bossType')].color);
        scene.physics.velocityFromRotation(base + spread, speed, b.body.velocity);
        addProjectileLifetime(scene, b, 3200);
    }
}

function bossShockwave(scene, boss, target) {
    const dist = Phaser.Math.Distance.Between(boss.x, boss.y, target.x, target.y);
    if (dist < 230 && !shieldActive && !dashActive) {
        takeDamage(scene, 1, boss);
    }
    const ring = scene.add.circle(boss.x, boss.y, 70, BOSS_TYPES[boss.getData('bossType')].color, 0.12).setStrokeStyle(4, BOSS_TYPES[boss.getData('bossType')].color).setDepth(0);
    scene.tweens.add({ targets: ring, radius: 230, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
}

function updateBoss(scene, boss, target, time) {
    if (!boss || !boss.active || !target || !target.active) return;
    const type = boss.getData('bossType');
    const data = BOSS_TYPES[type];
    if (!data) return;
    const dist = Phaser.Math.Distance.Between(boss.x, boss.y, target.x, target.y);
    const now = scene.time.now;

    if (type === 'void_walker' && now >= boss.getData('bossNextTeleport')) {
        const angle = Math.random() * Math.PI * 2;
        boss.setPosition(Phaser.Math.Clamp(target.x + Math.cos(angle) * 300, 70, config.width - 70), Phaser.Math.Clamp(target.y + Math.sin(angle) * 300, 90, config.height - 70));
        boss.setAlpha(0.25);
        scene.time.delayedCall(260, () => { if (boss.active) boss.setAlpha(1); });
        boss.setData('bossNextTeleport', now + 3600);
    }

    if (type === 'neon_king') {
        scene.physics.moveToObject(boss, target, data.speed + Math.sin(time * 0.004) * 18);
        if (now >= boss.getData('bossNextSummon')) {
            for (let i = 0; i < 3; i++) spawnEnemy(scene, ['enemy','fast','stalker'][Math.floor(Math.random()*3)]);
            boss.setData('bossNextSummon', now + 5000);
        }
    } else if (type === 'volt_titan') {
        if (dist < 280) scene.physics.moveToObject(boss, target, -data.speed);
        else if (dist > 390) scene.physics.moveToObject(boss, target, data.speed);
        else boss.setVelocity(0);
        if (now >= boss.getData('bossNextAttack')) {
            bossShockwave(scene, boss, target);
            boss.setData('bossNextAttack', now + 2600);
        }
    } else if (type === 'void_walker') {
        const angle = Phaser.Math.Angle.Between(boss.x, boss.y, target.x, target.y) + Math.sin(time * 0.006) * 0.9;
        scene.physics.velocityFromRotation(angle, data.speed, boss.body.velocity);
        if (now >= boss.getData('bossNextAttack')) {
            bossShoot(scene, boss, target, 3, 520);
            boss.setData('bossNextAttack', now + 1900);
        }
    } else if (type === 'ai_overlord') {
        const angle = Phaser.Math.Angle.Between(boss.x, boss.y, target.x, target.y) + Math.sin(time * 0.002) * 0.55;
        scene.physics.velocityFromRotation(angle, data.speed, boss.body.velocity);
        if (now >= boss.getData('bossNextAttack')) {
            bossShoot(scene, boss, target, 7, 570);
            bossShockwave(scene, boss, target);
            boss.setData('bossNextAttack', now + 2200);
        }
        if (now >= boss.getData('bossNextSummon')) {
            spawnEnemy(scene, 'medic');
            spawnEnemy(scene, 'charger');
            spawnEnemy(scene, 'bomber');
            boss.setData('bossNextSummon', now + 6000);
        }
    }
    updateBossUI();
}


function finishTimeAttack(scene) {
    neonRecordRunEnd();
    if (!isPlaying || isGameOver || gameMode !== 'timeattack') return;
    if (timeAttackTimerEvent) { timeAttackTimerEvent.remove(); timeAttackTimerEvent = null; }
    timeAttackTimeLeft = 0;
    isGameOver = true;
    isPlaying = false;
    scene.physics.pause();
    score += killCount * 15;
    showNotification(scene, 'TIME ATTACK concluído! Bônus por abates aplicado.', 'achievement');
    showDeadScreen(scene);
}

function startTimeAttackMode(scene) {
    timeAttackTimeLeft = 90;
    showNotification(scene, 'TIME ATTACK [NEW]: 90 segundos!', 'info');
    const spawnDelay = 650;
    scene.time.addEvent({ delay: spawnDelay, callback: () => {
        if (!isPlaying || isGameOver || isPaused || isShopOpen || gameMode !== 'timeattack') return;
        spawnEnemy(scene);
    }, loop: true });
    timeAttackTimerEvent = scene.time.addEvent({ delay: 1000, repeat: 89, callback: () => {
        if (!isPlaying || isGameOver || gameMode !== 'timeattack') return;
        timeAttackTimeLeft = Math.max(0, timeAttackTimeLeft - 1);
        updateUI();
        if (timeAttackTimeLeft <= 0) finishTimeAttack(scene);
    }});
}

function startBossRushMode(scene) {
    bossRushIndex = 0;
    bossRushActive = false;
    showNotification(scene, 'BOSS RUSH [NEW]: derrote os 4 chefes!', 'info');
    scene.time.delayedCall(900, () => beginBossRushBoss(scene, 0));
}

function beginBossRushBoss(scene, index) {
    if (!isPlaying || isGameOver || gameMode !== 'bossrush') return;
    const bossKeys = ['neon_king', 'volt_titan', 'void_walker', 'ai_overlord'];
    if (index >= bossKeys.length) return finishBossRush(scene);
    bossRushIndex = index;
    bossRushActive = true;
    updateUI();
    scene.time.delayedCall(300, () => {
        if (isPlaying && !isGameOver && gameMode === 'bossrush') spawnBoss(scene, bossKeys[index]);
    });
}

function finishBossRush(scene) {
    neonRecordRunEnd();
    if (!isPlaying || isGameOver || gameMode !== 'bossrush') return;
    bossRushActive = false;
    score += 5000;
    checkAchievement(scene, 'bossRushChampion');
    isGameOver = true;
    isPlaying = false;
    scene.physics.pause();
    showNotification(scene, 'BOSS RUSH concluído! +5000 PTS', 'achievement');
    showDeadScreen(scene);
}

function startInvasionMode(scene) {
    waveNumber = 1;
    waveTotal = 10;
    waveActive = false;
    waveTransition = false;
    if (waveSpawnTimer) waveSpawnTimer.remove();
    if (waveCheckTimer) waveCheckTimer.remove();
    showNotification(scene, 'MODO INVASÃO: prepare-se para 10 ondas!', 'info');
    scene.time.delayedCall(900, () => beginInvasionWave(scene, 1));
}

function beginInvasionWave(scene, wave) {
    if (!isPlaying || isGameOver || gameMode !== 'invasion') return;
    waveNumber = wave;
    waveActive = true;
    waveTransition = false;
    waveSpawningDone = false;
    const count = Math.min(42, 7 + wave * 4);
    let spawned = 0;
    if (waveSpawnTimer) waveSpawnTimer.remove();
    waveSpawnTimer = scene.time.addEvent({
        delay: Math.max(180, 650 - wave * 35),
        repeat: count - 1,
        callback: () => {
            if (!isPlaying || isGameOver || gameMode !== 'invasion') return;
            if (enemies.countActive(true) < ENGINE_LIMITS.maxEnemies) {
                spawnEnemy(scene, invasionEnemyType(wave));
            }
            spawned++;
        }
    });
    scene.time.delayedCall(Math.max(250, 650 - wave * 35) * count + 100, () => { waveSpawningDone = true; });
    showNotification(scene, `ONDA ${wave}/${waveTotal} — ${count} inimigos`, 'success');
    if (wave === 5 || wave === 10) {
        scene.time.delayedCall(Math.max(700, Math.floor(Math.max(180, 650 - wave * 35) * count) + 300), () => {
            if (isPlaying && !isGameOver && gameMode === 'invasion') spawnBoss(scene, getBossTypeForWave(wave));
        });
    }
    updateUI();
    if (waveCheckTimer) waveCheckTimer.remove();
    waveCheckTimer = scene.time.addEvent({
        delay: 350,
        loop: true,
        callback: () => {
            if (!isPlaying || isGameOver || gameMode !== 'invasion') return;
            if (!waveActive || waveTransition) return;
            if (waveSpawningDone && spawned >= count && enemies.countActive(true) === 0) {
                waveTransition = true;
                waveActive = false;
                if (waveCheckTimer) { waveCheckTimer.remove(); waveCheckTimer = null; }
                score += 250 * wave;
                if (wave >= waveTotal) {
                    checkAchievement(scene, 'invasionMaster');
                    showInvasionVictory(scene);
                } else {
                    showNotification(scene, `ONDA ${wave} concluída! +${250 * wave} pts`, 'achievement');
                    scene.time.delayedCall(2200, () => beginInvasionWave(scene, wave + 1));
                    updateUI();
                }
            }
        }
    });
}

function showInvasionVictory(scene) {
    neonRecordRunEnd();
    scene.physics.pause();
    isGameOver = true;
    isPlaying = false;
    const overlay = scene.add.rectangle(config.width/2, config.height/2, config.width, config.height, 0x000000, 0.82).setDepth(20);
    const title = scene.add.text(config.width/2, config.height/2 - 100, 'INVASÃO CONCLUÍDA!', { fontSize: '38px', color: '#00ffcc', fontStyle: 'bold' }).setOrigin(0.5).setDepth(21);
    const stats = scene.add.text(config.width/2, config.height/2 - 35, `10 ondas derrotadas\nSCORE: ${score}`, { fontSize: '22px', color: '#fff', align: 'center' }).setOrigin(0.5).setDepth(21);
    const btn = scene.add.text(config.width/2, config.height/2 + 70, 'JOGAR NOVAMENTE', { fontSize: '22px', backgroundColor: '#123', color: '#00ffcc' }).setPadding(14).setOrigin(0.5).setInteractive().setDepth(21);
    btn.on('pointerdown', () => scene.scene.restart());
}

function spawnEspionerSquad(scene) {
    if (!isPlaying || isGameOver || isPaused || isShopOpen || !enemies) return;
    if (scene.time.now - lastEspionerSquadSpawn < 26000) return;
    const slots = ENGINE_LIMITS.maxEnemies - enemies.countActive(true);
    if (slots < 5) return;

    lastEspionerSquadSpawn = scene.time.now;
    const side = Math.random() < 0.5 ? -90 : config.width + 90;
    const centerY = Phaser.Math.Between(90, Math.max(90, config.height - 90));

    for (let i = 0; i < 5; i++) {
        const e = enemies.create(
            side + Phaser.Math.Between(-18, 18),
            Phaser.Math.Clamp(centerY + Phaser.Math.Between(-150, 150), 45, config.height - 45),
            'espioner'
        );
        e.health = 4 + Math.min(4, Math.floor(level / 8));
        e.setData('maxHealth', e.health);
        e.setData('aiInit', false);
        e.setData('aiRole', 'espioner');
        e.setData('scanSeed', Math.random() * Math.PI * 2);
        e.setData('aiFlank', i % 2 === 0 ? -1 : 1);
        e.setData('spawnedAt', scene.time.now);
        e.setActive(true).setVisible(true);
    }

    showNotification(scene, '🕵️ ESPIONERS DETECTADOS! 5 estão investigando você!', 'danger');
}

function findLegendaryAllyTarget() {
    if (!enemies) return null;
    let target = null;
    let bestD2 = Infinity;
    enemies.getChildren().forEach(e => {
        if (!e || !e.active || e.getData('isAlly') || e.getData('defeated')) return;
        const dx = e.x - (legendaryAlly ? legendaryAlly.x : 0);
        const dy = e.y - (legendaryAlly ? legendaryAlly.y : 0);
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; target = e; }
    });
    return target;
}

function spawnLegendaryAlly(scene) {
    if (!scene || !enemies || legendaryAllySpawned || !legendaryAllyEligible || isGameOver || !isPlaying) return null;
    if (enemies.countActive(true) >= ENGINE_LIMITS.maxEnemies) return null;

    const side = Math.random() < 0.5 ? -90 : config.width + 90;
    const y = Phaser.Math.Between(80, Math.max(80, config.height - 80));
    const ally = enemies.create(side, y, 'legendary_ally');
    ally.health = 30 + Math.min(20, level * 2);
    ally.setData('maxHealth', ally.health);
    ally.setData('isAlly', true);
    ally.setData('aiRole', 'legendary_ally');
    ally.setData('defeated', false);
    ally.setData('nextShootTime', scene.time.now + 700);
    ally.setData('spawnedAt', scene.time.now);
    ally.setData('hitCooldown', 0);
    ally.setTint(0x66ff99);
    ally.setScale(1.05);
    ally.setActive(true).setVisible(true);
    legendaryAlly = ally;
    legendaryAllySpawned = true;
    legendaryAllyEligible = false;
    showNotification(scene, '🌟 ALIADO LENDÁRIO APARECEU! ELE ESTÁ DO SEU LADO!', 'achievement');
    return ally;
}

function updateLegendaryAlly(scene, ally, time, speedMultiplier) {
    if (!ally || !ally.active || !enemies) return;
    const target = findLegendaryAllyTarget();
    if (!target) {
        ally.setVelocity(0);
        return;
    }

    const dist = Phaser.Math.Distance.Between(ally.x, ally.y, target.x, target.y);
    if (dist > 190) scene.physics.moveToObject(ally, target, 155 * speedMultiplier);
    else if (dist < 110) scene.physics.moveToObject(ally, target, -75 * speedMultiplier);
    else ally.setVelocity(0);

    const nextShoot = Number(ally.getData('nextShootTime')) || 0;
    if (time >= nextShoot && enemyBullets && enemyBullets.countActive(true) < ENGINE_LIMITS.maxEnemyBullets) {
        const bullet = enemyBullets.create(ally.x, ally.y, 'legendary_ally_bullet');
        bullet.setTint(0x66ff99);
        bullet.setData('sourceEnemy', ally);
        bullet.setData('enemyDamage', 3);
        bullet.setData('isAllyBullet', true);
        const predicted = secondAIPredictTarget(target, 0.16);
        scene.physics.moveTo(bullet, predicted.x, predicted.y, 610);
        addProjectileLifetime(scene, bullet, 1800);
        ally.setData('nextShootTime', time + 620);
    }
}

function legendaryAllyTakeDamage(scene, ally, damage = 1) {
    if (!ally || !ally.active || !ally.getData('isAlly')) return;
    const now = scene && scene.time ? scene.time.now : performance.now();
    const nextAllowed = Number(ally.getData('hitCooldown')) || 0;
    if (now < nextAllowed) return;
    ally.setData('hitCooldown', now + 280);
    ally.health = Math.max(0, (Number(ally.health) || 1) - Math.max(1, Number(damage) || 1));
    ally.setTint(0xffffff);
    if (scene) scene.time.delayedCall(100, () => { if (ally && ally.active) ally.setTint(0x66ff99); });
    if (ally.health <= 0) {
        ally.setData('defeated', true);
        legendaryAlly = null;
        SoundFX.explosion();
        showNotification(scene, 'F — O ALIADO LENDÁRIO CAIU.', 'danger');
        if (scene && scene.cameras && scene.cameras.main) scene.cameras.main.shake(180, 0.012);
        ally.destroy();
    }
}

function legendaryAllyEnemyContact(a, b) {
    if (!a || !b || !a.active || !b.active) return;
    let ally = a.getData && a.getData('isAlly') ? a : (b.getData && b.getData('isAlly') ? b : null);
    const enemy = ally === a ? b : a;
    if (!ally || !enemy || enemy.getData('isAlly')) return;
    legendaryAllyTakeDamage(ally.scene, ally, 1);
}

function spawnEnemy(scene, forcedType = null) {
    if (isPracticeMode && !practiceSettings.enemies) return;
    if (!isPlaying || isGameOver || isPaused || isShopOpen) return;
    if (enemies.countActive(true) >= ENGINE_LIMITS.maxEnemies) return;

    // O Espioner é um evento raro: quando surge, aparecem exatamente 5.
    // Ele não é usado no Neon Legacy; este spawn pertence ao Neon Arena 2 atual.
    if (!forcedType && Math.random() < 0.025 && scene.time.now - lastEspionerSquadSpawn >= 26000) {
        spawnEspionerSquad(scene);
        return;
    }

    const r = Math.random();
    const type = forcedType || (
        r > 0.997 ? 'colossus' :
        r > 0.994 ? 'sword_keeper' :
        r > 0.991 ? 'miniboss' :
        r > 0.988 ? 'berserker' :
        r > 0.985 ? 'shield' :
        r > 0.982 ? 'phaser' :
        r > 0.979 ? 'vortex' :
        r > 0.976 ? 'turret_guard' :
        r > 0.973 ? 'frost' :
        r > 0.970 ? 'mine_layer' :
        r > 0.967 ? 'mirror' :
        r > 0.964 ? 'leaper' :
        r > 0.958 ? 'swarmer' :
        r > 0.905 ? 'medic' :
        r > 0.865 ? 'bomber' :
        r > 0.825 ? 'orbiter' :
        r > 0.775 ? 'charger' :
        r > 0.72 ? 'sniper' :
        r > 0.65 ? 'splitter' :
        r > 0.57 ? 'zipa' :
        r > 0.48 ? 'stalker' :
        r > 0.36 ? 'ghost' :
        r > 0.20 ? 'elite' :
        r > 0.09 ? 'fast' : 'enemy'
    );

    // O inimigo básico ('enemy') volta a ser um spawn válido nos modos normais e de prática.
    // Ele também permanece disponível para qualquer modo que use spawnEnemy() sem forcedType.
    const baseHealth = {
        enemy: 1,
        sword_keeper: 4,
        colossus: 8, miniboss: 20, medic: 5, bomber: 4, orbiter: 3, charger: 3,
        zipa: 2, sniper: 2, ghost: 2, splitter: 2, stalker: 2, elite: 1, fast: 1, tank: 1,
        espioner: 4, leaper: 3, shield: 6, mine_layer: 3, phaser: 3, swarmer: 1,
        turret_guard: 4, vortex: 5, mirror: 4, berserker: 5, frost: 3
    }[type] || 1;

    const scaling = Math.min(12, Math.floor(level / 5));
    const spawnX = Math.random() < 0.5 ? -80 : config.width + 80;
    const spawnY = Phaser.Math.Between(40, Math.max(40, config.height - 40));

    const enemyObj = enemies.create(spawnX, spawnY, type);
    enemyObj.health = baseHealth + (type === 'colossus' || type === 'miniboss' ? scaling : Math.floor(scaling / 2));
    enemyObj.setData('maxHealth', enemyObj.health);
    enemyObj.setData('aiInit', false);
    enemyObj.setData('aiRole', type);
    enemyObj.setData('aiFlank', Math.random() < 0.5 ? -1 : 1);
    enemyObj.setActive(true).setVisible(true);
    enemyObj.setData('spawnedAt', scene.time.now);
}

function getSafeGameScene(context = null) {
    // Resolve a real Phaser.Scene regardless of whether the callback
    // context is the Scene, ScenePlugin, GameObject or something else.
    if (context && context.sys && context.sys.game && context.add && context.physics) return context;
    if (context && context.scene && context.scene.sys && context.scene.add && context.scene.physics) return context.scene;
    if (typeof game !== 'undefined' && game.scene && Array.isArray(game.scene.scenes)) {
        return game.scene.scenes.find(s => s && s.sys && s.sys.isActive && s.sys.isActive()) || game.scene.scenes[0] || null;
    }
    return null;
}

function hitEnemyByEnemyBullet(bullet, enemy) {
    if (!bullet || !bullet.active || !enemy || !enemy.active || enemy.getData('defeated')) return;
    const shooter = bullet.getData ? bullet.getData('sourceEnemy') : null;
    if (shooter && enemy === shooter) return;

    const damage = Math.max(1, Number(bullet.getData ? bullet.getData('enemyDamage') : 1) || 1);
    if (enemy.getData && enemy.getData('isAlly')) {
        if (bullet.getData && bullet.getData('isAllyBullet')) return;
        legendaryAllyTakeDamage(enemy.scene, enemy, damage);
        bullet.destroy();
        return;
    }
    const maxHp = Number(enemy.getData('maxHealth')) || Number(enemy.health) || 1;
    enemy.health = Math.max(0, (Number(enemy.health) || maxHp) - damage);
    enemy.setData('damageScale', 1);
    bullet.destroy();

    if (enemy.health <= 0) {
        enemy.setData('defeated', true);
        SoundFX.explosion();
        if (enemy.texture && enemy.texture.key === 'enemy') killCount++;
        totalGlobalKills++;
        if (typeof score !== 'undefined') score += 25;
        if (typeof gems !== 'undefined' && gems) {
            const gem = gems.create(enemy.x, enemy.y, 'gem');
            gem.xpValue = 25;
            gem.setData('value', 25);
        }
        enemy.destroy();
        return;
    }

    // Pequeno feedback visual para deixar claro que o tiro acertou outro inimigo.
    enemy.setTint(0xffaa33);
    const scene = getSafeGameScene(bullet);
    if (scene && scene.time) {
        scene.time.delayedCall(90, () => {
            if (enemy && enemy.active) enemy.clearTint();
        });
    }
}

function hitEnemy(b, e, swordInfo = null) {
    if (!e || !e.active || e.getData('defeated') || e.getData('isAlly')) return;
    const scene = getSafeGameScene(this);
    const projectile = b;
    const damageScale = projectile && projectile.getData ? (Number(projectile.getData('damageScale')) || 1) : (Number(e.getData('damageScale')) || 1);
    const projectileWeapon = projectile && projectile.getData ? weapons[projectile.getData('weaponKey')] : null;
    const hitWeapon = projectileWeapon || currentWeapon || weapons.basic;
    let totalDmg = (hitWeapon.damage + (rebirthLevel * 2)) * damageMultiplier * damageScale * (isDebugEnabled('damageBoost') ? 10 : 1);
    if (swordInfo && swordInfo.swordHit) totalDmg = Number(swordInfo.overrideDamage) || (weapons.basic.damage * 2);
    if (e.getData && e.getData('isBoss')) totalDmg *= 0.9;
    if (e.getData && e.getData('shielded')) totalDmg *= 0.45;
    const mastery = Number(hitWeapon.mastery) || 0;
    const critChance = Math.min(0.25, 0.05 + mastery * 0.002);
    const critical = Math.random() < critChance;
    if (critical) totalDmg *= 2;
    e.health -= totalDmg;

    if (projectile && projectile !== laserBeam && projectile.active) {
        const weaponType = projectile.getData('weaponType');
        if (weaponType === 'chain') {
            let remaining = Number(projectile.getData('chainHits'));
            if (!Number.isFinite(remaining) || remaining <= 0) remaining = 1;
            remaining -= 1;
            projectile.setData('chainHits', remaining);
            if (remaining > 0 && enemies) {
                let next = null, bestD2 = Infinity;
                enemies.getChildren().forEach(candidate => {
                    if (!candidate || !candidate.active || candidate === e || candidate.getData('defeated')) return;
                    const dx = candidate.x - e.x, dy = candidate.y - e.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < bestD2) { bestD2 = d2; next = candidate; }
                });
                if (next && projectile.body) {
                    const angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, next.x, next.y);
                    scene.physics.velocityFromRotation(angle, 820, projectile.body.velocity);
                } else projectile.destroy();
            } else projectile.destroy();
        } else {
            const pierce = Number(projectile.getData('pierceLeft')) || 0;
            if (pierce > 0) projectile.setData('pierceLeft', pierce - 1);
            else projectile.destroy();
        }
    }
    if (!swordInfo?.swordHit && hitWeapon.type === 'slow') {
        e.setData('slowUntil', (scene ? scene.time.now : 0) + 900);
        e.setData('slowFactor', hitWeapon.slow || 0.45);
    }
    if (critical) SoundFX.critical();
    if (critical && scene) showNotification(scene, 'CRITICO! +' + Math.round(totalDmg) + ' dano', 'achievement');
    e.setData('damageScale', 1);

    let currentScene = scene || getSafeGameScene(this);
    if (currentScene && currentScene.cameras && currentScene.cameras.main) {
        if (e.texture.key === 'colossus' && e.health <= 0) {
            currentScene.cameras.main.shake(400, 0.03);
        } else if (e.health <= 0 && (e.texture.key === 'miniboss' || e.texture.key === 'tank')) {
            currentScene.cameras.main.shake(200, 0.015);
        }
    }

    if (e.health <= 0) {
        e.setData('defeated', true);
        SoundFX.explosion();
        if (e.texture.key === 'enemy') killCount++; 
         
        totalGlobalKills++;
        if (totalGlobalKills % 10 === 0) SoundFX.combo(totalGlobalKills);
        localStorage.setItem('neon_total_kills', totalGlobalKills);

        const bestScore = Math.max(parseInt(localStorage.getItem('neon_best_score')) || 0, score);
        localStorage.setItem('neon_best_score', bestScore);
         
        if (!skinAUnlocked && totalGlobalKills >= 5) { skinAUnlocked = true; localStorage.setItem('neon_skin_a', 'true'); showNotification(currentScene, 'Skin A desbloqueada!', 'success'); }
        if (!skinBUnlocked && totalGlobalKills >= 10) { skinBUnlocked = true; localStorage.setItem('neon_skin_b', 'true'); showNotification(currentScene, 'Skin B desbloqueada!', 'success'); }
        if (!skinCUnlocked && totalGlobalKills >= 15) { skinCUnlocked = true; localStorage.setItem('neon_skin_c', 'true'); showNotification(currentScene, 'Skin C desbloqueada!', 'success'); }
        if (!skinDUnlocked && totalGlobalKills >= 20) { skinDUnlocked = true; localStorage.setItem('neon_skin_d', 'true'); showNotification(currentScene, 'Fundo D desbloqueado!', 'success'); }
        if (!aeroUnlocked && totalGlobalKills >= 67) { neonUnlockAero(currentScene); }
        if (totalGlobalKills >= 67 && achievements.windowsAero && !achievements.windowsAero.unlocked) { achievements.windowsAero.current = 67; localStorage.setItem('neon_ach_windowsAero_curr','67'); checkAchievement(currentScene, 'windowsAero'); }

        checkAchievement(currentScene, 'firstBlood');
        checkAchievement(currentScene, 'masterSlayer');

        if (e.texture.key === 'colossus') {
            checkAchievement(currentScene, 'colossusSlayer');
        }

        if (e.getData && e.getData('isBoss')) {
            const bossType = e.getData('bossType');
            const bossData = BOSS_TYPES[bossType];
            if (bossData) {
                score += bossData.reward;
                if (!bossDefeatedSet[bossType]) {
                    bossDefeatedSet[bossType] = true;
                    localStorage.setItem('neon_boss_defeated_' + bossType, 'true');
                    checkAchievement(currentScene, 'bossSlayer');
                }
                showNotification(currentScene, bossData.name + ' derrotado! +' + bossData.reward + ' PTS', 'achievement');
                if (activeBoss === e) activeBoss = null;
                updateBossUI();
                if (gameMode === 'invasion' && waveNumber === 10) {
                    score += 1000;
                }
                if (gameMode === 'bossrush') {
                    bossRushActive = false;
                    scene.time.delayedCall(1400, () => {
                        if (!isPlaying || isGameOver || gameMode !== 'bossrush') return;
                        if (bossRushIndex + 1 >= bossRushTotal) finishBossRush(scene);
                        else beginBossRushBoss(scene, bossRushIndex + 1);
                    });
                }
            }
        }

        let key = e.texture.key; 
        
        if (key === 'splitter' && !e.isSplit) {
            for (let i = 0; i < 2; i++) {
                let mini = enemies.create(e.x + (i === 0 ? -15 : 15), e.y + (i === 0 ? -15 : 15), 'splitter');
                mini.setScale(0.6);
                mini.health = 1;
                mini.isSplit = true;
            }
        }

        if (key === 'tank' && purpleSouls < 6) purpleSouls++; 
        if (key === 'elite' && blueSouls < 8) blueSouls++; 
        if (key === 'zipa' && zipaSouls < 5) zipaSouls++; 

        const scoreValues = {
            colossus: 1567, espioner: 250, sword_keeper: 160, medic: 180, bomber: 145,
            orbiter: 125, charger: 110, tank: 50, elite: 115, zipa: 90, sniper: 100,
            splitter: 70, stalker: 132, miniboss: 225, leaper: 95, shield: 140, mine_layer: 115,
            phaser: 130, swarmer: 35, turret_guard: 150, vortex: 165, mirror: 120, berserker: 190, frost: 125
        };
        let baseVal = scoreValues[key] || 10;
        let scoreMultiplier = (gameMode === 'hardcore') ? 2 : 1;
        scoreMultiplier *= Math.max(1, Number(randomEventScoreMultiplier) || 1);
        score += baseVal * scoreMultiplier * (isDebugEnabled('scoreBoost') ? 10 : 1); 
        
        checkAchievement(currentScene, 'richPlayer');

        let dropType = key === 'tank' ? 'gem_pink' : 'gem_blue';
        if ((key === 'elite' || key === 'tank' || key === 'zipa' || key === 'sniper') && Math.random() < 0.4) {
            dropType = 'gem_shield';
        }

        gems.create(e.x, e.y, dropType).xpValue = baseVal;

        // v5.20 — chance rara de dropar um Coração Dourado.
        if (goldenHeartDrops && (isDebugEnabled('goldenHeartDrops') || Math.random() < 0.07)) {
            spawnGoldenHeartItem(currentScene, e.x, e.y);
        }

        // Sword Keeper sempre deixa uma espada de 5 golpes.
        if (key === 'sword_keeper' && swordDrops) {
            const sword = swordDrops.create(e.x, e.y, 'sword_drop');
            if (sword) {
                sword.setData('pickupType', 'sword');
                sword.setData('charges', 5);
                sword.setDepth(1);
                // Never assume the collision callback's `this` is a Scene.
                // A missing tween manager must not break the whole game.
                if (currentScene && currentScene.tweens && typeof currentScene.tweens.add === 'function') {
                    currentScene.tweens.add({
                        targets: sword,
                        scale: 1.18,
                        alpha: 0.55,
                        yoyo: true,
                        repeat: -1,
                        duration: 420
                    });
                }
            }
        }
        e.destroy(); 
        updateUI(); 
    } 
}

function buyHealth() { 
    let currentScene = game.scene.scenes[0];
    if (gameMode === 'hardcore') return;
    if (score >= 500) { 
        score -= 500; 
        hp1++; 
        if (gameMode === 'coop') hp2++; 
        updateUI(); 
        showNotification(currentScene, 'Vida extra comprada!', 'success');
    } else {
        showNotification(currentScene, 'Pontos insuficientes para comprar vida!', 'warning');
    }
}

function activateDoubleDamage(scene) { 
    if (killCount >= 12 && damageMultiplier === 1) { 
        killCount -= 12; 
        damageMultiplier = 2; 
        player1.setTint(0xffd700); 
        if (gameMode === 'coop') player2.setTint(0xffd700); 
        checkAchievement(scene, 'furyStriker');
        updateUI(); 
        showNotification(scene, 'Fúria Ativada! Dano em dobro!', 'success');
        scene.time.delayedCall(600000, () => { 
            damageMultiplier = 1; 
            if (gameMode === 'hardcore') player1.setTint(0xff2222);
            else player1.clearTint(); 
            if (gameMode === 'coop') player2.clearTint(); 
            updateUI(); 
        }); 
    } else {
        showNotification(scene, 'Necessário 12 abates para ativar o Dano em Dobro!', 'warning');
    }
}

function activateDoubleShot(scene) {
    if (score >= 300 && !doubleShotActive) {
        score -= 300;
        doubleShotActive = true;
        doubleShotTime = scene.time.now + 15000;
        updateUI();
        showNotification(scene, 'Tiro Duplo ativado!', 'success');
    } else {
        showNotification(scene, 'Pontos insuficientes ou já ativo!', 'warning');
    }
}

function activateLaser(scene) {
    if (score >= 400 && !laserActive) {
        score -= 400;
        laserActive = true;
        laserTime = scene.time.now + 3000;
        laserBeam.setVisible(true);
        updateUI();
        showNotification(scene, 'Laser de Plasma ativado!', 'success');
    } else {
        showNotification(scene, 'Pontos insuficientes ou laser já ativo!', 'warning');
    }
}

function activateBomb(scene) {
    if (score >= 600) {
        score -= 600;
        if (scene.cameras && scene.cameras.main) {
            scene.cameras.main.shake(350, 0.025);
        }
        enemies.getChildren().forEach(e => {
            hitEnemy.call({ scene: scene }, null, e);
        });
        updateUI();
        showNotification(scene, 'Bomba ativada! Inimigos eliminados.', 'danger');
    } else {
        showNotification(scene, 'Pontos insuficientes para a bomba!', 'warning');
    }
}

function activateTimeSlow(scene) {
    if (score >= 350 && !timeSlowActive) {
        score -= 350;
        timeSlowActive = true;
        SoundFX.powerup();
        timeSlowTime = scene.time.now + 6000;
        updateUI();
        showNotification(scene, 'Câmara Lenta ativada!', 'success');
    } else {
        showNotification(scene, 'Pontos insuficientes ou efeito já ativo!', 'warning');
    }
}

function createDebugPanel() {
    if (!NA2_DEBUG.requested || document.getElementById('na2-debug-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'na2-debug-panel';
    panel.style.cssText = 'display:none;position:fixed;right:18px;top:18px;width:330px;max-height:calc(100vh - 36px);overflow:auto;z-index:99999;background:rgba(5,8,14,.97);border:2px solid #00ffff;border-radius:12px;box-shadow:0 0 28px rgba(0,255,255,.35);color:#fff;font:14px Consolas,monospace;padding:16px;box-sizing:border-box;';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><b style="color:#00ffff;font-size:19px">🛠️ NA2 DEBUG</b><button id="na2-debug-close" style="background:#ff3344;color:#fff;border:0;border-radius:6px;padding:5px 9px;cursor:pointer">X</button></div>
      <div style="font-size:12px;color:#9eb2c0;margin-bottom:12px">H abre/fecha este painel. As opções abaixo afetam somente esta sessão.</div>
      <label style="display:block;margin:9px 0"><input type="checkbox" data-debug-option="goldenHeartDrops"> 💛 100% de chance de Coração Dourado</label>
      <label style="display:block;margin:9px 0"><input type="checkbox" data-debug-option="invulnerable"> 🛡️ Imortalidade</label>
      <label style="display:block;margin:9px 0"><input type="checkbox" data-debug-option="infiniteHp"> ❤️ Vida infinita</label>
      <label style="display:block;margin:9px 0"><input type="checkbox" data-debug-option="xpBoost"> 📈 XP ×10</label>
      <label style="display:block;margin:9px 0"><input type="checkbox" data-debug-option="scoreBoost"> 💰 Pontos ×10</label>
      <label style="display:block;margin:9px 0"><input type="checkbox" data-debug-option="damageBoost"> 💥 Dano ×10</label>
      <label style="display:block;margin:9px 0"><input type="checkbox" data-debug-option="noCooldown"> 🔫 Sem cooldown</label>
      <hr style="border:0;border-top:1px solid #19353b;margin:14px 0">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
        <button data-debug-action="heart">💛 Spawn Coração</button>
        <button data-debug-action="event">🎲 Forçar Evento</button>
        <button data-debug-action="level">📈 +1 Nível</button>
        <button data-debug-action="clear">🧹 Limpar Inimigos</button>
        <button data-debug-action="score">💯 +1000 Pontos</button>
        <button data-debug-action="reset">🔄 Resetar Opções</button>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelectorAll('button').forEach(btn => {
        btn.style.cssText += 'background:#14232a;color:#fff;border:1px solid #28606b;border-radius:6px;padding:8px 6px;cursor:pointer;font:12px Consolas,monospace;';
    });
    panel.querySelectorAll('[data-debug-option]').forEach(el => {
        el.addEventListener('change', () => debugSetOption(el.getAttribute('data-debug-option'), el.checked));
    });
    panel.querySelector('#na2-debug-close').addEventListener('click', toggleDebugPanel);
    panel.querySelector('[data-debug-action="heart"]').addEventListener('click', debugSpawnGoldenHeart);
    panel.querySelector('[data-debug-action="event"]').addEventListener('click', debugForceRandomEvent);
    panel.querySelector('[data-debug-action="level"]').addEventListener('click', () => debugAddLevel(getDebugScene()));
    panel.querySelector('[data-debug-action="clear"]').addEventListener('click', debugKillAllEnemies);
    panel.querySelector('[data-debug-action="score"]').addEventListener('click', () => { score += 1000; updateUI(); const scene = getDebugScene(); if (scene) showNotification(scene, '🛠️ DEBUG: +1000 pontos!', 'success'); });
    panel.querySelector('[data-debug-action="reset"]').addEventListener('click', () => { Object.keys(NA2_DEBUG.options).forEach(k => NA2_DEBUG.options[k] = false); updateDebugButtonState(); updateUI(); });
}

if (NA2_DEBUG.requested && document.readyState !== 'loading') createDebugPanel();
else if (NA2_DEBUG.requested) document.addEventListener('DOMContentLoaded', createDebugPanel, { once: true });

function updateUI() {
    normalizeProgressionState();
    if (ui.sword) ui.sword.setText(swordCharges > 0 ? 'ESPADA: ' + swordCharges + '/5 (G/SPACE)' : 'ESPADA: —');
    if (!ui.score || !ui.hp || !ui.xp || !ui.skills) return;
    let activeThemeKey = currentBackground === 'solid' ? solidThemeColor : currentBackground;
    let activeTheme = themeColors[activeThemeKey] || themeColors['grid'];
    ui.score.setStyle({ color: activeTheme.hex });
    ui.score.setText('SCORE: ' + score); 
    
    if (gameMode === 'coop') {
        const p1Gold = goldenHearts1 > 0 ? ' ' + '💛'.repeat(goldenHearts1) : '';
        const p2Gold = goldenHearts2 > 0 ? ' ' + '💛'.repeat(goldenHearts2) : '';
        ui.hp.setText(`P1: ${hp1 > 20 ? hp1 + ' ❤️' : '❤️'.repeat(Math.max(0, hp1))}${p1Gold} | P2: ${hp2 > 20 ? hp2 + ' ❤️' : '❤️'.repeat(Math.max(0, hp2))}${p2Gold}`);
    } else if (gameMode === 'hardcore') {
        const gold = goldenHearts1 > 0 ? ' ' + '💛'.repeat(goldenHearts1) : '';
        ui.hp.setText('HP: ❤️ (HARDCORE)' + gold);
    } else {
        const gold = goldenHearts1 > 0 ? ' ' + '💛'.repeat(goldenHearts1) : '';
        ui.hp.setText((hp1 > 20 ? 'HP: ' + hp1 + ' ❤️' : 'HP: ' + '❤️'.repeat(Math.max(0, hp1))) + gold);
    }
    
    ui.xp.setText(`LVL: ${level} [${xp}/${nextLevelXp}]`); 
    ui.skills.setText(`💀: ${purpleSouls}/6 | 🏃: ${blueSouls}/8 | ⚡: ${zipaSouls}/3 | ⚔️: ${damageMultiplier}x (${killCount}/12)`); 
    
    if (ui.weapon) {
        let totalDmgCalc = (currentWeapon.damage + (rebirthLevel * 2)) * damageMultiplier;
        ui.weapon.setText(`ARMA: ${currentWeapon.name} (Dano: ${totalDmgCalc}x | Rebirth: ${rebirthLevel})`);
    }
    if (ui.wave && gameMode === 'invasion') ui.wave.setText(`ONDA: ${waveNumber}/${waveTotal || 10}${waveActive ? '' : ' — PREPARANDO'}`);
    if (ui.wave && gameMode === 'timeattack') ui.wave.setText(`TEMPO: ${timeAttackTimeLeft}s`);
    if (ui.wave && gameMode === 'bossrush') ui.wave.setText(`BOSS: ${Math.min(bossRushIndex + 1, bossRushTotal)}/${bossRushTotal}` + (bossRushActive ? '' : ' — PREPARANDO'));
}

function recordWeaponMastery(w) {
    if (!w) return;
    w.mastery = Math.min(100, (Number(w.mastery) || 0) + 0.01);
    weaponMastery[w.name] = { mastery: w.mastery };
    try { localStorage.setItem('neon_weapon_mastery', JSON.stringify(weaponMastery)); } catch (e) {}
}

function createWeaponProjectile(scene, owner, angle, w, pierceLeft = 0, speed = 900) {
    if (!bullets || bullets.countActive(true) >= ENGINE_LIMITS.maxBullets) return null;
    const b = bullets.create(owner.x, owner.y, 'bullet');
    b.setTint(w.color);
    b.setData('damageScale', 1);
    b.setData('pierceLeft', pierceLeft);
    b.setData('weaponType', w.type);
    b.setData('weaponKey', Object.keys(weapons).find(key => weapons[key] === w) || 'basic');
    b.setData('weaponDamage', Number(w.damage) || weapons.basic.damage);
    b.setData('weaponSlow', Number(w.slow) || 0);
    if (w.type === 'homing') b.setData('homing', true);
    addProjectileLifetime(scene, b);
    scene.physics.velocityFromRotation(angle, speed, b.body.velocity);
    return b;
}

function weaponExplosion(scene, x, y, radius, damageScale = 0.65) {
    if (!scene || !enemies) return;
    SoundFX.explosion();
    if (scene.cameras && scene.cameras.main) scene.cameras.main.shake(90, 0.006);
    enemies.getChildren().slice().forEach(e => {
        if (!e || !e.active) return;
        if (Phaser.Math.Distance.Between(x, y, e.x, e.y) <= radius) {
            e.setData('damageScale', damageScale);
            hitEnemy.call({ scene }, null, e);
        }
    });
}

function fireEnhancedWeapon(scene, owner, target, cooldownKey) {
    if (!owner || !target || !scene || isGameOver || isPaused || isShopOpen) return;
    const now = scene.time.now;
    const last = cooldownKey === 1 ? lastFired1 : lastFired2;
    if (!isDebugEnabled('noCooldown') && now < last) return;
    const w = currentWeapon || weapons.basic;
    if (currentBackground === 'win10') {
        try { scene.sound.play('win10_shoot', { volume: 0.5 }); } catch (e) { SoundFX.shoot(); }
    } else SoundFX.shoot();

    const baseAngle = Phaser.Math.Angle.Between(owner.x, owner.y, target.x, target.y);
    naVisualMuzzle(scene, owner.x, owner.y, baseAngle, w.color || 0x00ffff);
    if (w.type === 'spread') {
        const count = Math.min(7, w.pellets || 5);
        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * (w.spread || 0.2);
            createWeaponProjectile(scene, owner, baseAngle + offset, w);
        }
    } else if (w.type === 'burst') {
        const count = Math.min(5, w.burst || 3);
        for (let i = 0; i < count; i++) {
            const offset = (Math.random() - 0.5) * (w.spread || 0.05);
            createWeaponProjectile(scene, owner, baseAngle + offset, w);
        }
    } else if (w.type === 'dual') {
        createWeaponProjectile(scene, owner, baseAngle - 0.09, w);
        createWeaponProjectile(scene, owner, baseAngle + 0.09, w);
    } else if (w.type === 'prism') {
        const count = Math.min(6, w.pellets || 6);
        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * 0.12;
            const shot = createWeaponProjectile(scene, owner, baseAngle + offset, w, 1, 780);
            if (shot) shot.setTint([0xff55aa,0xffdd55,0x66ff99,0x55ddff,0x6688ff,0xcc66ff][i]);
        }
    } else if (w.type === 'boomerang') {
        const shot = createWeaponProjectile(scene, owner, baseAngle, w, 2, 620);
        if (shot) { shot.setData('boomerangReturn', true); shot.setData('boomerangOwner', owner); shot.setData('boomerangBorn', now); }
    } else if (w.type === 'chain') {
        const shot = createWeaponProjectile(scene, owner, baseAngle, w, 1, 820);
        if (shot) shot.setData('chainHits', w.chain || 3);
    } else if (w.type === 'lightning') {
        createWeaponProjectile(scene, owner, baseAngle, w, 1, 1050);
        const zapRadius = w.radius || 135;
        enemies && enemies.getChildren().forEach(e => { if (e && e.active && Phaser.Math.Distance.Between(target.x, target.y, e.x, e.y) <= zapRadius) { e.setData('damageScale', 0.45); hitEnemy.call({ scene }, null, e); } });
    } else if (w.type === 'singularity') {
        createWeaponProjectile(scene, owner, baseAngle, w, 3, 700);
        scene.time.delayedCall(170, () => weaponExplosion(scene, target.x, target.y, w.radius || 155, 0.95));
    } else {
        createWeaponProjectile(scene, owner, baseAngle, w, w.pierce || 0);
    }

    // Efeitos especiais sao executados apos o tiro, sem criar texturas adicionais.
    if (w.type === 'explosive' || w.type === 'nova') {
        const radius = w.radius || 75;
        const x = target.x, y = target.y;
        scene.time.delayedCall(140, () => weaponExplosion(scene, x, y, radius, w.type === 'nova' ? 0.9 : 0.65));
    }

    if (cooldownKey === 1) lastFired1 = now + w.fireRate;
    else lastFired2 = now + w.fireRate;
    recordWeaponMastery(w);
}

function shootPlayer1(scene, p, colorNum) { fireEnhancedWeapon(scene, player1, p, 1); }
function shootPlayer2(scene, p, colorNum) { fireEnhancedWeapon(scene, player2, p, 2); }

function spawnGoldenHeartItem(scene, x = null, y = null) {
    if (!scene || !goldenHeartDrops || goldenHeartDrops.countActive(true) >= 2) return null;
    const px = x == null ? Phaser.Math.Between(55, config.width - 55) : x;
    const py = y == null ? Phaser.Math.Between(105, config.height - 55) : y;
    const item = goldenHeartDrops.create(px, py, 'golden_heart_item');
    if (!item) return null;
    item.setData('pickupType', 'golden_heart');
    item.setDepth(2);
    item.setCollideWorldBounds(true);
    if (scene.tweens && scene.tweens.add) {
        scene.tweens.add({ targets: item, y: py - 8, alpha: 0.62, scale: 1.12, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.easeInOut' });
    }
    scene.time.delayedCall(14000, () => {
        if (item && item.active) item.destroy();
    });
    return item;
}

function collectGoldenHeart(player, item) {
    if (!player || !item || !item.active || item.getData('pickupType') !== 'golden_heart') return;
    const scene = getSafeGameScene(player);
    const isP2 = player === player2;
    if (isP2) goldenHearts2 = Math.min(8, goldenHearts2 + 1);
    else goldenHearts1 = Math.min(8, goldenHearts1 + 1);
    SoundFX.powerup();
    if (scene) {
        const target = isP2 ? player2 : player1;
        if (target && target.active) target.setTint(0xffd43b);
        scene.time.delayedCall(260, () => {
            if (target && target.active && !shieldActive) target.clearTint();
        });
        showNotification(scene, '💛 Coração Dourado coletado! Aguenta 2 golpes.', 'success');
    }
    item.destroy();
    updateUI();
}

function absorbGoldenHeartHit(scene, playerNum) {
    if (playerNum === 2 && gameMode !== 'coop') return false;
    let hearts = playerNum === 2 ? goldenHearts2 : goldenHearts1;
    if (hearts <= 0) return false;

    if (playerNum === 2) goldenHeartHits2++;
    else goldenHeartHits1++;
    const hits = playerNum === 2 ? goldenHeartHits2 : goldenHeartHits1;

    if (hits >= 2) {
        hearts--;
        if (playerNum === 2) { goldenHearts2 = hearts; goldenHeartHits2 = 0; }
        else { goldenHearts1 = hearts; goldenHeartHits1 = 0; }
        showNotification(scene, '💛 Coração Dourado quebrado!', 'warning');
    } else {
        showNotification(scene, `💛 Coração Dourado absorveu o golpe! ${2 - hits} golpe restante.`, 'info');
    }
    updateUI();
    return true;
}

function takeDamage(scene, playerNum, e) { 
    if (isPracticeMode) { practiceStats.collisions++; if (practiceSettings.invulnerable) { if(e&&e.active)e.destroy(); return; } }
    if (auraActive || dashActive || isGameOver || isPaused || isShopOpen) return;
    if (isDebugEnabled('invulnerable') || isDebugEnabled('infiniteHp')) {
        if (e && e.active) e.destroy();
        return;
    } 
     
    if (shieldActive) {
        shieldActive = false;
        shieldSprite.setVisible(false);
        if (gameMode === 'hardcore') player1.setTint(0xff2222);
        else player1.clearTint();
        if (gameMode === 'coop') player2.clearTint();
        e.destroy();
        showNotification(scene, 'Escudo absorveu o dano!', 'info');
        return;
    }

    if (absorbGoldenHeartHit(scene, playerNum)) {
        if (e && e.active) e.destroy();
        if (scene.cameras && scene.cameras.main) scene.cameras.main.shake(130, 0.012);
        return;
    }

    if (scene.cameras && scene.cameras.main) {
        scene.cameras.main.shake(250, 0.02);
    }

    if (currentBackground === 'win10') {
        scene.sound.play('win10_damage', { volume: 0.6 });
    } else {
        SoundFX.hit();
    }

    let damageAmount = (gameMode === 'hardcore') ? 10 : ((e.texture.key === 'espioner') ? 7 : ((e.texture.key === 'colossus') ? 4 : ((e.texture.key === 'charger') ? 3 : ((e.texture.key === 'stalker' || e.texture.key === 'zipa' || e.texture.key === 'sniper' || e.texture.key === 'bomber') ? 2 : 1))));
    e.destroy(); 
     
    if (playerNum === 1) {
        hp1 -= damageAmount;
        if (isDebugEnabled('infiniteHp')) hp1 = Math.max(3, hp1 + damageAmount);
        if (hp1 < 0) hp1 = 0;
    } else {
        hp2 -= damageAmount;
        if (isDebugEnabled('infiniteHp')) hp2 = Math.max(3, hp2 + damageAmount);
        if (hp2 < 0) hp2 = 0;
    }
     
    showNotification(scene, `Você sofreu dano! (-${damageAmount} HP)`, 'danger');
    updateUI(); 
     
    if (gameMode === 'coop') {
        if (hp1 <= 0 && hp2 <= 0) { isGameOver = true; showDeadScreen(scene); }
    } else {
        if (hp1 <= 0) { isGameOver = true; showDeadScreen(scene); }
    }
}

function takeEnemyBulletDamage(scene, playerNum, bullet) {
    if (isPracticeMode) { practiceStats.collisions++; if (practiceSettings.invulnerable) { if(bullet&&bullet.active)bullet.destroy(); return; } }
    if (auraActive || dashActive || isGameOver || isPaused || isShopOpen) return;
    if (isDebugEnabled('invulnerable') || isDebugEnabled('infiniteHp')) {
        if (e && e.active) e.destroy();
        return;
    }
     
    if (shieldActive) {
        shieldActive = false;
        shieldSprite.setVisible(false);
        if (gameMode === 'hardcore') player1.setTint(0xff2222);
        else player1.clearTint();
        if (gameMode === 'coop') player2.clearTint();
        bullet.destroy();
        showNotification(scene, 'Escudo absorveu o projétil!', 'info');
        return;
    }

    if (absorbGoldenHeartHit(scene, playerNum)) {
        if (bullet && bullet.active) bullet.destroy();
        if (scene.cameras && scene.cameras.main) scene.cameras.main.shake(130, 0.012);
        return;
    }

    if (scene.cameras && scene.cameras.main) {
        scene.cameras.main.shake(250, 0.02);
    }

    if (currentBackground === 'win10') {
        scene.sound.play('win10_damage', { volume: 0.6 });
    } else {
        SoundFX.hit();
    }

    bullet.destroy();
     
    let bulletDmg = (gameMode === 'hardcore') ? 10 : 2;
    if (playerNum === 1) {
        hp1 -= bulletDmg;
        if (isDebugEnabled('infiniteHp')) hp1 = Math.max(3, hp1 + bulletDmg);
        if (hp1 < 0) hp1 = 0;
    } else {
        hp2 -= bulletDmg;
        if (isDebugEnabled('infiniteHp')) hp2 = Math.max(3, hp2 + bulletDmg);
        if (hp2 < 0) hp2 = 0;
    }
     
    showNotification(scene, `Atingido por projétil! (-${bulletDmg} HP)`, 'danger');
    updateUI();
     
    if (gameMode === 'coop') {
        if (hp1 <= 0 && hp2 <= 0) { isGameOver = true; showDeadScreen(scene); }
    } else {
        if (hp1 <= 0) { isGameOver = true; showDeadScreen(scene); }
    }
}

function collectSword(p, sword) {
    if (!p || !sword || !sword.active || sword.getData('pickupType') !== 'sword') return;
    const scene = getSafeGameScene(p);
    if (!scene) return;
    swordCharges = 5;
    if (swordVisual && swordVisual.active) swordVisual.destroy();
    swordVisual = scene.add.text(p.x, p.y - 28, '🗡️', { fontSize: '24px' }).setOrigin(0.5).setDepth(8);
    showNotification(scene, 'ESPADA COLETADA! 5 golpes disponíveis.', 'success');
    sword.destroy();
    updateUI();
}

function swingSword(scene) {
    if (!scene || !isPlaying || isGameOver || isPaused || isShopOpen || swordCharges <= 0) return;
    const now = scene.time.now;
    if (now < swordSwingCooldown) return;
    swordSwingCooldown = now + 380;
    swordSwingUntil = now + 180;

    const pointer = scene.input.activePointer;
    let angle = pointer ? Phaser.Math.Angle.Between(player1.x, player1.y, pointer.worldX, pointer.worldY) : 0;
    const gp = findActiveGamepad();
    if (gp && inputMode === INPUT_MODE.GAMEPAD) {
        let rx = gp.axes[2] || 0, ry = gp.axes[3] || 0;
        if (Math.hypot(rx, ry) > 0.22) angle = Math.atan2(ry, rx);
    }

    const arc = scene.add.arc(player1.x, player1.y, 62, Phaser.Math.RadToDeg(angle) - 55, Phaser.Math.RadToDeg(angle) + 55, false, 0xffdd55, 0.18).setStrokeStyle(5, 0xffffff, 0.9).setDepth(7);
    scene.tweens.add({ targets: arc, alpha: 0, scale: 1.12, duration: 180, onComplete: () => arc.destroy() });

    let hitSomeone = false;
    enemies.getChildren().forEach(enemy => {
        if (!enemy || !enemy.active || enemy.getData('defeated')) return;
        const dist = Phaser.Math.Distance.Between(player1.x, player1.y, enemy.x, enemy.y);
        if (dist > 105) return;
        const enemyAngle = Phaser.Math.Angle.Between(player1.x, player1.y, enemy.x, enemy.y);
        const diff = Math.abs(Phaser.Math.Angle.Wrap(enemyAngle - angle));
        if (diff <= Phaser.Math.DegToRad(58)) {
            enemy.setData('damageScale', 1);
            hitEnemy.call(scene, null, enemy, { overrideDamage: (weapons.basic.damage * 2), swordHit: true });
            hitSomeone = true;
        }
    });
    swordCharges = Math.max(0, swordCharges - 1);
    if (hitSomeone) SoundFX.hit();
    if (swordCharges <= 0) {
        showNotification(scene, 'A espada quebrou!', 'warning');
        if (swordVisual && swordVisual.active) swordVisual.destroy();
        swordVisual = null;
    }
    updateUI();
}

function collectGem(p, g) { 
    SoundFX.gem();
    let currentScene = g.scene;
    if (g.texture.key === 'gem_shield') {
        shieldActive = true;
        shieldSprite.setVisible(true);
        if (p === player1) player1.setTint(0x00ffff);
        if (p === player2) player2.setTint(0x00ffff);
        showNotification(currentScene, 'Escudo de Plasma coletado!', 'success');
    } else {
        // Nunca faça `xp += undefined`: isso transforma XP em NaN e trava a progressão.
        // Drops antigos sem xpValue recebem um valor seguro de 0.
        addPlayerXP(g.xpValue, currentScene);
    }
    g.destroy(); 
    updateUI(); 
}

function createDesktopControls(scene) {
    // No PC não usamos D-Pad nem os botões de celular: fica somente o acesso à loja.
    if (desktopShopButton && desktopShopButton.active) desktopShopButton.destroy();
    desktopShopButton = null;

    if (gameMode !== 'hardcore') {
        desktopShopButton = scene.add.text(config.width - 28, config.height - 28, '🛒 LOJA', {
            fontSize: '20px',
            backgroundColor: '#111111',
            color: '#00ffcc',
            fontStyle: 'bold',
            padding: { left: 12, right: 12, top: 8, bottom: 8 }
        }).setOrigin(1, 1).setInteractive({ useHandCursor: true }).setDepth(300);
        desktopShopButton.on('pointerdown', () => toggleShop(scene));
    }

    updateInputHint(scene, INPUT_MODE.KEYBOARD);
}

function addMobileButton(scene, x, y, label, callback, size = 38) {
    const btn = scene.add.text(x, y, label, {
        fontSize: `${size}px`,
        backgroundColor: '#111111',
        color: '#ffffff',
        padding: { left: 8, right: 8, top: 6, bottom: 6 }
    }).setOrigin(0.5).setInteractive().setDepth(300);

    btn.on('pointerdown', callback);
    mobileControlElements.push(btn);
    return btn;
}

function createMobileControls(scene) {
    mobileControlElements.forEach(el => { if (el && el.active) el.destroy(); });
    mobileControlElements = [];

    const smallScreen = config.width < 800;
    const dpadX = smallScreen ? 78 : 95;
    const dpadY = config.height - (smallScreen ? 105 : 125);
    const dpadSize = smallScreen ? 29 : 34;

    const hold = (prop) => {
        return (btn) => {
            btn.on('pointerdown', () => { joystick1[prop] = true; });
            btn.on('pointerup', () => { joystick1[prop] = false; });
            btn.on('pointerupoutside', () => { joystick1[prop] = false; });
        };
    };

    const up = addMobileButton(scene, dpadX, dpadY - 42, '⬆️', () => {}, dpadSize);
    const down = addMobileButton(scene, dpadX, dpadY + 42, '⬇️', () => {}, dpadSize);
    const left = addMobileButton(scene, dpadX - 42, dpadY, '⬅️', () => {}, dpadSize);
    const right = addMobileButton(scene, dpadX + 42, dpadY, '➡️', () => {}, dpadSize);
    hold('up')(up); hold('down')(down); hold('left')(left); hold('right')(right);

    // Habilidades ficam em uma ou duas linhas para não estourar a tela do celular.
    const actions = [];
    if (gameMode !== 'hardcore') actions.push(['🛒', () => toggleShop(scene)]);
    actions.push(
        ['🔄', () => activateAura(scene)],
        ['🏃', () => activateDash(scene)],
        ['💀', () => placeTurret(scene)],
        ['⚔️', () => activateDoubleDamage(scene)],
        ['💣', () => activateBomb(scene)],
        ['🛑', () => activateLaser(scene)],
        ['🟣', () => activateDoubleShot(scene)],
        ['⏳', () => activateTimeSlow(scene)],
        ['⚠️', () => placeTacticalTrap(scene)]
    );
    actions.push(['🗡️', () => swingSword(scene)]);
    if (gameMode !== 'hardcore') actions.push(['❤️', () => buyHealth()]);

    const buttonSize = smallScreen ? 28 : 32;
    const gap = smallScreen ? 45 : 52;
    const rows = smallScreen ? 2 : 1;
    const perRow = Math.ceil(actions.length / rows);
    const startX = smallScreen ? config.width - 18 - (perRow - 1) * gap : Math.max(390, config.width - 590);
    const rowY = smallScreen ? [config.height - 62, config.height - 115] : [config.height - 58];

    actions.forEach((item, i) => {
        const row = smallScreen ? Math.floor(i / perRow) : 0;
        const col = smallScreen ? i % perRow : i;
        const x = smallScreen ? startX + col * gap : startX + col * gap;
        const y = rowY[row];
        addMobileButton(scene, x, y, item[0], item[1], buttonSize);
    });

    updateInputHint(scene, INPUT_MODE.TOUCH);
}

function updateGamepad(scene, time) {
    const gp = findActiveGamepad();
    if (!gp) {
        if (inputMode === INPUT_MODE.GAMEPAD && performance.now() - gamepadLastSeen > 1000) {
            inputMode = touchDetected ? INPUT_MODE.TOUCH : INPUT_MODE.KEYBOARD;
            if (isPlaying) updateInputHint(scene, inputMode);
        }
        return;
    }

    gamepadLastSeen = performance.now();
    if (inputMode !== INPUT_MODE.GAMEPAD) {
        inputMode = INPUT_MODE.GAMEPAD;
        if (isPlaying) updateInputHint(scene, inputMode);
    }

    // X (índice 2 no padrão Xbox): abre/fecha a loja.
    if (gamepadButtonJustPressed(gp, 2)) {
        if (isPlaying && !isGameOver && !isPaused && gameMode !== 'hardcore') {
            toggleShop(scene);
        }
    }

    // Start/Menu: pausa o jogo.
    if (gamepadButtonJustPressed(gp, 9)) {
        if (isPlaying && !isGameOver && !isShopOpen) togglePauseMenu(scene);
    }

    // A = Dash, B = Aura, Y = Double Shot. LB/RB = Laser/Bomba.
    if (gamepadButtonJustPressed(gp, 0) && isPlaying && !isShopOpen) activateDash(scene);
    if (gamepadButtonJustPressed(gp, 1) && isPlaying && !isShopOpen) activateAura(scene);
    if (gamepadButtonJustPressed(gp, 3) && isPlaying && !isShopOpen) activateDoubleShot(scene);
    if (gamepadButtonJustPressed(gp, 4) && isPlaying && !isShopOpen) activateLaser(scene);
    if (gamepadButtonJustPressed(gp, 5) && isPlaying && !isShopOpen) activateBomb(scene);
    // LT (6) usa a espada quando houver cargas.
    if (gamepadButtonJustPressed(gp, 6) && isPlaying && !isShopOpen) swingSword(scene);

    // Analógico direito: mira e dispara automaticamente.
    if (isPlaying && !isGameOver && !isPaused && !isShopOpen) {
        let rx = gp.axes[2] || 0;
        let ry = gp.axes[3] || 0;
        const rDeadzone = 0.22;
        if (Math.abs(rx) < rDeadzone) rx = 0;
        if (Math.abs(ry) < rDeadzone) ry = 0;

        if (rx !== 0 || ry !== 0) {
            const aimPoint = {
                x: player1.x + rx * 500,
                y: player1.y + ry * 500
            };
            shootPlayer1(scene, aimPoint, (themeColors[currentBackground] || themeColors.grid).num);
        }
    }
}



// ==========================================
// GIANT SYSTEMS — instalados antes do boot
// ==========================================
function giantSaveMastery() {
    try {
        const data = {};
        Object.keys(weapons).forEach(k => data[k] = { mastery: Number(weapons[k].mastery) || 0 });
        localStorage.setItem('neon_weapon_mastery', JSON.stringify(data));
    } catch (e) {}
}

function giantChooseMission() {
    const m = giantMissions[Math.floor(Math.random() * giantMissions.length)];
    giantMission = { ...m, current: 0 };
    giantMissionRewarded = false;
}

function giantMissionProgress() {
    if (!giantMission || giantMissionRewarded) return 0;
    if (giantMission.id === 'kills') giantMission.current = giantRunKills;
    else if (giantMission.id === 'score') giantMission.current = score;
    else if (giantMission.id === 'combo') giantMission.current = Math.max(giantMission.current, giantComboBest);
    else if (giantMission.id === 'weapon') giantMission.current = Object.keys(giantWeaponKills).length;
    if (giantMission.current >= giantMission.target) {
        giantMissionRewarded = true;
        score += giantMission.reward;
        try { localStorage.setItem('neon_giant_mission_done', 'true'); } catch(e) {}
        showNotification(game.scene.scenes[0], `MISSÃO CONCLUÍDA: ${giantMission.name} +${giantMission.reward} PTS`, 'achievement');
    }
    return giantMission.current;
}

function giantCreateHUD(scene) {
    if (!scene || !scene.add) return;
    if (giantHud) giantHud.destroy();
    giantHud = scene.add.text(config.width - 14, config.height - 86, '', {
        fontSize:'13px', color:'#00ffcc', align:'right', fontStyle:'bold',
        backgroundColor:'#000000', padding:{left:8,right:8,top:5,bottom:5}
    }).setOrigin(1,1).setDepth(300);
    giantMissionText = scene.add.text(config.width - 14, config.height - 128, '', {
        fontSize:'12px', color:'#ffffff', align:'right', backgroundColor:'#000000',
        padding:{left:7,right:7,top:4,bottom:4}
    }).setOrigin(1,1).setDepth(300);
    giantComboText = scene.add.text(config.width/2, 22, '', {
        fontSize:'20px', color:'#ffcc00', fontStyle:'bold', align:'center'
    }).setOrigin(.5).setDepth(300);
    giantOverdriveText = scene.add.text(config.width/2, 48, '', {
        fontSize:'14px', color:'#ff66ff', fontStyle:'bold'
    }).setOrigin(.5).setDepth(300);
}

function giantResetRun(scene) {
    giantCombo = 0;
    giantComboUntil = 0;
    giantOverdriveUntil = 0;
    giantRunKills = 0;
    giantRunShots = 0;
    giantWeaponKills = {};
    giantRunStart = scene.time.now;
    giantChooseMission();
    giantCreateHUD(scene);
}

function giantRegisterKill(scene) {
    giantRunKills++;
    giantCombo++;
    giantComboUntil = scene.time.now + 2600;
    giantComboBest = Math.max(giantComboBest, giantCombo);
    try { localStorage.setItem('neon_giant_combo_best', String(giantComboBest)); } catch(e) {}
    const weaponKey = Object.keys(weapons).find(k => weapons[k] === currentWeapon) || currentWeapon.name;
    giantWeaponKills[weaponKey] = (giantWeaponKills[weaponKey] || 0) + 1;
    currentWeapon.mastery = Math.min(100, (Number(currentWeapon.mastery) || 0) + 0.35);
    giantSaveMastery();

    if (giantCombo >= 25) {
        const a = achievements.giantCombo;
        if (!a.unlocked) {
            a.current = 25;
            a.unlocked = true;
            localStorage.setItem('neon_ach_giantCombo', 'true');
            localStorage.setItem('neon_ach_giantCombo_curr', '25');
            score += a.reward;
            showNotification(scene, `CONQUISTA: ${a.title} (+${a.reward} PTS)`, 'achievement');
        }
    } else {
        achievements.giantCombo.current = Math.max(achievements.giantCombo.current || 0, giantCombo);
        localStorage.setItem('neon_ach_giantCombo_curr', String(achievements.giantCombo.current));
    }
    const distinct = Object.keys(giantWeaponKills).length;
    achievements.giantArsenal.current = distinct;
    localStorage.setItem('neon_ach_giantArsenal_curr', String(distinct));
    if (distinct >= 10 && !achievements.giantArsenal.unlocked) {
        achievements.giantArsenal.unlocked = true;
        localStorage.setItem('neon_ach_giantArsenal', 'true');
        score += achievements.giantArsenal.reward;
        showNotification(scene, `CONQUISTA: ${achievements.giantArsenal.title} (+${achievements.giantArsenal.reward} PTS)`, 'achievement');
    }
    if (giantRunKills % 15 === 0 && gems && gems.countActive(true) < 20) {
        const gem = gems.create(player1.x + Phaser.Math.Between(-30,30), player1.y + Phaser.Math.Between(-30,30), Math.random() < .5 ? 'gem_blue' : 'gem_pink');
        if (gem) gem.xpValue = 75;
    }
    giantMissionProgress();
}

function giantUpdateHUD(scene, time) {
    if (!giantHud) return;
    const elapsed = Math.max(0, Math.floor((time - giantRunStart) / 1000));
    const mm = Math.floor(elapsed / 60), ss = String(elapsed % 60).padStart(2,'0');
    giantHud.setText(`GIANT\nABATES: ${giantRunKills} | TEMPO: ${mm}:${ss}`);
    if (giantMissionText && giantMission) giantMissionText.setText(`MISSÃO: ${giantMission.name}\n${giantMissionProgress()}/${giantMission.target}  •  +${giantMission.reward}`);
    if (giantComboText) giantComboText.setText(giantCombo > 1 ? `COMBO x${giantCombo}` : '');
    if (giantOverdriveText) {
        const left = Math.max(0, giantOverdriveUntil - time);
        giantOverdriveText.setText(left > 0 ? `OVERDRIVE ${(left/1000).toFixed(1)}s` : '');
    }
}

function giantStartOverdrive(scene) {
    giantOverdriveUntil = scene.time.now + 8000;
    showNotification(scene, 'OVERDRIVE GIGANTE! Dano aumentado por 8 segundos.', 'success');
}

function giantInstall() {
    const originalStartGame = startGame;
    startGame = function(scene) {
        originalStartGame.call(this, scene);
        try { giantResetRun(scene); } catch(e) { console.warn('Giant reset:', e); }
    };

    const originalHitEnemy = hitEnemy;
    hitEnemy = function(b, e) {
        const wasActive = !!(e && e.active && !e.getData('defeated'));
        originalHitEnemy.call(this, b, e);
        if (wasActive && e && e.getData && e.getData('defeated')) {
            const scene = this.scene || (e.scene) || game.scene.scenes[0];
            if (scene) {
                giantRegisterKill(scene);
                if (giantCombo > 0 && giantCombo % 10 === 0) giantStartOverdrive(scene);
            }
        }
    };

    const originalUpdate = update;
    update = function(time) {
        originalUpdate.call(this, time);
        if (!isPlaying) return;
        const scene = this;
        if (giantCombo > 0 && time > giantComboUntil) giantCombo = 0;
        if (giantOverdriveUntil > 0 && time >= giantOverdriveUntil) giantOverdriveUntil = 0;
        if (giantOverdriveUntil > time) {
            // O bônus é aplicado em novos projéteis via um multiplicador temporário.
            // Não altera permanentemente damageMultiplier.
            if (player1 && player1.active) player1.setTint(0xff66ff);
        } else if (player1 && player1.active && !auraActive && !dashActive && gameMode !== 'hardcore') {
            player1.clearTint();
        }
        giantUpdateHUD(scene, time);
        giantMissionProgress();
    };

    // Conta tiros sem alterar a mecânica original.
    const originalShoot = shootPlayer1;
    if (typeof originalShoot === 'function') {
        shootPlayer1 = function(scene, pointer, themeNum) {
            giantRunShots++;
            return originalShoot.call(this, scene, pointer, themeNum);
        };
    }
}

giantInstall();

// O sistema emjs permanece disponível, mas desligado por padrão.
// Nada é removido: assets/emjs/ continua reservado para uma atualização futura.


// ==========================================
// FERRAMENTA DE DEBUG — CONSOLE
// Digite neonDebug() no console para abrir/fechar o painel.
// ==========================================
let neonDebugVisible = false;
let neonDebugText = null;
let neonDebugLastTime = 0;
let neonDebugFrames = 0;
let neonDebugFps = 0;

function neonDebugFormatGroup(group) {
    try { return group ? group.countActive(true) : 0; } catch (e) { return 0; }
}

function neonDebugUpdate(scene, time) {
    if (!neonDebugVisible || !neonDebugText || !scene) return;
    neonDebugFrames++;
    if (time - neonDebugLastTime >= 500) {
        neonDebugFps = Math.round(neonDebugFrames * 1000 / Math.max(1, time - neonDebugLastTime));
        neonDebugFrames = 0;
        neonDebugLastTime = time;
    }
    const p = player1 && player1.active ? `(${Math.round(player1.x)}, ${Math.round(player1.y)})` : 'N/A';
    const weapon = currentWeapon ? currentWeapon.name : 'N/A';
    const hp = typeof hp1 !== 'undefined' ? hp1 : 'N/A';
    const wave = typeof invasionWave !== 'undefined' ? invasionWave : '-';
    const boss = typeof currentBoss !== 'undefined' && currentBoss && currentBoss.active ? (currentBoss.getData ? (currentBoss.getData('bossType') || 'ATIVO') : 'ATIVO') : 'nenhum';
    const bossHp = typeof currentBoss !== 'undefined' && currentBoss && currentBoss.active ? (currentBoss.getData ? (currentBoss.getData('hp') || '?') : '?') : '-';
    neonDebugText.setText([
        'NEON ARENA — DEBUG',
        `FPS: ${neonDebugFps}`,
        `Modo: ${gameMode}`,
        `Jogando: ${isPlaying} | Pausado: ${isPaused}`,
        `Player: ${p} | HP: ${hp}`,
        `Arma: ${weapon}`,
        `Inimigos: ${neonDebugFormatGroup(enemies)}`,
        `Projéteis: ${neonDebugFormatGroup(bullets)}`,
        `Projéteis inimigos: ${neonDebugFormatGroup(enemyBullets)}`,
        `Gemas: ${neonDebugFormatGroup(gems)}`,
        `Torres: ${neonDebugFormatGroup(turrets)}`,
        `Onda: ${wave}`,
        `Boss: ${boss} | HP: ${bossHp}`,
        '',
        'neonDebug() = fechar painel'
    ].join('\n'));
}

function neonDebug() {
    neonDebugVisible = !neonDebugVisible;
    try {
        const scene = game && game.scene && game.scene.scenes ? game.scene.scenes[0] : null;
        if (!scene) {
            console.warn('[Neon Debug] O jogo ainda não terminou de inicializar.');
            return false;
        }
        if (neonDebugVisible) {
            neonDebugText = scene.add.text(12, 12, 'NEON ARENA — DEBUG\nInicializando...', {
                fontFamily: 'monospace', fontSize: '14px', color: '#00ffcc',
                backgroundColor: '#071018', padding: { x: 10, y: 8 },
                lineSpacing: 4
            }).setScrollFactor(0).setDepth(99999).setAlpha(0.94);
            neonDebugLastTime = scene.time.now;
            neonDebugFrames = 0;
            console.log('%c[Neon Debug] ATIVADO', 'color:#00ffcc;font-weight:bold');
            console.log('Use neonDebug() novamente para fechar.');
        } else {
            if (neonDebugText) neonDebugText.destroy();
            neonDebugText = null;
            console.log('%c[Neon Debug] DESATIVADO', 'color:#ff6699;font-weight:bold');
        }
        return neonDebugVisible;
    } catch (e) {
        console.error('[Neon Debug] Falha:', e);
        return false;
    }
}

function neonDebugHelp() {
    console.log('%cNEON ARENA DEBUG', 'font-size:16px;font-weight:bold;color:#00ffcc');
    console.log('neonDebug()  → abre/fecha o painel de debug');
    console.log('neonDebugHelp() → mostra esta ajuda');
}

// Fica disponível globalmente apenas como ferramenta de desenvolvimento.
if (typeof window !== 'undefined') {
    window.neonDebug = neonDebug;
    window.neonDebugHelp = neonDebugHelp;
}

const neonOriginalUpdateForDebug = update;
update = function(time) {
    const result = neonOriginalUpdateForDebug.call(this, time);
    if (neonDebugVisible && this) neonDebugUpdate(this, time);
    return result;
};

// Boot do Phaser somente depois de instalar os sistemas do Giant Update.
async function neonStartGame() {
    if (typeof window !== 'undefined' && window.NA_REQUIREMENTS_PAGE) return;
    // NA2 Services é opcional para o jogo. Se estiver presente, controla apenas os serviços.
    // O encerramento em 01/01/2027 desativa Daily/Monthly/etc., mas NÃO bloqueia a arena.
    if (typeof window !== 'undefined' && window.NA2Services && typeof window.NA2Services.isAvailable === 'function') {
        window.NA2Services.onGameBoot && window.NA2Services.onGameBoot();
    }
    neonModRunHook('beforeGameStart', NeonArena2Mods);
    await neonLoadMods();


// =========================================================
// OFFICIAL DROP UPDATES — EMBEDDED INTO game.js
// Drop #1 and Drop #2 are part of the official game build.
// The files under updates/ are kept only as source/archive copies.
// They are NOT loaded separately by index.html.
// =========================================================
/*
 * NEON ARENA 2 — DROP UPDATE #1
 * v1.0.0
 * Conteúdo oficial integrado ao jogo base a partir do Drop #2.
 *
 * Conteúdo:
 * - Novo inimigo: Dropper
 * - Nova mecânica: Drop Fever (5 kills rápidos)
 * - Novo power-up: Drop Core
 * - 2 conquistas
 * - efeitos visuais + sons Web Audio
 * - segredo DROP//NULL
 * - ícones SVG
 */
(function () {
    'use strict';

    const MOD_NAME = 'Drop Update #1';
    const MOD_VERSION = '1.0.0';
    const PREFIX = 'neon_drop1_';

    const state = {
        scene: null,
        pickupGroup: null,
        nextCoreAt: 0,
        nextEnemyAt: 0,
        nextSecretAt: 0,
        feverUntil: 0,
        killStreak: 0,
        lastKillCount: Number(localStorage.getItem('neon_total_kills') || 0),
        streakDeadline: 0,
        cores: Number(localStorage.getItem(PREFIX + 'cores') || 0),
        secretShown: localStorage.getItem(PREFIX + 'secret') === 'true',
        setupDone: false,
        panel: null,
        audioContext: null,
        lastPulse: 0
    };

    function R() {
        return window.NeonArena2Runtime || {
            game: null, player1: null, player2: null, enemies: null, enemyBullets: null,
            hitEnemy: null, isPlaying: false, isGameOver: false, isPaused: false
        };
    }

    const ICONS = {
        drop: 'assets/svg/drop1/drop.svg',
        enemy: 'assets/svg/drop1/dropper.svg',
        core: 'assets/svg/drop1/core.svg',
        secret: 'assets/svg/drop1/secret.svg'
    };

    function now(scene) {
        return scene && scene.time ? scene.time.now : performance.now();
    }

    function safeScene(scene) {
        if (scene && scene.sys && scene.add && scene.physics) return scene;
        if (R().game && R().game.scene && R().game.scene.scenes) {
            return R().game.scene.scenes.find(s => s && s.sys && s.sys.isActive && s.sys.isActive()) || null;
        }
        return null;
    }

    function save() {
        localStorage.setItem(PREFIX + 'cores', String(state.cores));
    }

    function notify(scene, text, type) {
        try {
            if (typeof showNotification === 'function') showNotification(scene, String(text), type || 'info');
        } catch (_) {}
    }

    function sound(type) {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            if (!state.audioContext) state.audioContext = new Ctx();
            const ctx = state.audioContext;
            if (ctx.state === 'suspended') ctx.resume().catch(() => {});
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = ctx.currentTime;
            const sets = {
                core: [520, 880, 0.13],
                enemy: [170, 90, 0.16],
                fever: [330, 660, 0.22],
                secret: [740, 1480, 0.35],
                achievement: [440, 990, 0.25]
            };
            const s = sets[type] || [400, 500, 0.12];
            osc.type = type === 'enemy' ? 'sawtooth' : 'sine';
            osc.frequency.setValueAtTime(s[0], t);
            osc.frequency.exponentialRampToValueAtTime(Math.max(50, s[1]), t + s[2]);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.08, t + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + s[2]);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + s[2] + 0.02);
        } catch (_) {}
    }

    function addTextureFromSVG(scene, key, svg) {
        if (!scene || !scene.textures || scene.textures.exists(key)) return;
        try {
            const uri = 'data:image/svg+xml;base64,' + btoa(svg);
            scene.textures.addBase64(key, uri);
        } catch (error) {
            console.warn('[Drop #1] Falha ao registrar SVG:', key, error);
        }
    }

    const SVG = {
        enemy: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="5" y="5" width="22" height="22" rx="5" fill="#090b18" stroke="#ff3bf2" stroke-width="2"/><path d="M16 8v16M8 16h16" stroke="#00f6ff" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="#ff3bf2"/><circle cx="16" cy="16" r="1.5" fill="#fff"/></svg>`,
        bullet: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="#ff3bf2" stroke="#fff" stroke-width="1"/><circle cx="6" cy="6" r="1.5" fill="#00f6ff"/></svg>`,
        core: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><path d="M13 2l9 5v12l-9 5-9-5V7z" fill="#101426" stroke="#00f6ff" stroke-width="2"/><path d="M13 6l5 3v7l-5 3-5-3V9z" fill="#00f6ff" opacity=".32"/><path d="M13 7v12M7 10l6 3 6-3" fill="none" stroke="#fff" stroke-width="1.4"/></svg>`
    };

    function flash(scene, x, y, color, radius) {
        if (!scene || !scene.add) return;
        const r = scene.add.circle(x, y, radius || 22, color || 0x00f6ff, 0.22).setDepth(350);
        const ring = scene.add.circle(x, y, 8, color || 0x00f6ff, 0).setStrokeStyle(3, color || 0x00f6ff, 0.9).setDepth(351);
        scene.tweens.add({
            targets: [r, ring],
            radius: radius ? radius * 2.2 : 50,
            alpha: 0,
            duration: 360,
            ease: 'Quad.easeOut',
            onComplete: () => { if (r.active) r.destroy(); if (ring.active) ring.destroy(); }
        });
    }

    function floatingText(scene, text, x, y, color) {
        if (!scene || !scene.add) return;
        const t = scene.add.text(x, y, text, {
            fontSize: '18px',
            fontStyle: 'bold',
            color: color || '#00f6ff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(352);
        scene.tweens.add({
            targets: t, y: y - 42, alpha: 0, duration: 900,
            ease: 'Cubic.easeOut', onComplete: () => { if (t.active) t.destroy(); }
        });
    }

    function unlockAchievement(scene, id, title, description) {
        const key = PREFIX + 'ach_' + id;
        if (localStorage.getItem(key) === 'true') return false;
        localStorage.setItem(key, 'true');
        sound('achievement');
        notify(scene, `🏆 CONQUISTA!\n${title}\n${description}`, 'achievement');
        return true;
    }

    function createPanel() {
        if (state.panel) state.panel.remove();
        const panel = document.createElement('div');
        panel.id = 'neon-drop1-panel';
        panel.style.cssText = [
            'position:fixed',
            'left:12px',
            'bottom:12px',
            'z-index:99999',
            'display:flex',
            'align-items:center',
            'gap:8px',
            'padding:7px 10px',
            'border:1px solid rgba(0,246,255,.65)',
            'border-radius:8px',
            'background:rgba(5,8,20,.86)',
            'box-shadow:0 0 14px rgba(0,246,255,.22)',
            'color:#fff',
            'font:600 12px Arial,sans-serif',
            'pointer-events:none',
            'user-select:none'
        ].join(';');

        const img = document.createElement('img');
        img.src = ICONS.drop;
        img.width = 22;
        img.height = 22;
        img.alt = 'Drop #1';
        img.style.cssText = 'display:block;filter:drop-shadow(0 0 4px #00f6ff)';

        const text = document.createElement('span');
        text.textContent = 'DROP #1 • 0 CORES';
        text.id = 'neon-drop1-panel-text';

        panel.appendChild(img);
        panel.appendChild(text);
        document.body.appendChild(panel);
        state.panel = panel;
        updatePanel();
    }

    function updatePanel() {
        const el = document.getElementById('neon-drop1-panel-text');
        if (el) el.textContent = `DROP #1 • ${state.cores} ${state.cores === 1 ? 'CORE' : 'CORES'}`;
    }

    function spawnCore(scene) {
        if (!state.pickupGroup || !scene || !R().player1) return;
        const margin = 70;
        const x = Phaser.Math.Between(margin, Math.max(margin, scene.scale.width - margin));
        const y = Phaser.Math.Between(margin, Math.max(margin, scene.scale.height - margin));
        const core = state.pickupGroup.create(x, y, 'drop1_core');
        core.setData('drop1Core', true);
        core.setDepth(6);
        core.setScale(0.95);
        core.body.setAllowGravity(false);
        core.body.setCircle(11);
        core.body.setVelocity(0, 0);
        scene.tweens.add({
            targets: core,
            scale: 1.18,
            angle: 360,
            duration: 900,
            yoyo: true,
            repeat: -1
        });
        flash(scene, x, y, 0x00f6ff, 14);
    }

    function collectCore(scene, player, core) {
        if (!core || !core.active || !core.getData('drop1Core')) return;
        core.destroy();
        state.cores++;
        save();
        updatePanel();
        sound('core');
        flash(scene, player.x, player.y, 0x00f6ff, 25);
        floatingText(scene, '+ DROP CORE', player.x, player.y - 20, '#00f6ff');

        if (state.cores === 1) {
            unlockAchievement(scene, 'first', 'PRIMEIRA QUEDA', 'Colete seu primeiro Drop Core.');
        }
        if (state.cores >= 5) {
            unlockAchievement(scene, 'hunter', 'CAÇADOR DE DROPS', 'Colete 5 Drop Cores.');
        }

        // Power-up: pulso de impacto que enfraquece todos os inimigos.
        if (R().enemies && R().hitEnemy) {
            R().enemies.getChildren().forEach(e => {
                if (!e || !e.active || e.getData('defeated')) return;
                try {
                    R().hitEnemy.call(scene, null, e, { overrideDamage: 1, swordHit: true });
                } catch (_) {
                    const hp = Number(e.health) || 1;
                    e.health = Math.max(0, hp - 1);
                }
            });
        } else if (state.scene && state.scene.children) {
            // Fallback para ambientes em que os bindings não são expostos ao window.
            console.log('[Neon Arena 2][Drop #1] Drop Core coletado; pulso visual ativado.');
        }

        const all = scene.children.list || [];
        all.forEach(obj => {
            if (obj && obj.active && obj.getData && obj.getData('drop1Core')) return;
        });
        notify(scene, '💠 DROP CORE!\nPulso liberado: inimigos receberam dano.', 'success');
    }

    function spawnDropper(scene) {
        if (!scene || !scene.physics || !scene.add) return;
        if (!R().enemies || !R().enemies.create) return;
        if (R().enemies.countActive(true) >= 42) return;

        const x = Math.random() < 0.5 ? -60 : scene.scale.width + 60;
        const y = Phaser.Math.Between(60, Math.max(60, scene.scale.height - 60));
        const e = R().enemies.create(x, y, 'drop1_enemy');
        e.health = 3;
        e.setData('maxHealth', 3);
        e.setData('aiRole', 'drop1_dropper');
        e.setData('drop1Enemy', true);
        e.setData('defeated', false);
        e.setActive(true).setVisible(true);
        e.setDepth(5);
        e.setScale(1.0);
        sound('enemy');
        flash(scene, x, y, 0xff3bf2, 18);
        notify(scene, '⚠️ DROPper entrou na arena!', 'warning');
    }

    function updateDroppers(scene, time) {
        if (!R().enemies || !scene || !R().player1) return;
        const target = R().player1;
        R().enemies.getChildren().forEach(e => {
            if (!e || !e.active || !e.getData('drop1Enemy')) return;

            if (state.feverUntil > time) {
                e.setTint(0xffff66);
            } else {
                e.clearTint();
            }

            const dist = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
            const angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y);
            const orbit = angle + Math.sin(time * 0.003 + e.x * 0.01) * 0.65;
            const desiredSpeed = dist > 360 ? 135 : (dist < 250 ? -110 : 85);
            e.setVelocity(Math.cos(orbit) * desiredSpeed, Math.sin(orbit) * desiredSpeed);

            if (!e.nextDrop1Shot) e.nextDrop1Shot = time + 700;
            if (time >= e.nextDrop1Shot && R().enemyBullets && R().enemyBullets.countActive(true) < 65) {
                const b = R().enemyBullets.create(e.x, e.y, 'drop1_bullet');
                b.setData('sourceEnemy', e);
                b.setData('enemyDamage', 1);
                b.setData('drop1Bullet', true);
                b.setDepth(4);
                const aim = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y);
                const spread = (Math.random() - 0.5) * 0.16;
                scene.physics.velocityFromRotation(aim + spread, state.feverUntil > time ? 520 : 430, b.body.velocity);
                e.nextDrop1Shot = time + (state.feverUntil > time ? 1050 : 1650);
            }
        });
    }

    function detectKills(scene, time) {
        const current = Number(localStorage.getItem('neon_total_kills') || 0);
        if (current > state.lastKillCount) {
            const gained = Math.min(20, current - state.lastKillCount);
            state.lastKillCount = current;
            state.killStreak += gained;
            state.streakDeadline = time + 7000;
            if (state.killStreak >= 5) {
                state.killStreak = 0;
                state.feverUntil = time + 6000;
                sound('fever');
                notify(scene, '🔥 DROP FEVER!\n5 eliminações rápidas ativaram o Drop Surge!', 'achievement');
                flash(scene, scene.scale.width / 2, scene.scale.height / 2, 0xff3bf2, 80);
            }
        }
        if (state.killStreak > 0 && time > state.streakDeadline) state.killStreak = 0;
    }

    function secretSignal(scene, time) {
        if (state.secretShown || !scene || time < state.nextSecretAt) return;
        if (Math.random() > 0.012) {
            state.nextSecretAt = time + 900;
            return;
        }
        state.secretShown = true;
        localStorage.setItem(PREFIX + 'secret', 'true');
        sound('secret');
        flash(scene, scene.scale.width / 2, scene.scale.height / 2, 0x9b5cff, 90);

        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;pointer-events:none;font:900 30px Arial,sans-serif;color:#fff;text-shadow:0 0 10px #9b5cff,0 0 25px #00f6ff';
        wrap.innerHTML = `<img src="${ICONS.secret}" width="38" height="38" style="margin-right:12px"><span>DROP//NULL</span>`;
        document.body.appendChild(wrap);
        setTimeout(() => wrap.remove(), 1500);
        notify(scene, '🔐 SEGREDO ENCONTRADO!\nDROP//NULL', 'achievement');
    }

    function setupScene(scene) {
        scene = safeScene(scene);
        if (!scene || state.scene === scene && state.setupDone) return;
        state.scene = scene;
        state.setupDone = true;

        if (scene.textures) {
            addTextureFromSVG(scene, 'drop1_enemy', SVG.enemy);
            addTextureFromSVG(scene, 'drop1_bullet', SVG.bullet);
            addTextureFromSVG(scene, 'drop1_core', SVG.core);
        }

        setTimeout(() => {
            if (!scene.sys || !scene.sys.isActive || !scene.sys.isActive() || !scene.physics) return;
            if (!state.pickupGroup || !state.pickupGroup.scene) {
                state.pickupGroup = scene.physics.add.group();
            }

            if (R().player1 && !scene.__drop1Overlaps) {
                scene.__drop1Overlaps = true;
                scene.physics.add.overlap(R().player1, state.pickupGroup, (p, c) => collectCore(scene, p, c), null, scene);
                if (R().player2) {
                    scene.physics.add.overlap(R().player2, state.pickupGroup, (p, c) => collectCore(scene, p, c), null, scene);
                }
            }

            state.nextCoreAt = scene.time.now + 7000;
            state.nextEnemyAt = scene.time.now + 9000;
            state.nextSecretAt = scene.time.now + 6000;
            createPanel();
        }, 0);

        scene.events.once('shutdown', () => {
            if (state.panel) {
                state.panel.remove();
                state.panel = null;
            }
            state.pickupGroup = null;
            state.setupDone = false;
        });
    }

    function update(scene, time) {
        scene = safeScene(scene);
        if (!scene || !scene.time) return;
        if (!state.setupDone) setupScene(scene);

        if (!R().isPlaying || R().isGameOver || R().isPaused) return;

        if (time >= state.nextCoreAt) {
            spawnCore(scene);
            state.nextCoreAt = time + (state.feverUntil > time ? 9000 : 14000);
        }

        if (time >= state.nextEnemyAt) {
            spawnDropper(scene);
            state.nextEnemyAt = time + (state.feverUntil > time ? 8500 : 18000);
        }

        detectKills(scene, time);
        updateDroppers(scene, time);
        secretSignal(scene, time);

        if (state.feverUntil > time && time - state.lastPulse > 700) {
            state.lastPulse = time;
            flash(scene, scene.scale.width / 2, scene.scale.height / 2, 0xff3bf2, 45);
        }
    }

    function afterStart(scene) {
        setupScene(scene);
        // Exposição opcional para debug/integrações.
        window.NeonArena2Drop1 = {
            name: MOD_NAME,
            version: MOD_VERSION,
            state,
            getCores: () => state.cores,
            isFeverActive: () => state.feverUntil > (state.scene ? state.scene.time.now : performance.now()),
            spawnCore: () => spawnCore(safeScene()),
            spawnDropper: () => spawnDropper(safeScene())
        };
    }

    if (window.NeonArena2Builtin) {
        window.NeonArena2Builtin.register(MOD_NAME + ' [BUILT-IN]', {
            afterGameStart: afterStart,
            sceneCreate: setupScene,
            sceneUpdate: update
        });
        console.log('[Neon Arena 2][Official Update] ' + MOD_NAME + ' v' + MOD_VERSION + ' integrado ao jogo base.');
    } else {
        console.error('[Drop #1] Sistema de updates oficiais não encontrado.');
    }
})();


/*
 * NEON ARENA 2 — DROP UPDATE #2
 * v1.0.0
 * Conteúdo oficial integrado ao jogo base.
 *
 * Foco: nova identidade visual em SVG.
 * - 2 logos oficiais reutilizáveis
 * - ícone do Drop #2
 * - Spark + badge SVG
 * - Galeria de logos no menu
 * - pequena marca visual do Drop #2
 */
(function () {
    'use strict';

    const VERSION = '1.0.0';
    const state = { scene: null, badge: null, logo: null, gallery: null, opened: false };

    function destroy(obj) { try { if (obj && obj.active) obj.destroy(); } catch (_) {} }

    function logoSize(scene) {
        const w = Math.max(260, Math.min(430, scene.scale.width * 0.34));
        return { w, h: w * 150 / 520 };
    }

    function addMenuLogo(scene) {
        if (!svgAssetsEnabled || !scene || scene.scale.width < 420 || !scene.textures.exists('na_logo_02')) return;
        if (state.logo && state.logo.scene) return;

        const oldTitle = (scene.children.list || []).find(o => o && o.type === 'Text' && o.text === 'NEON ARENA 2');
        if (oldTitle) oldTitle.setVisible(false);

        const size = logoSize(scene);
        state.logo = scene.add.image(scene.scale.width / 2, Math.max(64, scene.scale.height / 4 - 150), 'na_logo_02')
            .setDisplaySize(size.w, size.h)
            .setOrigin(0.5)
            .setDepth(20);

        if (window.neonAnimationsEnabled ? window.neonAnimationsEnabled() : true) {
            state.logo.setAlpha(0);
            scene.tweens.add({ targets: state.logo, alpha: 1, duration: 450, ease: 'Quad.easeOut' });
        }
    }

    function showGallery(scene) {
        if (!svgAssetsEnabled || !scene || state.gallery || !scene.textures.exists('na_logo_01') || !scene.textures.exists('na_logo_02')) return;
        state.opened = true;
        localStorage.setItem('neon_drop2_logo_seen', 'true');
        if (typeof showNotification === 'function') showNotification(scene, '✨ GALERIA DE LOGOS\nDrop #2 desbloqueou a nova identidade visual.', 'success');

        const W = Math.min(760, scene.scale.width - 30);
        const H = Math.min(520, scene.scale.height - 30);
        const cx = scene.scale.width / 2, cy = scene.scale.height / 2;
        const els = [];
        const bg = scene.add.rectangle(cx, cy, W, H, 0x050814, 0.97).setStrokeStyle(2, 0x00f6ff, 0.8).setDepth(9000);
        const title = scene.add.text(cx, cy - H / 2 + 34, '✦ DROP #2 — LOGO VAULT', { fontSize: '25px', color: '#00f6ff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(9001);
        const sub = scene.add.text(cx, cy - H / 2 + 68, 'As duas marcas SVG são assets oficiais e reutilizáveis em versões futuras.', { fontSize: '12px', color: '#bfefff', align: 'center', wordWrap: { width: W - 60 } }).setOrigin(0.5).setDepth(9001);
        els.push(bg, title, sub);

        const left = scene.add.image(cx - W * 0.24, cy - 5, 'na_logo_01').setDisplaySize(Math.min(290, W * .38), Math.min(90, H * .24)).setDepth(9001);
        const right = scene.add.image(cx + W * 0.24, cy - 5, 'na_logo_02').setDisplaySize(Math.min(330, W * .43), Math.min(96, H * .25)).setDepth(9001);
        const l1 = scene.add.text(cx - W * 0.24, cy + 78, 'LOGO 01 • MASTER', { fontSize: '13px', color: '#00f6ff' }).setOrigin(0.5).setDepth(9001);
        const l2 = scene.add.text(cx + W * 0.24, cy + 78, 'LOGO 02 • VERSIONADA', { fontSize: '13px', color: '#ff3bf2' }).setOrigin(0.5).setDepth(9001);
        els.push(left, right, l1, l2);

        const info = scene.add.text(cx, cy + H / 2 - 82, '01 = marca base\n02 = marca com numeração da versão\n\nO número pode mudar em versões futuras sem abandonar a identidade.', { fontSize: '14px', color: '#fff', align: 'center', lineSpacing: 6 }).setOrigin(0.5).setDepth(9001);
        const close = scene.add.text(cx, cy + H / 2 - 28, 'FECHAR', { fontSize: '17px', backgroundColor: '#15243a', color: '#fff', padding: { left: 14, right: 14, top: 8, bottom: 8 } }).setOrigin(0.5).setInteractive().setDepth(9002);
        els.push(info, close);
        close.on('pointerdown', () => { els.forEach(destroy); state.gallery = null; });
        state.gallery = { destroy: () => { els.forEach(destroy); state.gallery = null; } };
    }

    function addDropBadge(scene) {
        if (!svgAssetsEnabled || !scene || state.badge || scene.scale.width < 420 || !scene.textures.exists('drop2_badge')) return;
        const badge = scene.add.image(28, 28, 'drop2_badge').setDisplaySize(38, 38).setOrigin(0.5).setDepth(30).setInteractive({ useHandCursor: true });
        const label = scene.add.text(54, 28, 'DROP #2', { fontSize: '13px', color: '#00f6ff', fontStyle: 'bold', backgroundColor: '#071018', padding: { left: 7, right: 7, top: 5, bottom: 5 } }).setOrigin(0, 0.5).setDepth(30).setInteractive();
        const hit = () => showGallery(scene);
        badge.on('pointerdown', hit); label.on('pointerdown', hit);
        state.badge = { badge, label };
    }

    function addGameMark(scene) {
        // Keep the in-game mark tiny and away from the main HUD.
        if (!svgAssetsEnabled || !scene || !isPlaying || !scene.textures.exists('na_logo_01')) return;
        if (scene.__drop2GameMark) return;
        const mark = scene.add.image(scene.scale.width - 18, scene.scale.height - 18, 'na_logo_01')
            .setDisplaySize(105, 30).setOrigin(1, 1).setAlpha(0.38).setDepth(2).setScrollFactor(0);
        scene.__drop2GameMark = mark;
    }

    function create(scene) {
        if (state.scene !== scene) {
            state.logo = null;
            state.badge = null;
            state.gallery = null;
        }
        state.scene = scene;
        if (!isPlaying) {
            setTimeout(() => {
                if (!scene.sys || !scene.sys.isActive || !scene.sys.isActive()) return;
                addMenuLogo(scene);
                addDropBadge(scene);
            }, 20);
        } else {
            addGameMark(scene);
        }
    }

    function update(scene) {
        if (!scene || !scene.sys || !scene.sys.isActive || !scene.sys.isActive()) return;
        if (state.gallery && isPlaying) state.gallery.destroy();
        if (!isPlaying) {
            if (!state.logo || !state.logo.scene) addMenuLogo(scene);
            if (!state.badge) addDropBadge(scene);
        } else {
            addGameMark(scene);
        }
    }

    function shutdown() {
        if (state.gallery) state.gallery.destroy();
        state.gallery = null;
        state.logo = null;
        state.badge = null;
        state.scene = null;
    }

    if (window.NeonArena2Builtin) {
        window.NeonArena2Builtin.register('Drop Update #2 [BUILT-IN] v' + VERSION, {
            afterGameStart: create,
            sceneCreate: create,
            sceneUpdate: update
        });
        console.log('[Neon Arena 2][Official Update] Drop Update #2 v' + VERSION + ' integrado.');
    }
})();


    game = new Phaser.Game(config);
}
neonStartGame();

// ==========================================================
// NEON ARENA 2 v4.4 — POLISH / PERFORMANCE UPDATE
// Camada adicional segura: não substitui o núcleo do jogo.
// ==========================================================
const NA44_DEFAULTS = {
    performance: localStorage.getItem('neon_performance_mode') || 'auto',
    audioAnalysis: localStorage.getItem('neon_audio_analysis') !== 'false',
    inputIndicator: localStorage.getItem('neon_input_indicator') !== 'false'
};

let na44Perf = NA44_DEFAULTS.performance;
let na44AudioAnalysis = NA44_DEFAULTS.audioAnalysis;
let na44InputIndicator = NA44_DEFAULTS.inputIndicator;
let na44Fps = 60;
let na44FpsFrames = 0;
let na44FpsLast = 0;
let na44InputType = 'PC';
let na44Indicator = null;
let na44LastPointer = 0;
let na44PerfCooldown = 0;

function na44SaveSettings() {
    try {
        localStorage.setItem('neon_performance_mode', na44Perf);
        localStorage.setItem('neon_audio_analysis', na44AudioAnalysis ? 'true' : 'false');
        localStorage.setItem('neon_input_indicator', na44InputIndicator ? 'true' : 'false');
    } catch (e) {}
}

function na44DetectInput(type) {
    if (type === 'touch') na44InputType = 'TOUCH';
    else if (type === 'gamepad') na44InputType = 'CONTROLE';
    else na44InputType = 'PC';
    na44LastPointer = performance.now();
}

function na44CreateIndicator(scene) {
    if (!na44InputIndicator || na44Indicator || !scene || !scene.add) return;
    na44Indicator = scene.add.text(config.width - 14, config.height - 14, 'ENTRADA: ' + na44InputType, {
        fontFamily: 'monospace', fontSize: '12px', color: '#00ffcc',
        backgroundColor: '#071018', padding: { x: 7, y: 5 }
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(9000).setAlpha(0.72);
}

function na44UpdateIndicator(scene) {
    if (!scene || !scene.add) return;
    if (!na44InputIndicator) {
        if (na44Indicator) { na44Indicator.destroy(); na44Indicator = null; }
        return;
    }
    if (!na44Indicator || !na44Indicator.active) na44CreateIndicator(scene);
    if (na44Indicator) {
        na44Indicator.setText('ENTRADA: ' + na44InputType);
        na44Indicator.setPosition(config.width - 14, config.height - 14);
    }
}

function na44ApplyPerformance() {
    if (na44Perf === 'low') {
        ENGINE_LIMITS.maxEnemies = 30;
        ENGINE_LIMITS.maxEnemyBullets = 45;
        ENGINE_LIMITS.maxBullets = 65;
        ENGINE_LIMITS.maxTurretBullets = 40;
        ENGINE_LIMITS.maxTornados = 2;
        ENGINE_LIMITS.replaySampleEvery = 4;
    } else if (na44Perf === 'high') {
        ENGINE_LIMITS.maxEnemies = 52;
        ENGINE_LIMITS.maxEnemyBullets = 90;
        ENGINE_LIMITS.maxBullets = 110;
        ENGINE_LIMITS.maxTurretBullets = 75;
        ENGINE_LIMITS.maxTornados = 4;
        ENGINE_LIMITS.replaySampleEvery = 2;
    } else {
        ENGINE_LIMITS.maxEnemies = 42;
        ENGINE_LIMITS.maxEnemyBullets = 70;
        ENGINE_LIMITS.maxBullets = 90;
        ENGINE_LIMITS.maxTurretBullets = 60;
        ENGINE_LIMITS.maxTornados = 3;
        ENGINE_LIMITS.replaySampleEvery = 2;
    }
}

function na44AutoPerformance(scene, time) {
    if (na44Perf !== 'auto') return;
    if (!na44FpsLast) na44FpsLast = time;
    na44FpsFrames++;
    if (time - na44FpsLast < 1000) return;
    na44Fps = Math.round(na44FpsFrames * 1000 / Math.max(1, time - na44FpsLast));
    na44FpsFrames = 0;
    na44FpsLast = time;
    if (na44PerfCooldown > 0) { na44PerfCooldown--; return; }

    if (na44Fps < 35) {
        ENGINE_LIMITS.maxEnemies = Math.max(24, ENGINE_LIMITS.maxEnemies - 4);
        ENGINE_LIMITS.maxEnemyBullets = Math.max(35, ENGINE_LIMITS.maxEnemyBullets - 8);
        ENGINE_LIMITS.maxBullets = Math.max(55, ENGINE_LIMITS.maxBullets - 8);
        ENGINE_LIMITS.maxTurretBullets = Math.max(30, ENGINE_LIMITS.maxTurretBullets - 5);
        ENGINE_LIMITS.maxTornados = Math.max(1, ENGINE_LIMITS.maxTornados - 1);
        ENGINE_LIMITS.replaySampleEvery = Math.min(5, ENGINE_LIMITS.replaySampleEvery + 1);
        na44PerfCooldown = 3;
    } else if (na44Fps > 58) {
        ENGINE_LIMITS.maxEnemies = Math.min(42, ENGINE_LIMITS.maxEnemies + 2);
        ENGINE_LIMITS.maxEnemyBullets = Math.min(70, ENGINE_LIMITS.maxEnemyBullets + 4);
        ENGINE_LIMITS.maxBullets = Math.min(90, ENGINE_LIMITS.maxBullets + 4);
        ENGINE_LIMITS.maxTurretBullets = Math.min(60, ENGINE_LIMITS.maxTurretBullets + 3);
        ENGINE_LIMITS.maxTornados = Math.min(3, ENGINE_LIMITS.maxTornados + 1);
        ENGINE_LIMITS.replaySampleEvery = Math.max(2, ENGINE_LIMITS.replaySampleEvery - 1);
        na44PerfCooldown = 3;
    }
}

// Microfone: o processamento pesado pode ser desligado sem remover o sistema.
const na44OriginalUpdate = update;
update = function(time) {
    if (typeof analyser !== 'undefined' && analyser && !na44AudioAnalysis) {
        // O wrapper abaixo não toca no stream; apenas evita a análise por frame.
        // O código original só desenha a barra quando analyser existe, portanto
        // deixamos a flag disponível para ferramentas/versões futuras.
    }
    const result = na44OriginalUpdate.call(this, time);
    try {
        na44AutoPerformance(this, time);
        na44UpdateIndicator(this);
    } catch (e) {}
    return result;
};

// Detecta mudanças de dispositivo sem alterar os controles existentes.
window.addEventListener('pointerdown', function(e) {
    if (e.pointerType === 'touch') na44DetectInput('touch');
    else na44DetectInput('pc');
});
window.addEventListener('gamepadconnected', function() { na44DetectInput('gamepad'); });
window.addEventListener('gamepaddisconnected', function() { na44DetectInput('pc'); });

// API de configuração para testes/debug. Não aparece no menu.
function neonPolishHelp() {
    console.log('%cNEON ARENA 2 — POLISH TOOLS', 'font-size:16px;font-weight:bold;color:#00ffcc');
    console.log('neonPerformance("auto"|"low"|"high")');
    console.log('neonAudioAnalysis(true|false)');
    console.log('neonInputIndicator(true|false)');
    console.log('neonPolishStatus()');
}

function neonPerformance(mode) {
    if (!['auto','low','high'].includes(mode)) return console.warn('Use: auto, low ou high');
    na44Perf = mode;
    if (mode !== 'auto') na44ApplyPerformance();
    else na44ApplyPerformance();
    na44SaveSettings();
    console.log('[Neon 4.4] Performance:', na44Perf);
}

function neonAudioAnalysis(enabled) {
    na44AudioAnalysis = !!enabled;
    na44SaveSettings();
    console.log('[Neon 4.4] Análise de áudio:', na44AudioAnalysis ? 'ON' : 'OFF');
}

function neonInputIndicator(enabled) {
    na44InputIndicator = !!enabled;
    na44SaveSettings();
    const scene = game && game.scene && game.scene.scenes ? game.scene.scenes[0] : null;
    if (scene) na44UpdateIndicator(scene);
    console.log('[Neon 4.4] Indicador de entrada:', na44InputIndicator ? 'ON' : 'OFF');
}

function neonPolishStatus() {
    console.table({
        versao: '4.4', performance: na44Perf, fps: na44Fps,
        audioAnalysis: na44AudioAnalysis, input: na44InputType,
        maxEnemies: ENGINE_LIMITS.maxEnemies,
        maxEnemyBullets: ENGINE_LIMITS.maxEnemyBullets,
        maxBullets: ENGINE_LIMITS.maxBullets,
        replaySampleEvery: ENGINE_LIMITS.replaySampleEvery
    });
}

if (typeof window !== 'undefined') {
    window.neonPolishHelp = neonPolishHelp;
    window.neonPerformance = neonPerformance;
    window.neonAudioAnalysis = neonAudioAnalysis;
    window.neonInputIndicator = neonInputIndicator;
    window.neonPolishStatus = neonPolishStatus;
}

na44ApplyPerformance();
if (typeof performanceMode !== 'undefined' && typeof na44Perf !== 'undefined') {
    na44Perf = performanceMode === 'medium' ? 'auto' : performanceMode;
    na44ApplyPerformance();
}


// ================================================================
// NEON ARENA 2 — MORE VISUAL EFFECTS SYSTEM
// Efeitos leves e temporários; respeitam o preset de desempenho.
// ================================================================
let naVisualLastTrail = 0;
let naVisualLastEvent = '';
function naVisualBurst(scene,x,y,tint=0x00ffff,amount=6,scale=1){
    const level=getVisualFXLevel(); if(!scene||!scene.add||level<=0)return;
    const count=Math.min(amount,level===1?3:level===2?6:9), life=level===1?220:level===2?300:380;
    const ring=scene.add.circle(x,y,8,tint,0.22).setStrokeStyle(level===3?3:2,tint,0.9).setDepth(20);
    scene.tweens.add({targets:ring,radius:34*scale,alpha:0,duration:life,ease:'Cubic.easeOut',onComplete:()=>ring.destroy()});
    for(let i=0;i<count;i++){const a=Math.PI*2*i/count+Math.random()*.35,d=Phaser.Math.Between(18,42)*scale,dot=scene.add.circle(x,y,level===1?2:2.5,tint,.9).setDepth(21);scene.tweens.add({targets:dot,x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,alpha:0,scale:.25,duration:life,ease:'Cubic.easeOut',onComplete:()=>dot.destroy()});}
}
function naVisualHit(scene,x,y,critical=false){if(getVisualFXLevel()>0&&scene)naVisualBurst(scene,x,y,critical?0xff44ff:0x66ffff,critical?9:4,critical?1.15:.75);}
function naVisualKill(scene,x,y,key=''){const level=getVisualFXLevel();if(level<=0||!scene)return;const boss=/boss|colossus|miniboss|tank/i.test(key),tint=boss?0xff3366:0x00ffcc;naVisualBurst(scene,x,y,tint,level>=4?(key==='colossus'?18:11):(key==='colossus'?12:7),level>=4?(key==='colossus'?2.15:1.25):(key==='colossus'?1.7:1));if(level>=2&&boss&&scene.cameras&&scene.cameras.main)scene.cameras.main.shake(level>=4?170:(level===3?120:70),level>=4?.012:(level===3?.008:.004));}
function naVisualMuzzle(scene,x,y,angle,tint=0x00ffff){const level=getVisualFXLevel();if(level<2||!scene)return;const f=scene.add.circle(x+Math.cos(angle)*15,y+Math.sin(angle)*15,level>=4?10:(level===3?8:6),tint,.55).setDepth(22);scene.tweens.add({targets:f,scale:1.8,alpha:0,duration:level>=4?120:(level===3?90:70),onComplete:()=>f.destroy()});}
function naVisualTrail(scene,player){const level=getVisualFXLevel();if(level<2||!scene||!player||!player.active)return;const now=scene.time.now,interval=level>=4?45:(level===3?65:105);if(now<naVisualLastTrail)return;naVisualLastTrail=now+interval;const t=scene.add.circle(player.x,player.y,level>=4?7:(level===3?5:4),0x00ffff,level>=4?.38:(level===3?.28:.2)).setDepth(1);scene.tweens.add({targets:t,scale:.2,alpha:0,duration:180,onComplete:()=>t.destroy()});}
function naVisualLevelUp(scene){const level=getVisualFXLevel();if(level<=0||!scene||!player1)return;const r=scene.add.circle(player1.x,player1.y,16,0x00ffff,0).setStrokeStyle(level>=4?7:(level>=3?5:3),0x00ffff,1).setDepth(30);scene.tweens.add({targets:r,radius:level>=4?135:(level>=3?105:75),alpha:0,duration:420,ease:'Cubic.easeOut',onComplete:()=>r.destroy()});if(level>=2)naVisualBurst(scene,player1.x,player1.y,0x66ffff,10,1.25);}
function naVisualEventBurst(scene,color=0xff00ff){const level=getVisualFXLevel();if(level<=0||!scene)return;const r=scene.add.circle(config.width/2,config.height/2,40,color,0).setStrokeStyle(level>=4?7:(level>=3?5:3),color,.9).setDepth(90);scene.tweens.add({targets:r,radius:Math.max(config.width,config.height)*.65,alpha:0,duration:level===3?700:450,ease:'Cubic.easeOut',onComplete:()=>r.destroy()});}
function naVisualUpdate(scene){if(!scene||!isPlaying||isGameOver||isPaused)return;if(player1&&player1.active&&(Math.abs(player1.body?.velocity?.x||0)+Math.abs(player1.body?.velocity?.y||0))>180)naVisualTrail(scene,player1);if(typeof v5!=='undefined'&&v5.event&&v5.event!==naVisualLastEvent){naVisualLastEvent=v5.event;naVisualEventBurst(scene,{overload:0xffdd33,ghost:0xaa66ff,gems:0x55ffff,espioner:0x00ffff,boss:0xff3366}[v5.event]||0xff00ff);}naBetterDetailsUpdate(scene,scene.time.now);}

// ================================================================
// NEON ARENA 2 v5.0 — BIG SYSTEM UPDATE
// Desafios diários • Estatísticas • Títulos • Combo • Eventos •
// Arenas • Música • Sandbox • Save 2.0 • AI Director
// ================================================================
const V5_SAVE_KEY = 'neon_v5_profile';
const V5_CHALLENGE_KEY = 'neon_v5_daily';
const V5_TITLES = [
    {id:'novato', name:'NOVATO', need:0},
    {id:'cacador', name:'CAÇADOR', need:50},
    {id:'veterano', name:'VETERANO', need:250},
    {id:'mestre', name:'MESTRE', need:750},
    {id:'lenda', name:'LENDÁRIO', need:2000}
];
const V5_ARENAS = {
    grid:{name:'NEON GRID', bg:0x111111, grid:0x222222},
    city:{name:'CYBER CITY', bg:0x090d18, grid:0x16304a},
    lab:{name:'CYBER LAB', bg:0x101018, grid:0x303018},
    void:{name:'VOID', bg:0x08000d, grid:0x26002f},
    factory:{name:'FACTORY', bg:0x17130b, grid:0x33270e}
};
const V5_EVENTS = [
    {id:'overload', name:'⚡ SOBRECARGA', duration:12000, text:'Inimigos acelerados e recompensas +50%!'},
    {id:'ghost', name:'👻 INVASÃO FANTASMA', duration:10000, text:'Uma pequena invasão de Ghosts começou!'},
    {id:'gems', name:'💎 CHUVA DE GEMAS', duration:10000, text:'Gemas extras estão aparecendo!'},
    {id:'espioner', name:'🕵️ INVESTIGAÇÃO', duration:9000, text:'Os Espioners localizaram você!'},
    {id:'boss', name:'👑 BOSS SURPRESA', duration:10000, text:'Um chefe surpresa entrou na arena!'}
];
let v5NextAutoSave = 0;
let v5 = {
    kills:0, shots:0, hits:0, damageDealt:0, damageTaken:0, collisions:0,
    jumps:0, slides:0, lasers:0, bombs:0, totalPlayMs:0, sessionStart:0,
    combo:0, comboBest:Number(localStorage.getItem('neon_v5_combo_best'))||0,
    comboUntil:0, event:null, eventUntil:0, lastEvent:0, director:1,
    arena:localStorage.getItem('neon_v5_arena')||'grid', music:localStorage.getItem('neon_v5_music')!=='off',
    challenge:null, challengeProgress:0, title:localStorage.getItem('neon_v5_title')||'novato',
    sandbox:false, challengeDate:''
};
try { Object.assign(v5, JSON.parse(localStorage.getItem(V5_SAVE_KEY)||'{}')); } catch(e) {}

function v5DateKey(){ return new Date().toISOString().slice(0,10); }
function v5LoadChallenge(){
    const today=v5DateKey();
    let saved={}; try{saved=JSON.parse(localStorage.getItem(V5_CHALLENGE_KEY)||'{}')}catch(e){}
    if(saved.date===today && saved.challenge){ v5.challenge=saved.challenge; v5.challengeProgress=Number(saved.progress)||0; v5.challengeDate=today; return; }
    const list=[
        {id:'kills',name:'Caçador Neon',desc:'Derrote 100 inimigos',goal:100,reward:1500},
        {id:'score',name:'Pontuação Alta',desc:'Faça 5000 pontos',goal:5000,reward:1200},
        {id:'survive',name:'Sobrevivente',desc:'Jogue por 5 minutos',goal:300000,reward:1800},
        {id:'combo',name:'Combo Insano',desc:'Alcance combo 20',goal:20,reward:2000},
        {id:'shots',name:'Chuva de Neon',desc:'Dispare 500 tiros',goal:500,reward:1000}
    ];
    v5.challenge=list[Math.floor(Math.random()*list.length)]; v5.challengeProgress=0; v5.challengeDate=today;
    localStorage.setItem(V5_CHALLENGE_KEY,JSON.stringify({date:today,challenge:v5.challenge,progress:0}));
}
function v5Save(){
    try{localStorage.setItem(V5_SAVE_KEY,JSON.stringify({kills:v5.kills,shots:v5.shots,hits:v5.hits,damageDealt:v5.damageDealt,damageTaken:v5.damageTaken,totalPlayMs:v5.totalPlayMs,comboBest:v5.comboBest,arena:v5.arena,music:v5.music,title:v5.title}));}catch(e){}
    try{localStorage.setItem('neon_v5_combo_best',String(v5.comboBest));}catch(e){}
}
function v5CurrentScene(){ return (typeof game!=='undefined'&&game.scene&&game.scene.scenes)?game.scene.scenes.find(s=>s&&s.scene&&s.scene.isActive())||game.scene.scenes[0]:null; }
function v5Toast(scene,msg){ if(typeof showNotification==='function'&&scene) showNotification(scene,msg,'achievement'); }
let v5LastChallengeSave = 0;
function v5SetChallengeProgress(value, scene){
    if(!v5.challenge) return;
    const next = Math.min(v5.challenge.goal, Math.max(v5.challengeProgress, value));
    const changed = next !== v5.challengeProgress;
    v5.challengeProgress = next;
    const now = Date.now();
    const completed = v5.challengeProgress >= v5.challenge.goal && !v5.challenge.done;
    // Persistência limitada: desafios como 'sobreviva' eram salvos a cada frame.
    if (changed && (completed || now - v5LastChallengeSave >= 1000)) {
        v5LastChallengeSave = now;
        localStorage.setItem(V5_CHALLENGE_KEY,JSON.stringify({date:v5.challengeDate,challenge:v5.challenge,progress:v5.challengeProgress}));
    }
    if(completed){
        v5.challenge.done=true;
        v5LastChallengeSave = now;
        localStorage.setItem(V5_CHALLENGE_KEY,JSON.stringify({date:v5.challengeDate,challenge:v5.challenge,progress:v5.challengeProgress}));
        score+=v5.challenge.reward; v5Toast(scene,'🏆 DESAFIO DIÁRIO concluído! +'+v5.challenge.reward+' PTS');
    }
}
function v5UpdateChallenge(scene){
    if(!v5.challenge||v5.challenge.done) return;
    if(v5.challenge.id==='score') v5SetChallengeProgress(score,scene);
    else if(v5.challenge.id==='survive'&&v5.sessionStart) v5SetChallengeProgress(Date.now()-v5.sessionStart,scene);
    else if(v5.challenge.id==='combo') v5SetChallengeProgress(v5.combo,scene);
    else if(v5.challenge.id==='kills') v5SetChallengeProgress(v5.kills,scene);
    else if(v5.challenge.id==='shots') v5SetChallengeProgress(v5.shots,scene);
}
function v5Title(){
    let unlocked=V5_TITLES[0];
    for(const t of V5_TITLES) if(v5.kills>=t.need) unlocked=t;
    if(v5.title!==unlocked.id){v5.title=unlocked.id;v5Toast(v5CurrentScene(),'🎖️ Novo título desbloqueado: '+unlocked.name);v5Save();}
    return unlocked.name;
}
function v5ComboKill(scene){
    v5.combo++; v5.comboUntil=Date.now()+3000;
    if(v5.combo>v5.comboBest){v5.comboBest=v5.combo;localStorage.setItem('neon_v5_combo_best',String(v5.comboBest));}
    if(v5.combo>=5 && v5.combo%5===0) v5Toast(scene,'🔥 COMBO x'+v5.combo+'!');
    v5UpdateChallenge(scene);
}
function v5ResetCombo(){ if(v5.comboUntil && Date.now()>v5.comboUntil) v5.combo=0; }
function v5Director(scene){
    if(!isPlaying||isGameOver||gameMode==='legacy') return;
    const pressure=(v5.combo>=10?0.08:0)+(hp1<=2?-0.08:0)+(v5.kills>0?Math.min(0.15,v5.kills/1000):0);
    v5.director=Math.max(0.88,Math.min(1.25,1+pressure));
}
function v5StartEvent(scene){
    if(gameMode==='legacy'||v5.event||Date.now()-v5.lastEvent<25000) return;
    if(Math.random()>0.012) return;
    const ev=V5_EVENTS[Math.floor(Math.random()*V5_EVENTS.length)];
    v5.event=ev.id; v5.eventUntil=Date.now()+ev.duration; v5.lastEvent=Date.now();
    v5Toast(scene,ev.name+' — '+ev.text);
    naVisualEventBurst(scene,({overload:0xffdd33,ghost:0xaa66ff,gems:0x55ffff,espioner:0x00ffff,boss:0xff3366}[ev.id]||0xff00ff));
    if(ev.id==='ghost') for(let i=0;i<3;i++) spawnEnemy(scene,'ghost');
    if(ev.id==='espioner' && typeof spawnEspionerSquad==='function') spawnEspionerSquad(scene);
    if(ev.id==='boss' && typeof spawnBoss==='function') { try{spawnBoss(scene);}catch(e){} }
    if(ev.id==='gems') for(let i=0;i<8;i++){ let x=Phaser.Math.Between(40,config.width-40),y=Phaser.Math.Between(80,config.height-40); gems.create(x,y,'gem_blue').xpValue=40; }
}
function v5EventMultiplier(){return v5.event==='overload'?1.5:1;}
function v5EventUpdate(scene){
    if(v5.event && Date.now()>v5.eventUntil){v5.event=null;v5Toast(scene,'✅ Evento encerrado.');}
    // A aceleração do evento é aplicada no multiplicador de velocidade da IA.
    // Evita multiplicar a velocidade acumulativamente a cada frame.
    if(v5.event==='overload' && v5.director !== 1) { /* diretor já é aplicado pela IA */ }
}
function v5StatsText(){
    const mins=Math.floor(v5.totalPlayMs/60000),secs=Math.floor(v5.totalPlayMs/1000)%60;
    const acc=v5.shots?((v5.hits/v5.shots)*100).toFixed(1):'0.0';
    return `📊 ESTATÍSTICAS\nKills: ${v5.kills}\nDano causado: ${Math.floor(v5.damageDealt)}\nDano recebido: ${Math.floor(v5.damageTaken)}\nTiros: ${v5.shots}\nAcertos: ${v5.hits}\nPrecisão: ${acc}%\nMelhor combo: x${v5.comboBest}\nTempo total: ${mins}m ${secs}s\nTítulo: ${v5Title()}`;
}
function v5ExportSave(){
    v5Save(); const data=btoa(unescape(encodeURIComponent(JSON.stringify({profile:JSON.parse(localStorage.getItem(V5_SAVE_KEY)||'{}'),challenge:JSON.parse(localStorage.getItem(V5_CHALLENGE_KEY)||'{}')}))));
    const a=document.createElement('a');a.href='data:application/json;base64,'+data;a.download='neon-arena-2-save.json';a.click();
}
function v5ImportSave(){
    const i=document.createElement('input');i.type='file';i.accept='.json,application/json';
    i.onchange=()=>{const f=i.files&&i.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d.profile)localStorage.setItem(V5_SAVE_KEY,JSON.stringify(d.profile));if(d.challenge)localStorage.setItem(V5_CHALLENGE_KEY,JSON.stringify(d.challenge));location.reload();}catch(e){alert('Save inválido.')}};r.readAsText(f);};i.click();
}
function v5ApplyArena(scene){
    const a=V5_ARENAS[v5.arena]||V5_ARENAS.grid;
    if(!scene||!scene.add)return;
    scene.add.rectangle(config.width/2,config.height/2,config.width,config.height,a.bg,.18).setDepth(-998);
    scene.add.grid(config.width/2,config.height/2,5000,5000,40,40,a.grid).setAlpha(.12).setDepth(-997);
}
function v5BuildMenu(scene){
    if(!scene||isPlaying)return;
    const make=(y,text,fn)=>scene.add.text(config.width/2,y,text,{fontSize:'14px',backgroundColor:isLightMode?'#ddd':'#222',color:isLightMode?'#000':'#0ff'}).setPadding(8).setOrigin(.5).setInteractive().setDepth(10).on('pointerdown',fn);
    make(config.height/4+115,'📊 ESTATÍSTICAS',()=>v5ShowPanel(scene,v5StatsText()));
    make(config.height/4+160,'🏆 DESAFIO DIÁRIO',()=>v5ShowPanel(scene,`🏆 ${v5.challenge.name}\n${v5.challenge.desc}\nProgresso: ${v5.challengeProgress}/${v5.challenge.goal}\nRecompensa: ${v5.challenge.reward} PTS`));
    make(config.height/4+205,'🧪 SANDBOX',()=>v5OpenSandbox(scene));
    make(config.height/4+250,'💾 SAVE 2.0',()=>v5ShowPanel(scene,'💾 SAVE 2.0\nUse os botões abaixo para exportar/importar.'));
}
function v5ShowPanel(scene,text){
    neonCloseActiveOverlay();
    const els=[];
    const bg=scene.add.rectangle(config.width/2,config.height/2,Math.min(560,config.width-40),Math.min(360,config.height-80),isLightMode?0xffffff:0x080808,.97).setDepth(100);
    const t=scene.add.text(config.width/2,config.height/2-100,text,{fontSize:'16px',color:isLightMode?'#111':'#fff',align:'center',wordWrap:{width:Math.min(500,config.width-70)}}).setOrigin(.5).setDepth(101);
    const close=scene.add.text(config.width/2,config.height/2+115,'FECHAR',{fontSize:'18px',backgroundColor:'#333',color:'#fff'}).setPadding(10).setOrigin(.5).setInteractive().setDepth(101);
    els.push(bg,t,close);
    neonOpenOverlay(scene,els);
    close.on('pointerdown',()=>neonCloseOverlay(els));
    if(text.includes('SAVE 2.0')){
        const ex=scene.add.text(config.width/2-90,config.height/2+55,'EXPORTAR',{fontSize:'14px',backgroundColor:'#222'}).setPadding(8).setOrigin(.5).setInteractive().setDepth(101);
        const im=scene.add.text(config.width/2+90,config.height/2+55,'IMPORTAR',{fontSize:'14px',backgroundColor:'#222'}).setPadding(8).setOrigin(.5).setInteractive().setDepth(101);
        ex.on('pointerdown',v5ExportSave); im.on('pointerdown',v5ImportSave);
        els.push(ex,im);
    }
}
function v5OpenSandbox(scene){
    v5.sandbox=!v5.sandbox;
    if(v5.sandbox){
        v5Toast(scene,'🧪 SANDBOX ATIVADO — use o console: neonSandboxHelp()');
    } else v5Toast(scene,'🧪 SANDBOX desativado.');
}
function neonSandboxHelp(){
    console.log('NEON ARENA 2 — SANDBOX 5.0');
    console.log('neonSandboxSpawn("ghost")');
    console.log('neonSandboxSpawn("espioner")');
    console.log('Novos: leaper, shield, mine_layer, phaser, swarmer, turret_guard, vortex, mirror, berserker, frost');
    console.log('neonSandboxSetHP(99)');
    console.log('neonSandboxSetScore(99999)');
    console.log('neonSandboxEvent("overload|ghost|gems|espioner|boss")');
}
function neonSandboxSpawn(type){const s=v5CurrentScene();if(!v5.sandbox)return console.warn('Ative o Sandbox primeiro.');if(s)spawnEnemy(s,type);}
function neonSandboxSetHP(n){if(!v5.sandbox)return;hp1=Math.max(1,Number(n)||1);updateUI();}
function neonSandboxSetScore(n){if(!v5.sandbox)return;score=Math.max(0,Number(n)||0);updateUI();}
function neonSandboxEvent(id){const s=v5CurrentScene();if(!v5.sandbox||!s)return;const ev=V5_EVENTS.find(x=>x.id===id);if(!ev)return;v5.event=id;v5.eventUntil=Date.now()+ev.duration;v5.lastEvent=Date.now();v5Toast(s,ev.name+' — SANDBOX');}
function neonStats(){console.table({kills:v5.kills,shots:v5.shots,hits:v5.hits,damageDealt:v5.damageDealt,damageTaken:v5.damageTaken,comboBest:v5.comboBest,title:v5Title(),arena:v5.arena});}
function neonArena(id){if(!V5_ARENAS[id])return console.warn('Arenas: '+Object.keys(V5_ARENAS).join(', '));v5.arena=id;localStorage.setItem('neon_v5_arena',id);console.log('Arena selecionada:',V5_ARENAS[id].name);}

v5LoadChallenge();
const v5OriginalCreate=create;
create=function(){
    v5OriginalCreate.call(this);
    if(!isPlaying) {
        try{v5BuildMenu(this);}catch(e){}
    }
};
const v5OriginalStartGame=startGame;
startGame=function(scene){
    v5.sessionStart=Date.now();
    v5.combo=0;
    v5.event=null;
    v5.lastEvent=Date.now();
    v5.shots=0;
    v5NextAutoSave=0;
    v5.hits=0;
    v5.damageDealt=0;
    v5.damageTaken=0;
    v5.collisions=0;
    v5OriginalStartGame.call(this,scene);
    try{naBetterDetailsReset(scene);}catch(e){}
    try{v5ApplyArena(scene);}catch(e){}
};
const v5OriginalHitEnemy=hitEnemy;
hitEnemy=function(bullet,e){
    if(!e || !e.active) return;
    const wasActive=!!e.active;
    const beforeHealth=Number(e.health);
    const result=v5OriginalHitEnemy.apply(this,arguments);
    try{
        const afterHealth=Number(e.health);
        if(wasActive){
            v5.hits++;
            if(Number.isFinite(beforeHealth) && Number.isFinite(afterHealth) && afterHealth < beforeHealth){
                v5.damageDealt += beforeHealth-afterHealth;
            }
        }
        if(wasActive){
            const hitScene=v5CurrentScene(), hx=Number(e.x)||0, hy=Number(e.y)||0, didKill=!!(e&&!e.active);
            naVisualHit(hitScene,hx,hy,false);
            if(didKill) naVisualKill(hitScene,hx,hy,e.texture&&e.texture.key||'');
        }
        if(wasActive && e && !e.active){
            v5.kills++;
            v5ComboKill(v5CurrentScene());
            v5UpdateChallenge(v5CurrentScene());
            v5Save();
        }
    }catch(err){}
    return result;
};
const v5OriginalTakeDamage=takeDamage;
takeDamage=function(scene,playerNum,e){
    const before=playerNum===1?hp1:hp2;
    const result=v5OriginalTakeDamage.apply(this,arguments);
    try{
        const after=playerNum===1?hp1:hp2;
        if(after<before){
            v5.damageTaken+=before-after;
            if(!isPracticeMode) v5.collisions++;
        }
    }catch(err){}
    return result;
};
const v5OriginalUpdate=update;
update=function(time){
    const r=v5OriginalUpdate.call(this,time);
    neonModRunHook('sceneUpdate', this, time, NeonArena2Mods);
    neonBuiltinRunHook('sceneUpdate', this, time);
    try{
        if(isPlaying && !isGameOver && gameMode!=='legacy'){
            v5.totalPlayMs=Date.now()-(v5.sessionStart||Date.now());
            v5ResetCombo();v5Director(this);v5StartEvent(this);v5EventUpdate(this);v5UpdateChallenge(this);naVisualUpdate(this);
            if (!v5NextAutoSave || Date.now() >= v5NextAutoSave) {
                v5NextAutoSave = Date.now() + 10000;
                v5Save();
            }
        }
    }catch(e){}
    return r;
};
const v5OriginalShootPlayer1=shootPlayer1;
shootPlayer1=function(){
    const before=lastFired1;
    const result=v5OriginalShootPlayer1.apply(this,arguments);
    if(lastFired1!==before) v5.shots++;
    return result;
};
if(typeof shootPlayer2==='function'){
    const v5OriginalShootPlayer2=shootPlayer2;
    shootPlayer2=function(){
        const before=lastFired2;
        const result=v5OriginalShootPlayer2.apply(this,arguments);
        if(lastFired2!==before) v5.shots++;
        return result;
    };
}
if(typeof createWeaponProjectile==='function'){
    const v5OriginalProjectile=createWeaponProjectile;
    createWeaponProjectile=function(scene,owner,angle,w,pierceLeft,speed){const p=v5OriginalProjectile.apply(this,arguments);return p;};
}
if(typeof window!=='undefined'){
    window.neonStats=neonStats;window.neonArena=neonArena;window.neonSandboxHelp=neonSandboxHelp;
    window.NeonArena2Mods=NeonArena2Mods;window.NeonArena2Builtin=NeonArena2Builtin;window.neonLoadMods=neonLoadMods;window.neonModState=NA_MOD_STATE;
    window.neonSandboxSpawn=neonSandboxSpawn;window.neonSandboxSetHP=neonSandboxSetHP;window.neonSandboxSetScore=neonSandboxSetScore;window.neonSandboxEvent=neonSandboxEvent;
}
