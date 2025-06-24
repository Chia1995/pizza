import * as d3 from 'd3';

const categoryColors = {
  'Veggie': '#024702',
  'Chicken': '#0b159c',
  'Supreme': '#db0469',
  'Classic': '#ba0707'
};

export function buildThirdScreenChart() {
  d3.select('.thirdscreen').selectAll('*').remove();

  const margin = { top: 50, right: 30, bottom: 50, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select('.thirdscreen')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select('.thirdscreen')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);

  d3.csv('/data/pizza_sales.csv').then(data => {
    if (!window.selectedPizzas || window.selectedPizzas.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .text('No pizzas selected');
      return;
    }

    const parseDate = d3.timeParse('%m/%d/%Y');
    data.forEach(d => {
      d.date = parseDate(d.order_date);
      d.quantity = +d.quantity;
    });

    const filteredData = data.filter(d => window.selectedPizzas.includes(d.pizza_name) && d.date !== null);

    const selectedDates = filteredData.map(d => d.date);
    
    const x = d3.scaleTime()
      .domain(d3.extent(selectedDates))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, 110])
      .range([height, 0]);

      const allMonths = d3.timeMonths(
        d3.timeMonth.floor(d3.min(selectedDates)),
        d3.timeMonth.ceil(d3.max(selectedDates))
      );
      

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .tickValues(allMonths)
          .tickFormat(d3.timeFormat('%B'))
      )
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    svg.append('g')
      .call(d3.axisLeft(y).ticks(11).tickFormat(d3.format('d')));

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

    const line = d3.line()
      .defined(d => d.date && !isNaN(d.total))
      .x(d => x(d.date))
      .y(d => y(d.total));

    const groups = svg.selectAll('.line-group')
      .data(lineData)
      .enter()
      .append('g')
      .attr('class', 'line-group');

    groups.append('path')
      .attr('class', 'pizza-line')
      .attr('fill', 'none')
      .attr('stroke', d => {
        const category = data.find(p => p.pizza_name === d.name)?.pizza_category;
        return categoryColors[category] || '#999';
      })
      .attr('stroke-width', 2)
      .attr('d', d => line(d.values))
      .on('click', function () {
        svg.selectAll('.pizza-line')
          .attr('stroke-opacity', 0.1)
          .attr('stroke-width', 2);

        d3.select(this)
          .attr('stroke-opacity', 1)
          .attr('stroke-width', 4);
      });

    groups.selectAll('.dot')
      .data(d => d.values.filter(v => v.date !== null))
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.total))
      .attr('r', 3)
      .attr('fill', '#fff')
      .attr('stroke', d => {
        const pizza = lineData.find(l => l.values.includes(d));
        const category = data.find(p => p.pizza_name === pizza.name)?.pizza_category;
        return categoryColors[category] || '#999';
      })
      .on('mouseover', (event, d) => {
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`${d3.timeFormat('%B %Y')(d.date)}<br/>Sold: ${d.total}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 20}px`);
      })
      .on('mouseout', () => {
        tooltip.transition().duration(200).style('opacity', 0);
      });
  });
}
