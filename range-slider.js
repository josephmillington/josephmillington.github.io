const sheet = document.createElement('style');
document.body.appendChild(sheet);

const slider = document.getElementById('yearSlider');
const labels = document.querySelectorAll('.range-labels li');
const prefs = ['webkit-slider-runnable-track', 'moz-range-track', 'ms-track'];

function updateSliderStyle(val) {
  const percent = (val) * 25;
  let style = '';

  labels.forEach((label, i) => {
    label.classList.remove('active', 'selected');
    if (i < val) label.classList.add('selected');
    if (i === val) label.classList.add('active');
    console.log('Active:', i, val);
  });

  prefs.forEach(prefix => {
    style += `
      .range input::-${prefix} {
        background: linear-gradient(to right, #37adbf 0%, #37adbf ${percent}%, #b2b2b2 ${percent}%, #b2b2b2 100%);
      }
    `;
  });

  sheet.textContent = style;
}

slider.addEventListener('input', e => {
  updateSliderStyle(parseInt(e.target.value));
});

labels.forEach((label, index) => {
  label.addEventListener('click', () => {
    slider.value = index + 1;
    slider.dispatchEvent(new Event('input'));
  });
});

// Initial update
updateSliderStyle(parseInt(slider.value));
