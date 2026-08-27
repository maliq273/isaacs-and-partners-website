/* Shared control-plane navigation helper. */
export function bindReturnHome(selector = '[data-return-home]') {
    document.querySelectorAll(selector).forEach((button) => {
        if (button.dataset.returnHomeBound === 'true') return;
        button.dataset.returnHomeBound = 'true';
        button.addEventListener('click', () => {
            window.location.assign('/app/dashboard/super-admin.html');
        });
    });
}

export default bindReturnHome;
