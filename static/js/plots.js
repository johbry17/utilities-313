// Description: plots, supporting app.js

// ── Shared design tokens ───────────────────────────────────────────────────
const FONT = "'Helvetica Neue', Arial, sans-serif";

const colorPalette = {
  Electric: "#4a7bb5",
  Gas:      "#c8703a",
  Internet: "#2d9da8",
  Cleaning: "#4a9e6a",
};

// Year-over-year comparison palette (non-category traces)
const yearColorway = ["#4a7bb5", "#c8703a", "#2d9da8", "#4a9e6a", "#9a7bc8"];

// Axis style defaults
const AXIS_X = {
  gridcolor: "#e8e8e4",
  showgrid: false,
  linecolor: "#d4d0cc",
  linewidth: 1,
  tickfont: { family: FONT, size: 11, color: "#666" },
  title: { font: { family: FONT, size: 11, color: "#888" } },
  zeroline: false,
  showspikes: false,
};

const AXIS_Y = {
  gridcolor: "#e8e8e4",
  showgrid: true,
  linecolor: "rgba(0,0,0,0)",
  tickfont: { family: FONT, size: 11, color: "#666" },
  title: { font: { family: FONT, size: 11, color: "#888" } },
  zeroline: false,
  zerolinecolor: "#d4d0cc",
  showspikes: false,
};

// Table header and cell colors
const TABLE_HEADER_FILL = "#f0efed";
const TABLE_CELL_FILL   = "#ffffff";
const TABLE_ALT_FILL    = "#fafaf8";
const TABLE_LINE_COLOR  = "#e2e0dc";

// ── Plotly config (shared across all charts) ───────────────────────────────
const config = {
  responsive: true,
  displayModeBar: "hover",
  modeBarButtonsToRemove: [
    "zoom2d", "pan2d", "select2d", "lasso2d",
    "zoomIn2d", "zoomOut2d", "autoScale2d",
    "toggleSpikelines", "hoverClosestCartesian",
    "hoverCompareCartesian", "hoverClosestPie",
    "toggleHover", "toImage",
  ],
};

// ── Base layout factory ────────────────────────────────────────────────────
// Merges one level deep: top-level keys from `overrides` are shallow-merged
// with the base defaults.  Callers should pass `xaxis`, `yaxis`, `title`,
// `margin`, etc. as override keys.
function makeLayout(overrides = {}) {
  const isMobile = window.innerWidth <= 768;

  const base = {
    paper_bgcolor: "#ffffff",
    plot_bgcolor:  "#fafaf8",
    font: { family: FONT, size: 12, color: "#2d2d2d" },
    title: {
      x: 0.04,
      xanchor: "left",
      font: { family: FONT, size: isMobile ? 13 : 15, color: "#1a1a1a" },
      pad: { l: 6 },
    },
    hoverlabel: {
      bgcolor: "#ffffff",
      bordercolor: "#cccccc",
      font: { family: FONT, size: 12, color: "#1a1a1a" },
    },
    legend: {
      orientation: "h",
      x: 0.5,
      xanchor: "center",
      y: -0.18,
      bgcolor: "rgba(255,255,255,0)",
      borderwidth: 0,
      font: { family: FONT, size: 11, color: "#444" },
    },
    margin: {
      t: isMobile ? 44 : 56,
      b: isMobile ? 36 : 64,
      l: isMobile ? 38 : 64,
      r: isMobile ? 16 : 32,
    },
  };

  const result = { ...base };
  for (const [key, val] of Object.entries(overrides)) {
    if (
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      base[key] !== undefined
    ) {
      result[key] = { ...base[key], ...val };
    } else {
      result[key] = val;
    }
  }
  return result;
}

