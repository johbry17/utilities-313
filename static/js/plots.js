// Description: plots, supporting app.js

// consistent color palette for categories
// const colorPalette = {
//   Electric: "blue",
//   Cleaning: "orange",
//   Internet: "green",
//   Gas: "red",
// };
const colorPalette = {
    Electric: "red",
    Cleaning: "green",
    Internet: "orange",
    Gas: "blue",
  };

// timeseries chart of expenses per month
function updateLineChart(data) {
  const groupedData = d3.group(
    data,
    (d) => new Date(d.Year, d.Month),
    (d) => d.Expense
  );
  const dates = Array.from(groupedData.keys());
  const categories = ["Gas", "Internet", "Cleaning", "Electric"];

  // check toggles
  const isPerPerson = document.getElementById("toggle-per-person").checked;
  const isCategory = document.getElementById("toggle-category").checked;

  let traces;

  // conditional to create traces based on category toggle
  if (isCategory) {
    // create trace for each category
    traces = categories.map((category) => {
      return {
        x: dates,
        y: dates.map((date) => {
          const categoryData = groupedData.get(date)?.get(category);
          const totalAmount = categoryData
            ? categoryData.reduce((sum, d) => sum + d.Amount, 0)
            : 0;
          return isPerPerson ? totalAmount / 3 : totalAmount; // divide by 3 for per person
        }),
        name: category,
        type: "scatter",
        mode: "lines",
        hovertemplate: `$%{y:.2f}<br>`,
        line: { color: colorPalette[category] },
      };
    });

    // calculate totals for hover trace
    const totals = dates.map((date) => {
      return categories.reduce((sum, category) => {
        const categoryData = groupedData.get(date)?.get(category);
        const categoryTotal = categoryData
          ? categoryData.reduce((sum, d) => sum + d.Amount, 0)
          : 0;
        return sum + (isPerPerson ? categoryTotal / 3 : categoryTotal);
      }, 0);
    });

    // hidden trace for totals as hover text
    const totalTrace = {
      x: dates,
      y: totals,
      hovertemplate: isPerPerson
        ? "Total per Person:<br>$%{customdata:.2f}<extra></extra>"
        : "Total: $%{customdata:.2f}<extra></extra>",
      customdata: totals,
      mode: "text",
      name: "Total",
      showlegend: false, // hide trace from legend
    };

    // add totalTrace to traces
    traces.push(totalTrace);
  } else {
    // single trace for total
    const amounts = dates.map((date) => {
      return categories.reduce((sum, category) => {
        const categoryData = groupedData.get(date)?.get(category);
        const totalAmount = categoryData
          ? categoryData.reduce((sum, d) => sum + d.Amount, 0)
          : 0;
        return sum + (isPerPerson ? totalAmount / 3 : totalAmount);
      }, 0);
    });

    // traces
    traces = [
      {
        x: dates,
        y: amounts,
        type: "scatter",
        mode: "lines",
        name: isPerPerson ? "Total Utilities per Person" : "Total Utilities",
        hovertemplate: "$%{y:.2f}",
      },
    ];
  }

  // dynamic chart title
  const chartTitle = isCategory
    ? isPerPerson
      ? "Utilities per Month <b>per Person</b> by Category"
      : "Utilities per Month by Category"
    : isPerPerson
    ? "Utilities per Month <b>per Person</b>"
    : "Utilities per Month";

  // set y-axis range, excluding Total
  const yMax = Math.max(
    ...traces
      .filter((trace) => trace.name !== "Total")
      .flatMap((trace) => trace.y.filter((y) => y !== null))
  );

  // layout with dynamic title
  const layout = {
    title: chartTitle,
    xaxis: { title: "Date" },
    yaxis: {
      title: "Amount ($)",
      range: [0, yMax * 1.1],
    },
  };

  Plotly.newPlot("line-chart", traces, layout);
}

// treemap chart of Expenses totaled
function updateTreemap(data) {
  const groupedData = d3.rollup(
    data,
    (v) => d3.sum(v, (d) => d.Amount),
    (d) => d.Expense
  );
  const labels = Array.from(groupedData.keys());
  const values = Array.from(groupedData.values());
  const isPerPerson = document.getElementById("toggle-per-person").checked;
  const adjustedValues = isPerPerson ? values.map((v) => v / 3) : values; // divide by 3 for per person

  // calculate total for percentage calculation
  const total = adjustedValues.reduce((sum, v) => sum + v, 0);

  // add percentage of total to text and hover
  const percentages = adjustedValues.map((v) => (v / total) * 100);

  // toggle title and hover template
  const chartTitle = isPerPerson
    ? "Expenses <b>per Person</b>"
    : "Total Expenses";
  const hoverTemplates = labels.map((label, i) => {
    if (!adjustedValues[i]) return ""; // no hover text for the root node
    return isPerPerson // conditional hover text based on toggle
      ? "<b>%{label}</b><br>Total per Person: $%{value:,.2f}<br>% of Total: %{customdata:.2f}%<extra></extra>"
      : "<b>%{label}</b><br>Total: $%{value:,.2f}<br>% of Total: %{customdata:.2f}%<extra></extra>";
  });

  // create trace
  const trace = {
    type: "treemap",
    labels: labels,
    parents: labels.map(() => ""), // no parent hierarchy (root node)
    values: adjustedValues,
    customdata: percentages, // percentages for hover template
    textinfo: "label+value+percent entry",
    texttemplate: "<b>%{label}</b><br>$%{value:,.2f}<br>%{customdata:.2f}%",
    hovertemplate: hoverTemplates,
    textposition: "top right",
    root: { visible: false },
    marker: {
      colors: labels.map((label) => colorPalette[label]),
    },
  };

  const layout = {
    title: chartTitle,
  };

  Plotly.newPlot("treemap-chart", [trace], layout);
}

