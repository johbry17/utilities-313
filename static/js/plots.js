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
      ? "Monthly Utilities<br><b>per Person</b> by Category"
      : "Monthly Utilities<br>by Category"
    : isPerPerson
    ? "Monthly Utilities<br><b>per Person</b>"
    : "Monthly Utilities";

  // set y-axis range, excluding Total
  const yMax = Math.max(
    ...traces
      .filter((trace) => trace.name !== "Total")
      .flatMap((trace) => trace.y.filter((y) => y !== null))
  );

  // for foramtting on mobile
  const isMobile = window.innerWidth <= 768;

  // layout with dynamic title, mobile responsiveness
  const layout = {
    title: chartTitle,
    xaxis: {
      title: isMobile ? "" : "Date",
    },
    yaxis: {
      title: isMobile ? "" : "Amount",
      range: [0, yMax * 1.1],
      tickprefix: "$",
    },
    legend: {
      orientation: "h",
      x: 0.5,
      xanchor: "center",
      y: -0.2,
    },
    margin: {
      t: isMobile ? 40 : 80,
      b: isMobile ? 30 : 80,
      l: isMobile ? 30 : 80,
      r: isMobile ? 10 : 80,
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
    ? "Expenses<br><b>per Person</b>"
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

  // for formatting on mobile
  const isMobile = window.innerWidth <= 768;

  const layout = {
    title: chartTitle,
    margin: {
      t: isMobile ? 40 : 80,
      b: isMobile ? 30 : 80,
      l: isMobile ? 30 : 80,
      r: isMobile ? 30 : 80,
    },
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
    ? "Monthly Expenses<br><b>per Person</b>"
    : "Total Monthly Expenses";

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

  // for formatting on mobile
  const isMobile = window.innerWidth <= 768;

  // layout with dynamic title, mobile responsiveness
  const layout = {
    title: chartTitle,
    barmode: "stack",
    xaxis: {
      title: isMobile ? "" : "Date",
    },
    yaxis: {
      title: isMobile ? "" : "Amount",
      tickprefix: "$",
    },
    legend: {
      orientation: "h",
      x: 0.5,
      xanchor: "center",
      y: -0.2,
    },
    margin: {
      t: isMobile ? 40 : 80,
      b: isMobile ? 30 : 80,
      l: isMobile ? 30 : 80,
      r: isMobile ? 10 : 80,
    },
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
    const newMonth = d.Month + 1; // increment the month
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

  // sort by year
  yearlyStats.sort((a, b) => a[0] - b[0]);

  // columns for table
  const years = yearlyStats.map((d) => d[0]);
  const maxAmounts = yearlyStats.map((d) => `$${d[1].max.toFixed(2)}`);
  const minAmounts = yearlyStats.map((d) => `$${d[1].min.toFixed(2)}`);
  const avgAmounts = yearlyStats.map((d) => `$${d[1].avg.toFixed(2)}`);
  const totalAmounts = yearlyStats.map((d) => `$${d[1].total.toFixed(2)}`);

  // create table
  const tableData = [
    {
      type: "table",
      header: {
        values: [
          "<b>Year</b>",
          "<b>Max per Person</b>",
          "<b>Min per Person</b>",
          "<b>Avg per Person</b>",
          "<b>Annual per Person</b>",
        ],
        fill: { color: "paleturquoise" },
        align: "right",
        font: { size: 14 },
      },
      cells: {
        values: [years, maxAmounts, minAmounts, avgAmounts, totalAmounts],
        fill: { color: "lavender" },
        align: "right",
        font: { size: 12 },
      },
    },
  ];

  const layout = {
    title: "Max, Min, Average, and Total<br>Monthly Bill per Person per Year",
    margin: { t: 50, l: 25, r: 25, b: 25 },
  };

  Plotly.newPlot("table", tableData, layout);
}

function createYearsLineChart(data) {
  // convert month numbers to names
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // JavaScript's month is 0 indexed, December is month 11
  // so to filter out data before January 2021,
  // I first must filter out data before month 12 of 2020
  const filteredData = data.filter(
    (d) => d.Year > 2020 || (d.Year === 2020 && d.Month >= 12)
  );

  // this adjusts the month and year to account for the 0-indexed month
  const adjustedData = filteredData.map((d) => {
    const newMonth = d.Month + 1; // increment the month
    return {
      ...d,
      Month: newMonth > 12 ? 1 : newMonth, // wrap around to 1 if greater than 12
      Year: newMonth > 12 ? d.Year + 1 : d.Year, // increment the year if the month wraps around
      Amount: +d.Amount,
    };
  });

  // group data by Year and Month, then sum Amount
  const groupedData = d3.rollups(
    adjustedData,
    (v) => d3.sum(v, (d) => d.Amount),
    (d) => d.Year,
    (d) => d.Month
  );

  console.log("Grouped and consolidated data by year and month:", groupedData);

  // create traces
  let traces = [];
  groupedData.forEach(([year, months]) => {
    traces.push({
      x: months.map(([month, totalAmount]) => monthNames[month - 1]), // convert month numbers to names
      y: months.map(([month, totalAmount]) => totalAmount / 3), // divide by 3 for per person
      customdata: months.map(([month, totalAmount]) => ({
        // for hover template
        year: year,
        amount: totalAmount / 3,
      })),
      mode: "lines",
      name: year.toString(), // convert year to string for legend
      hovertemplate:
        "%{x} %{customdata.year}<br>$%{customdata.amount:,.2f}<extra></extra>",
    });
  });

  // for formatting on mobile
  const isMobile = window.innerWidth <= 768;

  // mobile responsive layout
  let layout = {
    title: "Individual Years<br><b>per Person</b>",
    xaxis: {
      title: isMobile ? "" : "Month",
    },
    yaxis: {
      title: isMobile ? "" : "Amount",
      tickprefix: "$",
    },
    margin: {
      t: isMobile ? 40 : 80,
      b: isMobile ? 30 : 80,
      l: isMobile ? 40 : 80,
      r: isMobile ? 20 : 80,
    },
    legend: {
      orientation: "h",
      x: 0.5,
      xanchor: "center",
      y: -0.2,
    },
  };

  Plotly.newPlot("years-line", traces, layout);
}
