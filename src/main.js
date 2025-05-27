import * as d3 from 'd3';

// SVG setup
const svg = d3.select('#pizza-viz');
const width = +svg.attr('width');
const height = +svg.attr('height');

const centerX = width / 2;
const centerY = height / 2;
const radius = Math.min(width, height) / 2;

// Tooltip
const tooltip = d3.select('#tooltip');

// Category colors
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

  // Draw pizza base
  svg.append('circle')
    .attr('cx', centerX)
    .attr('cy', centerY)
    .attr('r', radius)
    .attr('fill', '#dfc99a');

  // Populate category dropdown
  const categories = Array.from(new Set(data.map(d => d.pizza_category))).sort();
  const categorySelect = document.getElementById('category-select');
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  // Add change listener
  categorySelect.addEventListener('change', drawDots);

  // Initial draw
  drawDots();
});

function drawDots() {
  svg.selectAll('circle.pizza-dot').remove();

  const category = document.getElementById('category-select').value;
  const parseDate = d3.timeParse('%m/%d/%Y');

  const filtered = globalData
    .filter(d => category === 'all' || d.pizza_category === category)
    .map(d => {
      const pd = parseDate(d.order_date);
      return pd ? { ...d, parsedDate: pd } : null;
    })
    .filter(d => d);

  const dots = filtered.map(d => {
    const m = d.parsedDate.getMonth();
    const start = (m / 12) * 2 * Math.PI;
    const end = ((m + 1) / 12) * 2 * Math.PI;
    const offset = -Math.PI / 2;
    const angle = start + Math.random() * (end - start) + offset;
    const r = Math.sqrt(Math.random()) * radius * 0.95;
    return {
      ...d,
      cx: centerX + r * Math.cos(angle),
      cy: centerY + r * Math.sin(angle)
    };
  });

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
