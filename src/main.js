import * as d3 from 'd3';

// SVG setup
const svg = d3.select('#pizza-viz');
const width = +svg.attr('width');
const height = +svg.attr('height');

const centerX = width / 2;
const centerY = height / 2;
const radius = Math.min(width, height) / 2;

// Tooltip div
const tooltip = d3.select('#tooltip');

// Color mapping by category
const categoryColors = {
  'Veggie': '#2ecc71',
  'Chicken': '#ef5777',
  'Supreme': '#DB5461',
  'Classic': '#fff200'
};
const colorScale = d => categoryColors[d] || '#ccc';

let globalData = [];

// Load CSV data
d3.csv('/data/pizza_sales.csv').then(data => {
  globalData = data;

  // Draw static pizza base
  svg.append('circle')
    .attr('cx', centerX).attr('cy', centerY)
    .attr('r', radius)
    .attr('fill', '#dfc99a');

  // Populate category dropdown
  const categories = Array.from(new Set(data.map(d => d.pizza_category))).sort();
  const categorySelect = document.getElementById('category-select');
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  // Populate pizza-name multi-select once
  const uniquePizzas = Array.from(new Set(data.map(d => d.pizza_name))).sort();
  const pizzaSelect = document.getElementById('pizza-filter');
  uniquePizzas.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    pizzaSelect.appendChild(opt);
  });

  // Wire up both filters to redraw
  categorySelect.addEventListener('change', drawDots);
  pizzaSelect.addEventListener('change', drawDots);

  // Initial draw
  drawDots();
});

function drawDots() {
  // Clear old dots
  svg.selectAll('circle.pizza-dot').remove();

  // Read filter values
  const category = document.getElementById('category-select').value;
  const pizzaSelect = document.getElementById('pizza-filter');
  const selectedPizzas = Array.from(pizzaSelect.selectedOptions)
                              .map(o => o.value);

  // Parse dates
  const parseDate = d3.timeParse('%m/%d/%Y');

  // Filter data
  const filtered = globalData
    .filter(d => category === 'all' || d.pizza_category === category)
    .filter(d => selectedPizzas.length === 0 || selectedPizzas.includes(d.pizza_name));

  // Map each sale to a dot in its month slice
  const dots = filtered
    .map(d => {
      const pd = parseDate(d.order_date);
      return pd ? { ...d, parsedDate: pd } : null;
    })
    .filter(d => d)
    .map(d => {
      const m = d.parsedDate.getMonth(); // 0–11
      const start = (m / 12) * 2 * Math.PI;
      const end   = ((m + 1) / 12) * 2 * Math.PI;
      const offset = -Math.PI/2; // start at top
      const angle = start + Math.random() * (end - start) + offset;
      const r = Math.sqrt(Math.random()) * radius * 0.95;
      return {
        ...d,
        cx: centerX + r * Math.cos(angle),
        cy: centerY + r * Math.sin(angle)
      };
    });

  // Draw dots
  svg.selectAll('circle.pizza-dot')
    .data(dots)
    .enter()
    .append('circle')
    .attr('class', 'pizza-dot')
    .attr('r', 2.5)
    .attr('fill', d => colorScale(d.pizza_category))
    .attr('cx', d => d.cx)
    .attr('cy', d => d.cy)
    .on('mouseover', (event, d) => {
      tooltip
        .style('opacity', 1)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY + 10}px`)
        .html(`
          <strong>${d.pizza_name}</strong><br/>
          ${d.pizza_category}<br/>
          <small>${d.order_date} at ${d.order_time}</small>
        `);
    })
    .on('mouseleave', () => {
      tooltip.style('opacity', 0);
    });
}
