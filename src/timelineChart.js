import * as d3 from 'd3';

const categoryColors = {
  'Veggie': '#024702',
  'Chicken': '#0b159c',
  'Supreme': '#db0469',
  'Classic': '#ba0707'
};

let activeLineName = null;

export function drawTimelineChart(data, selected, containerSelector, isCategory = false) {
  d3.select(containerSelector).html(""); // clear old chart

  const parseDate = d3.timeParse('%m/%d/%Y');
  data.forEach(d => {
    d.date = parseDate(d.order_date);
    d.quantity = +d.quantity;
  });

  let lineData;

  if (isCategory) {
    const filtered = data.filter(d => selected.includes(d.pizza_category) && d.date !== null);
    const grouped = d3.rollups(
      filtered,
      v => d3.sum(v, d => d.quantity),
      d => d.pizza_category,
      d => d3.timeMonth(d.date)
    );

    lineData = grouped.map(([name, values]) => ({
      name,
      values: values.map(([date, total]) => ({ date, total })).sort((a, b) => d3.ascending(a.date, b.date))
    }));

  } else {
    if (!selected || selected.length === 0) return;

    const filtered = data.filter(d => selected.includes(d.pizza_name) && d.date !== null);
    const grouped = d3.rollups(
      filtered,
      v => d3.sum(v, d => d.quantity),
      d => d.pizza_name,
      d => d3.timeMonth(d.date)
    );

    lineData = grouped.map(([name, values]) => ({
      name,
      values: values.map(([date, total]) => ({ date, total })).sort((a, b) => d3.ascending(a.date, b.date))
    }));
  }

  if (!lineData || lineData.length === 0 || lineData.every(l => l.values.length === 0)) {
    console.warn("No data to draw timeline.");
    return;
  }

  const margin = { top: 50, right: 20, bottom: 50, left: 40 };
  const width = 800 - margin.left - margin.right;
  const height = 350 - margin.top - margin.bottom;

  const svg = d3.select(containerSelector)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Add this AFTER svg is created
  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .lower()
    .on("click", () => {
      activeLineName = null;
      updateLines();
    });

  const allDates = lineData.flatMap(d => d.values.map(p => p.date));
  const allTotals = lineData.flatMap(d => d.values.map(p => p.total));

  const x = d3.scaleTime()
    .domain(d3.extent(allDates))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(allTotals) * 1.1])
    .range([height, 0]);

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b')))
    .selectAll("text")
    .style("fill", "#5d2720")
    .style("font-family", "aptly, sans-serif")
    .style("font-size", "1rem");

  svg.append('g')
    .call(d3.axisLeft(y).ticks(4))
    .selectAll("text")
    .style("fill", "#5d2720")
    .style("font-family", "aptly, sans-serif")
    .style("font-size", "1rem");

  svg.selectAll(".domain, .tick line")
    .style("stroke", "#5d2720")
    .style("stroke-width", 1);

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.total));

  const tooltip = d3.select("#tooltip");

  const paths = svg.selectAll('.line-path')
    .data(lineData)
    .enter()
    .append('path')
    .attr('class', 'line-path')
    .attr('fill', 'none')
    .attr('stroke', d => {
      const category = isCategory ? d.name : data.find(p => p.pizza_name === d.name)?.pizza_category;
      return categoryColors[category] || 'steelblue';
    })
    .attr('stroke-width', 2)
    .attr('d', d => line(d.values))
    .style("cursor", "pointer")
    .on("click", function (event, d) {
      event.stopPropagation();
      activeLineName = activeLineName === d.name ? null : d.name;
      updateLines();
    });

  const dots = svg.selectAll(".dot")
    .data(lineData.flatMap(d => d.values.map(v => ({ ...v, name: d.name }))))
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d.total))
    .attr("r", 4)
    .attr("fill", d => {
      const category = isCategory ? d.name : data.find(p => p.pizza_name === d.name)?.pizza_category;
      return categoryColors[category] || "steelblue";
    })
    .style("cursor", "pointer")
    .on("click", function (event, d) {
      event.stopPropagation();
      activeLineName = activeLineName === d.name ? null : d.name;
      updateLines();
    })
    .on("mouseover", function (event, d) {
      if (!activeLineName || d.name === activeLineName) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(`<strong>${d.name}</strong><br>${d3.timeFormat("%B")(d.date)}<br>${d.total} sold`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      }
    })
    .on("mouseout", function () {
      tooltip.transition().duration(300).style("opacity", 0);
    });

  function updateLines() {
    svg.selectAll(".line-path")
      .attr("stroke-opacity", d => !activeLineName || d.name === activeLineName ? 1 : 0.2);

    svg.selectAll(".dot")
      .attr("opacity", d => !activeLineName || d.name === activeLineName ? 1 : 0.2);
  }

  updateLines();
}
