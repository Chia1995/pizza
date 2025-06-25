import * as d3 from 'd3';

export function buildFourthScreen() {
  const categoryColors = {
    'Veggie': '#024702',
    'Chicken': '#0b159c',
    'Supreme': '#db0469',
    'Classic': '#ba0707'
  };

  // Clear previous content if reloading
  const container = d3.select('.fourthscreen')
    .html('') // clear old content

    const content = container.append('div')
  .attr('class', 'fourthscreen-content');
  // Header text above card
  content.append('h3').text('All these');
  content.append('h2').text('PIZZA');
  content.append('p').text('facts got you HUNGRY? Not sure what to pick?');
  content.append('p').html('Let’s see the top 3 slices people couldn’t resist on a day like today!')
  .style('font-size', '2rem');

  // Flip card setup
  const card = content.append('div')
    .attr('class', 'flip-card')
    .style('margin-top', '1rem');

  const inner = card.append('div')
    .attr('class', 'flip-card-inner');

  const front = inner.append('div')
    .attr('class', 'flip-card-front')
    .style('cursor', 'pointer');

  // Date string (dd.mm.yyyy)
  const today = new Date();
  const formattedDate = today.toLocaleDateString('de-DE');

  front.append('h2')
    .text(formattedDate)
    .style('font-family', 'manicotti, sans-serif')
    .style('font-size', '8rem')
    .style('color', '#fff');
    

  front.append('p')
    .text('Click to reveal information')
    .style('color', '#fff')
    .style('font-size', '1rem');

  const back = inner.append('div')
    .attr('class', 'flip-card-back')
    .append('div')
    .attr('class', 'top-3-list');

  // Flip logic
  card.on('click', function () {
    const innerElem = this.querySelector('.flip-card-inner');
    innerElem.classList.toggle('flipped');
  });

  // Load top 3 for today
  d3.csv('/data/pizza_sales.csv').then(data => {
    const parseDate1 = d3.timeParse('%d-%m-%Y');
    const parseDate2 = d3.timeParse('%m/%d/%Y');

    const filtered = data.filter(d => {
      let date = parseDate1(d.order_date) || parseDate2(d.order_date);
      return date?.getDate() === today.getDate() && date?.getMonth() === today.getMonth();
    });

    const top3 = d3.rollups(
      filtered,
      v => d3.sum(v, d => +d.quantity),
      d => d.pizza_name
    ).sort((a, b) => d3.descending(a[1], b[1])).slice(0, 3);

    if (top3.length === 0) {
      d3.select('.top-3-list').html('<p>No data for today in the dataset.</p>');
    } else {
      const maxValue = Math.max(...top3.map(d => d[1]));
      const maxBarWidth = 400;

      d3.select('.top-3-list').html(
        top3.map(([name, value]) => {
          const width = (value / maxValue) * maxBarWidth;
          const category = data.find(d => d.pizza_name === name)?.pizza_category;
          const color = categoryColors[category] || '#41403e';

          return `
            <div class="bar-container">
              <div class="bar-label" style="color: ${color}">${name}</div>
              <div class="bar" style="background:${color}; width: ${width}px;">
                <span class="bar-value">${value} sold</span>
              </div>
            </div>
          `;
        }).join('')
      );
    }
  });
}
