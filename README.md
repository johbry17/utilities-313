# Utilities-313 Dashboard
Visualizing the bills

- [Description](#description)
- [Usage](#usage)
- [Gallery](#gallery)
- [References](#references)
- [Acknowledgements](#acknowledgements)
- [Author](#author)

## Description

The Utilities-313 Dashboard is a web-based visualization tool for analyzing utility expenses. It includes an interactive web dashboard and an exploratory data analysis (EDA) report generated from a Jupyter Notebook.

- **Interactive Web Dashboard:** Provides insights into utility expenses over time, categorized by type.

- **Exploratory Data Analysis (EDA) Report:** A Jupyter Notebook converted to HTML with visualizations and statistics.

- **Automated Data Processing:** Easily updates the dashboard with new data.

### Features

- Stacked bar charts for monthly expenses by category.
- Line charts for trends over time.
- Treemaps for visualizing total spending by category.
- Interactive hover functionality for detailed insights.
- Mobile-friendly layout.

## Usage

The dashboard is available online at [GitHub Pages](https://johbry17.github.io/utilities-313/), with the EDA report acessible as a subpage [here](https://johbry17.github.io/utilities-313/utilities_313_EDA.html).

### Refreshing the Dataset
1. Open the Jupyter Notebook `./resources/extract_data.ipynb`.
2. Click **Run All** to process the latest data.

### Updating the EDA HTML
Run the following command from the terminal to generate the updated EDA report:
 
```bash
jupyter nbconvert --to html --execute --TemplateExporter.exclude_input=True utilities_313_EDA.ipynb  
```

## Gallery

![Web Dashboard](./resources/images/dashboard.png)

![Stacked Bar Chart of Monthly Utilities By Category](./resources/images/stacked_bar.png)

![EDA CleanChoice Utilities Over Time](./resources/images/EDA_CleanChoice.png)

![Monthly Bills By Year](./resources/images/years_plot.png)

![Years Table](./resources/images/year_table.png)

![Treemap of Utilities By Type](./resources/images/treemap.png)

## References

Data supplied by Utilities 313.

## Acknowledgements

Thanks to the entire utility team over the years.

## Author

Bryan Johns, March 2025