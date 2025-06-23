import * as d3 from 'd3';

const container = d3.select('.fourthscreen')
  .style('display', 'flex')
  .style('justify-content', 'center')
  .style('align-items', 'center');

const card = container.append('div')
  .attr('class', 'flip-card');

const inner = card.append('div')
  .attr('class', 'flip-card-inner');

const front = inner.append('div')
  .attr('class', 'flip-card-front');

front.append('button')
  .attr('class', 'button-55')
  .text("All these pizza facts got you hungry? Not sure what to pick? Let’s see the top 3 slices people couldn’t resist on a day like today!");

front.append('p')
  .text('click to reveal information')
  .style('color', '#fff')
  .style('margin-top', '1rem');

const back = inner.append('div')
  .attr('class', 'flip-card-back')
  .append('div')
  .attr('class', 'top-3-list')
  .text('Loading...');

// Flip on click
card.on('click', function () {
  const innerElem = this.querySelector('.flip-card-inner');
  innerElem.classList.toggle('flipped');
});

// Check today's top 3
function getSameDayTop3(data) {
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const parseDate1 = d3.timeParse('%d-%m-%Y');
  const parseDate2 = d3.timeParse('%m/%d/%Y');

  const filtered = data.filter(d => {
    let date = parseDate1(d.order_date);
    if (!date) date = parseDate2(d.order_date);
    return date && date.getMonth() === todayMonth && date.getDate() === todayDate;
  });

  console.log(`🗓 Найдено записей на ${todayDate}.${todayMonth + 1}:`, filtered.length);

  const sales = d3.rollups(
    filtered,
    v => d3.sum(v, d => +d.quantity),
    d => d.pizza_name
  ).sort((a, b) => d3.descending(a[1], b[1]));

  return sales.slice(0, 3);
}

d3.csv('/data/pizza_sales.csv').then(data => {
  console.log("📦 CSV загружен:", data.slice(0, 3));

  const top3 = getSameDayTop3(data);

  if (top3.length === 0) {
    d3.select('.top-3-list').html('<p>No data for today in the dataset.</p>');
  } else {
    const max = d3.max(top3, d => d[1]);

    const maxValue = Math.max(...top3.map(d => d[1]));

d3.select('.top-3-list').html(
  top3.map(([name, value]) => `
    <div class="bar-container">
      <div class="bar-label">${name}</div>
      <div class="bar" style="width: ${(value / maxValue) * 100}%">${value} sold</div>
    </div>
  `).join('')
);
  }
});
