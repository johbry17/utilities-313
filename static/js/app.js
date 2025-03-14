// Description: JavaScript code for the utilities dashboard

// global variable to store data
let processedData = [];

// clean data for use
// calculate amount per person
// filter out the last month of data since it is usually incomplete
// consolidate Pepco and CleanChoice into Electric
// group data by year, month, and expense to consolidate Electric expenses per month
function processData(data) {
  data.forEach((d) => {
    d.Date = new Date(d.Date); // convert string to date
    d.AmountPerPerson = d.Amount / 3;
    if (d.Expense === "Pepco" || d.Expense === "CleanChoice")
      d.Expense = "Electric";
  });

  const maxDate = d3.max(data, (d) => d.Date);
  data = data.filter((d) => d.Date < maxDate);

  // group by year, month, and expense type, then sum Amount
  // for combining Pepco and CleanChoice into Electric
  const monthly_expense = d3.rollup(
    data,
    (v) => d3.sum(v, (d) => d.Amount),
    (d) => d.Date.getFullYear(),
    (d) => d.Date.getMonth() + 1, // JavaScript's month is 0 indexed
    (d) => d.Expense
  );

  // convert grouped data to a flat array
  // continuing combining Pepco and CleanChoice into Electric
  const flat_data = [];
  monthly_expense.forEach((yearData, year) => {
    yearData.forEach((monthData, month) => {
      monthData.forEach((amount, expense) => {
        flat_data.push({
          Year: year,
          Month: month,
          Expense: expense,
          Amount: amount,
        });
      });
    });
  });

  return flat_data;
}

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

  // set y-axis range
  const yMax = Math.max(
    ...traces
      .filter((trace) => trace.name !== "Total") // Exclude the "Total" trace
      .flatMap((trace) => trace.y.filter((y) => y !== null)) // Get all y values from visible traces
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

// summary stats box
function updateSummary(data) {
  const totalSpent = d3.sum(data, (d) => d.Amount);
  const totalPerPerson = totalSpent / 3;
  const minDate = new Date(
    d3.min(data, (d) => new Date(d.Year, d.Month))
  ).toLocaleString("default", { month: "long", year: "numeric" });
  const maxDate = new Date(
    d3.max(data, (d) => new Date(d.Year, d.Month))
  ).toLocaleString("default", { month: "long", year: "numeric" });

  document.getElementById("summary-box").innerHTML = `
        <p>Total Spent: $${totalSpent.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}</p>
        <p>Total Amount per Person: $${totalPerPerson.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}</p>
        <p>${minDate} - ${maxDate}</p>
    `;
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
  const hoverTemplate = isPerPerson
    ? "<b>%{label}</b><br>Total per Person: $%{value:,.2f}<br>% of Total: %{customdata:.2f}%<extra></extra>"
    : "<b>%{label}</b><br>Total: $%{value:,.2f}<br>% of Total: %{customdata:.2f}%<extra></extra>";

  // create trace
  const trace = {
    type: "treemap",
    labels: labels,
    parents: labels.map(() => ""), // no parent hierarchy
    values: adjustedValues,
    customdata: percentages, // percentages for hover template
    textinfo: "label+value+percent entry",
    texttemplate: "<b>%{label}</b><br>$%{value:,.2f}<br>%{customdata:.2f}%",
    hovertemplate: hoverTemplate,
    textposition: "top right",
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

// inital load data and update charts
d3.csv("utilities_313.csv").then(function (data) {
  processedData = processData(data);
  updateLineChart(processedData);
  updateTreemap(processedData);
  updateStackedBar(processedData);
  updateSummary(processedData);
});

// event listeners for toggle switches
document.getElementById("toggle-per-person").addEventListener("change", () => {
  updateLineChart(processedData);
  updateTreemap(processedData);
  updateStackedBar(processedData);
  updateSummary(processedData);
});

document.getElementById("toggle-category").addEventListener("change", () => {
  updateLineChart(processedData);
});
