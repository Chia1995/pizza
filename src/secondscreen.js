import * as d3 from 'd3';

let selectedPizzas = [];

const categoryColors = {
  'Veggie': '#038c0c',
  'Chicken': '#3558e6',
  'Supreme': '#b437d4',
  'Classic': '#fa193e'
};

d3.csv('/data/pizza_sales.csv').then(data => {
  const pizzaSales = d3.rollups(
    data,
    v => ({
      total: d3.sum(v, d => +d.quantity),
      category: v[0].pizza_category
    }),
    d => d.pizza_name
  );

  pizzaSales.sort((a, b) => d3.descending(a[1].total, b[1].total));

  const pizzaButtons = d3.select('#pizza-buttons');

  pizzaSales.forEach(([pizzaName, info], i) => {
    pizzaButtons.append('button')
      .attr('class', 'button-55 pizza-button')
      .text(pizzaName)
      .style('border-color', categoryColors[info.category] || '#41403e')
      .style('color', categoryColors[info.category] || '#41403e')
      .on('click', function() {
        if (selectedPizzas.includes(pizzaName)) {
          selectedPizzas = selectedPizzas.filter(p => p !== pizzaName);
          d3.select(this).classed('selected', false)
            .style('background-color', '#ff9239')
            .style('color', categoryColors[info.category] || '#41403e');
        } else {
          if (selectedPizzas.length < 3) {
            selectedPizzas.push(pizzaName);
            d3.select(this).classed('selected', true)
              .style('background-color', categoryColors[info.category] || '#41403e')
              .style('color', '#fff');
          }
        }

        d3.select('#complete-selection').attr('disabled', selectedPizzas.length === 0 ? true : null);
      });
  });

  d3.select('#complete-selection').on('click', () => {
    const messages = selectedPizzas.map(name => {
      const rank = pizzaSales.findIndex(d => d[0] === name) + 1;
      if (rank <= 10) {
        return `"${name}": Your pick is in the top 10! A clear favorite!`;
      } else if (rank <= 20) {
        return `"${name}": Your pick ranks #${rank} out of 32! A respectable choice!`;
      } else {
        return `"${name}": Your pick ranks #${rank} out of 32 — a rare gem!`;
      }
    });
    d3.select('#selection-message').html(messages.join('<br/>'));
  });

  
});
