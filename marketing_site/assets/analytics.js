(function () {
  var GA_MEASUREMENT_ID = 'G-XLFYEL1PD0';
  if (!/^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID)) return;

  var url = new URL(window.location.href);
  var campaignParameters = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'dclid',
    'gbraid',
    'wbraid'
  ]);
  var keptParameters = Array.from(url.searchParams.entries()).filter(function (entry) {
    return campaignParameters.has(entry[0]);
  });
  url.search = '';
  keptParameters.forEach(function (entry) {
    url.searchParams.append(entry[0], entry[1]);
  });
  url.hash = '';

  var referrer = '';
  if (document.referrer) {
    var referrerUrl = new URL(document.referrer);
    referrer = referrerUrl.origin + referrerUrl.pathname;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_location: url.href,
    page_referrer: referrer,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
  document.head.appendChild(script);
})();