// ── Timeseries line chart ──────────────────────────────────────────────────
function updateLineChart(data) {
  const groupedData = d3.group(
    data,
    (d) => new Date(d.Year, d.Month - 1),
    (d) => d.Expense,
  );
  const dates = Array.from(groupedData.keys());
  const categories = ["Gas", "Internet", "Cleaning", "Electric"];

  const formattedDates = dates.map((date) =>
    date.toLocaleString("default", { month: "short", year: "numeric" }),
  );

  const isPerPerson = document.getElementById("toggle-per-person").checked;
  const isCategory  = document.getElementById("toggle-category").checked;

  let traces;

  if (isCategory) {
    traces = categories.map((category) => ({
      x: formattedDates,
      y: dates.map((date) => {
        const cat = groupedData.get(date)?.get(category);
        const total = cat ? cat.reduce((s, d) => s + d.Amount, 0) : 0;
        return isPerPerson ? total / 3 : total;
      }),
      name: category,
      type: "scatter",
      mode: "lines",
      hovertemplate: `$%{y:.2f}<br>`,
      line: { color: colorPalette[category], width: 2 },
    }));

    const totals = dates.map((date) =>
      categories.reduce((sum, cat) => {
        const cd = groupedData.get(date)?.get(cat);
        const t = cd ? cd.reduce((s, d) => s + d.Amount, 0) : 0;
        return sum + (isPerPerson ? t / 3 : t);
      }, 0),
    );

    traces.push({
      x: formattedDates,
      y: totals,
      hovertemplate: isPerPerson
        ? "<b>Total / Person:</b> $%{customdata:.2f}<extra></extra>"
        : "<b>Total:</b> $%{customdata:.2f}<extra></extra>",
      customdata: totals,
      mode: "text",
      name: "Total",
      showlegend: false,
    });
  } else {
    const amounts = dates.map((date) =>
      categories.reduce((sum, cat) => {
        const cd = groupedData.get(date)?.get(cat);
        const t = cd ? cd.reduce((s, d) => s + d.Amount, 0) : 0;
        return sum + (isPerPerson ? t / 3 : t);
      }, 0),
    );

    traces = [
      {
        x: formattedDates,
        y: amounts,
        type: "scatter",
        mode: "lines",
        name: isPerPerson ? "Total / Person" : "Total Utilities",
        hovertemplate: "$%{y:.2f}",
        line: { color: "#4a7bb5", width: 2 },
      },
    ];
  }

  const chartTitle = isCategory
    ? isPerPerson
      ? "Monthly Utilities per Person, by Type"
      : "Monthly Utilities by Type"
    : isPerPerson
      ? "Monthly Utilities per Person"
      : "Monthly Utilities";

  const isMobile = window.innerWidth <= 768;

  let tickvals = formattedDates.filter((_, i) => i % 12 === 0);
  let ticktext  = tickvals.map((d) => d.split(" ")[1]);

  if (dates.length <= 24) {
    tickvals = formattedDates;
    ticktext  = formattedDates;
  }

  const yMax = Math.max(
    ...traces
      .filter((t) => t.name !== "Total")
      .flatMap((t) => t.y.filter((y) => y !== null)),
  );

  const layout = makeLayout({
    title: chartTitle,
    xaxis: {
      ...AXIS_X,
      title: isMobile ? "" : "Date",
      tickvals,
      ticktext,
    },
    yaxis: {
      ...AXIS_Y,
      title: isMobile ? "" : "Amount ($)",
      range: [0, yMax * 1.1],
      tickprefix: "$",
    },
    hovermode: "x",
  });

  Plotly.newPlot("line-chart", traces, layout, config);
}

// ── Treemap ────────────────────────────────────────────────────────────────
function updateTreemap(data) {
  const groupedData = d3.rollup(
    data,
    (v) => d3.sum(v, (d) => d.Amount),
    (d) => d.Expense,
  );
  const labels  = Array.from(groupedData.keys());
  const values  = Array.from(groupedData.values());
  const isPerPerson = document.getElementById("toggle-per-person").checked;
  const adjusted    = isPerPerson ? values.map((v) => v / 3) : values;
  const total       = adjusted.reduce((s, v) => s + v, 0);
  const percentages = adjusted.map((v) => (v / total) * 100);

  const chartTitle  = isPerPerson ? "Total Expenses per Person" : "Total Expenses";

  const hoverTemplates = labels.map((_, i) => {
    if (!adjusted[i]) return "";
    return isPerPerson
      ? "<b>%{label}</b><br>Total / Person: $%{value:,.2f}<br>% of Total: %{customdata:.1f}%<extra></extra>"
      : "<b>%{label}</b><br>Total: $%{value:,.2f}<br>% of Total: %{customdata:.1f}%<extra></extra>";
  });

  const trace = {
    type: "treemap",
    labels,
    parents: labels.map(() => ""),
    values: adjusted,
    customdata: percentages,
    textinfo: "label+value+percent entry",
    texttemplate: "<b>%{label}</b><br>$%{value:,.2f}<br>%{customdata:.1f}%",
    hovertemplate: hoverTemplates,
    textposition: "top right",
    root: { visible: false },
    marker: {
      colors: labels.map((l) => colorPalette[l]),
      line: { width: 1.5, color: "#ffffff" },
    },
    textfont: { family: FONT, size: 13 },
  };

  const isMobile = window.innerWidth <= 768;
  const layout = makeLayout({
    title: chartTitle,
    margin: {
      t: isMobile ? 44 : 56,
      b: isMobile ? 10 : 16,
      l: isMobile ? 10 : 16,
      r: isMobile ? 10 : 16,
    },
  });

  Plotly.newPlot("treemap-chart", [trace], layout, config);
}

