import { assembleVegaLite } from "flint-chart";
import { makeBeliefSamples } from "./scoring.js";

const chartTheme = {
  background: "transparent",
  view: { stroke: null },
  axis: {
    domainColor: "#bbb5aa",
    gridColor: "#e5e0d7",
    gridOpacity: 0.7,
    labelColor: "#72786f",
    labelFont: "DM Sans, ui-sans-serif, system-ui",
    labelFontSize: 11,
    tickColor: "#bbb5aa",
    titleColor: "#515850",
    titleFont: "DM Sans, ui-sans-serif, system-ui",
    titleFontSize: 11,
    titleFontWeight: 500,
  },
  legend: {
    labelColor: "#626960",
    labelFont: "DM Sans, ui-sans-serif, system-ui",
    labelFontSize: 11,
    symbolStrokeWidth: 2,
    title: null,
  },
};

function stripMetadata(spec) {
  return Object.fromEntries(
    Object.entries(spec).filter(([key]) => !key.startsWith("_")),
  );
}

function finishSpec(spec, height) {
  const clean = stripMetadata(spec);
  clean.width = "container";
  clean.height = height;
  clean.autosize = { type: "fit", contains: "padding", resize: true };
  clean.background = "transparent";
  clean.config = {
    ...clean.config,
    ...chartTheme,
    axis: { ...clean.config?.axis, ...chartTheme.axis },
    legend: { ...clean.config?.legend, ...chartTheme.legend },
    view: chartTheme.view,
  };
  return clean;
}

function stageAxis(title = null) {
  return {
    title,
    values: [0, 1, 2, 3],
    labelExpr:
      "datum.value === 0 ? 'Precon.' : datum.value === 1 ? 'Contempl.' : datum.value === 2 ? 'Preparation' : 'Action'",
    labelAngle: 0,
    labelPadding: 8,
    labelOverlap: false,
    grid: true,
  };
}

export function buildTtmObservationSpec(turns) {
  const spec = assembleVegaLite({
    data: {
      values: turns.map((turn, index) => ({
        turn: `Turn ${index + 1}`,
        stage: turn.stage,
        stagePosition: turn.stagePosition,
        confidence: turn.stageConfidence,
        meaningfulness: turn.meaningfulness,
        decision: turn.decision,
      })),
    },
    semantic_types: {
      turn: "Category",
      stage: "Category",
      stagePosition: "Quantity",
      confidence: "Rating",
      meaningfulness: "Quantity",
    },
    chart_spec: {
      chartType: "Scatter Plot",
      encodings: {
        x: { field: "stagePosition" },
        y: { field: "confidence" },
        size: { field: "meaningfulness" },
        color: { field: "stage" },
      },
      baseSize: { width: 620, height: 190 },
      canvasSize: { width: 760, height: 220 },
      chartProperties: { opacity: 0.9 },
    },
    options: {
      addTooltips: true,
      baseLabelFontSize: 11,
      baseTitleFontSize: 11,
    },
  });

  const finished = finishSpec(spec, 176);
  finished.encoding.x.axis = stageAxis();
  finished.encoding.x.scale = { domain: [-0.18, 3.18], nice: false };
  finished.encoding.y.axis = {
    title: "Classification confidence",
    format: ".0%",
    tickCount: 3,
  };
  finished.encoding.y.scale = { domain: [0.45, 1], nice: false };
  finished.encoding.size.scale = { range: [90, 760] };
  finished.encoding.size.legend = null;
  finished.encoding.color.scale = {
    domain: [
      "Precontemplation",
      "Contemplation",
      "Preparation",
      "Action",
    ],
    range: ["#d98270", "#d6a64e", "#82947e", "#6f9f9a"],
  };
  return finished;
}

