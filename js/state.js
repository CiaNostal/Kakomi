// js/state.js
// アプリケーションの状態(editState)を管理します。
import { defaultEditState } from './config.js';

export let editState = JSON.parse(JSON.stringify(defaultEditState));

export function updateEditState(newParams) {
    for (const key in newParams) {
        if (Object.prototype.hasOwnProperty.call(editState, key)) {
            if (typeof editState[key] === 'object' && editState[key] !== null && !Array.isArray(editState[key]) &&
                typeof newParams[key] === 'object' && newParams[key] !== null && !Array.isArray(newParams[key])) {
                // ネストされたオブジェクトの場合は、新しいオブジェクトで上書きするのではなく、プロパティをマージする
                editState[key] = { ...editState[key], ...newParams[key] };
            } else {
                editState[key] = newParams[key];
            }
        } else {
            console.warn(`Attempted to update non-existent state property: ${key}`);
        }
    }
}

export function resetEditStateToDefault(keepImageDetails = true) {
    const image = keepImageDetails ? editState.image : null;
    const originalWidth = keepImageDetails ? editState.originalWidth : 0;
    const originalHeight = keepImageDetails ? editState.originalHeight : 0;

    const newDefaultState = JSON.parse(JSON.stringify(defaultEditState));
    // editStateの各プロパティを新しいデフォルト値で上書き
    // (image, originalWidth, originalHeight 以外)
    for (const key in newDefaultState) {
        if (key !== 'image' && key !== 'originalWidth' && key !== 'originalHeight') {
            if (Object.prototype.hasOwnProperty.call(newDefaultState, key)) {
                // ネストされたオブジェクトも正しくコピーされるようにする
                if (typeof newDefaultState[key] === 'object' && newDefaultState[key] !== null) {
                    editState[key] = JSON.parse(JSON.stringify(newDefaultState[key]));
                } else {
                    editState[key] = newDefaultState[key];
                }
            }
        }
    }

    if (keepImageDetails) {
        editState.image = image;
        editState.originalWidth = originalWidth;
        editState.originalHeight = originalHeight;
    } else {
        editState.image = null;
        editState.originalWidth = 0;
        editState.originalHeight = 0;
    }
}

export function getEditState() {
    return JSON.parse(JSON.stringify(editState));
}