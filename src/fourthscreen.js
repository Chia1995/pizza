import * as d3 from 'd3';

const categoryColors = {
  'Veggie': '#024702',
  'Chicken': '#0b159c',
  'Supreme': '#db0469',
  'Classic': '#ba0707'
};

export function buildFourthScreen() {
  const container = d3.select('.fourthscreen')
    .style('display', 'flex')
    .style('justify-content', 'center')
    .style('align-items', 'center');

  container.selectAll('*').remove(); // Clear previous content

  const card = container.append('div')
    .attr('class', 'flip-card');

  const inner = card.append('div')
    .attr('class', 'flip-card-inner');

  const front = inner.append('div')
    .attr('class', 'flip-card-front');

  front.append('div')
    .attr('class', 'custom-front-text')
    .text("All these pizza facts got you hungry? Not sure what to pick? Let’s see the top 3 slices people couldn’t resist on a day like today!");

  front.append('p')
    .attr('class', 'reveal-text')
    .text('Click to reveal information');

  const back = inner.append('div')
    .attr('class', 'flip-card-back')
    .append('div')
    .attr('class', 'top-3-list');

  card.on('click', function () {
    const innerElem = this.querySelector('.flip-card-inner');
    innerElem.classList.toggle('flipped');
  });

  function getSameDayTop3(data) {
    const today = new Date();
    const parseDate1 = d3.timeParse('%d-%m-%Y');
    const parseDate2 = d3.timeParse('%m/%d/%Y');

    return d3.rollups(
      data.filter(d => {
        let date = parseDate1(d.order_date) || parseDate2(d.order_date);
        return date?.getDate() === today.getDate() && date?.getMonth() === today.getMonth();
      }),
      v => d3.sum(v, d => +d.quantity),
      d => d.pizza_name
    ).sort((a, b) => d3.descending(a[1], b[1])).slice(0, 3);
  }

  d3.csv('/data/pizza_sales.csv').then(data => {
    const top3 = getSameDayTop3(data);
    if (top3.length === 0) {
      d3.select('.top-3-list').html('<p>No data for today in the dataset.</p>');
    } else {
      const maxValue = Math.max(...top3.map(d => d[1]));
      const maxContainerWidth = 400;

      d3.select('.top-3-list').html(
        top3.map(([name, value]) => {
          const containerWidth = (value / maxValue) * maxContainerWidth;
          const category = data.find(d => d.pizza_name === name)?.pizza_category;
          const color = categoryColors[category] || '#41403e';

          return `
            <div class="bar-container">
              <div class="bar-label" style="color: ${color}">${name}</div>
              <div class="bar" style="background:${color}; width: ${containerWidth}px;">
                <span class="bar-value">${value} sold</span>
              </div>
            </div>
          `;
        }).join('')
      );
    }
  });
}
