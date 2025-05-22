// js/state.js
// アプリケーションの状態(editState)を管理します。
import { defaultEditState } from './config.js';

// アプリケーションの現在の状態。defaultEditStateをディープコピーして初期化。
export let editState = JSON.parse(JSON.stringify(defaultEditState));

/**
 * editStateの一部または全体を更新します。
 * @param {object} newParams 更新したいプロパティと値を持つオブジェクト。
 * ネストしたオブジェクトの特定プロパティのみを更新する場合も、
 * そのネストしたオブジェクト全体を渡す必要があります。
 * 例: updateEditState({ photoViewParams: { ...editState.photoViewParams, offsetX: newValue }})
 */
export function updateEditState(newParams) {
    for (const key in newParams) {
        if (Object.prototype.hasOwnProperty.call(editState, key)) {
            // editStateのプロパティがオブジェクトで、かつnewParamsの対応する値もオブジェクトの場合、
            // プロパティごとにマージするのではなく、newParamsの値で上書きする。
            // より細かい制御が必要な場合は、キーごとに処理を分けるか、専用の更新関数を用意する。
            if (typeof editState[key] === 'object' && editState[key] !== null && !Array.isArray(editState[key]) &&
                typeof newParams[key] === 'object' && newParams[key] !== null && !Array.isArray(newParams[key]) &&
                key !== 'image' && key !== 'exifData') {
                // ImageオブジェクトとexifDataは直接置き換える)
                // ネストされたオブジェクトを安全に更新するために、現在の状態と新しいパラメータをマージ
                // editState[key] = { ...editState[key], ...newParams[key] }; // このマージだと意図しない挙動の可能性あり
                editState[key] = JSON.parse(JSON.stringify(newParams[key])); // 新しいオブジェクトで完全に置き換える方がシンプル
            } else {
                editState[key] = newParams[key];
            }
        } else {
            console.warn(`[State] Attempted to update non-existent property: ${key}`);
        }
    }
}

/**
 * editStateをデフォルト状態にリセットします。
 * @param {boolean} keepImageDetails trueの場合、現在の画像情報(image, originalWidth, originalHeight)を保持します。
 */
export function resetEditStateToDefault(keepImageDetails = true) {
    const currentImage = keepImageDetails ? editState.image : null;
    const currentOriginalWidth = keepImageDetails ? editState.originalWidth : 0;
    const currentOriginalHeight = keepImageDetails ? editState.originalHeight : 0;
    // exifDataは画像に紐づくので、画像を残す場合は残し、そうでない場合はリセット
    const currentExifData = keepImageDetails && editState.exifData ? { ...editState.exifData } : {};

    const newDefaultState = JSON.parse(JSON.stringify(defaultEditState));
    for (const key in newDefaultState) {
        if (Object.prototype.hasOwnProperty.call(newDefaultState, key)) {
            if (key !== 'image' && key !== 'originalWidth' && key !== 'originalHeight' && key !== 'exifData') {
                if (typeof newDefaultState[key] === 'object' && newDefaultState[key] !== null) {
                    editState[key] = JSON.parse(JSON.stringify(newDefaultState[key]));
                } else {
                    editState[key] = newDefaultState[key];
                }
            }
        }
    }

    if (keepImageDetails) {
        editState.image = currentImage;
        editState.originalWidth = currentOriginalWidth;
        editState.originalHeight = currentOriginalHeight;
        editState.exifData = currentExifData;
    } else {
        editState.image = null;
        editState.originalWidth = 0;
        editState.originalHeight = 0;
        editState.exifData = {}; // 空にする
    }
    console.log('[State] Reset to default. Image kept:', keepImageDetails);
}

/**
 * 現在のeditStateのディープコピーを取得します。
 * @returns {object} 現在のeditStateのディープコピー。
 */
export function getEditState() {
    return JSON.parse(JSON.stringify(editState));
}