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
    console.log("✅ buildFifthScreen started");
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

    const root = d3.hierarchy(hierarchyData).sum(d => d.value).sort((a, b) => b.value - a.value);
    const pack = d3.pack().size([width, height]).padding(5);
    const packedRoot = pack(root);

    const node = svg.selectAll("g")
      .data(packedRoot.descendants())
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x - width / 2},${d.y - height / 2})`);

    node.append("circle")
      .attr("r", d => d.r)
      .attr("fill", d => {
        if (d.depth === 1) return "none";
        if (d.depth === 2) return categoryColors[d.data.category] || "#ccc";
        return "none";
      })
      .attr("stroke", d => {
        if (d.depth === 1) return categoryColors[d.data.name] || "#ccc";
        return "none";
      })
      .attr("stroke-width", d => d.depth === 1 ? 1 : 0)
      .style("cursor", d => d.depth === 2 ? "pointer" : "default")
      .on("click", function (event, d) {
        if (d.depth !== 2) return;

        const pizzaName = d.data.name;
        const index = selectedPizzas.indexOf(pizzaName);
        if (index === -1) selectedPizzas.push(pizzaName);
        else selectedPizzas.splice(index, 1);

        window.selectedPizzas = selectedPizzas;

        const selectedData = processedData.filter(row => selectedPizzas.includes(row.pizza_name));

        if (selectedPizzas.length === 0) {
          drawEmptyBarChart();
          d3.select("#timeline-chart").html("");
        } else {
          updateBarChart(selectedData, pizzaCategories);
          drawTimelineChart(processedData, selectedPizzas, "#timeline-chart");
        }

        event.stopPropagation();
      });

    const pizzaText = node.filter(d => d.depth === 2)
      .append("text")
      .attr("text-anchor", "middle")
      .style("fill", "#fff")
      .style("font-family", "aptly, sans-serif")
      .style("pointer-events", "none")
      .style("font-size", d => {
        const size = Math.max(Math.min(d.r / 4, 14), 12);
        return `${size}px`;
      });

    pizzaText.each(function (d) {
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
  });
}

function drawEmptyBarChart() {
  d3.select("#bar-chart").html("");
}

function updateBarChart(data, pizzaCategories) {
  d3.select("#bar-chart").html("");

  const totals = d3.rollups(
    data,
    v => d3.sum(v, d => d.quantity),
    d => d.pizza_name
  ).map(([name, quantity]) => ({
    name,
    quantity,
    category: pizzaCategories[name]
  }));

  const margin = { top: 20, right: 20, bottom: 90, left: 40 };
  const width = 600 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  const x = d3.scaleBand()
    .domain(totals.map(d => d.name))
    .range([0, width])
    .padding(0.2);

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
    .each(function (d) {
      const maxLineLength = 12;
      const lines = [];

      if (d.length <= maxLineLength) {
        lines.push(d);
      } else {
        const words = d.split(" ");
        let line = words[0];

        for (let i = 1; i < words.length; i++) {
          if ((line + " " + words[i]).length <= maxLineLength) {
            line += " " + words[i];
          } else {
            lines.push(line);
            line = words[i];
            if (lines.length === 2) break;
          }
        }
        if (lines.length < 2 && line) lines.push(line);
      }

      d3.select(this).text(null)
        .selectAll("tspan")
        .data(lines)
        .enter()
        .append("tspan")
        .text(line => line)
        .attr("x", 0)
        .attr("dy", (_, i) => i === 0 ? "1.4em" : "1.2em");

    })
    .style("font-size", "1rem");

  svg.selectAll("rect")
    .data(totals)
    .enter()
    .append("rect")
    .attr("x", d => x(d.name))
    .attr("y", d => y(d.quantity))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.quantity))
    .attr("fill", d => categoryColors[d.category] || "#ccc");

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
