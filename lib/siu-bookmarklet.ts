/**
 * Genera el bookmarklet que corre el harvester en la página de SIU Guaraní,
 * comprime el resultado (gzip nativo) y redirige a austral-map con el plan
 * cargado en el hash: <origin>/#plan=<gzip+base64>.
 *
 * El origin se inyecta en runtime desde la propia app, así se auto-configura.
 */
export function buildBookmarkletSource(targetOrigin: string): string {
  // OJO: este código corre en el navegador del usuario dentro de SIU.
  // Se mantiene alineado con scripts/siu-harvester.js (misma lógica de parseo).
  return `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const TARGET = ${JSON.stringify(targetOrigin)};
  alert('austral-map: iniciando importación del plan desde SIU');
  try {
    document.querySelectorAll('a.materia_generica.accordion-toggle').forEach((a) => a.click());
    await sleep(1200);
    const verBtns = [...document.querySelectorAll('a.ver_correlatividades')];
    const corrRow = (btn) => {
      const row = btn.closest('tr.materia');
      const corr = row && row.nextElementSibling;
      return corr && corr.classList && corr.classList.contains('correlatividades') ? corr : null;
    };
    const labelFor = (btn) => ((btn.closest('tr.materia') && btn.closest('tr.materia').querySelector('td') || {}).innerText || 'Materia sin identificar').replace(/\\s+/g, ' ').trim();
    const loadedCorr = (btn) => btn.dataset.completo === 'true' || Boolean((corrRow(btn) && corrRow(btn).innerText || '').trim());
    const waitCorr = async (btn, timeoutMs) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) { if (loadedCorr(btn)) return true; await sleep(250); }
      return loadedCorr(btn);
    };
    const loadCorr = async (btn) => {
      if (loadedCorr(btn)) return true;
      for (let attempt = 1; attempt <= 3; attempt++) {
        btn.click();
        if (await waitCorr(btn, 5000 + attempt * 3000)) return true;
        await sleep(500);
      }
      return false;
    };
    const failedCorr = [];
    for (let i = 0; i < verBtns.length; i++) {
      const ok = await loadCorr(verBtns[i]);
      if (!ok) failedCorr.push(labelFor(verBtns[i]));
      await sleep(150);
    }
    if (failedCorr.length > 0) throw new Error('No se pudieron cargar ' + failedCorr.length + ' correlativas. Aborté para no generar un plan incompleto. Fallaron: ' + failedCorr.join(' | '));
    const parseCond = (t) => { const s = (t || '').toLowerCase(); if (s.includes('aprob')) return 'Aprobada'; if (s.includes('regular')) return 'Regularizada'; return null; };
    const parseCorr = (tr) => {
      const toTake = [], toPass = [];
      if (!tr || !tr.classList || !tr.classList.contains('correlatividades')) return { toTake, toPass };
      const lines = (tr.innerText || '').split('\\n').map((l) => l.trim()).filter(Boolean);
      let bucket = null, option = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i], low = line.toLowerCase();
        if (low.startsWith('para cursar')) { bucket = 'take'; option = 0; continue; }
        if (low.startsWith('para aprobar')) { bucket = 'pass'; option = 0; continue; }
        if (low.startsWith('opci')) { option += 1; continue; }
        if (low.startsWith('requisito') || low.startsWith('verificar')) continue;
        const idM = line.match(/\\(([^)]+)\\)/);
        if (!idM || !bucket) continue;
        let cond = parseCond(line); if (!cond && i + 1 < lines.length) cond = parseCond(lines[i + 1]);
        (bucket === 'take' ? toTake : toPass).push({ id: idM[1].trim(), condition: cond || 'Aprobada', option: option || 1 });
      }
      return { toTake, toPass };
    };
    const parseYear = (m) => { const y = (m || '').match(/(\\d+)\\s*(er|do|to|ro|mo)?\\.?\\s*a[ñn]o/i); if (y) return Number(y[1]); if (/ingreso/i.test(m)) return 0; if (/optativ/i.test(m)) return 'Electives'; return null; };
    const cleanText = (t) => String(t || '').replace(/\\s+/g, ' ').trim();
    const textChunks = (texts) => texts.filter(Boolean).flatMap((t) => String(t).split(/[\\n|]+/)).map(cleanText).filter(Boolean);
    const extractLabeledValue = (texts, labels) => {
      const labelPattern = labels.join('|');
      const stopPattern = 'alumno|estudiante|apellido\\\\s+y\\\\s+nombre|nombre|carrera|propuesta|plan(?:\\\\s+de\\\\s+estudios)?|legajo|estado|ubicaci[oó]n|documento';
      for (const chunk of textChunks(texts)) {
        const match = chunk.match(new RegExp('(?:^|\\\\b)(?:' + labelPattern + ')\\\\s*:?\\\\s*(.+)$', 'i'));
        if (!match) continue;
        const value = cleanText(match[1].split(new RegExp('\\\\s+(?:' + stopPattern + ')\\\\s*:', 'i'))[0]);
        if (value) return value;
      }
      return null;
    };
    const cleanStudentNameCandidate = (value) => {
      const candidate = cleanText(value).replace(/cerrar\\s+sesi[oó]n|mis\\s+datos|perfil|configuraci[oó]n|salir|logout|usuario/ig, ' ').replace(/[▾▼⏷]/g, ' ').replace(/\\s+/g, ' ').trim();
      if (!candidate || candidate.length > 80 || /\\d/.test(candidate)) return null;
      if (/(siu|guaran[ií]|plan|carrera|propuesta|universidad|facultad|inicio|operaci[oó]n|mensaje|notificaci[oó]n|ingenier[ií]a|licenciatura|abogac[ií]a|medicina|contador|profesorado|maestr[ií]a|doctorado)/i.test(candidate)) return null;
      return candidate;
    };
    const inferStudentName = (texts) => {
      const labeled = cleanStudentNameCandidate(extractLabeledValue(texts, ['alumno', 'estudiante', 'apellido\\\\s+y\\\\s+nombre']));
      if (labeled) return labeled;
      const nameLike = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'´\`.-]+(?:,?\\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'´\`.-]+){1,5}$/;
      for (const chunk of textChunks(texts)) {
        const candidate = cleanStudentNameCandidate(chunk);
        if (candidate && candidate.length >= 5 && nameLike.test(candidate)) return candidate;
      }
      return null;
    };
    const inferCareerName = (texts) => {
      const chunks = texts.filter(Boolean).flatMap((t) => String(t).split(/[\\n|]+/)).map((t) => t.replace(/\\s+/g, ' ').trim()).filter(Boolean);
      const careerWords = /(ingenier[ií]a|licenciatura|abogac[ií]a|medicina|contador|profesorado|maestr[ií]a|doctorado)/i;
      for (const chunk of chunks) {
        const labeled = chunk.match(/(?:carrera|propuesta)\\s*:?\\s*(.+)$/i);
        const candidate = (labeled ? labeled[1] : chunk).trim();
        if (careerWords.test(candidate)) return candidate;
      }
      return null;
    };
    const visibleTextFrom = (selector) => [...document.querySelectorAll(selector)].map((el) => el.innerText || '').filter(Boolean).join('\\n');
    const subjects = [], seen = new Set();
    document.querySelectorAll('tr.materia').forEach((tr) => {
      const tds = tr.querySelectorAll('td'); if (!tds.length) return;
      const act = (tds[0].innerText || '').trim();
      const m = act.match(/^(.*)\\(([^)]+)\\)\\s*$/); if (!m) return;
      const id = m[2].trim(); if (seen.has(id)) return; seen.add(id);
      const mod = ((tr.closest('.modulos.accordion') && tr.closest('.modulos.accordion').querySelector('.accordion-heading') || {}).innerText || '').replace(/módulo:/i, '').replace(/\\s+/g, ' ').trim();
      const { toTake, toPass } = parseCorr(tr.nextElementSibling);
      subjects.push({ course: m[1].trim(), id, type: (tds[1] && tds[1].innerText || '').trim(), module: mod, year: parseYear(mod), credits: (tds[6] && tds[6].innerText || '').trim() || null, nota: (tds[4] && tds[4].innerText || '').trim() || null, origen: (tds[5] && tds[5].innerText || '').trim() || null, prerequisitesToTake: toTake, prerequisitesToPass: toPass });
    });
    const carreraText = cleanText(document.querySelector('.control-label-carrera') && document.querySelector('.control-label-carrera').innerText) || null;
    const rawEncabezadoText = document.querySelector('table.encabezado') && document.querySelector('table.encabezado').innerText || '';
    const encabezadoText = cleanText(rawEncabezadoText) || null;
    const titleText = [...document.querySelectorAll('h1,h2,.titulo_operacion,.titulo-pagina')].map((el) => el.innerText || '').join(' | ');
    const metadataTexts = [rawEncabezadoText, carreraText, titleText, visibleTextFrom('.control-label-alumno,.control-label-persona,.control-label-plan,.control-label-propuesta,.datos-alumno,.datos_usuario,.usuario,#usuario,#info_usuario,.navbar .pull-right .dropdown-menu,.navbar .navbar-right .dropdown-menu,.navbar .nav.pull-right .dropdown-menu,.navbar .dropdown-menu,.navbar .dropdown-toggle,.navbar .pull-right,.dropdown-menu-right,.pull-right .dropdown-menu,header .dropdown-menu,header .dropdown-toggle,.user-menu,.user-info,.profile,.perfil-usuario,.nombre-usuario')];
    const labeledCareerName = extractLabeledValue(metadataTexts, ['carrera', 'propuesta']);
    const careerName = labeledCareerName || inferCareerName([carreraText, rawEncabezadoText, titleText]);
    const studentName = inferStudentName(metadataTexts);
    const planName = extractLabeledValue(metadataTexts, ['plan(?:\\\\s+de\\\\s+estudios)?']);
    const cumpl = ([...document.querySelectorAll('h3')].map((h) => h.innerText).join(' ').match(/obtener\\s+(\\d+)\\s+horas/i) || [])[1];
    const plan = { meta: { source: 'siu-bookmarklet', generatedAt: new Date().toISOString(), studentName, careerName, planName, propuesta: carreraText, encabezado: encabezadoText, electiveHoursRequired: cumpl ? Number(cumpl) : null }, subjects };
    if (!subjects.length) { alert('No se encontraron materias. ¿Estás en la página "Plan de estudios" de SIU?'); return; }
    const json = JSON.stringify(plan);
    const gz = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    const bytes = new Uint8Array(gz); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    const payload = btoa(bin).replace(/\\+/g, '-').replace(/\\//g, '_');
    window.location.href = TARGET + '/#plan=' + payload;
  } catch (e) { alert('Error al leer el plan: ' + (e && e.message || e)); }
})();`;
}

/** Devuelve la URL `javascript:` lista para arrastrar a favoritos. */
export function buildBookmarkletHref(targetOrigin: string): string {
  // Bookmarklets deben quedar en UNA sola línea. Saltos de línea reales en una
  // URL javascript: pueden hacer que el favorito no ejecute nada en algunos browsers.
  const source = buildBookmarkletSource(targetOrigin)
    .replace(/\s+/g, ' ')
    .trim();
  return `javascript:${source}`;
}
