// js/tabManager.js
// タブ切り替えのロジックをここに配置します。

/**
 * 現在アクティブなタブの data-tab 値（例: 'tab-layout' / 'tab-background' / 'tab-frame'）を返す。
 * プレビュー上のドラッグの意味を「開いているタブ」で切り替えるために canvasInteraction.js が参照する。
 * どのタブもアクティブでなければ null。
 */
export function getActiveTab() {
    const active = document.querySelector('.tab-button.active');
    return active ? active.getAttribute('data-tab') : null;
}

const tabChangeCallbacks = [];

/**
 * タブが切り替わったときに呼ばれるコールバックを登録する。引数は新しい data-tab 値。
 * 「背景／フレームタブへ移ったら写真の選択を解除する」などの連動処理（main.js 側）で使う。
 */
export function onTabChange(callback) {
    tabChangeCallbacks.push(callback);
}

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
            tabChangeCallbacks.forEach(cb => cb(targetTabId));
        });
    });

    // 初期状態で最初のタブをアクティブにする
    if (tabButtons.length > 0) {
        tabButtons[0].click();
    }
}