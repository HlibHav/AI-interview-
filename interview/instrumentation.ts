export const register = async () => {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }
  const module = await import('./instrumentation.node');
  module.register();
};