// ── Stacked bar chart ──────────────────────────────────────────────────────
function updateStackedBar(data) {
  const groupedData = d3.group(
    data,
    (d) => new Date(d.Year, d.Month - 1),
    (d) => d.Expense,
  );
  const dates = Array.from(groupedData.keys());
  const formattedDates = dates.map((date) =>
    date.toLocaleString("default", { month: "short", year: "numeric" }),
  );
  const categories = ["Gas", "Internet", "Cleaning", "Electric"];
  const isPerPerson = document.getElementById("toggle-per-person").checked;

  const chartTitle = isPerPerson
    ? "Monthly Expenses per Person"
    : "Total Monthly Expenses";

  const traces = categories.map((category) => ({
    x: formattedDates,
    y: dates.map((date) => {
      const cd = groupedData.get(date)?.get(category);
      const t  = cd ? cd.reduce((s, d) => s + d.Amount, 0) : 0;
      return isPerPerson ? t / 3 : t;
    }),
    name: category,
    type: "bar",
    hovertemplate: "$%{y:.2f}",
    marker: { color: colorPalette[category] },
  }));

  const totals = dates.map((date) =>
    categories.reduce((sum, cat) => {
      const cd = groupedData.get(date)?.get(cat);
      const t  = cd ? cd.reduce((s, d) => s + d.Amount, 0) : 0;
      return sum + (isPerPerson ? t / 3 : t);
    }, 0),
  );

  traces.push({
    x: formattedDates,
    y: totals,
    hovertemplate: isPerPerson
      ? "<b>Total / Person:</b> $%{y:.2f}<extra></extra>"
      : "<b>Total:</b> $%{y:.2f}<extra></extra>",
    mode: "text",
    name: "Total",
    showlegend: false,
  });

  const isMobile = window.innerWidth <= 768;

  let tickvals = formattedDates.filter((_, i) => i % 12 === 0);
  let ticktext  = tickvals.map((d) => d.split(" ")[1]);

  if (formattedDates.length <= 24) {
    tickvals = formattedDates;
    ticktext  = formattedDates;
  }

  const layout = makeLayout({
    title: chartTitle,
    barmode: "stack",
    xaxis: {
      ...AXIS_X,
      title: isMobile ? "" : "Date",
      tickvals,
      ticktext,
    },
    yaxis: {
      ...AXIS_Y,
      title: isMobile ? "" : "Amount ($)",
      tickprefix: "$",
    },
    hovermode: "x",
  });

  Plotly.newPlot("stacked-bar-chart", [...traces], layout, config);
}

