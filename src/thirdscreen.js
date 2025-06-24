import * as d3 from 'd3';

const categoryColors = {
  'Veggie': '#024702',
  'Chicken': '#0b159c',
  'Supreme': '#db0469',
  'Classic': '#ba0707'
};

export function buildThirdScreenChart() {
  // Clear previous chart + tooltip + legend
  d3.select('.thirdscreen').selectAll('*').remove();

  // Add legend container
  const legendContainer = d3.select('.thirdscreen')
    .append('div')
    .attr('class', 'chart-legend')
    .style('display', 'flex')
    .style('justify-content', 'center')
    .style('gap', '2rem')
    .style('margin-bottom', '1rem');

  d3.csv('/data/pizza_sales.csv').then(data => {
    if (!window.selectedPizzas || window.selectedPizzas.length === 0) {
      d3.select('.thirdscreen')
        .append('div')
        .style('color', '#fff')
        .style('text-align', 'center')
        .text('No pizzas selected');
      return;
    }

    // Create legend items
    window.selectedPizzas.forEach(pizzaName => {
      const category = data.find(d => d.pizza_name === pizzaName)?.pizza_category;
      legendContainer.append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .html(`
          <span style="
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: ${categoryColors[category] || '#999'};
            margin-right: 0.5rem;
          "></span>
          <span style="color: #fff; font-family: aptly, sans-serif;">${pizzaName}</span>
        `);
    });

    const margin = { top: 50, right: 30, bottom: 120, left: 60 };
    const width = 1200 - margin.left - margin.right;
    const height = 800 - margin.top - margin.bottom;

    const outerWidth = width + margin.left + margin.right;
    const outerHeight = height + margin.top + margin.bottom;

    const svgContainer = d3.select('.thirdscreen')
      .append('svg')
      .attr('viewBox', `0 0 ${outerWidth} ${outerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto');

    const svg = svgContainer.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select('.thirdscreen')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

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
          .tickSizeInner(15)
      )
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("dy", "1.5em")
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
      .attr('stroke-width', 3)
      .attr('d', d => line(d.values))
      .on('click', function(event, d) {
        event.stopPropagation();

        const isSelected = d3.select(this.parentNode).classed('selected-group');
        svg.selectAll('.line-group').classed('selected-group', false);

        if (!isSelected) {
          d3.select(this.parentNode).classed('selected-group', true);
        }

        updateStyles();
      });

    groups.selectAll('.dot')
      .data(d => d.values)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.total))
      .attr('r', 8)
      .attr('fill', d => {
        const pizza = lineData.find(l => l.values.includes(d));
        const category = data.find(p => p.pizza_name === pizza.name)?.pizza_category;
        return categoryColors[category] || '#999';
      })
      .on('mouseover', function(event, d) {
        const parentGroup = d3.select(this.parentNode);
        if (!svg.selectAll('.selected-group').empty() && !parentGroup.classed('selected-group')) {
          return;
        }

        const pizza = lineData.find(l => l.values.includes(d));
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`<strong>${pizza.name}</strong><br/>${d3.timeFormat('%B %Y')(d.date)}<br/>Sold: ${d.total}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 20}px`);
      })
      .on('mouseout', () => {
        tooltip.transition().duration(200).style('opacity', 0);
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        const parentGroup = d3.select(this.parentNode);
        const isSelected = parentGroup.classed('selected-group');

        svg.selectAll('.line-group').classed('selected-group', false);

        if (!isSelected) {
          parentGroup.classed('selected-group', true);
        }

        updateStyles();
      });

    svg.on('click', () => {
      svg.selectAll('.line-group').classed('selected-group', false);
      tooltip.transition().duration(200).style('opacity', 0);
      updateStyles();
    });

    function updateStyles() {
      if (svg.selectAll('.selected-group').empty()) {
        svg.selectAll('.pizza-line')
          .attr('stroke-opacity', 1)
          .attr('stroke-width', 2);
        svg.selectAll('.dot')
          .attr('opacity', 1);
      } else {
        svg.selectAll('.line-group').each(function() {
          const group = d3.select(this);
          if (group.classed('selected-group')) {
            group.select('.pizza-line')
              .attr('stroke-opacity', 1)
              .attr('stroke-width', 4);
            group.selectAll('.dot')
              .attr('opacity', 1);
          } else {
            group.select('.pizza-line')
              .attr('stroke-opacity', 0.3)
              .attr('stroke-width', 2);
            group.selectAll('.dot')
              .attr('opacity', 0.3);
          }
        });
      }
    }
  });
}
