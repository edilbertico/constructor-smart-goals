export interface ValidationResult {
  criterio: string;
  pasado: boolean;
  mensaje: string;
  categoria: "S" | "M" | "A" | "R" | "T";
}

export interface SmartScore {
  total: number;
  detalles: {
    categoria: string;
    letra: string;
    puntos: number;
    maxPuntos: number;
    validaciones: ValidationResult[];
  }[];
}

const VERBOS_VALIDOS = [
  "analizar", "diseñar", "implementar", "fortalecer", "desarrollar",
  "optimizar", "evaluar", "caracterizar", "elaborar", "consolidar",
  "promover", "incrementar", "reducir", "capacitar", "mejorar",
  "formular", "establecer", "generar", "proponer", "crear",
  "construir", "disminuir", "ampliar", "transformar", "gestionar",
  "organizar", "planificar", "articular", "facilitar", "intervenir",
];

function startsWithInfinitive(text: string): boolean {
  const t = text.trim().toLowerCase();
  const firstWord = t.split(/\s+/)[0];
  return firstWord.endsWith("ar") || firstWord.endsWith("er") || firstWord.endsWith("ir");
}

function hasValidVerb(text: string): boolean {
  const t = text.trim().toLowerCase();
  const firstWord = t.split(/\s+/)[0];
  return VERBOS_VALIDOS.includes(firstWord);
}

function hasSingleAction(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const commaCount = (lower.match(/,/g) || []).length;
  const yCount = (lower.match(/\by\b/g) || []).length;
  const puntoYComaCount = (lower.match(/;/g) || []).length;
  if (commaCount >= 2 && yCount >= 1) return false;
  if (puntoYComaCount >= 1) return false;
  return true;
}

function hasPopulation(text: string): boolean {
  const patterns = [
    /\d+\s*(personas|profesionales|estudiantes|docentes|pacientes|niños|niñas|adolescentes|adultos|adultas|madres|padres|familias|comunidades|habitantes|funcionarios|trabajadores|agentes|líderes|gestores|equipos)/i,
    /(población|grupo objetivo|beneficiarios|participantes|usuarios|personal|comunidad)/i,
    /(de\s+\d+\s)/i,
  ];
  return patterns.some((p) => p.test(text));
}

function hasRegion(text: string, region?: string): boolean {
  if (region) {
    const regionNorm = region.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const textNorm = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return textNorm.includes(regionNorm);
  }
  return false;
}

function hasMunicipio(text: string, municipio?: string): boolean {
  if (municipio) {
    const municNorm = municipio.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const textNorm = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return textNorm.includes(municNorm);
  }
  return false;
}

function hasIndicator(text: string): boolean {
  const patterns = [
    /(cumplimiento|indicador|índice|tasa|cobertura|porcentaje|proporción|nivel)/i,
    /\d+\s*%/i,
    /(\d+)%/i,
  ];
  return patterns.some((p) => p.test(text));
}

function hasQuantifiableGoal(text: string): boolean {
  const patterns = [
    /\d+\s*%/i,
    /(al\s+\d+|hasta\s+\d+|del\s+\d+|un\s+\d+|una?\s+\d+)/i,
    /(\d+\s+(personas|unidades|servicios|actividades|sesiones|talleres|programas|proyectos|acciones))/i,
  ];
  return patterns.some((p) => p.test(text));
}

function hasTimeframe(text: string): boolean {
  const patterns = [
    /(antes de|para el|al\s+(diciembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))/i,
    /(diciembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre)\s+de\s+\d{4}/i,
    /\d{4}/,
    /(en\s+\d+\s+meses|en\s+un\s+año|en\s+\d+\s+años|plazo de|período)/i,
  ];
  return patterns.some((p) => p.test(text));
}

function isUnder70Words(text: string): boolean {
  return text.trim().split(/\s+/).length <= 70;
}

function noMultipleObjectives(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const commaY = (lower.match(/,\s*y\s+/g) || []).length;
  if (commaY >= 1) return false;
  const yAfterVerb = lower.replace(/^[a-záéíóúñ]+\s+/, "");
  const yCount = (yAfterVerb.match(/\by\b/g) || []).length;
  return yCount <= 1;
}

export interface ValidationInput {
  objetivo: string;
  region?: string;
  municipio?: string;
}

