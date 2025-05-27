import * as d3 from 'd3';

const svg = d3.select('#pizza-viz');
const svgNode = svg.node();
const width = svgNode.clientWidth;
const height = svgNode.clientHeight;

const centerX = width / 2;
const centerY = height / 2;
const radius = Math.min(width, height) / 2;

const tooltip = d3.select('#tooltip');

const categoryColors = {
  'Veggie': '#2ecc71',
  'Chicken': '#ef5777',
  'Supreme': '#DB5461',
  'Classic': '#fff200'
};
const colorScale = d => categoryColors[d] || '#ccc';

let globalData = [];

d3.csv('/data/pizza_sales.csv').then(data => {
  globalData = data;

  svg.append('circle')
    .attr('cx', centerX)
    .attr('cy', centerY)
    .attr('r', radius)
    .attr('fill', '#dfc99a');

  // ✅ Create checkboxes
  const categoryContainer = document.getElementById('category-checkboxes');
  const categories = Array.from(new Set(data.map(d => d.pizza_category))).sort();

  categories.forEach(cat => {
    const label = document.createElement('label');
    label.style.marginRight = '1rem';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = cat;
    checkbox.checked = true;

    checkbox.addEventListener('change', drawDots);

    label.appendChild(checkbox);
    label.append(` ${cat}`);
    categoryContainer.appendChild(label);
  });

  drawDots();
});

function drawDots() {
  svg.selectAll('circle.pizza-dot').remove();

  const parseDate = d3.timeParse('%m/%d/%Y');

  const selectedCategories = Array.from(
    document.querySelectorAll('#category-checkboxes input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  const filtered = globalData
    .filter(d => selectedCategories.includes(d.pizza_category))
    .map(d => {
      const parsedDate = parseDate(d.order_date);
      return parsedDate ? { ...d, parsedDate } : null;
    })
    .filter(d => d);

  const sample = d3.shuffle(filtered).slice(0, 24000);

  const dots = sample.map(d => {
    const month = d.parsedDate.getMonth();
    const start = (month / 12) * 2 * Math.PI;
    const end = ((month + 1) / 12) * 2 * Math.PI;
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
