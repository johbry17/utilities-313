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
    d.Date = new Date(d.Year, d.Month - 1);

    // adjust the Electric expenses for June 2023 and May 2023
    if (d.Year === 2023 && d.Month === 6 && d.Expense === "CleanChoice") {
      console.log("Before CleanChoice for June 2023:", {
        AmountBefore: d.Amount,
      });
      d.Amount -= 143.5; // subtract 143.5 from June 2023, CleanChoice
      console.log("After CleanChoice for June 2023:", {
        AmountAfter: d.Amount,
      });
    }
    if (d.Year === 2023 && d.Month === 5 && d.Expense === "Pepco") {
      console.log("Before Pepco for May 2023:", { AmountBefore: d.Amount });
      d.Amount += 143.5; // add 143.5 to May 2023, Pepco
      console.log("After Pepco for May 2023:", { AmountAfter: d.Amount });
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
});

// updates all plots on change
function updateAllComponents() {
  // get date range from slider
  const startDateText =
    document.getElementById("start-date-display").textContent;
  const endDateText = document.getElementById("end-date-display").textContent;

  // parse dates from slider
  const startDate = parseDateFromSlider(startDateText);
  const endDate = parseDateFromSlider(endDateText);

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
});

document.getElementById("toggle-category").addEventListener("change", () => {
  updateAllComponents();
});

// filter data by date range, for plot updates
function filterDataByDateRange(data, startDate, endDate) {
  return data.filter((d) => {
    const date = new Date(d.Year, d.Month - 1);
    return date >= startDate && date <= endDate;
  });
}

// creates a Date object from the slider's date string
// subtract 1 from the month to account for JavaScript's 0-indexed months
function parseDateFromSlider(dateText) {
  const [year, month] = dateText.split("-").map(Number);
  return new Date(year, month - 1);
}

window.addEventListener("resize", resizePlots);

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
  const minDate = d3.min(data, (d) => new Date(d.Year, d.Month - 1));
  const maxDate = d3.max(data, (d) => new Date(d.Year, d.Month - 1));

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

  // event listener to update charts on slider change
  slider.noUiSlider.on("update", () => {
    updateChartsFromSlider(slider, dateRange);
  });
}

// update charts based on slider values
function updateChartsFromSlider(slider, dateRange) {
  const values = slider.noUiSlider.get(); // get slider values
  const startIndex = Math.round(values[0]);
  const endIndex = Math.round(values[1]);

  const startDate = dateRange[startIndex];
  const endDate = dateRange[endIndex];

  // update displayed start and end dates
  document.getElementById("start-date-display").textContent =
    formatDate(startDate);
  document.getElementById("end-date-display").textContent = formatDate(endDate);

  // filter on selected date range
  const filteredData = filterDataByDateRange(processedData, startDate, endDate);
  console.log("sliderData:", filteredData);

  // update charts
  updateLineChart(filteredData);
  updateSummary(filteredData);
  updateTreemap(filteredData);
  updateStackedBar(filteredData);
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
  console.log("summaryData:", data);
  // calculate total spent and total per person
  const totalSpent = d3.sum(data, (d) => d.Amount);
  const totalPerPerson = totalSpent / 3;

  // get min and max dates
  const minDate = new Date(
    d3.min(data, (d) => new Date(d.Year, d.Month - 1))
  ).toLocaleString("default", { month: "long", year: "numeric" });
  const maxDate = new Date(
    d3.max(data, (d) => new Date(d.Year, d.Month - 1))
  ).toLocaleString("default", { month: "long", year: "numeric" });

  // compute monthly stats
  const groupedByMonth = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.Amount),
    (d) => `${d.Year}-${d.Month}`
  );
  const monthlyTotals = groupedByMonth.map(([_, total]) => total);
  const maxMonthly = d3.max(monthlyTotals);
  const minMonthly = d3.min(monthlyTotals);
  const avgMonthly = d3.mean(monthlyTotals);
  const stdDevMonthly = d3.deviation(monthlyTotals);

  // update summary box
  document.getElementById("summary-box").innerHTML = `
    <div style="margin: 5px 0;">${minDate} - ${maxDate}</div>
    <p>Total Spent:<br>
      <b>$${totalSpent.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</b>
    </p>
    <p>Total Amount per Person:<br>
      <b>$${totalPerPerson.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</b>
    </p>
    <div style="margin: 5px 0;">Highest Monthly Bill:<br>
        $${(maxMonthly / 3).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
    </div>
    <div style="margin: 5px 0;">Lowest Monthly Bill:<br>
        $${(minMonthly / 3).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
    </div>
    <div style="margin: 5px 0;">Average Monthly Bill:<br>
        $${(avgMonthly / 3).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
    </div>
    <div style="margin: 5px 0;">Standard Deviation:<br>
        $${(stdDevMonthly / 3).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
    </div>
  `;
}