export function validateSmart(input: ValidationInput): SmartScore {
  const { objetivo, region, municipio } = input;
  const results: SmartScore = {
    total: 0,
    detalles: [],
  };

  // S - Específico
  const sValidations: ValidationResult[] = [
    {
      criterio: "Comienza con verbo en infinitivo",
      pasado: startsWithInfinitive(objetivo),
      mensaje: startsWithInfinitive(objetivo) ? "" : "El objetivo debe comenzar con un verbo en infinitivo (terminado en -ar, -er, -ir).",
      categoria: "S",
    },
    {
      criterio: "Usa verbo de taxonomía de Bloom",
      pasado: hasValidVerb(objetivo),
      mensaje: hasValidVerb(objetivo) ? "" : "Se recomienda usar un verbo de la taxonomía de Bloom (ej: Fortalecer, Desarrollar, Implementar).",
      categoria: "S",
    },
    {
      criterio: "Tiene una sola acción principal",
      pasado: hasSingleAction(objetivo),
      mensaje: hasSingleAction(objetivo) ? "" : "El objetivo contiene más de una acción principal. Debe enfocarse en una sola.",
      categoria: "S",
    },
    {
      criterio: "No supera las 70 palabras",
      pasado: isUnder70Words(objetivo),
      mensaje: isUnder70Words(objetivo) ? "" : "El objetivo supera las 70 palabras. Debe ser más conciso.",
      categoria: "S",
    },
  ];
  const sPassed = sValidations.filter((v) => v.pasado).length;
  const sPoints = Math.round((sPassed / sValidations.length) * 20);

  // M - Medible
  const mValidations: ValidationResult[] = [
    {
      criterio: "Tiene indicador de medición",
      pasado: hasIndicator(objetivo),
      mensaje: hasIndicator(objetivo) ? "" : "Debe incluir un indicador que permita medir el cumplimiento.",
      categoria: "M",
    },
    {
      criterio: "Tiene meta cuantificable",
      pasado: hasQuantifiableGoal(objetivo),
      mensaje: hasQuantifiableGoal(objetivo) ? "" : "Debe incluir una meta cuantificable (ej: 90%, 120 personas).",
      categoria: "M",
    },
    {
      criterio: "No contiene objetivos múltiples",
      pasado: noMultipleObjectives(objetivo),
      mensaje: noMultipleObjectives(objetivo) ? "" : "El objetivo contiene múltiples objetivos unidos por \"y\". Debe ser uno solo.",
      categoria: "M",
    },
  ];
  const mPassed = mValidations.filter((v) => v.pasado).length;
  const mPoints = Math.round((mPassed / mValidations.length) * 20);

  // A - Alcanzable (based on completeness of context info)
  const aValidations: ValidationResult[] = [
    {
      criterio: "Indica población objetivo",
      pasado: hasPopulation(objetivo),
      mensaje: hasPopulation(objetivo) ? "" : "Falta especificar la población objetivo (ej: 120 profesionales de salud).",
      categoria: "A",
    },
    {
      criterio: "Incluye municipio",
      pasado: hasMunicipio(objetivo, municipio),
      mensaje: hasMunicipio(objetivo, municipio) ? "" : "Debe indicar el municipio donde se realizará la intervención.",
      categoria: "A",
    },
    {
      criterio: "Incluye región",
      pasado: hasRegion(objetivo, region),
      mensaje: hasRegion(objetivo, region) ? "" : "Debe indicar la región de referencia.",
      categoria: "A",
    },
  ];
  const aPassed = aValidations.filter((v) => v.pasado).length;
  const aPoints = Math.round((aPassed / aValidations.length) * 20);

  // R - Relevante (context-based)
  const rValidations: ValidationResult[] = [
    {
      criterio: "El verbo refleja una acción transformadora",
      pasado: hasValidVerb(objetivo),
      mensaje: hasValidVerb(objetivo) ? "" : "El verbo utilizado no refleja claramente una acción transformadora.",
      categoria: "R",
    },
    {
      criterio: "El objetivo tiene una sola acción principal",
      pasado: hasSingleAction(objetivo) && noMultipleObjectives(objetivo),
      mensaje: hasSingleAction(objetivo) && noMultipleObjectives(objetivo) ? "" : "Objetivos múltiples reducen la relevancia. Enfóquese en uno.",
      categoria: "R",
    },
    {
      criterio: "Tiene población y territorio definidos",
      pasado: hasPopulation(objetivo) && (hasMunicipio(objetivo, municipio) || hasRegion(objetivo, region)),
      mensaje: hasPopulation(objetivo) && (hasMunicipio(objetivo, municipio) || hasRegion(objetivo, region)) ? "" : "Para ser relevante, debe definir población y territorio.",
      categoria: "R",
    },
  ];
  const rPassed = rValidations.filter((v) => v.pasado).length;
  const rPoints = Math.round((rPassed / rValidations.length) * 20);

  // T - Temporal
  const tValidations: ValidationResult[] = [
    {
      criterio: "Tiene plazo definido",
      pasado: hasTimeframe(objetivo),
      mensaje: hasTimeframe(objetivo) ? "" : "No se evidencia un plazo definido. Incluya una fecha o período.",
      categoria: "T",
    },
    {
      criterio: "Incluye año de referencia",
      pasado: /\d{4}/.test(objetivo),
      mensaje: /\d{4}/.test(objetivo) ? "" : "Debe incluir el año de referencia (ej: 2026).",
      categoria: "T",
    },
    {
      criterio: "El plazo es específico",
      pasado: /(antes de|para el|hasta|en\s+\d+)/i.test(objetivo) && /\d{4}/.test(objetivo),
      mensaje: /(antes de|para el|hasta|en\s+\d+)/i.test(objetivo) && /\d{4}/.test(objetivo) ? "" : "El plazo debe ser más específico (ej: antes de diciembre de 2026).",
      categoria: "T",
    },
  ];
  const tPassed = tValidations.filter((v) => v.pasado).length;
  const tPoints = Math.round((tPassed / tValidations.length) * 20);

  results.detalles = [
    { categoria: "Específico", letra: "S", puntos: sPoints, maxPuntos: 20, validaciones: sValidations },
    { categoria: "Medible", letra: "M", puntos: mPoints, maxPuntos: 20, validaciones: mValidations },
    { categoria: "Alcanzable", letra: "A", puntos: aPoints, maxPuntos: 20, validaciones: aValidations },
    { categoria: "Relevante", letra: "R", puntos: rPoints, maxPuntos: 20, validaciones: rValidations },
    { categoria: "Temporal", letra: "T", puntos: tPoints, maxPuntos: 20, validaciones: tValidations },
  ];

  results.total = sPoints + mPoints + aPoints + rPoints + tPoints;

  return results;
}

