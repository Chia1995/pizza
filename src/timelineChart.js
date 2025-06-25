import * as d3 from 'd3';

const categoryColors = {
    'Veggie': '#024702',
    'Chicken': '#0b159c',
    'Supreme': '#db0469',
    'Classic': '#ba0707'
};

export function drawTimelineChart(data, selectedPizzaNames, containerSelector) {
    d3.select(containerSelector).html(""); // clear old chart

    if (!selectedPizzaNames || selectedPizzaNames.length === 0) return;

    const parseDate = d3.timeParse('%m/%d/%Y');
    data.forEach(d => {
        d.date = parseDate(d.order_date);
        d.quantity = +d.quantity;
    });

    const filteredData = data.filter(
        d => selectedPizzaNames.includes(d.pizza_name) && d.date !== null
    );

    const nested = d3.rollups(
        filteredData,
        v => d3.sum(v, d => d.quantity),
        d => d.pizza_name,
        d => d3.timeMonth(d.date)
    );

    const lineData = nested.map(([name, values]) => ({
        name,
        values: values
            .map(([date, total]) => ({ date, total }))
            .filter(d => d.date !== null)
            .sort((a, b) => d3.ascending(a.date, b.date))
    }));

    if (lineData.length === 0 || lineData[0].values.length === 0) {
        console.warn("No data to draw line. Something is still wrong.");
        return;
    }

    const margin = { top: 10, right: 20, bottom: 50, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = d3.select(containerSelector)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const allDates = lineData.flatMap(d => d.values.map(p => p.date));
    const allTotals = lineData.flatMap(d => d.values.map(p => p.total));

    const x = d3.scaleTime()
        .domain(d3.extent(allDates))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, 110])  // static max value
        .range([height, 0]);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b')))
        ;

    svg.append('g').call(d3.axisLeft(y).ticks(4));

    svg.selectAll(".domain, .tick line")
  .style("stroke", "#5d2720")
  .style("stroke-width", 1.5); // same width as bar chart for consistency

svg.selectAll(".tick text")
  .style("fill", "#5d2720")
  .style("font-family", "aptly, sans-serif")
  .style("font-size", "1.2rem"); // match font size of bar chart


    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.total));

    svg.selectAll('.line')
        .data(lineData)
        .enter()
        .append('path')
        .attr('class', 'line-debug')
        .attr('fill', 'none')
        .attr('stroke', d => {
            const category = data.find(p => p.pizza_name === d.name)?.pizza_category;
            return categoryColors[category] || 'steelblue';
        })
        .attr('stroke-width', 2)
        .attr('d', d => line(d.values));

    // 🎨 Style axes to match bar chart
    svg.selectAll(".tick text")
        .style("fill", "#5d2720")
        .style("font-family", "aptly, sans-serif")
        .style("font-size", "1rem");

    svg.selectAll(".domain, .tick line")
        .style("stroke", "#5d2720")
        .style("stroke-width", 1);
}
