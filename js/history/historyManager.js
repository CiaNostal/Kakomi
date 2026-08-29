// js/history/historyManager.js
/**
 * historyManager.js
 * 編集設定に対するUndo/Redo（編集履歴）を管理する。
 *
 * 対象は「ユーザーが調整する編集設定」のみで、読み込んだ画像そのもの（image, exifData,
 * originalFileName等）やレイアウト計算の派生データ（photoDrawConfig, outputCanvasConfig）は
 * 対象外とする。画像の読み込みは「編集のやり直し」というよりセッションの切り替えに近い操作であり、
 * 誤ってUndoで巻き戻ってしまうと混乱を招くため。
 *
 * スライダーのドラッグやCanvas上のドラッグ操作は、1回の操作で大量のupdateState呼び出しを
 * 発生させる。これを1つ1つ履歴として記録すると「戻る」を何度も押さないと意味のある単位まで
 * 戻れなくなるため、状態変化が一定時間（COMMIT_DEBOUNCE_MS）落ち着いたタイミングで
 * まとめて1つのチェックポイントとして記録する（デバウンス方式）。
 */
import { getState, updateState, EDITABLE_SETTINGS_KEYS } from '../stateManager.js';
import { isEditableElement } from '../utils/domUtils.js';

const MAX_HISTORY = 50;
const COMMIT_DEBOUNCE_MS = 500;

// editState全体ではなく、undo/redo対象とする編集設定のキーのみを追跡する
// （stateManager.jsのEDITABLE_SETTINGS_KEYSを、プリセット保存機能と共有している）
const TRACKED_KEYS = EDITABLE_SETTINGS_KEYS;

let history = [];
let historyIndex = -1;
let pendingTimer = null;
let isApplyingHistory = false; // undo/redoの適用自体を新しい履歴として記録してしまうのを防ぐガード
const listeners = [];
const applyListeners = [];

function getTrackableSnapshot() {
    const state = getState();
    const snapshot = {};
    for (const key of TRACKED_KEYS) {
        snapshot[key] = state[key];
    }
    return snapshot;
}

function snapshotsEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function notifyHistoryChange() {
    const status = { canUndo: canUndo(), canRedo: canRedo() };
    for (const listener of listeners) listener(status);
}

/** 保留中の変更を、直ちに1つのチェックポイントとして確定させる */
function commitCheckpoint() {
    if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
    }
    if (isApplyingHistory) return;

    const current = getTrackableSnapshot();
    if (history.length > 0 && snapshotsEqual(history[historyIndex], current)) return;

    // 新しい変更が入るので、これより先のredo方向の履歴は破棄する
    history = history.slice(0, historyIndex + 1);
    history.push(current);
    if (history.length > MAX_HISTORY) {
        history.shift();
    }
    historyIndex = history.length - 1;
    notifyHistoryChange();
}

function scheduleCommit() {
    if (isApplyingHistory) return;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(commitCheckpoint, COMMIT_DEBOUNCE_MS);
}

function applySnapshot(snapshot) {
    isApplyingHistory = true;
    updateState(snapshot);
    isApplyingHistory = false;
    notifyHistoryChange();
    for (const listener of applyListeners) listener();
}

/**
 * 履歴管理を初期化し、Ctrl+Z（Undo）/ Ctrl+Shift+Z・Ctrl+Y（Redo）のショートカットを配線する。
 * main.js からアプリ初期化時に一度だけ呼び出す。
 */
export function initHistory() {
    history = [getTrackableSnapshot()];
    historyIndex = 0;
    notifyHistoryChange();

    document.addEventListener('keydown', (e) => {
        if (isEditableElement(document.activeElement)) return; // 入力欄ではブラウザ標準のUndo/Redoに委ねる
        if (!(e.ctrlKey || e.metaKey)) return;

        if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
        } else if (e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            redo();
        }
    });
}

/** 状態変更リスナーとして登録する。呼ばれるたびにチェックポイント記録をデバウンスする。 */
export function recordStateChange() {
    scheduleCommit();
}

export function undo() {
    commitCheckpoint(); // 直前の操作がまだ未確定なら、先に1つのチェックポイントとして確定させる
    if (historyIndex <= 0) return;
    historyIndex--;
    applySnapshot(history[historyIndex]);
}

export function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    applySnapshot(history[historyIndex]);
}

export function canUndo() {
    return historyIndex > 0;
}

export function canRedo() {
    return historyIndex < history.length - 1;
}

/** Undo/Redoの可否が変化するたびに呼ばれるリスナーを登録する（ボタンの有効/無効化に使う） */
export function onHistoryChange(fn) {
    listeners.push(fn);
}

/**
 * undo/redoでスナップショットが適用された直後に呼ばれるリスナーを登録する。
 * customTexts配列の中身（個数・選択中レイヤーの有無）が非連続に変わりうるため、
 * 通常のドラッグ操作用の軽量同期（syncUIFromState）とは別に、
 * UI全体の再構築（initializeUIFromState）を行うために使う。
 */
export function onSnapshotApplied(fn) {
    applyListeners.push(fn);
}