export function generateFeedback(score: SmartScore): string[] {
  const feedback: string[] = [];
  for (const detalle of score.detalles) {
    for (const val of detalle.validaciones) {
      if (!val.pasado && val.mensaje) {
        feedback.push(val.mensaje);
      }
    }
  }
  return feedback;
}

export function generateRecommendations(score: SmartScore): string[] {
  const recs: string[] = [];
  if (score.total >= 90) {
    recs.push("Excelente formulación. El objetivo cumple con la mayoría de criterios SMART.");
    recs.push("Considere compartir este objetivo con su equipo para validar la viabilidad operativa.");
  } else if (score.total >= 70) {
    recs.push("Buena formulación con oportunidades de mejora. Revise los criterios que no se cumplieron.");
    recs.push("Verifique que el indicador sea realista y medible con los datos disponibles.");
  } else if (score.total >= 50) {
    recs.push("El objetivo requiere ajustes significativos. Revise cada componente SMART faltante.");
    recs.push("Se recomienda reformular el objetivo siguiendo la fórmula: Verbo + Acción + Población + Ubicación + Indicador + Meta + Plazo.");
  } else {
    recs.push("El objetivo no cumple con los criterios mínimos SMART. Se recomienda reconstruirlo paso a paso.");
    recs.push("Utilice el constructor guiado paso a paso para asegurar que todos los componentes estén presentes.");
  }
  if (score.detalles.find((d) => d.letra === "S")?.puntos === 0) {
    recs.push("Priorice la especificidad: defina claramente qué, quién, dónde y para qué.");
  }
  if (score.detalles.find((d) => d.letra === "T")?.puntos === 0) {
    recs.push("Sin un plazo definido, el objetivo no es SMART. Agregue una fecha límite concreta.");
  }
  return recs;
}