export function buildTtmBeliefSpec(turns) {
  const spec = assembleVegaLite({
    data: { values: makeBeliefSamples(turns) },
    semantic_types: {
      stagePosition: "Quantity",
      sourceTurn: "Category",
    },
    chart_spec: {
      chartType: "Density Plot",
      encodings: { x: { field: "stagePosition" } },
      baseSize: { width: 620, height: 120 },
      canvasSize: { width: 760, height: 150 },
      chartProperties: { bandwidth: 0.18 },
    },
    options: {
      addTooltips: true,
      baseLabelFontSize: 11,
      baseTitleFontSize: 11,
    },
  });

  const finished = finishSpec(spec, 108);
  finished.encoding.x.axis = stageAxis();
  finished.encoding.x.scale = { domain: [-0.18, 3.18], nice: false };
  finished.encoding.y.axis = {
    title: "Relative belief",
    labels: false,
    ticks: false,
    domain: false,
    grid: false,
  };
  finished.mark = {
    type:
      typeof finished.mark === "string"
        ? finished.mark
        : finished.mark?.type ?? "area",
    ...(typeof finished.mark === "object" ? finished.mark : {}),
    fill: "#82947e",
    fillOpacity: 0.16,
    stroke: "#657b61",
    strokeWidth: 2,
  };
  return finished;
}

export function buildCombSpec(turns) {
  const gapRows = turns.flatMap((turn, index) => [
    {
      turn: index + 1,
      gap: "Bandwidth",
      score: turn.capability,
    },
    {
      turn: index + 1,
      gap: "Engagement",
      score: turn.motivation,
    },
    {
      turn: index + 1,
      gap: "Timing",
      score: turn.opportunity,
    },
  ]);
  const totalRows = turns.map((turn, index) => ({
    turn: index + 1,
    score: turn.behaviorScore,
  }));

  const areaSpec = stripMetadata(
    assembleVegaLite({
      data: { values: gapRows },
      semantic_types: {
        turn: "Quantity",
        gap: "Category",
        score: "Quantity",
      },
      chart_spec: {
        chartType: "Area Chart",
        encodings: {
          x: { field: "turn" },
          y: { field: "score" },
          color: { field: "gap" },
        },
        baseSize: { width: 620, height: 240 },
        canvasSize: { width: 760, height: 260 },
        chartProperties: { interpolate: "monotone", opacity: 0.58 },
      },
      options: {
        addTooltips: true,
        baseLabelFontSize: 11,
        baseTitleFontSize: 11,
      },
    }),
  );
  const lineSpec = stripMetadata(
    assembleVegaLite({
      data: { values: totalRows },
      semantic_types: {
        turn: "Quantity",
        score: "Quantity",
      },
      chart_spec: {
        chartType: "Line Chart",
        encodings: {
          x: { field: "turn" },
          y: { field: "score" },
        },
        baseSize: { width: 620, height: 240 },
        canvasSize: { width: 760, height: 260 },
        chartProperties: { interpolate: "monotone", showPoints: true },
      },
      options: {
        addTooltips: true,
        baseLabelFontSize: 11,
        baseTitleFontSize: 11,
      },
    }),
  );

  const commonXAxis = {
    title: null,
    values: turns.map((_, index) => index + 1),
    labelExpr: "'T' + datum.value",
    labelPadding: 8,
    grid: false,
  };
  const commonYAxis = {
    title: "Behavior load (sum of gaps)",
    domain: [0, 3],
    format: ".1f",
    tickCount: 4,
  };

  const areaLayer = {
    data: areaSpec.data,
    mark: { ...areaSpec.mark, opacity: 0.56 },
    encoding: {
      ...areaSpec.encoding,
      x: { ...areaSpec.encoding.x, axis: commonXAxis },
      y: {
        ...areaSpec.encoding.y,
        axis: commonYAxis,
        scale: { domain: [0, 3], nice: false },
      },
      color: {
        ...areaSpec.encoding.color,
        scale: {
          domain: ["Bandwidth", "Engagement", "Timing"],
          range: ["#6f9f9a", "#d6a64e", "#a385bd"],
        },
      },
    },
  };

  const totalLayer = {
    data: lineSpec.data,
    mark: {
      type: "line",
      color: "#343934",
      strokeWidth: 2.2,
      point: { filled: true, fill: "#fffefa", stroke: "#343934", size: 50 },
    },
    encoding: {
      ...lineSpec.encoding,
      x: { ...lineSpec.encoding.x, axis: commonXAxis },
      y: {
        ...lineSpec.encoding.y,
        axis: commonYAxis,
        scale: { domain: [0, 3], nice: false },
      },
    },
  };

  return {
    width: "container",
    height: 238,
    autosize: { type: "fit", contains: "padding", resize: true },
    background: "transparent",
    layer: [areaLayer, totalLayer],
    config: chartTheme,
  };
}