// stacked bar chart of expenses per month
function updateStackedBar(data) {
  const groupedData = d3.group(
    data,
    (d) => new Date(d.Year, d.Month),
    (d) => d.Expense
  );
  const dates = Array.from(groupedData.keys());
  const categories = ["Gas", "Internet", "Cleaning", "Electric"];

  // check toggle
  const isPerPerson = document.getElementById("toggle-per-person").checked;
  const chartTitle = isPerPerson
    ? "Expenses per Month <b>per Person</b>"
    : "Total Expenses per Month";

  // create traces for each category
  const traces = categories.map((category) => {
    return {
      x: dates,
      y: dates.map((date) => {
        const categoryData = groupedData.get(date)?.get(category);
        const totalAmount = categoryData
          ? categoryData.reduce((sum, d) => sum + d.Amount, 0)
          : 0;
        return isPerPerson ? totalAmount / 3 : totalAmount; // divide by 3 for per person
      }),
      name: category,
      type: "bar",
      hovertemplate: "$%{y:.2f}",
      marker: { color: colorPalette[category] },
    };
  });

  // calculate totals for each month for hover trace
  const totals = dates.map((date) => {
    const totalAmount = categories.reduce((sum, category) => {
      const categoryData = groupedData.get(date)?.get(category);
      const categoryTotal = categoryData
        ? categoryData.reduce((sum, d) => sum + d.Amount, 0)
        : 0;
      return sum + (isPerPerson ? categoryTotal / 3 : categoryTotal);
    }, 0);
    return totalAmount;
  });

  // trace for the totals as hover text
  const totalTrace = {
    x: dates,
    y: totals,
    hovertemplate: "Total: $%{y:.2f}<extra></extra>",
    mode: "text",
    name: "Total",
    showlegend: false, // hide trace from legend
  };

  // layout with dynamic title
  const layout = {
    title: chartTitle,
    barmode: "stack",
    xaxis: { title: "Date" },
    yaxis: { title: "Amount ($)" },
  };

  // plot chart
  Plotly.newPlot("stacked-bar-chart", [...traces, totalTrace], layout);
}

// create static summary of expenses
function createTable(processedData) {
  // JavaScript's month is 0 indexed
  // this is a terribly annoying problem
  // so to get data starting at Jan 2021, I first must
  // filter out data before December 2020
  const filteredData = processedData.filter(
    (d) => d.Year > 2020 || (d.Year === 2020 && d.Month >= 12)
  );

  // now that I have filtered the data
  // I have to increment the month by 1
  // and then check if it is greater than 12
  // to wrap around to 1 and increment the year
  const adjustedFilteredData = filteredData.map((d) => {
    const newMonth = d.Month + 1; // Increment the month
    return {
      ...d,
      Month: newMonth > 12 ? 1 : newMonth,
      Year: newMonth > 12 ? d.Year + 1 : d.Year,
    };
  });

  // group data by year and month, then sum the Amount
  const monthlyTotals = d3.rollups(
    adjustedFilteredData,
    (v) => d3.sum(v, (d) => d.Amount),
    (d) => d.Year,
    (d) => d.Month
  );

  // flatten grouped data
  // extract year, then month and total amount for each month
  // calculate Amount per Person
  const flattenedData = [];
  monthlyTotals.forEach(([year, yearData]) => {
    yearData.forEach(([month, totalAmount]) => {
      flattenedData.push({
        Year: year,
        Month: month,
        TotalAmount: totalAmount,
        AmountPerPerson: totalAmount / 3, // divide by 3 for per person
      });
    });
  });

  // group data by year, calculate max, min, and average amount per Person
  const yearlyStats = d3.rollups(
    flattenedData,
    (v) => ({
      max: d3.max(v, (d) => d.AmountPerPerson),
      min: d3.min(v, (d) => d.AmountPerPerson),
      avg: d3.mean(v, (d) => d.AmountPerPerson),
      total: d3.sum(v, (d) => d.AmountPerPerson),
    }),
    (d) => d.Year
  );

  // Sort by year
  yearlyStats.sort((a, b) => a[0] - b[0]);
  console.log(yearlyStats);
  // columns for table
  const years = yearlyStats.map((d) => d[0]);
  const maxAmounts = yearlyStats.map((d) => `$${d[1].max.toFixed(2)}`);
  const minAmounts = yearlyStats.map((d) => `$${d[1].min.toFixed(2)}`);
  const avgAmounts = yearlyStats.map((d) => `$${d[1].avg.toFixed(2)}`);
  const totalAmounts = yearlyStats.map((d) => `$${d[1].total.toFixed(2)}`);

  // Create the Plotly table
  const tableData = [
    {
      type: "table",
      header: {
        values: [
          "<b>Year</b>",
          "<b>Max per Person</b>",
          "<b>Min per Person</b>",
          "<b>Average per Person</b>",
          "<b>Total per Person</b>",
        ],
        fill: { color: "paleturquoise" },
        align: "left",
        font: { size: 14 },
      },
      cells: {
        values: [years, maxAmounts, minAmounts, avgAmounts, totalAmounts],
        fill: { color: "lavender" },
        align: "left",
        font: { size: 12 },
      },
    },
  ];

  const layout = {
    title: "Max, Min, Average, and Total Amount per Person per Year",
    margin: { t: 50, l: 25, r: 25, b: 25 },
  };

  Plotly.newPlot("table", tableData, layout);
}
