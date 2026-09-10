document.querySelectorAll('[data-include]').forEach(function (slot) {
  fetch('partials/' + slot.dataset.include + '.html')
    .then(function (response) {
      if (!response.ok) throw new Error('Could not load ' + slot.dataset.include);
      return response.text();
    })
    .then(function (html) {
      slot.outerHTML = html;
    });
});
