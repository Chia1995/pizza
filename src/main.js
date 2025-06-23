import * as d3 from 'd3';


const categoryColors = {
   'Veggie': '#038c0c',
  'Chicken': '#3558e6',
  'Supreme': '#b437d4',
  'Classic': '#fa193e'
};
const colorScale = d => categoryColors[d] || '#ccc';

let globalData = [];

// Load and process data
d3.csv('/data/pizza_sales.csv').then(data => {
  globalData = data;

  // Draw pizza background circle
  svg.append('circle')
    .attr('cx', centerX)
    .attr('cy', centerY)
    .attr('r', radius)
    .attr('fill', '#dfc99a');

  drawDots(globalData);
});

// Draw pizza dots based on data
function drawDots(data) {
  svg.selectAll('circle.pizza-dot').remove();

  const parseDate = d3.timeParse('%m/%d/%Y');

  const dots = data
    .map(d => {
      const parsedDate = parseDate(d.order_date);
      if (!parsedDate) return null;
      const month = parsedDate.getMonth();
      const startAngle = (month / 12) * 2 * Math.PI;
      const endAngle = ((month + 1) / 12) * 2 * Math.PI;
      const angle = startAngle + Math.random() * (endAngle - startAngle) - Math.PI / 2;
      const r = Math.sqrt(Math.random()) * radius * 0.95;
      return {
        ...d,
        parsedDate,
        cx: centerX + r * Math.cos(angle),
        cy: centerY + r * Math.sin(angle)
      };
    })
    .filter(d => d !== null);

  svg.selectAll('circle.pizza-dot')
    .data(d3.shuffle(dots).slice(0, 24000))
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

// OPTIONAL: Floating background dots (if needed)
function createFloatingDots() {
  const bg = document.querySelector('.floating-background');
  if (!bg) return;

  const numDots = 120;
  for (let i = 0; i < numDots; i++) {
    const dot = document.createElement('div');
    dot.classList.add('floating-dot');

    const colorKeys = Object.keys(categoryColors);
    const category = colorKeys[Math.floor(Math.random() * colorKeys.length)];
    dot.style.backgroundColor = categoryColors[category];

    dot.style.left = `${Math.random() * 100}%`;
    dot.style.top = `${Math.random() * 200}%`;
    dot.style.animationDuration = `${4 + Math.random() * 4}s`;
    dot.style.animationDelay = `${Math.random() * 4}s`;

    bg.appendChild(dot);
  }
}

createFloatingDots();
