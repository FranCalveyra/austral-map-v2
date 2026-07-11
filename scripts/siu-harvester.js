/**
 * SIU Guaraní → austral-map harvester
 * ------------------------------------
 * Pegá TODO este archivo en la consola del navegador (DevTools → Console)
 * estando logueado en la página "Plan de estudios" de SIU Guaraní.
 *
 * Qué hace:
 *  1. Clickea automáticamente todos los "Ver" de correlativas (que se cargan por AJAX).
 *  2. Expande las materias optativas (también AJAX).
 *  3. Lee el DOM ya completo y arma un JSON genérico y normalizado.
 *  4. Te lo copia al portapapeles y lo deja en `window.__PLAN__`.
 *
 * No depende de ningún plan en particular: sirve para cualquier carrera.
 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.log('%c[harvester]', 'color:#3b82f6;font-weight:bold', ...a);

  // ---- 1. Expandir acordeones de módulos (por si están colapsados) ----
  document
    .querySelectorAll('.modulos.accordion .accordion-body.collapse:not(.in) .accordion-toggle, a.modulos.accordion-toggle')
    .forEach((a) => {
      const body = a.closest('.accordion-group')?.querySelector('.accordion-body');
      if (body && !body.classList.contains('in')) a.click();
    });
  await sleep(400);

  // ---- 2. Cargar las materias optativas (genéricas, vía AJAX) ----
  document.querySelectorAll('a.materia_generica.accordion-toggle').forEach((a) => a.click());
  await sleep(1200);

  // ---- 3. Cargar todas las correlativas ("Ver") una por una, con retries ----
  // Regla fuerte: si alguna no carga, abortamos. Generar un plan incompleto es peor
  // que fallar explícitamente.
  const verBtns = [...document.querySelectorAll('a.ver_correlatividades')];
  const getCorrelativasRow = (btn) => {
    const row = btn.closest('tr.materia');
    const corr = row?.nextElementSibling;
    return corr?.classList?.contains('correlatividades') ? corr : null;
  };
  const subjectLabelFor = (btn) =>
    (btn.closest('tr.materia')?.querySelector('td')?.innerText || 'Materia sin identificar')
      .replace(/\s+/g, ' ')
      .trim();
  const hasLoadedCorrelativas = (btn) =>
    btn.dataset.completo === 'true' || Boolean((getCorrelativasRow(btn)?.innerText || '').trim());
  const waitForCorrelativa = async (btn, timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (hasLoadedCorrelativas(btn)) return true;
      await sleep(250);
    }
    return hasLoadedCorrelativas(btn);
  };
  const loadCorrelativa = async (btn) => {
    if (hasLoadedCorrelativas(btn)) return true;
    for (let attempt = 1; attempt <= 3; attempt++) {
      btn.click();
      if (await waitForCorrelativa(btn, 5000 + attempt * 3000)) return true;
      await sleep(500);
    }
    return false;
  };

  log(`Cargando ${verBtns.length} correlativas una por una…`);
  const failedCorrelativas = [];
  for (let i = 0; i < verBtns.length; i++) {
    const btn = verBtns[i];
    const label = subjectLabelFor(btn);
    log(`Correlativas ${i + 1}/${verBtns.length}: ${label}`);
    const ok = await loadCorrelativa(btn);
    if (!ok) failedCorrelativas.push(label);
    await sleep(150);
  }
  if (failedCorrelativas.length > 0) {
    throw new Error(
      `No se pudieron cargar ${failedCorrelativas.length} correlativas. ` +
      `Aborté para no generar un plan incompleto. Fallaron: ${failedCorrelativas.join(' | ')}`
    );
  }

  // ---- 4. Parseo ----
  const CONDS = { aprob: 'Aprobada', regular: 'Regularizada' };
  const parseCond = (t) => {
    const s = (t || '').toLowerCase();
    if (s.includes('aprob')) return CONDS.aprob;
    if (s.includes('regular')) return CONDS.regular;
    return null;
  };

  // Correlativa: dado el <tr class="correlatividades"> parsea "Para cursar" / "Para aprobar".
  const parseCorrelativas = (tr) => {
    const toTake = [];
    const toPass = [];
    if (!tr || !tr.classList || !tr.classList.contains('correlatividades')) {
      return { toTake, toPass };
    }
    const lines = (tr.innerText || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let bucket = null; // 'take' | 'pass'
    let option = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const low = line.toLowerCase();
      if (low.startsWith('para cursar')) { bucket = 'take'; option = 0; continue; }
      if (low.startsWith('para aprobar')) { bucket = 'pass'; option = 0; continue; }
      if (low.startsWith('opción') || low.startsWith('opcion')) { option += 1; continue; }
      if (low.startsWith('requisito') || low.startsWith('verificar')) continue;

      // Fila de requisito: "Nombre (ID)\tCondición" (o la condición en la línea siguiente)
      const idMatch = line.match(/\(([^)]+)\)/);
      if (!idMatch || !bucket) continue;
      const id = idMatch[1].trim();
      let cond = parseCond(line);
      if (!cond && i + 1 < lines.length) cond = parseCond(lines[i + 1]);
      const entry = { id, condition: cond || 'Aprobada', option: option || 1 };
      (bucket === 'take' ? toTake : toPass).push(entry);
    }
    return { toTake, toPass };
  };

  const parseYear = (moduleName) => {
    const m = (moduleName || '').match(/(\d+)\s*(er|do|to|ro|mo)?\.?\s*a[ñn]o/i);
    if (m) return Number(m[1]);
    if (/ingreso/i.test(moduleName)) return 0;
    if (/optativ/i.test(moduleName)) return 'Electives';
    return null; // Otros Requisitos, Vida Universitaria, etc.
  };

  const cleanText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

  const textChunks = (texts) =>
    texts
      .filter(Boolean)
      .flatMap((t) => String(t).split(/[\n|]+/))
      .map(cleanText)
      .filter(Boolean);

  const extractLabeledValue = (texts, labels) => {
    const labelPattern = labels.join('|');
    const stopPattern = 'alumno|estudiante|apellido\\s+y\\s+nombre|nombre|carrera|propuesta|plan(?:\\s+de\\s+estudios)?|legajo|estado|ubicaci[oó]n|documento';
    for (const chunk of textChunks(texts)) {
      const match = chunk.match(new RegExp('(?:^|\\b)(?:' + labelPattern + ')\\s*:?\\s*(.+)$', 'i'));
      if (!match) continue;
      const value = cleanText(match[1].split(new RegExp('\\s+(?:' + stopPattern + ')\\s*:', 'i'))[0]);
      if (value) return value;
    }
    return null;
  };

  const cleanStudentNameCandidate = (value) => {
    const candidate = cleanText(value)
      .replace(/cerrar\s+sesi[oó]n|mis\s+datos|perfil|configuraci[oó]n|salir|logout|usuario/ig, ' ')
      .replace(/[▾▼⏷]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!candidate || candidate.length > 80 || /\d/.test(candidate)) return null;
    if (/(siu|guaran[ií]|plan|carrera|propuesta|universidad|facultad|inicio|operaci[oó]n|mensaje|notificaci[oó]n|ingenier[ií]a|licenciatura|abogac[ií]a|medicina|contador|profesorado|maestr[ií]a|doctorado)/i.test(candidate)) return null;
    return candidate;
  };

  const inferStudentName = (texts) => {
    const labeled = cleanStudentNameCandidate(
      extractLabeledValue(texts, ['alumno', 'estudiante', 'apellido\\s+y\\s+nombre'])
    );
    if (labeled) return labeled;

    const nameLike = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'´`.-]+(?:,?\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'´`.-]+){1,5}$/;
    for (const chunk of textChunks(texts)) {
      const candidate = cleanStudentNameCandidate(chunk);
      if (
        candidate &&
        candidate.length >= 5 &&
        nameLike.test(candidate)
      ) {
        return candidate;
      }
    }
    return null;
  };

  const inferCareerName = (texts) => {
    const chunks = texts
      .filter(Boolean)
      .flatMap((t) => String(t).split(/[\n|]+/))
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const careerWords = /(ingenier[ií]a|licenciatura|abogac[ií]a|medicina|contador|profesorado|maestr[ií]a|doctorado)/i;
    for (const chunk of chunks) {
      const labeled = chunk.match(/(?:carrera|propuesta)\s*:?\s*(.+)$/i);
      const candidate = (labeled ? labeled[1] : chunk).trim();
      if (careerWords.test(candidate)) return candidate;
    }
    return null;
  };

  const visibleTextFrom = (selector) =>
    [...document.querySelectorAll(selector)]
      .map((el) => el.innerText || '')
      .filter(Boolean)
      .join('\n');

  const subjects = [];
  const seen = new Set();

  document.querySelectorAll('tr.materia').forEach((tr) => {
    const tds = tr.querySelectorAll('td');
    if (!tds.length) return;

    const actividad = (tds[0].innerText || '').trim();
    const idMatch = actividad.match(/^(.*)\(([^)]+)\)\s*$/);
    if (!idMatch) return;
    const course = idMatch[1].trim();
    const id = idMatch[2].trim();
    if (seen.has(id)) return; // evitar duplicados si un id aparece 2 veces
    seen.add(id);

    const tipo = (tds[1]?.innerText || '').trim();
    const nota = (tds[4]?.innerText || '').trim();
    const origen = (tds[5]?.innerText || '').trim();
    const creditos = (tds[6]?.innerText || '').trim();

    // Módulo contenedor
    const moduleName = (
      tr.closest('.modulos.accordion')?.querySelector('.accordion-heading')?.innerText || ''
    )
      .replace(/módulo:/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    const { toTake, toPass } = parseCorrelativas(tr.nextElementSibling);

    subjects.push({
      course,
      id,
      type: tipo,
      module: moduleName,
      year: parseYear(moduleName),
      credits: creditos || null,
      nota: nota || null,
      origen: origen || null,
      prerequisitesToTake: toTake,
      prerequisitesToPass: toPass,
    });
  });

  const carreraText = cleanText(document.querySelector('.control-label-carrera')?.innerText) || null;
  const rawEncabezadoText = document.querySelector('table.encabezado')?.innerText || '';
  const encabezadoText = cleanText(rawEncabezadoText) || null;
  const titleText = [...document.querySelectorAll('h1,h2,.titulo_operacion,.titulo-pagina')]
    .map((el) => el.innerText || '')
    .join(' | ');
  const metadataTexts = [
    rawEncabezadoText,
    carreraText,
    titleText,
    visibleTextFrom([
      '.control-label-alumno',
      '.control-label-persona',
      '.control-label-plan',
      '.control-label-propuesta',
      '.datos-alumno',
      '.datos_usuario',
      '.usuario',
      '#usuario',
      '#info_usuario',
      '.navbar .pull-right .dropdown-menu',
      '.navbar .navbar-right .dropdown-menu',
      '.navbar .nav.pull-right .dropdown-menu',
      '.navbar .dropdown-menu',
      '.navbar .dropdown-toggle',
      '.navbar .pull-right',
      '.dropdown-menu-right',
      '.pull-right .dropdown-menu',
      'header .dropdown-menu',
      'header .dropdown-toggle',
      '.user-menu',
      '.user-info',
      '.profile',
      '.perfil-usuario',
      '.nombre-usuario',
    ].join(','))
  ];
  const labeledCareerName = extractLabeledValue(metadataTexts, ['carrera', 'propuesta']);
  const careerName = labeledCareerName || inferCareerName([carreraText, rawEncabezadoText, titleText]);
  const studentName = inferStudentName(metadataTexts);
  const planName = extractLabeledValue(metadataTexts, ['plan(?:\\s+de\\s+estudios)?']);

  const plan = {
    meta: {
      source: 'siu-harvester',
      generatedAt: new Date().toISOString(),
      studentName,
      careerName,
      planName,
      propuesta: carreraText,
      encabezado: encabezadoText,
      electiveHoursRequired: (() => {
        const m = [...document.querySelectorAll('h3')].map((h) => h.innerText).join(' ').match(/obtener\s+(\d+)\s+horas/i);
        return m ? Number(m[1]) : null;
      })(),
    },
    subjects,
  };

  const json = JSON.stringify(plan, null, 2);
  window.__PLAN__ = plan;
  try {
    await navigator.clipboard.writeText(json);
    log(`✅ ${subjects.length} materias. JSON copiado al portapapeles y en window.__PLAN__`);
  } catch {
    log(`✅ ${subjects.length} materias en window.__PLAN__. Copiá manualmente:`);
    console.log(json);
  }
  return plan;
})();