// ── Category summary table (filterable) ───────────────────────────────────
function updateCategoryTable(data) {
  const isPerPerson = document.getElementById("toggle-per-person").checked;

  const groupedData = d3.rollups(
    data,
    (v) => ({
      total:  d3.sum(v, (d) => d.Amount)       || 0,
      min:    d3.min(v, (d) => d.Amount)        || 0,
      max:    d3.max(v, (d) => d.Amount)        || 0,
      avg:    d3.mean(v, (d) => d.Amount)       || 0,
      stdDev: d3.deviation(v, (d) => d.Amount) || 0,
    }),
    (d) => d.Expense,
  );

  groupedData.push([
    "<b>Total</b>",
    (() => {
      const monthlyTotals = d3.rollups(
        data,
        (v) => d3.sum(v, (d) => d.Amount),
        (d) => `${d.Year}-${d.Month}`,
      );
      const amounts = monthlyTotals.map(([, t]) => t);
      return {
        total:  d3.sum(amounts)       || 0,
        min:    d3.min(amounts)        || 0,
        max:    d3.max(amounts)        || 0,
        avg:    d3.mean(amounts)       || 0,
        stdDev: d3.deviation(amounts) || 0,
      };
    })(),
  ]);

  const sortOrder = ["Electric", "Cleaning", "Internet", "Gas", "<b>Total</b>"];
  groupedData.sort((a, b) => sortOrder.indexOf(a[0]) - sortOrder.indexOf(b[0]));

  const fmt = (n) =>
    `$${(isPerPerson ? n / 3 : n).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  const expenses  = groupedData.map(([e])   => e);
  const totalSpend = groupedData.map(([, s]) => fmt(s.total));
  const minSpend   = groupedData.map(([, s]) => fmt(s.min));
  const maxSpend   = groupedData.map(([, s]) => fmt(s.max));
  const avgSpend   = groupedData.map(([, s]) => fmt(s.avg));
  const stdDevSpend = groupedData.map(([, s]) => fmt(s.stdDev));

  const isMobile = window.innerWidth <= 768;
  const n = expenses.length;
  const rowFill = Array.from({ length: n }, (_, i) =>
    i === n - 1 ? TABLE_HEADER_FILL : (i % 2 === 0 ? TABLE_CELL_FILL : TABLE_ALT_FILL),
  );

  const tableTrace = {
    type: "table",
    header: {
      values: [
        "<b>Utility</b>",
        "<b>Total Spend</b>",
        "<b>Min Bill</b>",
        "<b>Max Bill</b>",
        "<b>Avg Bill</b>",
        "<b>Std Dev</b>",
      ],
      fill:  { color: TABLE_HEADER_FILL },
      align: "right",
      font:  { family: FONT, size: isMobile ? 12 : 13, color: "#3d3d3d" },
      line:  { color: TABLE_LINE_COLOR, width: 1 },
      height: 32,
    },
    cells: {
      values: [expenses, totalSpend, minSpend, maxSpend, avgSpend, stdDevSpend],
      fill:  { color: [rowFill] },
      align: "right",
      font:  { family: FONT, size: isMobile ? 11 : 12, color: "#1a1a1a" },
      line:  { color: TABLE_LINE_COLOR, width: 1 },
      height: 28,
    },
  };

  const layout = makeLayout({
    title: {
      text: isPerPerson
        ? "Monthly Bill by Utility Type — per Person"
        : "Monthly Bill by Utility Type",
      x: 0.04,
      xanchor: "left",
      font: { family: FONT, size: isMobile ? 13 : 15, color: "#1a1a1a" },
    },
    margin: {
      t: isMobile ? 50 : 60,
      b: 8,
      l: isMobile ? 10 : 16,
      r: isMobile ? 10 : 16,
    },
    height: 270,
  });

  Plotly.newPlot("category-summary-table", [tableTrace], layout, config);
}

// ── Annual statistics table (static) ──────────────────────────────────────
function createTable(processedData) {
  const filteredData = processedData.filter((d) => d.Year > 2020);

  const monthlyTotals = d3.rollups(
    filteredData,
    (v) => d3.sum(v, (d) => d.Amount),
    (d) => d.Year,
    (d) => d.Month,
  );

  const flattenedData = [];
  monthlyTotals.forEach(([year, yearData]) => {
    yearData.forEach(([month, total]) => {
      flattenedData.push({
        Year: year,
        Month: month,
        TotalAmount: total,
        AmountPerPerson: total / 3,
      });
    });
  });

  const yearlyStats = d3.rollups(
    flattenedData,
    (v) => ({
      max:   d3.max(v, (d)  => d.AmountPerPerson),
      min:   d3.min(v, (d)  => d.AmountPerPerson),
      avg:   d3.mean(v, (d) => d.AmountPerPerson),
      total: d3.sum(v, (d)  => d.AmountPerPerson),
    }),
    (d) => d.Year,
  );
  yearlyStats.sort((a, b) => a[0] - b[0]);

  const fmt = (v) =>
    `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const years        = yearlyStats.map((d) => d[0]);
  const maxAmounts   = yearlyStats.map((d) => fmt(d[1].max));
  const minAmounts   = yearlyStats.map((d) => fmt(d[1].min));
  const avgAmounts   = yearlyStats.map((d) => fmt(d[1].avg));
  const totalAmounts = yearlyStats.map((d) => fmt(d[1].total));

  const isMobile = window.innerWidth <= 768;
  const n = years.length;
  const rowFill = Array.from({ length: n }, (_, i) =>
    i % 2 === 0 ? TABLE_CELL_FILL : TABLE_ALT_FILL,
  );

  const tableTrace = {
    type: "table",
    header: {
      values: [
        "<b>Year</b>",
        "<b>Max / Person</b>",
        "<b>Min / Person</b>",
        "<b>Avg / Person</b>",
        "<b>Annual / Person</b>",
      ],
      fill:  { color: TABLE_HEADER_FILL },
      align: "right",
      font:  { family: FONT, size: isMobile ? 12 : 13, color: "#3d3d3d" },
      line:  { color: TABLE_LINE_COLOR, width: 1 },
      height: 32,
    },
    cells: {
      values: [years, maxAmounts, minAmounts, avgAmounts, totalAmounts],
      fill:  { color: [rowFill] },
      align: "right",
      font:  { family: FONT, size: isMobile ? 11 : 12, color: "#1a1a1a" },
      line:  { color: TABLE_LINE_COLOR, width: 1 },
      height: 28,
    },
  };

  const layout = makeLayout({
    title: "Annual Utility Bills per Person",
    margin: {
      t: isMobile ? 50 : 60,
      b: 8,
      l: isMobile ? 10 : 16,
      r: isMobile ? 10 : 16,
    },
  });

  Plotly.newPlot("table", [tableTrace], layout, config);
}

