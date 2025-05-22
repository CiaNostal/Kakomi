// js/state.js
// アプリケーションの状態(editState)を管理します。
import { defaultEditState } from './config.js';

// アプリケーションの現在の状態
// defaultEditStateをディープコピーして初期化
export let editState = JSON.parse(JSON.stringify(defaultEditState));

/**
 * editStateの一部を更新します。
 * @param {object} newParams 更新したいプロパティと値を持つオブジェクト
 */
export function updateEditState(newParams) {
    // NOTE: ここではeditStateのトップレベルのプロパティを更新する想定。
    // ネストしたプロパティ (例: photoViewParams.offsetX) を更新する場合は、
    // 呼び出し側で適切にオブジェクトを渡すか、より詳細な更新関数を用意する必要がある。
    // 例: updateEditState({ photoViewParams: { ...editState.photoViewParams, offsetX: newValue }})
    for (const key in newParams) {
        if (Object.prototype.hasOwnProperty.call(editState, key)) {
            editState[key] = newParams[key];
        } else {
            console.warn(`Attempted to update non-existent state property: ${key}`);
        }
    }
}

/**
 * editStateをデフォルト状態にリセットします。
 * 画像関連の情報は保持し、設定値をデフォルトに戻すなどの調整が必要な場合がある。
 * ここでは単純に defaultEditState で上書きする例を示す。
 * 画像情報(image, originalWidth, originalHeight)は別途リセットしないように制御が必要。
 */
export function resetEditStateToDefault(keepImage = false) {
    const image = keepImage ? editState.image : null;
    const originalWidth = keepImage ? editState.originalWidth : 0;
    const originalHeight = keepImage ? editState.originalHeight : 0;

    editState = JSON.parse(JSON.stringify(defaultEditState));

    if (keepImage) {
        editState.image = image;
        editState.originalWidth = originalWidth;
        editState.originalHeight = originalHeight;
    }
}

/**
 * 現在のeditStateを取得します (読み取り専用として)。
 * @returns {object} 現在のeditStateのコピー
 */
export function getEditState() {
    // 外部から直接editStateを変更されるのを防ぐためにコピーを返す (必要に応じて)
    return JSON.parse(JSON.stringify(editState));
}