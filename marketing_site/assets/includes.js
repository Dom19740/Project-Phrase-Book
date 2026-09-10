document.querySelectorAll('[data-include]').forEach(function (slot) {
  var name = slot.dataset.include;
  fetch('partials/' + name + '.html')
    .then(function (response) {
      if (!response.ok) throw new Error('Could not load ' + name);
      return response.text();
    })
    .then(function (html) {
      slot.outerHTML = html;
      if (name === 'header') initFloatingHeader();
    });
});

// On pages with their own hero brand mark, keep the sticky header hidden while
// the page is at the top and fade it in as soon as the visitor starts scrolling.
function initFloatingHeader() {
  var header = document.querySelector('header');
  if (!header || !document.querySelector('.hero-brand')) return;
  header.classList.add('floating');
  var update = function () {
    header.classList.toggle('visible', window.scrollY > 4);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
}
