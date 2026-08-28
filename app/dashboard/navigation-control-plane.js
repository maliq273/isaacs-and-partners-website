export function wireControlPlaneNavigation({ home = '/app/dashboard/super-admin.html' } = {}) {
    const selectors = [
        '[data-super-admin-home]',
        '[data-return-super-admin]',
        '[data-control-plane-home]'
    ];

    document.querySelectorAll(selectors.join(',')).forEach((element) => {
        element.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.assign(home);
        });
    });
}

export function createControlPlaneHomeLink(home = '/app/dashboard/super-admin.html') {
    const link = document.createElement('a');
    link.href = home;
    link.dataset.superAdminHome = 'true';
    link.className = 'control-plane-home-link';
    link.textContent = '← Super Admin Dashboard';
    return link;
}
