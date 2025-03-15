// Description: JavaScript code for the utilities dashboard
// Description: This code is for a dashboard that displays utility expenses for a shared living space. The data is loaded from a CSV file and displayed in a line chart, treemap, stacked bar chart, and summary statistics. The user can toggle between viewing the data per person or as a total, and can also toggle between viewing the data by category or as a total. The code uses D3.js and Plotly.js for data visualization.
// first data processing
// then routing logic, event listeners, and calls to update charts
// then slider initialization
// then summary stats box

// global variable to store data
let processedData = [];

// clean data for use
// calculate amount per person
// filter out the last month of data since it is usually incomplete
// consolidate Pepco and CleanChoice into Electric
// group data by year, month, and expense to consolidate Electric expenses per month
function processData(data) {
  data.forEach((d) => {
    // switch data types for processing
    d.Date = new Date(d.Date);
    d.Year = +d.Year;
    d.Month = +d.Month;
    d.Amount = parseFloat(d.Amount);

    // adjust the Electric expenses for June 2023 and May 2023
    if (d.Year === 2023 && d.Month === 6 && d.Expense === "CleanChoice") {
      d.Amount -= 143.5; // Subtract 143.5 from June 2023, CleanChoice
    }
    if (d.Year === 2023 && d.Month === 5 && d.Expense === "Pepco") {
      d.Amount += 143.5; // Add 143.5 to May 2023, Pepco
    }

    // reassign CleanChoice and Pepco to Electric
    if (d.Expense === "Pepco" || d.Expense === "CleanChoice")
      d.Expense = "Electric";
  });

  // dynamically remove the last month of data, 
  // since it is usually incomplete
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

// inital load data and update charts
d3.csv("resources/utilities_313.csv").then(function (data) {
  processedData = processData(data);
  initializeDateSlider(processedData);
  createTable(processedData);
  createYearsLineChart(processedData);
  updateAllComponents();
});

// filter data by date range, for plot updates
function filterDataByDateRange(data, startDate, endDate) {
  return data.filter((d) => {
    const date = new Date(d.Year, d.Month - 1);
    return date >= startDate && date <= endDate;
  });
}

// updates all plots on change
function updateAllComponents() {
  // get the date range from the slider
  const startDate = new Date(
    document.getElementById("start-date-display").textContent
  );
  const endDate = new Date(
    document.getElementById("end-date-display").textContent
  );

  // filter data on selected date range
  filteredData = filterDataByDateRange(processedData, startDate, endDate);

  // update all charts and components
  updateLineChart(filteredData);
  updateSummary(filteredData);
  updateTreemap(filteredData);
  updateStackedBar(filteredData);
  resizePlots();
}

// event listeners for toggle switches
document.getElementById("toggle-per-person").addEventListener("change", () => {
  updateAllComponents();

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
  updateAllComponents();

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

// function to resize all Plotly plots
function resizePlots() {
  const plots = document.querySelectorAll(".plot");
  plots.forEach((plot) => {
    Plotly.Plots.resize(plot);
  });
}

// initialize dual-ended slider
function initializeDateSlider(data) {
  // get min and max dates
  const minDate = d3.min(data, (d) => new Date(d.Year, d.Month));
  const maxDate = d3.max(data, (d) => new Date(d.Year, d.Month));

  // array of months between minDate and maxDate
  const dateRange = d3.timeMonth.range(
    minDate,
    d3.timeMonth.offset(maxDate, 1)
  );

  // initialize noUiSlider
  const slider = document.getElementById("date-slider");
  noUiSlider.create(slider, {
    start: [0, dateRange.length - 1], // start and end positions
    connect: true,
    range: {
      min: 0,
      max: dateRange.length - 1,
    },
    step: 1, // step by one month
    tooltips: false, // disable tooltips (they currently show the index)
    // (the date is already displayed, and I'm too lazy to format the tooltips)
    // I wasted an hour trying to get this to work
  });

  // display initial start and end dates
  document.getElementById("start-date-display").textContent = formatDate(
    dateRange[0]
  );
  document.getElementById("end-date-display").textContent = formatDate(
    dateRange[dateRange.length - 1]
  );

  // event listener to update charts on change
  slider.noUiSlider.on("update", (values) => {
    const startIndex = Math.round(values[0]);
    const endIndex = Math.round(values[1]);

    const startDate = dateRange[startIndex];
    const endDate = dateRange[endIndex];

    // update displayed start and end dates
    document.getElementById("start-date-display").textContent =
      formatDate(startDate);
    document.getElementById("end-date-display").textContent =
      formatDate(endDate);

    // filter data based on selected date range
    const filteredData = processedData.filter((d) => {
      const date = new Date(d.Year, d.Month - 1);
      return date >= startDate && date <= endDate;
    });

    // update charts
    updateLineChart(filteredData);
    updateSummary(filteredData);
    updateTreemap(filteredData);
    updateStackedBar(filteredData);
  });
}

// slider support function
// formats date as "YYYY-MM"
function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
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
