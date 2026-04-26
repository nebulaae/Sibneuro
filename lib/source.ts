export const getAppSource = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    if (source) {
      sessionStorage.setItem('app_source', source);
      return source;
    }
    return sessionStorage.getItem('app_source');
  } catch {
    return null;
  }
};
