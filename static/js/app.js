// Description: JavaScript code for the utilities dashboard
// Description: This code is for a dashboard that displays utility expenses for a shared living space. The data is loaded from a CSV file and displayed in a line chart, treemap, stacked bar chart, and summary statistics. The user can toggle between viewing the data per person or as a total, and can also toggle between viewing the data by category or as a total. The code uses D3.js and Plotly.js for data visualization.

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
        <p>Total Spent:<br><b>$${totalSpent.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}</b></p>
        <p>Total Amount per Person:<br><b>$${totalPerPerson.toLocaleString(
          "en-US",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}</b></p>
        <p>${minDate} - ${maxDate}</p>
    `;
}

// function to resize all Plotly plots
function resizePlots() {
  const plots = document.querySelectorAll(".plot");
  plots.forEach((plot) => {
    Plotly.Plots.resize(plot);
  });
}

// inital load data and update charts
d3.csv("resources/utilities_313.csv").then(function (data) {
  processedData = processData(data);
  updateLineChart(processedData);
  updateSummary(processedData);
  updateTreemap(processedData);
  updateStackedBar(processedData);
  createTable(processedData);
  resizePlots();
  document.querySelector(".toggle-label").style.color = "#A9A9A9";
  document.querySelector("#toggle-container .toggle-label").style.color =
    "#A9A9A9";
});

// event listeners for toggle switches
document.getElementById("toggle-per-person").addEventListener("change", () => {
  updateLineChart(processedData);
  updateSummary(processedData);
  updateTreemap(processedData);
  updateStackedBar(processedData);
  resizePlots();

  const toggleLabel = document.querySelector(".toggle-label");
  if (document.getElementById("toggle-per-person").checked) {
    toggleLabel.style.color = "#0085A1";
    toggleLabel.style.fontWeight = "bold";
  } else {
    toggleLabel.style.color = "#A9A9A9";
    toggleLabel.style.fontWeight = "normal";
  }
});

document.getElementById("toggle-category").addEventListener("change", () => {
  updateLineChart(processedData);
  resizePlots();

  const toggleLabel = document.querySelector("#toggle-container .toggle-label");
  if (document.getElementById("toggle-category").checked) {
    toggleLabel.style.color = "#0085A1";
    toggleLabel.style.fontWeight = "bold";
  } else {
    toggleLabel.style.color = "#A9A9A9";
    toggleLabel.style.fontWeight = "normal";
  }
});

window.addEventListener("resize", resizePlots());
