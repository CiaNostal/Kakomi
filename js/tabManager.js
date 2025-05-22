// js/tabManager.js
// タブ切り替えのロジックをここに配置します。

export function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    if (tabButtons.length === 0 || tabPanes.length === 0) return;

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            button.classList.add('active');
            const targetTabId = button.getAttribute('data-tab');
            const targetPane = document.getElementById(targetTabId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // 初期状態で最初のタブをアクティブにする
    if (tabButtons.length > 0) {
        tabButtons[0].click();
    }
}