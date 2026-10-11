// Silence console output based on environment variable.
// Set REACT_APP_SILENCE_LOGS=true in your environment to disable all console output.
(function() {
  try {
    const disabled = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_SILENCE_LOGS === 'true');
    if (!disabled) return;
    if (typeof console === 'undefined') return;
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};
  } catch (e) {
    // ignore
  }
})();
