// js/tabManager.js
// タブ切り替えのロジックをここに配置します。

/**
 * 現在アクティブなタブの data-tab 値（例: 'tab-layout' / 'tab-background' / 'tab-frame'）を返す。
 * プレビュー上のドラッグの意味を「開いているタブ」で切り替えるために canvasInteraction.js が参照する。
 * どのタブもアクティブでなければ（＝パネルが畳まれていれば）null。
 */
export function getActiveTab() {
    const active = document.querySelector('.tab-button.active');
    return active ? active.getAttribute('data-tab') : null;
}

// パネル（.tab-content-area）の畳み状態は .app-shell に .panel-collapsed を付けて表す。
function getShell() {
    return document.querySelector('.app-shell');
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
            const shell = getShell();
            const targetTabId = button.getAttribute('data-tab');
            // フェーズ4(E-1): アクティブなタブをもう一度押す → パネルを畳む（＝アクティブなし）。
            const alreadyOpen = button.classList.contains('active') && shell && !shell.classList.contains('panel-collapsed');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            if (alreadyOpen) {
                if (shell) shell.classList.add('panel-collapsed');
                tabChangeCallbacks.forEach(cb => cb(null));
                return;
            }

            if (shell) shell.classList.remove('panel-collapsed');
            button.classList.add('active');
            const targetPane = document.getElementById(targetTabId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
            tabChangeCallbacks.forEach(cb => cb(targetTabId));
        });
    });

    // 初期状態: 最初のタブ（レイアウト）を開いた状態にする。
    // HTML 側で最初のボタンに .active が付いているとトグルで畳まれてしまうため、一度クリアしてから開く。
    if (tabButtons.length > 0) {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        const shell = getShell();
        if (shell) shell.classList.remove('panel-collapsed');
        tabButtons[0].click();
    }
}