import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  TableLayoutType,
  convertInchesToTwip,
} from "docx";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Validacion {
  criterio: string;
  pasado: boolean;
  mensaje: string;
  categoria: string;
}

interface DetalleCategoria {
  categoria: string;
  letra: string;
  puntos: number;
  maxPuntos: number;
  validaciones: Validacion[];
}

interface Evaluacion {
  total: number;
  detalles: DetalleCategoria[];
}

interface ExportBody {
  nombre: string;
  fecha: string;
  region: string;
  municipio: string;
  problema: string;
  objetivoSmart: string;
  evaluacion: Evaluacion;
  observaciones: string[];
  recomendaciones: string[];
}

/* ------------------------------------------------------------------ */
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */

const EMERALD = "059669";
const GREEN_BG = "D1FAE5";
const RED = "DC2626";
const RED_BG = "FEE2E2";
const HEADER_BG = "065F46";
const HEADER_FG = "FFFFFF";
const GRAY_BG = "F3F4F6";
const DARK_TEXT = "111827";
const SECTION_ACCENT = "065F46";

/* ------------------------------------------------------------------ */
/*  Shared borders (thin, clean)                                       */
/* ------------------------------------------------------------------ */

const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
};

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

/* ------------------------------------------------------------------ */
/*  Reusable cell factory                                              */
/* ------------------------------------------------------------------ */

function headerCell(text: string, width?: { size: number; type: WidthType }) {
  return new TableCell({
    width,
    shading: { type: ShadingType.SOLID, color: HEADER_BG },
    borders: thinBorder,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text,
            bold: true,
            color: HEADER_FG,
            size: 20,
            font: "Segoe UI",
          }),
        ],
      }),
    ],
  });
}

function dataCell(
  text: string,
  opts?: {
    bold?: boolean;
    color?: string;
    bg?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    width?: { size: number; type: WidthType };
    colSpan?: number;
  }
) {
  return new TableCell({
    width: opts?.width,
    columnSpan: opts?.colSpan,
    shading: opts?.bg ? { type: ShadingType.SOLID, color: opts.bg } : undefined,
    borders: thinBorder,
    children: [
      new Paragraph({
        alignment: opts?.align ?? AlignmentType.LEFT,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text,
            bold: opts?.bold,
            color: opts?.color ?? DARK_TEXT,
            size: 20,
            font: "Segoe UI",
          }),
        ],
      }),
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Section heading helper                                             */
/* ------------------------------------------------------------------ */

function sectionHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: SECTION_ACCENT,
        size: 28,
        font: "Segoe UI",
      }),
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Numbered list helper                                               */
/* ------------------------------------------------------------------ */

function numberedItems(items: string[]): Paragraph[] {
  return items.map(
    (item, i) =>
      new Paragraph({
        spacing: { before: 60, after: 60 },
        indent: { left: convertInchesToTwip(0.4), hanging: convertInchesToTwip(0.25) },
        children: [
          new TextRun({
            text: `${i + 1}. ${item}`,
            size: 20,
            font: "Segoe UI",
            color: DARK_TEXT,
          }),
        ],
      })
  );
}

/* ------------------------------------------------------------------ */
/*  Validation sub-table for each SMART letter                         */
/* ------------------------------------------------------------------ */

