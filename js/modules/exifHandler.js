/**
 * exif.js
 * Exif情報の読み込みと処理を担当するモジュール
 */

/**
 * 画像からExif情報を抽出する
 * @param {File} file - 画像ファイル
 * @returns {Promise<Object>} Exifデータを含むPromise
 */
function extractExifFromFile(file) {
    return new Promise((resolve, reject) => {
        // FileReaderを使用してファイルを読み込む
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // arraybufferとしてファイルを読み込む
                const arrayBuffer = e.target.result;
                
                // Exifデータを解析する
                // 注: ここではpiexif.jsが使用されることを想定しているが、
                // このコードでは単純化のためダミーの実装とする
                // 実際の実装では、piexif.jsやexif-jsなどのライブラリを使用する
                
                // ダミーのExifデータを返す
                setTimeout(() => {
                    resolve({
                        Make: 'カメラメーカーサンプル',
                        Model: 'カメラモデルサンプル',
                        DateTime: '2023:04:15 12:30:45',
                        FNumber: 2.8,
                        ExposureTime: 1/125,
                        ISOSpeedRatings: 100,
                        FocalLength: 50,
                        LensModel: 'サンプルレンズ 24-70mm',
                        Software: 'サンプルソフトウェア',
                        // 実際のピクセル解像度など
                        PixelXDimension: 6000,
                        PixelYDimension: 4000,
                        // その他のExif情報...
                        _binary: new Uint8Array(arrayBuffer) // 実際のバイナリデータを保持
                    });
                }, 100);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('ファイルの読み込みに失敗しました。'));
        };
        
        // ファイルをArrayBufferとして読み込む
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Exif情報をフォーマットして表示用の文字列に変換する
 * @param {Object} exifData - Exifデータオブジェクト
 * @returns {Object} 表示用にフォーマットされたExif情報
 */
function formatExifForDisplay(exifData) {
    if (!exifData) return {};
    
    const formatted = {};
    
    // カメラ情報
    if (exifData.Make) formatted.make = exifData.Make;
    if (exifData.Model) formatted.model = exifData.Model;
    
    // 撮影設定
    if (exifData.FNumber) {
        formatted.fNumber = `F${exifData.FNumber}`;
    }
    
    if (exifData.ExposureTime) {
        // 露出時間を分数形式に変換
        const exposureTime = exifData.ExposureTime;
        if (exposureTime < 1) {
            const denominator = Math.round(1 / exposureTime);
            formatted.exposureTime = `1/${denominator}秒`;
        } else {
            formatted.exposureTime = `${exposureTime}秒`;
        }
    }
    
    if (exifData.ISOSpeedRatings) {
        formatted.iso = `ISO ${exifData.ISOSpeedRatings}`;
    }
    
    if (exifData.FocalLength) {
        formatted.focalLength = `${exifData.FocalLength}mm`;
    }
    
    // レンズ情報
    if (exifData.LensModel) {
        formatted.lens = exifData.LensModel;
    }
    
    // 日時情報
    if (exifData.DateTime) {
        const dateTime = exifData.DateTime;
        formatted.dateTime = dateTime.replace(/:/g, '/').replace(' ', ' ');
    }
    
    return formatted;
}

/**
 * 元のExifデータを新しいJPEG画像に埋め込む
 * @param {Blob} jpegBlob - JPEGデータを含むBlob
 * @param {Object} exifData - 埋め込むExifデータ
 * @returns {Promise<Blob>} Exifが埋め込まれたJPEGデータを含むBlobのPromise
 */
function embedExifToJpeg(jpegBlob, exifData) {
    return new Promise((resolve, reject) => {
        if (!exifData || !exifData._binary) {
            // Exifデータがない場合は元のBlobをそのまま返す
            resolve(jpegBlob);
            return;
        }
        
        try {
            // この関数は実際にはピクセフまたは他のライブラリを使用する必要があります
            // このサンプルでは単純に元のBlobを返します
            
            // 実際の実装では次のような処理を行います：
            // 1. ArrayBufferとしてJPEGデータを読み込む
            // 2. Exifデータを挿入
            // 3. 新しいBlobを作成して返す
            
            // ここでは簡単のため元のBlobを返す
            setTimeout(() => {
                resolve(jpegBlob);
            }, 100);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Exif情報を画面に表示する
 * @param {Object} exifData - Exifデータ
 * @param {HTMLElement} container - 表示するコンテナ要素
 */
function displayExifInfo(exifData, container) {
    if (!exifData || !container) return;
    
    // 表示用にフォーマット
    const formatted = formatExifForDisplay(exifData);
    
    // HTMLを生成
    let html = '<table class="exif-table">';
    
    if (formatted.make || formatted.model) {
        html += '<tr><th colspan="2">カメラ情報</th></tr>';
        if (formatted.make) {
            html += `<tr><td>メーカー名</td><td>${formatted.make}</td></tr>`;
        }
        if (formatted.model) {
            html += `<tr><td>機種名</td><td>${formatted.model}</td></tr>`;
        }
    }
    
    let hasShootingInfo = formatted.fNumber || formatted.exposureTime || 
                          formatted.iso || formatted.focalLength;
    
    if (hasShootingInfo) {
        html += '<tr><th colspan="2">撮影設定</th></tr>';
        if (formatted.fNumber) {
            html += `<tr><td>F値</td><td>${formatted.fNumber}</td></tr>`;
        }
        if (formatted.exposureTime) {
            html += `<tr><td>シャッタースピード</td><td>${formatted.exposureTime}</td></tr>`;
        }
        if (formatted.iso) {
            html += `<tr><td>ISO感度</td><td>${formatted.iso}</td></tr>`;
        }
        if (formatted.focalLength) {
            html += `<tr><td>焦点距離</td><td>${formatted.focalLength}</td></tr>`;
        }
    }
    
    if (formatted.lens) {
        html += '<tr><th colspan="2">レンズ情報</th></tr>';
        html += `<tr><td>レンズ</td><td>${formatted.lens}</td></tr>`;
    }
    
    if (formatted.dateTime) {
        html += '<tr><th colspan="2">日時情報</th></tr>';
        html += `<tr><td>撮影日時</td><td>${formatted.dateTime}</td></tr>`;
    }
    
    html += '</table>';
    
    // コンテナにHTMLを設定
    container.innerHTML = html;
}

// モジュールとしてエクスポート
export { extractExifFromFile, formatExifForDisplay, embedExifToJpeg, displayExifInfo }; 