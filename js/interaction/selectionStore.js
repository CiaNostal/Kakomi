// js/interaction/selectionStore.js
/**
 * selectionStore.js
 * 「今どのオブジェクトを選択しているか」という一時的なUI状態を保持する。
 *
 * editState（stateManager.js）とは意図的に分離している。選択状態は
 * 書き出しファイルの内容にもプリセット保存にも（将来のUndo/Redoの対象にも）
 * 含めるべきではない一時的な情報のため。
 */

let selectedId = null;
const listeners = [];

/** 選択中のオブジェクトIDを変更する（変化がなければ何もしない） */
export function setSelectedId(id) {
    if (selectedId === id) return;
    selectedId = id;
    for (const listener of listeners) listener(selectedId);
}

/** 現在選択中のオブジェクトIDを取得する（未選択はnull） */
export function getSelectedId() {
    return selectedId;
}

/** 指定idが現在選択中であれば選択解除する（レイヤー削除時などに使用） */
export function clearSelectionIfMatches(id) {
    if (selectedId === id) setSelectedId(null);
}

/** 選択変更のリスナーを登録する */
export function onSelectionChange(fn) {
    listeners.push(fn);
}
