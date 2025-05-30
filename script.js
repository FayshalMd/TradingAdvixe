// Initialize the dashboard when page loads and connect all modules
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new CompleteCryptoDashboard();
    
    // Cleanup when page is unloaded
    window.addEventListener('beforeunload', () => {
        dashboard.cleanup();
    });
    
    // Handle visibility changes to pause/resume when tab is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Page hidden - reducing update frequency');
        } else {
            console.log('Page visible - resuming normal updates');
            dashboard.updateStats();
        }
    });
});
