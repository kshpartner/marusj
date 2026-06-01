(function () {
  function normalizeBaseUrl(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  window.maruApiUrl = function maruApiUrl(path) {
    const baseUrl = normalizeBaseUrl(window.MARUSJ_API_BASE_URL);
    if (!baseUrl) return path;
    return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  };

  window.maruFetch = function maruFetch(path, options) {
    return fetch(window.maruApiUrl(path), options);
  };
})();
