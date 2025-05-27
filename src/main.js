import * as d3 from 'd3';

const svg = d3.select('#pizza-viz');
const width = svg.node().clientWidth;
const height = svg.node().clientHeight;
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

document.getElementById('category-btn')?.addEventListener('click', () => {
  document.getElementById('category-checkboxes')?.classList.toggle('show');
});

document.getElementById('pizza-btn')?.addEventListener('click', () => {
  document.getElementById('pizza-checkboxes')?.classList.toggle('show');
});

d3.csv('/data/pizza_sales.csv').then(data => {
  globalData = data;

  svg.append('circle')
    .attr('cx', centerX)
    .attr('cy', centerY)
    .attr('r', radius)
    .attr('fill', '#dfc99a');

  const categoryContainer = document.getElementById('category-checkboxes');
  const pizzaContainer = document.getElementById('pizza-checkboxes');
  const categories = Array.from(new Set(data.map(d => d.pizza_category))).sort();

  // "All" checkbox
  const allLabel = document.createElement('label');
  const allCheckbox = document.createElement('input');
  allCheckbox.type = 'checkbox';
  allCheckbox.value = 'all';
  allCheckbox.checked = true;

  allCheckbox.addEventListener('change', () => {
    categoryContainer.querySelectorAll('input[type="checkbox"]:not([value="all"])')
      .forEach(cb => cb.checked = false);
    updatePizzaFilter(); // 🔁 rebuild pizza name filter
    drawDots();
  });

  allLabel.appendChild(allCheckbox);
  allLabel.append(' All');
  categoryContainer.appendChild(allLabel);

  // Category checkboxes
  categories.forEach(cat => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = cat;
    checkbox.checked = false;

    checkbox.addEventListener('change', () => {
      allCheckbox.checked = false;
      updatePizzaFilter(); // 🔁 call here to update name filter immediately
      drawDots();
    });

    label.appendChild(checkbox);
    label.append(` ${cat}`);
    categoryContainer.appendChild(label);
  });

  updatePizzaFilter(); // initial build
  drawDots();

  function updatePizzaFilter() {
    pizzaContainer.innerHTML = '';
  
    const selectedCategories = Array.from(
      document.querySelectorAll('#category-checkboxes input[type="checkbox"]:not([value="all"]):checked')
    ).map(cb => cb.value);
  
    const allSelected = document.querySelector('#category-checkboxes input[value="all"]')?.checked;
  
    // Only show pizzas from selected categories (or all if "All" is selected)
    const visiblePizzas = globalData.filter(d =>
      allSelected || selectedCategories.includes(d.pizza_category)
    );
  
    // Map: category → [pizza names...]
    const categoryGroups = new Map();
  
    visiblePizzas.forEach(d => {
      if (!categoryGroups.has(d.pizza_category)) {
        categoryGroups.set(d.pizza_category, []);
      }
      if (!categoryGroups.get(d.pizza_category).includes(d.pizza_name)) {
        categoryGroups.get(d.pizza_category).push(d.pizza_name);
      }
    });
  
    // Sort categories based on your defined order
    const orderedCategories = Object.keys(categoryColors);
  
    orderedCategories.forEach(category => {
      const pizzas = categoryGroups.get(category);
      if (!pizzas) return;
  
      pizzas.sort(); // sort pizza names alphabetically within category
  
      pizzas.forEach(pizzaName => {
        const label = document.createElement('label');
        label.classList.add('pizza-checkbox');
        label.dataset.category = category;
  
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = pizzaName;
        checkbox.checked = false;
  
        checkbox.addEventListener('change', () => {
          drawDots();
        });
  
        label.appendChild(checkbox);
        label.append(` ${pizzaName}`);
        pizzaContainer.appendChild(label);
      });
    });
  }
  
});

function drawDots() {
  svg.selectAll('circle.pizza-dot').remove();
  const parseDate = d3.timeParse('%m/%d/%Y');

  const selectedCategories = Array.from(
    document.querySelectorAll('#category-checkboxes input[type="checkbox"]:not([value="all"]):checked')
  ).map(cb => cb.value);

  const selectedPizzaNames = Array.from(
    document.querySelectorAll('#pizza-checkboxes input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  const allSelected = document.querySelector('#category-checkboxes input[value="all"]')?.checked;

  const filtered = globalData
    .filter(d => allSelected || selectedCategories.includes(d.pizza_category))
    .filter(d => selectedPizzaNames.length === 0 || selectedPizzaNames.includes(d.pizza_name))
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