// ── Year-over-year monthly line chart (static) ────────────────────────────
function createYearsLineChart(data) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const filteredData = data.filter((d) => d.Year > 2020);

  const groupedData = d3.rollups(
    filteredData,
    (v) => d3.sum(v, (d) => d.Amount),
    (d) => d.Year,
    (d) => d.Month,
  );

  const traces = [];
  groupedData.forEach(([year, months], idx) => {
    traces.push({
      x: months.map(([month]) => monthNames[month - 1]),
      y: months.map(([, total]) => total / 3),
      customdata: months.map(([, total]) => ({ year, amount: total / 3 })),
      mode: "lines+markers",
      name: year.toString(),
      hovertemplate: "<b>%{customdata.year}</b><br>$%{customdata.amount:,.2f}<extra></extra>",
      line:   { color: yearColorway[idx % yearColorway.length], width: 2 },
      marker: { size: 5 },
    });
  });

  const isMobile = window.innerWidth <= 768;

  const layout = makeLayout({
    title: "Individual Years per Person",
    colorway: yearColorway,
    xaxis: {
      ...AXIS_X,
      title: isMobile ? "" : "Month",
    },
    yaxis: {
      ...AXIS_Y,
      title: isMobile ? "" : "Amount ($)",
      tickprefix: "$",
    },
    hovermode: "x",
  });

  Plotly.newPlot("years-line", traces, layout, config);
}

// ── Monthly average stacked bar (static) ──────────────────────────────────
function createMonthlyAverageStackedBar(data) {
  const groupedData = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.Amount),
    (d) => d.Year,
    (d) => d.Month,
    (d) => d.Expense,
  );

  const flattenedData = [];
  groupedData.forEach(([year, months]) => {
    months.forEach(([month, expenses]) => {
      expenses.forEach(([expense, total]) => {
        flattenedData.push({ Year: year, Month: month, Expense: expense, Amount: total / 3 });
      });
    });
  });

  const monthlyAverages = d3.rollups(
    flattenedData,
    (v) => d3.mean(v, (d) => d.Amount),
    (d) => d.Month,
    (d) => d.Expense,
  );

  const monthlyTotals = Array(12).fill(0);
  monthlyAverages.forEach(([month, expenses]) => {
    monthlyTotals[month - 1] = expenses.reduce((s, [, avg]) => s + avg, 0);
  });

  const maxTotal   = Math.max(...monthlyTotals);
  const expenseTypes = ["Gas", "Internet", "Cleaning", "Electric"];
  const months       = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const traces = [];

  expenseTypes.forEach((expense) => {
    const yValues = Array(12).fill(0);
    monthlyAverages.forEach(([month, expenses]) => {
      const ed = expenses.find(([e]) => e === expense);
      if (ed) yValues[month - 1] = ed[1];
    });

    traces.push({
      x: months,
      y: yValues,
      name: expense,
      type: "bar",
      hovertemplate: `<b>${expense}:</b> $%{y:.2f}<extra></extra>`,
      marker: { color: colorPalette[expense] },
    });
  });

  traces.push({
    x: months,
    y: monthlyTotals,
    name: "Total",
    type: "bar",
    marker: { color: "transparent", opacity: 0 },
    hovertemplate: "<b>Total %{x}:</b> $%{y:.2f}<extra></extra>",
    showlegend: false,
  });

  const isMobile = window.innerWidth <= 768;

  const layout = makeLayout({
    title: "Monthly Average Bills per Person",
    barmode: "stack",
    xaxis: {
      ...AXIS_X,
      title: isMobile ? "" : "Month",
      tickmode: "array",
      tickvals: months,
    },
    yaxis: {
      ...AXIS_Y,
      title: isMobile ? "" : "Average Amount ($)",
      tickprefix: "$",
      range: [0, maxTotal * 1.1],
    },
    hovermode: "x",
  });

  Plotly.newPlot("monthly-average-stacked-bar", traces, layout, config);
}

