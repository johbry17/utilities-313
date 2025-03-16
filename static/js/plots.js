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
  // group data by Year and Month, then by Expense
  const groupedData = d3.group(
    data,
    (d) => new Date(d.Year, d.Month - 1), // adjust month for 0-based index
    (d) => d.Expense
  );
  const dates = Array.from(groupedData.keys());
  const categories = ["Gas", "Internet", "Cleaning", "Electric"];

  // format dates as "MMM YYYY" for x-axis and hover
  const formattedDates = dates.map((date) =>
    date.toLocaleString("default", { month: "short", year: "numeric" })
  );

  // check toggles
  const isPerPerson = document.getElementById("toggle-per-person").checked;
  const isCategory = document.getElementById("toggle-category").checked;

  let traces;

  // conditional to create traces based on category toggle
  if (isCategory) {
    // create trace for each category
    traces = categories.map((category) => {
      return {
        x: formattedDates,
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

    // calculate totals for hover
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
      x: formattedDates,
      y: totals,
      hovertemplate: isPerPerson
        ? "<b>Total per Person:</b><br>$%{customdata:.2f}<extra></extra>"
        : "<b>Total:</b><br>$%{customdata:.2f}<extra></extra>",
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
        x: formattedDates,
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
      ? "Monthly Utilities<br><b>per Person</b> by Type"
      : "Monthly Utilities<br>by Type"
    : isPerPerson
    ? "Monthly Utilities<br><b>per Person</b>"
    : "Monthly Utilities";

  // dynamic tick values and labels for layout
  // one tick per year by default
  let tickvals = formattedDates.filter((_, i) => i % 12 === 0);
  let ticktext = tickvals.map((date) => date.split(" ")[1]);

  // change ticks for smaller date ranges
  if (dates.length <= 24) {
    tickvals = formattedDates;
    ticktext = formattedDates;
  }

  // set y-axis range, excluding Total
  const yMax = Math.max(
    ...traces
      .filter((trace) => trace.name !== "Total")
      .flatMap((trace) => trace.y.filter((y) => y !== null))
  );

  // for formatting on mobile
  const isMobile = window.innerWidth <= 768;

  // layout with dynamic title, mobile responsiveness
  const layout = {
    title: chartTitle,
    xaxis: {
      title: isMobile ? "" : "Date",
      tickvals: tickvals,
      ticktext: ticktext,
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
    hovermode: "x", // show hover info for all traces
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
  // group data by Year, Month, and Expense
  const groupedData = d3.group(
    data,
    (d) => new Date(d.Year, d.Month - 1), // adjust month for 0-based index
    (d) => d.Expense
  );
  const dates = Array.from(groupedData.keys());

  // format dates as "MMM YYYY" for x-axis and hover
  const formattedDates = dates.map((date) =>
    date.toLocaleString("default", { month: "short", year: "numeric" })
  );

  const categories = ["Gas", "Internet", "Cleaning", "Electric"];

  // check toggle
  const isPerPerson = document.getElementById("toggle-per-person").checked;
  const chartTitle = isPerPerson
    ? "Monthly Expenses<br><b>per Person</b><br><sup>Stacked by Utility Type</sup>"
    : "Total Monthly Expenses<br><sup>Stacked by Utility Type</sup>";

  // create traces for each category
  const traces = categories.map((category) => {
    return {
      x: formattedDates,
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
    x: formattedDates,
    y: totals,
    hovertemplate: isPerPerson
      ? "<b>Total<br>per Person:</b><br>$%{y:.2f}<extra></extra>"
      : "<b>Total:</b><br>$%{y:.2f}<extra></extra>",
    mode: "text",
    name: "Total",
    showlegend: false, // hide trace from legend
  };

  // dynamic tick values and labels for layout
  // one tick per year by default
  let tickvals = formattedDates.filter((_, i) => i % 12 === 0);
  let ticktext = tickvals.map((date) => date.split(" ")[1]);

  // change ticks for smaller date ranges
  if (formattedDates.length <= 24) {
    tickvals = formattedDates;
    ticktext = formattedDates;
  }

  // for formatting layout on mobile
  const isMobile = window.innerWidth <= 768;

  // layout with mobile responsiveness
  const layout = {
    title: chartTitle,
    barmode: "stack",
    xaxis: {
      title: isMobile ? "" : "Date",
      tickvals: tickvals,
      ticktext: ticktext,
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
    hovermode: "x", // show hover info for all traces
  };

  // plot chart
  Plotly.newPlot("stacked-bar-chart", [...traces, totalTrace], layout);
}

function updateCategoryTable(data) {
  // check toggle
  const isPerPerson = document.getElementById("toggle-per-person").checked;

  // group data by Expense and calculate summary statistics
  const groupedData = d3.rollups(
    data,
    (v) => ({
      total: d3.sum(v, (d) => d.Amount) || 0,
      min: d3.min(v, (d) => d.Amount) || 0,
      max: d3.max(v, (d) => d.Amount) || 0,
      avg: d3.mean(v, (d) => d.Amount) || 0,
      stdDev: d3.deviation(v, (d) => d.Amount) || 0,
    }),
    (d) => d.Expense
  );

  // add Total row
  groupedData.push([
    "<b>Total</b>",
    (() => {
      // group data by Year and Month, calculate monthly totals
      const monthlyTotals = d3.rollups(
        data,
        (v) => d3.sum(v, (d) => d.Amount),
        (d) => `${d.Year}-${d.Month}` // group by Year-Month
      );

      // extract monthly total amounts
      const monthlyAmounts = monthlyTotals.map(([_, total]) => total);

      // calculate statistics based on monthly totals
      return {
        total: d3.sum(monthlyAmounts) || 0,
        min: d3.min(monthlyAmounts) || 0,
        max: d3.max(monthlyAmounts) || 0,
        avg: d3.mean(monthlyAmounts) || 0,
        stdDev: d3.deviation(monthlyAmounts) || 0,
      };
    })(),
  ]);

  // custom sort order
  const sortOrder = ["Electric", "Cleaning", "Internet", "Gas", "<b>Total</b>"];

  // sort
  groupedData.sort((a, b) => {
    const indexA = sortOrder.indexOf(a[0]);
    const indexB = sortOrder.indexOf(b[0]);
    return indexA - indexB;
  });

  // convert data into arrays for table
  const expenses = groupedData.map(([expense]) => expense);
  const totalSpend = groupedData.map(
    ([_, stats]) =>
      `$${(isPerPerson ? stats.total / 3 : stats.total).toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`
  );
  const minSpend = groupedData.map(
    ([_, stats]) =>
      `$${(isPerPerson ? stats.min / 3 : stats.min).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
  );
  const maxSpend = groupedData.map(
    ([_, stats]) =>
      `$${(isPerPerson ? stats.max / 3 : stats.max).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
  );
  const avgSpend = groupedData.map(
    ([_, stats]) =>
      `$${(isPerPerson ? stats.avg / 3 : stats.avg).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
  );
  const stdDevSpend = groupedData.map(
    ([_, stats]) =>
      `$${(isPerPerson ? stats.stdDev / 3 : stats.stdDev).toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`
  );

  // for formatting on mobile
  const isMobile = window.innerWidth <= 768;

  // create table
  const tableData = [
    {
      type: "table",
      header: {
        values: [
          "<b>Expense</b>",
          "<b>Total Spend</b>",
          "<b>Min Bill</b>",
          "<b>Max Bill</b>",
          "<b>Avg Bill</b>",
          "<b>Standard Deviation</b>",
        ],
        fill: { color: "paleturquoise" },
        align: "right",
        font: { size: isMobile ? 13 : 14 },
      },
      cells: {
        values: [
          expenses,
          totalSpend,
          minSpend,
          maxSpend,
          avgSpend,
          stdDevSpend,
        ],
        fill: { color: "lavender" },
        align: "right",
        font: { size: isMobile ? 11 : 12 },
      },
    },
  ];

  // layout
  const layout = {
    title: {
      text: `Monthly Bill by Utility Type<br><sup>Min, Max, Avg, and Standard Deviation ${
        isPerPerson ? "<b>per Person</b>" : ""
      }</sup>`,
      x: 0.5,
      xanchor: "center",
    },
    margin: {
      t: isMobile ? 80 : 80,
      b: isMobile ? 0 : 0,
      l: isMobile ? 10 : 80,
      r: isMobile ? 10 : 80,
    },
    height: 250,
  };

  Plotly.newPlot("category-summary-table", tableData, layout);
}

// create static summary of expenses
function createTable(processedData) {
  // filter out data before 2021
  const filteredData = processedData.filter((d) => d.Year > 2020);

  // group data by year and month, then sum the Amount
  const monthlyTotals = d3.rollups(
    filteredData,
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
  const maxAmounts = yearlyStats.map(
    (d) =>
      `$${d[1].max.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
  );
  const minAmounts = yearlyStats.map(
    (d) =>
      `$${d[1].min.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
  );
  const avgAmounts = yearlyStats.map(
    (d) =>
      `$${d[1].avg.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
  );
  const totalAmounts = yearlyStats.map(
    (d) =>
      `$${d[1].total.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
  );

  // for formatting on mobile
  const isMobile = window.innerWidth <= 768;

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
        font: { size: isMobile ? 13 : 14 },
      },
      cells: {
        values: [years, maxAmounts, minAmounts, avgAmounts, totalAmounts],
        fill: { color: "lavender" },
        align: "right",
        font: { size: isMobile ? 11 : 12 },
      },
    },
  ];

  const layout = {
    title:
      "Annual Utility Bills <b>per Person</b><br><sup>Max, Min, Average, and Total</sup>",
    margin: {
      t: isMobile ? 80 : 80,
      b: isMobile ? 0 : 20,
      l: isMobile ? 10 : 80,
      r: isMobile ? 10 : 80,
    },
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

  // filter out data before 2021
  const filteredData = data.filter((d) => d.Year > 2020);

  // group data by Year and Month, then sum Amount
  const groupedData = d3.rollups(
    filteredData,
    (v) => d3.sum(v, (d) => d.Amount),
    (d) => d.Year,
    (d) => d.Month
  );

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
        "<b>%{customdata.year}</b><br>$%{customdata.amount:,.2f}<extra></extra>",
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
    hovermode: "x", // show hover info for all traces
    legend: {
      orientation: "h",
      x: 0.5,
      xanchor: "center",
      y: -0.2,
    },
  };

  Plotly.newPlot("years-line", traces, layout);
}

// create monthly average stacked bar chart
function createMonthlyAverageStackedBar(data) {
  // group data by Year, Month, and Expense, calculate the total Amount
  const groupedData = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.Amount),
    (d) => d.Year,
    (d) => d.Month,
    (d) => d.Expense
  );

  // flatten grouped data
  const flattenedData = [];
  groupedData.forEach(([year, months]) => {
    months.forEach(([month, expenses]) => {
      expenses.forEach(([expense, total]) => {
        flattenedData.push({
          Year: year,
          Month: month,
          Expense: expense,
          Amount: total / 3, // divide by 3 for per person
        });
      });
    });
  });

  // convert flattened data into a D3 nest grouped by Month and Expense
  const monthlyAverages = d3.rollups(
    flattenedData,
    (v) => d3.mean(v, (d) => d.Amount), // calculate average for each month
    (d) => d.Month,
    (d) => d.Expense
  );

  // calculate totals for each month for hover
  const monthlyTotals = Array(12).fill(0);
  monthlyAverages.forEach(([month, expenses]) => {
    monthlyTotals[month - 1] = expenses.reduce((sum, [_, avg]) => sum + avg, 0);
  });

  // get max total, to set y-axis range
  const maxTotal = Math.max(...monthlyTotals);

  // prep data
  const expenseTypes = ["Gas", "Internet", "Cleaning", "Electric"]; // order of utilities
  const months = [
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
  const traces = [];

  expenseTypes.forEach((expense) => {
    const yValues = Array(12).fill(0); // array for 12 months with 0 values

    monthlyAverages.forEach(([month, expenses]) => {
      const expenseData = expenses.find(([e]) => e === expense);
      if (expenseData) {
        yValues[month - 1] = expenseData[1]; // adjust for 0-based month index
      }
    });

    // create traces for each expense
    traces.push({
      x: months,
      y: yValues,
      name: expense,
      type: "bar",
      hovertemplate: `<b>${expense}:</b><br>$%{y:.2f}<extra></extra>`,
      marker: { color: colorPalette[expense] },
    });
  });

  // trace for total
  traces.push({
    x: months,
    y: monthlyTotals,
    name: "Total",
    type: "bar",
    // mode: "markers",
    marker: { color: "black", size: 10, opacity: 0 }, // invisible marker
    hovertemplate: `<b>Total %{x}:</b><br>$%{y:.2f}<extra></extra>`,
    showlegend: false, // hide from legend
    hoverlabel: { yanchor: "top", yshift: -15 },
  });

  // for formatting on mobile
  const isMobile = window.innerWidth <= 768;

  // create layout
  const layout = {
    barmode: "stack",
    title:
      "Monthly Average Bills<br><b>per Person</b><br><sup>Stacked by Utility Type</sup>",
    xaxis: {
      title: isMobile ? "" : "Month",
      tickmode: "array",
      tickvals: months,
    },
    yaxis: {
      title: isMobile ? "" : "Average Amount ($)",
      tickprefix: "$",
      range: [0, maxTotal * 1.1], // set y-axis range
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
    hovermode: "x", // show hover info for all traces
  };

  Plotly.newPlot("monthly-average-stacked-bar", traces, layout);
}