function validationSubTable(validaciones: Validacion[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    margins: {
      top: 40,
      bottom: 40,
      left: 80,
      right: 80,
    },
    rows: [
      new TableRow({
        children: [
          headerCell("Criterio", { size: 65, type: WidthType.PERCENTAGE }),
          headerCell("Estado", { size: 35, type: WidthType.PERCENTAGE }),
        ],
      }),
      ...validaciones.map(
        (v) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                borders: thinBorder,
                shading: { type: ShadingType.SOLID, color: v.pasado ? GREEN_BG : RED_BG },
                children: [
                  new Paragraph({
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({
                        text: v.criterio,
                        size: 20,
                        font: "Segoe UI",
                        color: DARK_TEXT,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                borders: thinBorder,
                shading: { type: ShadingType.SOLID, color: v.pasado ? GREEN_BG : RED_BG },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({
                        text: v.pasado ? "✓ Aprobado" : "✗ No aprobado",
                        size: 20,
                        font: "Segoe UI",
                        color: v.pasado ? EMERALD : RED,
                        bold: true,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
      ),
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Build the full document                                            */
/* ------------------------------------------------------------------ */

function buildDocument(body: ExportBody): Document {
  const { nombre, fecha, region, municipio, problema, objetivoSmart, evaluacion, observaciones, recomendaciones } = body;

  /* ---- Info table ---- */
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    rows: [
      ["Nombre", nombre],
      ["Fecha", fecha],
      ["Región", region],
      ["Municipio", municipio],
    ].map(
      ([label, value]) =>
        new TableRow({
          children: [
            dataCell(label as string, { bold: true, bg: GRAY_BG, width: { size: 30, type: WidthType.PERCENTAGE } }),
            dataCell(value as string),
          ],
        })
    ),
  });

  /* ---- Evaluation summary table (S M A R T overview) ---- */
  const evalSummaryRows = [
    new TableRow({
      children: [
        headerCell("Letra", { size: 12, type: WidthType.PERCENTAGE }),
        headerCell("Categoría", { size: 38, type: WidthType.PERCENTAGE }),
        headerCell("Puntuación", { size: 25, type: WidthType.PERCENTAGE }),
        headerCell("Resultado", { size: 25, type: WidthType.PERCENTAGE }),
      ],
    }),
    ...evaluacion.detalles.map(
      (d) =>
        new TableRow({
          children: [
            dataCell(d.letra, {
              bold: true,
              align: AlignmentType.CENTER,
              width: { size: 12, type: WidthType.PERCENTAGE },
            }),
            dataCell(d.categoria, { width: { size: 38, type: WidthType.PERCENTAGE } }),
            dataCell(`${d.puntos} / ${d.maxPuntos}`, {
              align: AlignmentType.CENTER,
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
            dataCell(d.puntos >= d.maxPuntos * 0.6 ? "Aprobado" : "No aprobado", {
              bold: true,
              color: d.puntos >= d.maxPuntos * 0.6 ? EMERALD : RED,
              bg: d.puntos >= d.maxPuntos * 0.6 ? GREEN_BG : RED_BG,
              align: AlignmentType.CENTER,
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
          ],
        })
    ),
  ];

  const evalSummaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    rows: evalSummaryRows,
  });

  /* ---- Detail sections per letter ---- */
  const detailSections: (Paragraph | Table)[] = [];
  for (const d of evaluacion.detalles) {
    detailSections.push(sectionHeading(`${d.letra} — ${d.categoria}  (${d.puntos}/${d.maxPuntos})`));
    detailSections.push(validationSubTable(d.validaciones));
  }

  /* ---- Assemble document ---- */
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: "Segoe UI", size: 22, color: DARK_TEXT },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          /* ---- Title ---- */
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "Constructor de Objetivos SMART",
                bold: true,
                size: 36,
                color: SECTION_ACCENT,
                font: "Segoe UI",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: "Reporte de Evaluación",
                bold: true,
                size: 30,
                color: SECTION_ACCENT,
                font: "Segoe UI",
              }),
            ],
          }),

          /* ---- Student info ---- */
          sectionHeading("Información del Estudiante"),
          infoTable,

          /* ---- Problem ---- */
          sectionHeading("Problema Identificado"),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: problema,
                size: 22,
                font: "Segoe UI",
                color: DARK_TEXT,
              }),
            ],
          }),

          /* ---- SMART Objective ---- */
          sectionHeading("Objetivo SMART"),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            indent: { left: convertInchesToTwip(0.3), right: convertInchesToTwip(0.3) },
            shading: { type: ShadingType.SOLID, color: "ECFDF5" },
            children: [
              new TextRun({
                text: objetivoSmart,
                size: 22,
                font: "Segoe UI",
                italics: true,
                color: SECTION_ACCENT,
              }),
            ],
          }),

          /* ---- Evaluation summary ---- */
          sectionHeading("Evaluación SMART — Resumen"),
          evalSummaryTable,

          /* ---- Total score ---- */
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({
                text: `Puntuación total: ${evaluacion.total}/100`,
                bold: true,
                size: 26,
                color: SECTION_ACCENT,
                font: "Segoe UI",
              }),
            ],
          }),

          /* ---- Detail per letter ---- */
          sectionHeading("Evaluación Detallada por Criterio"),
          ...detailSections,

          /* ---- Observations ---- */
          ...(observaciones.length > 0
            ? [
                sectionHeading("Observaciones"),
                ...numberedItems(observaciones),
              ]
            : []),

          /* ---- Recommendations ---- */
          ...(recomendaciones.length > 0
            ? [
                sectionHeading("Recomendaciones"),
                ...numberedItems(recomendaciones),
              ]
            : []),
        ],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const body: ExportBody = await request.json();

    // Basic validation
    if (!body || !body.objetivoSmart || !body.evaluacion) {
      return NextResponse.json(
        { error: "Faltan campos requeridos en el cuerpo de la solicitud." },
        { status: 400 }
      );
    }

    const doc = buildDocument(body);
    const buffer = await Packer.toBuffer(doc);

    // Sanitize filename
    const safeName = (body.nombre || "Anónimo").replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-_.]/g, "").trim() || "Anonimo";
    const filename = `Objetivo_SMART_${safeName}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("[export-docx] Error generating document:", error);
    return NextResponse.json(
      { error: "No se pudo generar el documento DOCX. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}