// ── First/last 24-month comparison (static) ───────────────────────────────
function createFirstLast24MonthsChart(data) {
  const mostRecentDate  = d3.max(data, (d) => new Date(d.Year, d.Month - 1));
  const mostRecentYear  = mostRecentDate.getFullYear();
  const mostRecentMonth = mostRecentDate.getMonth() + 1;

  const startDate  = new Date(mostRecentYear, mostRecentMonth - 24);
  const startMonth = startDate.toLocaleString("default", { month: "short" });
  const startYear  = startDate.getFullYear();
  const endMonth   = mostRecentDate.toLocaleString("default", { month: "short" });
  const endYear    = mostRecentYear;

  const past24MonthsData = data.filter((d) => {
    const date = new Date(d.Year, d.Month - 1);
    return (
      date >= new Date(mostRecentYear, mostRecentMonth - 24) &&
      date <= mostRecentDate
    );
  });

  function calculateMonthlyTotalAverage(filteredData) {
    const monthlyTotals = d3.rollups(
      filteredData,
      (v) => d3.sum(v, (d) => d.Amount / 3),
      (d) => `${d.Year}-${d.Month}`,
    );
    return d3
      .rollups(
        monthlyTotals,
        (v) => d3.mean(v, ([, total]) => total),
        ([ym]) => parseInt(ym.split("-")[1]),
      )
      .sort((a, b) => a[0] - b[0]);
  }

  const avg2021_2022   = calculateMonthlyTotalAverage(
    data.filter((d) => d.Year === 2021 || d.Year === 2022),
  );
  const avgLast24Months = calculateMonthlyTotalAverage(past24MonthsData);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const traceLast24Months = {
    x: months,
    y: avgLast24Months.map(([, avg]) => avg),
    name: `Last 24 months (${startMonth} ${startYear}–${endMonth} ${endYear})`,
    type: "bar",
    marker: { color: "#c8703a" },
    hovertemplate: "<b>Last 24 mo:</b> $%{y:.2f}<extra></extra>",
  };

  const trace2021_2022 = {
    x: months,
    y: avg2021_2022.map(([, avg]) => avg),
    name: "Avg 2021–2022",
    type: "scatter",
    mode: "lines+markers",
    line:   { color: "#4a7bb5", width: 2.5 },
    marker: { size: 6, color: "#4a7bb5" },
    hovertemplate: "<b>2021–2022:</b> $%{y:.2f}<extra></extra>",
  };

  const isMobile = window.innerWidth <= 768;

  const layout = makeLayout({
    title: `Monthly Average per Person: Last 24 Months vs. 2021–2022`,
    xaxis: {
      ...AXIS_X,
      title: isMobile ? "" : "Month",
      tickmode: "array",
      tickvals: months,
    },
    yaxis: {
      ...AXIS_Y,
      title: isMobile ? "" : "Average Amount ($)",
      tickprefix: "$",
    },
    hovermode: "x",
    barmode: "overlay",
  });

  Plotly.newPlot(
    "first-last-24-months-chart",
    [traceLast24Months, trace2021_2022],
    layout,
    config,
  );
}
