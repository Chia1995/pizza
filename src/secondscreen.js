import * as d3 from 'd3';
import { buildThirdScreenChart } from './thirdscreen.js';

const categoryColors = {
  'Veggie': '#024702',
  'Chicken': '#0b159c',
  'Supreme': '#db0469',
  'Classic': '#ba0707'
};

d3.csv('/data/pizza_sales.csv').then(data => {
  // Group and sum
  const pizzaSales = d3.rollups(
    data,
    v => ({
      total: d3.sum(v, d => +d.quantity),
      category: v[0].pizza_category
    }),
    d => d.pizza_name
  );

  window.selectedPizzas = [];
  let selectedPizzas = window.selectedPizzas;

  // Sort descending by total
  pizzaSales.sort((a, b) => d3.descending(a[1].total, b[1].total));

  // Grand total
  const grandTotal = d3.sum(pizzaSales, d => d[1].total);

  // Create buttons
  const pizzaButtons = d3.select('#pizza-buttons');

  pizzaSales.forEach(([pizzaName, info]) => {
    pizzaButtons.append('button')
      .attr('class', 'button-55 pizza-button')
      .text(pizzaName)
      .style('border-color', categoryColors[info.category] || '#41403e')
      .style('color', categoryColors[info.category] || '#41403e')
      .on('click', function () {
        const index = selectedPizzas.indexOf(pizzaName);
        if (index > -1) {
          selectedPizzas.splice(index, 1);
          d3.select(this)
            .classed('selected', false)
            .style('background-color', '#ff9239')
            .style('color', categoryColors[info.category] || '#41403e');
        } else {
          if (selectedPizzas.length < 3) {
            selectedPizzas.push(pizzaName);
            d3.select(this)
              .classed('selected', true)
              .style('background-color', categoryColors[info.category] || '#41403e')
              .style('color', '#fff');
          }
        }

        d3.select('#complete-selection').attr('disabled', selectedPizzas.length === 0 ? true : null);
        buildThirdScreenChart();
      });
  });

  // Handle complete button
  d3.select('#complete-selection').on('click', () => {
    const messages = selectedPizzas.map(name => {
      const entry = pizzaSales.find(d => d[0] === name);
      const rank = pizzaSales.findIndex(d => d[0] === name) + 1;
      const percentage = ((entry[1].total / grandTotal) * 100).toFixed(1);

      let rankText = '';
      if (rank <= 10) {
        rankText = `Your pick is in the top 10! A clear favorite!`;
      } else if (rank <= 20) {
        rankText = `Your pick ranks #${rank} out of 32! A respectable choice!`;
      } else {
        rankText = `Your pick ranks #${rank} out of 32 — a rare gem!`;
      }

      return `
        <div class="result-entry" style="color: ${categoryColors[entry[1].category] || '#ffffff'}">
          <div class="result-info">
            <div class="result-name">${name}</div>
            <div class="result-rank">${rankText}</div>
          </div>
          <div class="result-percentage">
            <div class="percentage-value">${percentage}%</div>
            <div class="percentage-label">of all sales</div>
          </div>
        </div>
      `;
    });

    d3.select('#selection-message').html(messages.join(''));

    // Show the thirdscreen section (was hidden initially)
    d3.select('.thirdscreen-container').style('display', 'block');


    // Build the timeline chart
    buildThirdScreenChart();
  });
});
