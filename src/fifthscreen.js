import * as d3 from 'd3';
import { drawTimelineChart } from './timelineChart.js';
import { buildFourthScreen } from './fourthscreen.js';

const categoryColors = {
  'Veggie': '#024702',
  'Chicken': '#0b159c',
  'Supreme': '#db0469',
  'Classic': '#ba0707'
};

let selectedPizzas = [];
let selectedCategories = [];
let selectionMode = null;

export function buildFifthScreen() {
  const width = 800;
  const height = 800;

  const svg = d3.select("#packed-circle-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  d3.csv('/data/pizza_sales.csv').then(data => {
    const parseDate = d3.timeParse('%m/%d/%Y');

    const processedData = data.map(d => ({
      ...d,
      quantity: +d.quantity,
      date: parseDate(d.order_date),
      pizza_category: d.pizza_category
    }));

    const pizzaSales = d3.rollups(
      processedData,
      v => d3.sum(v, d => d.quantity),
      d => d.pizza_category,
      d => d.pizza_name
    );

    const pizzaCategories = {};
    processedData.forEach(d => {
      pizzaCategories[d.pizza_name] = d.pizza_category;
    });

    const hierarchyData = {
      name: "Pizzas",
      children: pizzaSales.map(([category, pizzas]) => ({
        name: category,
        children: pizzas.map(([pizzaName, total]) => ({
          name: pizzaName,
          value: total,
          category
        }))
      }))
    };

    const legend = d3.select("#packed-circle-chart")
      .insert("div", ":first-child")
      .attr("class", "category-legend")
      .style("display", "flex")
      .style("justify-content", "center")
      .style("gap", "30px")
      .style("margin-bottom", "20px");

    Object.entries(categoryColors).forEach(([category, color]) => {
      const item = legend.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "8px");

      item.append("div")
        .style("width", "15px")
        .style("height", "15px")
        .style("border-radius", "50%")
        .style("background-color", color);

      item.append("span")
        .style("color", "white")
        .style("font-family", "aptly, sans-serif")
        .style("font-size", "1rem")
        .text(category);
    });

    const root = d3.hierarchy(hierarchyData).sum(d => d.value).sort((a, b) => b.value - a.value);
    const pack = d3.pack().size([width, height]).padding(5);
    const packedRoot = pack(root);

    const node = svg.selectAll("g")
      .data(packedRoot.descendants())
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x - width / 2},${d.y - height / 2})`);

    const circles = node.append("circle")
      .attr("r", d => d.r)
      .attr("fill", d => {
        if (d.depth === 1) return categoryColors[d.data.name] || "#ccc";
        if (d.depth === 2) return categoryColors[d.data.category] || "#ccc";
        return "none";
      })
      .style("fill-opacity", d => d.depth === 1 ? 0.1 : 1)
      .attr("stroke", d => {
        if (d.depth === 1) return categoryColors[d.data.name] || "#ccc";
        return "none";
      })
      .attr("stroke-width", d => d.depth === 1 ? 1 : 0)
      .style("cursor", d => d.depth > 0 ? "pointer" : "default")
      .style("opacity", 0.4)
      .on("click", function (event, d) {
        if (d.depth === 2) {
          if (selectionMode === 'category') return;
          selectionMode = 'pizza';
          const name = d.data.name;
          const index = selectedPizzas.indexOf(name);
          if (index === -1) selectedPizzas.push(name);
          else selectedPizzas.splice(index, 1);
          if (selectedPizzas.length === 0) selectionMode = null;
          updateVisuals(processedData, pizzaCategories);
        } else if (d.depth === 1) {
          if (selectionMode === 'pizza') return;
          selectionMode = 'category';
          const name = d.data.name;
          const index = selectedCategories.indexOf(name);
          if (index === -1) selectedCategories.push(name);
          else selectedCategories.splice(index, 1);
          if (selectedCategories.length === 0) selectionMode = null;
          updateVisuals(processedData, pizzaCategories);
        }
        event.stopPropagation();
      })
      .on("mouseover", function (event, d) {
        if ((d.depth === 2 && selectionMode !== 'category') ||
          (d.depth === 1 && selectionMode !== 'pizza')) {
          d3.select(this).style("opacity", 1).attr("stroke-width", 2);
        }
      })
      .on("mouseout", function (event, d) {
        if ((d.depth === 2 && selectionMode !== 'category') ||
          (d.depth === 1 && selectionMode !== 'pizza')) {
          const isSelectedPizza = selectedPizzas.includes(d.data.name);
          const isSelectedCategory = selectedCategories.includes(d.data.name);
          if (!isSelectedPizza && !isSelectedCategory) {
            d3.select(this)
              .style("opacity", 0.4)
              .attr("stroke-width", d.depth === 1 ? 1 : 0);
          }
        }
      });

    node.filter(d => d.depth === 2)
      .append("text")
      .attr("text-anchor", "middle")
      .style("fill", "#fff")
      .style("font-family", "aptly, sans-serif")
      .style("pointer-events", "none")
      .style("font-size", d => `${Math.max(Math.min(d.r / 4, 14), 12)}px`)
      .each(function (d) {
        const lines = d.data.name.split(/(?=[A-Z])|\s+/);
        const lineHeight = 1.1;
        const totalLines = lines.length;
        const startDy = -((totalLines - 1) / 2) * lineHeight;

        const text = d3.select(this);
        text.selectAll("tspan")
          .data(lines)
          .enter()
          .append("tspan")
          .text(line => line)
          .attr("x", 0)
          .attr("dy", (_, i) => `${i === 0 ? startDy : lineHeight}em`);
      });

    drawEmptyBarChart();
    d3.select("#timeline-chart").html("");

    function updateVisuals(processedData, pizzaCategories) {
      node.selectAll("circle")
        .style("opacity", d => {
          if (d.depth === 1) {
            return (selectionMode === 'category' && selectedCategories.includes(d.data.name)) ? 1 : 0.4;
          }
          if (d.depth === 2) {
            return (selectionMode === 'pizza' && selectedPizzas.includes(d.data.name)) ? 1 : 0.4;
          }
          return 1;
        });

      const isAnySelected = selectedPizzas.length > 0 || selectedCategories.length > 0;
d3.select(".bubble-section").classed("animate-shift", isAnySelected);

      const sideCharts = d3.select(".side-charts");
      sideCharts.classed("hidden", false);
      setTimeout(() => {
        sideCharts.classed("visible", true);
      }, 10);

      if (selectionMode === 'pizza') {
        const filtered = processedData.filter(row => selectedPizzas.includes(row.pizza_name));
        if (filtered.length > 0) {
          d3.select(".bubble-section").classed("animate-shift", true);
          d3.select(".side-charts").classed("visible", true);
          updateBarChart(filtered, pizzaCategories, false);
          if (selectionMode === 'pizza') {
            const filtered = processedData.filter(row => selectedPizzas.includes(row.pizza_name));
            if (filtered.length > 0) {
              d3.select(".bubble-section").classed("animate-shift", true);
              d3.select(".side-charts").classed("visible", true);
              updateBarChart(filtered, pizzaCategories, false);
              drawTimelineChart(processedData, selectedPizzas, "#timeline-chart", false); // 👈 CHANGED
            } else {
              drawEmptyBarChart();
              d3.select("#timeline-chart").html("");

              // Reset animation and hide charts
              d3.select(".bubble-section").classed("animate-shift", false);
              const sideCharts = d3.select(".side-charts");
              sideCharts.classed("visible", false);
              setTimeout(() => {
                sideCharts.classed("hidden", true);
              }, 800);
            }
          }

        } else {
          drawEmptyBarChart();
          d3.select("#timeline-chart").html("");
        }
      } else if (selectionMode === 'category') {
        if (selectedCategories.length > 0) {
          const filtered = processedData.filter(d => selectedCategories.includes(d.pizza_category));
          d3.select(".bubble-section").classed("animate-shift", true);
          d3.select(".side-charts").classed("visible", true);
          updateBarChart(filtered, pizzaCategories, true);
          drawTimelineChart(processedData, selectedCategories, "#timeline-chart", true);
        } else {
          drawEmptyBarChart();
          d3.select("#timeline-chart").html("");
        }
      } else {
        drawEmptyBarChart();
        d3.select("#timeline-chart").html("");
      }
    }
  });
}

function drawEmptyBarChart() {
  d3.select("#bar-chart").html("");
}

function updateBarChart(data, pizzaCategories, isCategoryMode = false) {
  d3.select("#bar-chart").html("");

  let totals;

  if (isCategoryMode && data.length > 0) {
    totals = d3.rollups(
      data,
      v => d3.sum(v, d => d.quantity),
      d => d.pizza_category
    ).map(([name, quantity]) => ({
      name,
      quantity,
      category: name
    }));
  } else {
    totals = d3.rollups(
      data,
      v => d3.sum(v, d => d.quantity),
      d => d.pizza_name
    ).map(([name, quantity]) => ({
      name,
      quantity,
      category: pizzaCategories[name]
    }));
  }

  const margin = { top: 20, right: 20, bottom: 90, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  const x = d3.scaleBand()
    .domain(totals.map(d => d.name))
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(totals, d => d.quantity)])
    .range([height, 0]);

  const svg = d3.select("#bar-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("g").call(d3.axisLeft(y));

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(0)")
    .style("text-anchor", "middle")
    .style("font-size", "1rem");

  const tooltip = d3.select("#tooltip");

  svg.selectAll("rect")
    .data(totals)
    .enter()
    .append("rect")
    .attr("x", d => x(d.name))
    .attr("y", d => y(d.quantity))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.quantity))
    .attr("fill", d => categoryColors[d.category] || "#ccc")
    .on("mouseover", function (event, d) {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.name}</strong><br>Total Sales: ${d.quantity}`);
    })
    .on("mousemove", function (event) {
      tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
    });

  svg.selectAll("text")
    .style("font-family", "aptly, sans-serif")
    .style("fill", "#5d2720");

  svg.selectAll(".domain, .tick line")
    .style("stroke", "#5d2720");

  svg.selectAll(".tick text")
    .style("fill", "#5d2720")
    .style("font-family", "aptly, sans-serif")
    .style("font-size", "1rem");
}

buildFourthScreen();
buildFifthScreen();