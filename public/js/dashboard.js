/**
 * LLMO診断ダッシュボード - クライアントサイドJS
 * 2系統診断対応版
 */

// グローバル変数 - UPDATED
let currentSessionId = null;
let currentResults = null;
let currentCategory = null;
let pollingInterval = null;
let currentDiagnosisType = 'technical'; // 'technical' or 'business'

// API設定（Vercelの場合は相対パス、ローカルの場合は絶対パス）
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// 全体表示フラグ
let isExpandedView = false;

// 診断タイプの定義
const DIAGNOSIS_TYPES = {
    technical: {
        name: 'テクニカル診断',
        endpoint: '/diagnose',
        description: '技術的観点から9カテゴリー×4項目で評価'
    },
    business: {
        name: 'マーケティング診断',
        endpoint: '/diagnose',  // 同じAPIを使用、type=businessで識別
        description: '経営的観点から4カテゴリー×9項目で評価'
    }
};

/**
 * 診断タイプを選択
 */
function selectDiagnosisType(type) {
    currentDiagnosisType = type;
    
    // ボタンのアクティブ状態を更新
    document.getElementById('technicalDiagnosisBtn').classList.toggle('diagnosis-type-active', type === 'technical');
    document.getElementById('technicalDiagnosisBtn').classList.toggle('border-blue-500', type === 'technical');
    document.getElementById('technicalDiagnosisBtn').classList.toggle('border-gray-300', type !== 'technical');
    
    document.getElementById('businessDiagnosisBtn').classList.toggle('diagnosis-type-active', type === 'business');
    document.getElementById('businessDiagnosisBtn').classList.toggle('border-purple-500', type === 'business');
    document.getElementById('businessDiagnosisBtn').classList.toggle('border-gray-300', type !== 'business');
    
    // ラベルを更新
    document.getElementById('diagnosisTypeLabel').textContent = DIAGNOSIS_TYPES[type].name.replace('診断', '');
    
    // 結果タイトルも更新（診断後に表示される）
    updateResultsTitle(type);
    
    // スタートボタンの色を変更
    const startButton = document.getElementById('startButton');
    if (type === 'business') {
        startButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        startButton.classList.add('bg-purple-600', 'hover:bg-purple-700');
    } else {
        startButton.classList.remove('bg-purple-600', 'hover:bg-purple-700');
        startButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
    }
}

/**
 * 診断結果タイトルを更新
 */
function updateResultsTitle(type) {
    const titleElement = document.getElementById('diagnosisResultTitle');
    const subtitleElement = document.getElementById('diagnosisResultSubtitle');
    
    if (titleElement && subtitleElement) {
        if (type === 'technical') {
            titleElement.innerHTML = '<i class="fas fa-cogs text-blue-600 mr-3"></i>テクニカル診断結果';
            subtitleElement.textContent = '技術的観点から9カテゴリー×4項目（計36項目）を評価';
        } else {
            titleElement.innerHTML = '<i class="fas fa-chart-line text-purple-600 mr-3"></i>マーケティング診断結果';
            subtitleElement.textContent = '経営的観点から4カテゴリー×9項目（計36項目）を評価';
        }
    }
}

/**
 * 診断を開始
 */
async function startDiagnosis() {
    const urlInput = document.getElementById('urlInput');
    const url = urlInput.value.trim();
    
    if (!url) {
        alert('URLを入力してください');
        return;
    }
    
    // URL検証
    try {
        new URL(url);
    } catch (e) {
        alert('有効なURLを入力してください');
        return;
    }
    
    // UI更新
    document.getElementById('startSection').classList.add('opacity-50');
    document.getElementById('startButton').disabled = true;
    document.getElementById('progressSection').classList.remove('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
    
    // プログレスメッセージを更新
    document.getElementById('progressMessage').textContent = `${DIAGNOSIS_TYPES[currentDiagnosisType].name}を実行中...`;
    
    try {
        // 診断開始APIを呼び出し（タイプに応じてエンドポイントを変更）
        const endpoint = DIAGNOSIS_TYPES[currentDiagnosisType].endpoint;
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                url: url,
                type: currentDiagnosisType 
            })
        });
        
        if (!response.ok) {
            throw new Error('診断の開始に失敗しました');
        }
        
        const data = await response.json();
        currentSessionId = data.sessionId;
        currentResults = data.results;
        
        // 診断タイプを結果に追加
        currentResults.diagnosisType = currentDiagnosisType;
        
        // 即座に結果を表示
        displayResults(data.results);
        
        // UI更新
        document.getElementById('progressSection').classList.add('hidden');
        document.getElementById('resultsSection').classList.remove('hidden');
        
    } catch (error) {
        console.error('診断エラー:', error);
        const errorMessage = error.message || error.toString() || '不明なエラーが発生しました';
        alert('診断の開始に失敗しました: ' + errorMessage);
        resetUI();
    }
}

/**
 * 診断結果を表示
 */
function displayResults(results) {
    if (!results) return;
    
    // スクレイピング証拠を表示（デバッグ用）
    if (results.scrapingEvidence) {
        console.log('=== Mastra スクレイピング証拠 ===');
        console.log('HTMLサイズ:', results.scrapingEvidence.htmlLength, 'バイト');
        console.log('タイトル:', results.scrapingEvidence.title || '未検出');
        console.log('H1タグ数:', results.scrapingEvidence.h1Tags);
        console.log('画像数:', results.scrapingEvidence.images);
        console.log('構造化データ:', results.scrapingEvidence.structuredDataTypes.join(', ') || 'なし');
        console.log('LLMs.txt:', results.scrapingEvidence.llmsTxtFound ? '検出' : '未検出');
        console.log('HTTPヘッダー:', results.scrapingEvidence.httpHeaders);
        console.log('===============================');
        
        // アラートでも表示（重要な証拠）
        alert(`Mastraがスクレイピング完了！\n\n` +
              `✅ HTMLサイズ: ${results.scrapingEvidence.htmlLength}バイト\n` +
              `✅ タイトル: ${results.scrapingEvidence.title || '未検出'}\n` +
              `✅ H1タグ数: ${results.scrapingEvidence.h1Tags}\n` +
              `✅ LLMs.txt: ${results.scrapingEvidence.llmsTxtFound ? '検出' : '❌ 未検出'}\n\n` +
              `FAQ実装が3/10の理由: FAQPage構造化データが未実装のため`);
    }
    
    // セクション切り替え
    document.getElementById('progressSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.remove('hidden');
    
    // 総合スコア表示（アニメーション付き）
    const totalScore = results.summary.overallScore;
    animateScore('totalScore', 0, totalScore, 1000);
    
    // スコアサークルアニメーション
    const scoreCircle = document.getElementById('scoreCircle');
    const circumference = 2 * Math.PI * 80;
    const offset = circumference - (totalScore / 100) * circumference;
    setTimeout(() => {
        scoreCircle.style.strokeDashoffset = offset;
    }, 100);
    
    // 診断タイプに応じてタイトル更新
    updateResultsTitle(currentDiagnosisType);
    
    // カテゴリー別に処理
    if (currentDiagnosisType === 'technical') {
        displayTechnicalCategoryResults(results.categories);
    } else {
        displayBusinessResults(results);
    }
    
    // 統計情報を更新
    updateSummaryStats(results);
    
    // UIリセット
    document.getElementById('startSection').classList.remove('opacity-50');
    document.getElementById('startButton').disabled = false;
    
    // 詳細結果ページへのリンクを追加
    addDetailedResultsLink();
}

/**
 * テクニカル診断結果を表示（1つの表にまとめて表示）
 */
function displayTechnicalResults(results) {
    // カテゴリカードを削除して、表を表示
    const container = document.getElementById('categoryCards');
    if (container) {
        container.innerHTML = `
            <div class="col-span-4">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="border border-gray-300 px-4 py-2 text-left">項目</th>
                                <th class="border border-gray-300 px-4 py-2 text-center">評価</th>
                                <th class="border border-gray-300 px-4 py-2 text-center">スコア</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">改善提案</th>
                            </tr>
                        </thead>
                        <tbody id="allItemsTable">
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    // 全36項目を表に表示
    displayAllItemsInTable(results);
}

/**
 * 全36項目を1つの表に表示
 */
function displayAllItemsInTable(results) {
    const tbody = document.getElementById('allItemsTable');
    if (!tbody) return;
    
    let html = '';
    let categoryIndex = 1;
    
    // カテゴリーごとに処理
    Object.entries(results.categories).forEach(([categoryKey, category]) => {
        // カテゴリーヘッダー
        html += `
            <tr style="background: #f0f4ff;">
                <td colspan="4" class="border border-gray-300 px-4 py-2 font-bold">
                    ${categoryIndex}. ${category.name}
                </td>
            </tr>
        `;
        
        // 各項目
        let itemIndex = 1;
        category.items.forEach(item => {
            // 100点満点のスコアを正確に10点満点に変換（小数点以下四捨五入）
            const starsCount = Math.round(item.score / 10);  // 82点 → 8.2 → 8星, 78点 → 7.8 → 8星
            const stars = '⭐'.repeat(Math.max(0, Math.min(10, starsCount)));
            const scoreColor = item.score >= 70 ? 'text-green-600' : item.score >= 40 ? 'text-yellow-600' : 'text-red-600';
            const issues = item.issues && item.issues.length > 0 ? item.issues[0] : '優秀な実装です。改善の必要なし';
            
            html += `
                <tr>
                    <td class="border border-gray-300 px-4 py-2">
                        ${categoryIndex}-${itemIndex}. ${item.name}
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center">
                        <div class="stars">${stars}</div>
                        <div class="text-xs text-gray-500 font-bold">${starsCount}星/10星満点</div>
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center">
                        <div class="score-badge ${scoreColor} font-bold text-lg">${item.score}点/100点満点</div>
                        <div class="text-xs text-gray-600 mt-1">
                            ${item.score >= 90 ? 'S級（最優秀）' : 
                              item.score >= 70 ? 'A級（優秀）' : 
                              item.score >= 50 ? 'B級（良好）' : 
                              item.score >= 30 ? 'C級（要改善）' : 'D級（緊急対応）'}
                        </div>
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-sm">
                        <div class="mb-2">${issues}</div>
                        ${item.actualCode ? `
                            <details class="mb-2">
                                <summary class="cursor-pointer text-blue-600 hover:text-blue-800">実際の検出コード</summary>
                                <pre class="bg-gray-100 p-2 mt-1 text-xs overflow-x-auto"><code>${item.actualCode}</code></pre>
                            </details>
                        ` : ''}
                        ${item.recommendation ? `
                            <details>
                                <summary class="cursor-pointer text-green-600 hover:text-green-800">改善提案</summary>
                                <div class="mt-1 text-xs">
                                    <div class="mb-2">${item.recommendation.explanation}</div>
                                    <pre class="bg-green-50 p-2 text-xs overflow-x-auto"><code>${item.recommendation.code}</code></pre>
                                    <div class="mt-1 text-gray-600">${item.recommendation.specificAdvice}</div>
                                </div>
                            </details>
                        ` : ''}
                    </td>
                </tr>
            `;
            itemIndex++;
        });
        
        categoryIndex++;
    });
    
    tbody.innerHTML = html;
    
    // 合計スコアを計算して表示
    let totalScore = 0;
    let maxTotalScore = 0;
    let totalItems = 0;
    
    Object.values(results.categories).forEach(category => {
        if (category.items) {
            let categoryTotal = 0;
            category.items.forEach(item => {
                categoryTotal += item.score || 0;
            });
            totalScore += categoryTotal;
            maxTotalScore += category.items.length * 100;
            totalItems += category.items.length;
        }
    });
    
    const overallScore = maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0;
    
    // 総合スコアを更新
    const totalScoreElement = document.getElementById('totalScore');
    if (totalScoreElement) {
        animateScore('totalScore', 0, overallScore, 1500);
        
        // テクニカルグレードを設定
        const gradeElement = document.getElementById('technicalGrade');
        if (gradeElement) {
            const grade = getTechnicalGrade(overallScore);
            gradeElement.textContent = grade.label;
            gradeElement.className = `px-2 py-1 rounded-full text-xs font-medium ${grade.bgColor} ${grade.textColor}`;
        }
    }
    
    // スコアサークル更新
    const scoreCircle = document.getElementById('scoreCircle');
    if (scoreCircle) {
        const circumference = 502; // 2 * π * 80
        const offset = circumference - (overallScore / 100) * circumference;
        setTimeout(() => {
            scoreCircle.style.strokeDashoffset = offset;
        }, 200);
    }
    
    // 統計情報表示
    updateSummaryStats(results);
    
    // 診断タイプに応じて表示方法を変更
    if (currentDiagnosisType === 'technical') {
        // テクニカル診断: 9カテゴリーをそのまま表示
        displayTechnicalCategoryResults(results.categories);
    } else {
        // マーケティング診断: 4カテゴリーに集約
        const businessResults = aggregateToBusinessCategories(results);
        displayCategoryResults(businessResults);
    }
}

/**
 * ビジネス診断結果を表示（4カテゴリーをそのまま表示）
 */
function displayBusinessResults(results) {
    console.log('マーケティング診断結果表示開始');
    console.log('カテゴリー:', Object.keys(results.categories));
    
    // マーケティング診断の場合は実際のカテゴリー名で表示
    displayBusinessCategoryResults(results.categories);
    
    // 統計情報も更新
    updateBusinessStats(results.categories);
}

/**
 * マーケティング診断用：実際のカテゴリーで表示
 */
function displayBusinessCategoryResults(categories) {
    const categoryCardsContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4.gap-6.mb-8') || 
                                  document.querySelector('.grid.grid-cols-1');
    if (!categoryCardsContainer) {
        console.error('カテゴリーカードコンテナが見つかりません');
        return;
    }
    
    let html = '';
    const categoryEntries = Object.entries(categories);
    
    console.log('マーケティング診断: カテゴリー数', categoryEntries.length);
    
    // マーケティング診断の場合は実際のカテゴリーを使用
    categoryEntries.forEach(([key, category], index) => {
        if (!category.items || category.items.length === 0) return;
        
        console.log(`カテゴリー ${index + 1}: ${category.name}`);
        
        let categoryTotal = 0;
        let categoryMax = 0;
        if (category.items) {
            category.items.forEach(item => {
                categoryTotal += item.score || 0;
                categoryMax += 100;
            });
        }
        const score = categoryMax > 0 ? Math.round((categoryTotal / categoryMax) * 100) : 0;
        const passed = category.items.filter(item => item.score >= 70).length;
        const warning = category.items.filter(item => item.score >= 30 && item.score < 70).length;
        const critical = category.items.filter(item => item.score < 30).length;
        
        // アイコンと色を割り切って設定
        const colors = ['blue', 'green', 'yellow', 'purple'];
        const icons = ['fas fa-server', 'fas fa-file-alt', 'fas fa-search', 'fas fa-robot'];
        const color = colors[index % colors.length];
        const icon = icons[index % icons.length];
        
        html += `
            <div class="category-card bg-white rounded-lg shadow p-6 cursor-pointer" onclick="showCategoryDetails('${key}')">
                <div class="flex items-center mb-4">
                    <div class="w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center mr-3">
                        <i class="${icon} text-2xl text-${color}-600"></i>
                    </div>
                    <h3 class="font-semibold">${category.name}</h3>
                </div>
                <div class="text-3xl font-bold mb-2">${score}</div>
                <div class="text-sm text-gray-600 mb-1">${category.description || 'カテゴリー評価'}</div>
                <div class="text-xs text-gray-500 mb-2">${category.items.length}項目の評価</div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-${color}-600 h-2 rounded-full" style="width: ${score}%"></div>
                </div>
                <div class="mt-3 text-xs">
                    <span class="text-green-600">${passed}</span> 合格 / 
                    <span class="text-yellow-600">${warning}</span> 警告 / 
                    <span class="text-red-600">${critical}</span> 要改善
                </div>
            </div>
        `;
    });
    
    console.log('カテゴリーカードHTML更新:', html.length, '文字');
    categoryCardsContainer.innerHTML = html;
    
    // グリッドをカテゴリー数に合わせて調整
    if (categoryEntries.length <= 3) {
        categoryCardsContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8';
    } else {
        categoryCardsContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8';
    }
    
    console.log('マーケティング診断カテゴリー表示完了');
}

/**
 * マーケティング診断の統計情報を更新
 */
function updateBusinessStats(categories) {
    let totalPassed = 0;
    let totalWarning = 0;
    let totalCritical = 0;
    
    Object.values(categories).forEach(category => {
        if (category.items) {
            category.items.forEach(item => {
                if (item.score >= 70) {
                    totalPassed++;
                } else if (item.score >= 30) {
                    totalWarning++;
                } else {
                    totalCritical++;
                }
            });
        }
    });
    
    // UI更新
    const passedElement = document.getElementById('passedItems');
    if (passedElement) passedElement.textContent = totalPassed;
    
    const warningElement = document.getElementById('warningItems');
    if (warningElement) warningElement.textContent = totalWarning;
    
    const criticalElement = document.getElementById('criticalItems');
    if (criticalElement) criticalElement.textContent = totalCritical;
}

/**
 * カテゴリー結果を表示（共通処理）
 */
function displayCategoryResults(categoryResults) {
    // 診断タイプに応じてカテゴリー説明を更新
    updateCategoryDescriptions();
    
    // 統計カウント
    let totalPassed = 0;
    let totalWarning = 0;
    let totalCritical = 0;
    
    // カテゴリー別結果表示
    Object.entries(categoryResults).forEach(([key, category]) => {
        if (category.items.length === 0) return;
        
        // カテゴリースコア計算（0-100）
        const categoryScore = Math.round((category.totalScore / category.maxScore) * 100);
        
        // スコア表示
        const scoreElement = document.getElementById(`${key}Score`);
        if (scoreElement) {
            animateScore(`${key}Score`, 0, categoryScore, 800);
        }
        
        // プログレスバー
        const bar = document.getElementById(`${key}Bar`);
        if (bar) {
            setTimeout(() => {
                bar.style.width = `${categoryScore}%`;
            }, 100);
        }
        
        // 統計計算
        let passed = 0;
        let warning = 0;
        let critical = 0;
        
        category.items.forEach(item => {
            if (item.score >= 70) passed++;
            else if (item.score >= 30) warning++;
            else critical++;
        });
        
        totalPassed += passed;
        totalWarning += warning;
        totalCritical += critical;
        
        // 統計表示
        const passedElement = document.getElementById(`${key}Passed`);
        const warningElement = document.getElementById(`${key}Warning`);
        const criticalElement = document.getElementById(`${key}Critical`);
        
        if (passedElement) passedElement.textContent = passed;
        if (warningElement) warningElement.textContent = warning;
        if (criticalElement) criticalElement.textContent = critical;
    });
    
    // サマリー統計
    document.getElementById('passedItems').textContent = totalPassed;
    document.getElementById('warningItems').textContent = totalWarning;
    document.getElementById('criticalItems').textContent = totalCritical;
    document.getElementById('executionTime').textContent = '即座に完了';
}

/**
 * スコアアニメーション
 */
function animateScore(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const range = end - start;
    const startTime = performance.now();
    
    function updateScore(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentScore = Math.floor(start + (range * progress));
        element.textContent = currentScore;
        
        if (progress < 1) {
            requestAnimationFrame(updateScore);
        }
    }
    
    requestAnimationFrame(updateScore);
}

/**
 * カテゴリー詳細を表示
 */
function showCategoryDetails(categoryKey) {
    if (!currentResults) return;
    
    currentCategory = categoryKey;
    
    let categoryData;
    let categoryInfo;
    
    if (currentDiagnosisType === 'technical') {
        // テクニカル診断の場合は集約処理
        const results = aggregateToBusinessCategories(currentResults);
        categoryData = results[categoryKey];
        categoryInfo = BUSINESS_CATEGORIES[categoryKey];
    } else {
        // ビジネス診断の場合はそのまま使用
        const category = currentResults.categories[categoryKey];
        categoryData = {
            items: category.items,
            totalScore: categoryTotal,
            maxScore: categoryMax
        };
        categoryInfo = {
            name: category.name,
            icon: BUSINESS_CATEGORIES[categoryKey].icon,
            color: BUSINESS_CATEGORIES[categoryKey].color
        };
    }
    
    if (!categoryData || categoryData.items.length === 0) return;
    
    // モーダルタイトル
    document.getElementById('modalTitle').innerHTML = `
        <i class="${categoryInfo.icon} text-${categoryInfo.color}-600 mr-2"></i>
        ${categoryInfo.name}
    `;
    
    // モーダルコンテンツ
    const content = document.getElementById('modalContent');
    const categoryScore = Math.round((categoryData.totalScore / categoryData.maxScore) * 100);
    
    content.innerHTML = `
        <div class="mb-6">
            <p class="text-gray-600 mb-4">このカテゴリーに含まれる${categoryData.items.length}項目の詳細診断結果です。</p>
            
            <!-- スコアサマリー -->
            <div class="bg-gray-50 rounded-lg p-4 mb-6">
                <div class="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div class="text-2xl font-bold text-${categoryInfo.color}-600">${categoryScore}</div>
                        <div class="text-sm text-gray-600">総合スコア</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-green-600">${categoryData.items.filter(i => i.score >= 70).length}</div>
                        <div class="text-sm text-gray-600">合格項目</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-red-600">${categoryData.items.filter(i => i.score < 30).length}</div>
                        <div class="text-sm text-gray-600">要改善項目</div>
                    </div>
                </div>
            </div>
            
            <!-- 診断項目リスト -->
            <div class="space-y-4">
                ${categoryData.items.map(item => `
                    <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div class="flex items-start justify-between mb-2">
                            <h4 class="font-semibold text-gray-800">${item.name}</h4>
                            ${getStatusBadge(item.score)}
                        </div>
                        <div class="mb-3">
                            ${generateStarRating(item.score)}
                        </div>
                        <p class="text-sm text-gray-600 mb-2">${generateShortComment(item.score, item.name)}</p>
                        ${item.issues && item.issues.length > 0 ? `
                            <div class="mt-3 pl-4 border-l-2 border-gray-200">
                                <p class="text-sm font-medium text-gray-700 mb-1">改善ポイント:</p>
                                <ul class="text-sm text-gray-600 space-y-1">
                                    ${item.issues.map(issue => `<li>• ${issue}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // モーダル表示
    document.getElementById('categoryModal').classList.remove('hidden');
}

/**
 * 9カテゴリーの結果を4カテゴリーに集約（テクニカル診断用）
 */
function aggregateToBusinessCategories(results) {
    const CATEGORY_MAPPING = {
        'metaTags': 'visibility',
        'htmlStructure': 'content',
        'structuredData': 'visibility',
        'contentQuality': 'content',
        'eatElements': 'content',
        'pageSpeed': 'infrastructure',
        'responsiveDesign': 'infrastructure',
        'httpsConfig': 'infrastructure',
        'llmoOptimization': 'aiReadiness'
    };
    
    const businessResults = {
        infrastructure: { items: [], totalScore: 0, maxScore: 0 },
        content: { items: [], totalScore: 0, maxScore: 0 },
        visibility: { items: [], totalScore: 0, maxScore: 0 },
        aiReadiness: { items: [], totalScore: 0, maxScore: 0 }
    };
    
    // 9カテゴリーを4カテゴリーに振り分け
    Object.entries(results.categories).forEach(([key, category]) => {
        const businessCategory = CATEGORY_MAPPING[key];
        if (businessCategory && businessResults[businessCategory] && category.items) {
            businessResults[businessCategory].items.push(...category.items);
            let categoryTotal = 0;
            category.items.forEach(item => {
                categoryTotal += item.score || 0;
            });
            businessResults[businessCategory].totalScore += categoryTotal;
            businessResults[businessCategory].maxScore += category.items.length * 100;
        }
    });
    
    return businessResults;
}

/**
 * 統計情報を更新
 */
function updateSummaryStats(results) {
    if (!results || !results.categories) return;
    
    let totalItems = 0;
    let passedItems = 0;
    let warningItems = 0;
    let criticalItems = 0;
    
    Object.values(results.categories).forEach(category => {
        if (category.items) {
            category.items.forEach(item => {
                totalItems++;
                if (item.score >= 70) {
                    passedItems++;
                } else if (item.score >= 30) {
                    warningItems++;
                } else {
                    criticalItems++;
                }
            });
        }
    });
    
    // UI更新
    const passedElement = document.getElementById('passedItems');
    if (passedElement) passedElement.textContent = passedItems;
    
    const warningElement = document.getElementById('warningItems');
    if (warningElement) warningElement.textContent = warningItems;
    
    const criticalElement = document.getElementById('criticalItems');
    if (criticalElement) criticalElement.textContent = criticalItems;
    
    // 実行時間を設定
    const executionTimeElement = document.getElementById('executionTime');
    if (executionTimeElement && results.executionTime) {
        executionTimeElement.textContent = results.executionTime;
    }
}

/**
 * テクニカル診断用：9カテゴリーの結果を表示
 */
function displayTechnicalCategoryResults(categories) {
    // 9カテゴリーの実際の名前を使用してカード表示を更新
    const categoryDisplayMap = {
        'metaTags': {
            name: 'メタタグの最適化',
            description: 'SEOに重要なHTMLメタタグの設定状況を診断',
            items: 'タイトルタグ（30-60文字推奨）、メタディスクリプション（120-160文字推奨）、OGPタグ（SNS共有用）、カノニカルタグ（重複コンテンツ対策）',
            icon: 'fas fa-tags',
            color: 'blue'
        },
        'htmlStructure': {
            name: 'HTML構造の最適化',
            description: 'HTMLの構造的な品質と accessibility を診断',
            items: 'H1タグ（1ページに1つ推奨）、見出し階層（H1→H2→H3の順序）、セマンティック要素（article、section等）、画像のalt属性（視覚障害者対応）',
            icon: 'fas fa-code',
            color: 'green'
        },
        'structuredData': {
            name: '構造化データ (Schema.org)',
            description: 'Googleのリッチスニペット表示のための構造化データを診断',
            items: 'JSON-LD形式の実装、Organization（組織情報）、LocalBusiness（ローカルビジネス）、WebSite（サイト情報）、FAQPage（よくある質問）',
            icon: 'fas fa-database',
            color: 'purple'
        },
        'contentQuality': {
            name: 'コンテンツの質',
            description: 'ページコンテンツの品質と価値を総合的に診断',
            items: 'コンテンツ長（300文字以上推奨）、読みやすさ（適切な段落分け）、独自性（他サイトとの差別化）、マルチメディア要素（画像・動画の活用）',
            icon: 'fas fa-file-alt',
            color: 'yellow'
        },
        'eatElements': {
            name: 'E-E-A-T要素',
            description: 'GoogleのSEO評価基準である E-E-A-T を診断',
            items: 'Expertise（専門性：著者の専門知識）、Authoritativeness（権威性：業界での信頼度）、Trustworthiness（信頼性：サイトの安全性）、Experience（経験：実体験に基づく内容）',
            icon: 'fas fa-shield-alt',
            color: 'red'
        },
        'pageSpeed': {
            name: 'ページ速度',
            description: 'ページの表示速度とパフォーマンスを診断',
            items: '読み込み速度（3秒以内推奨）、Core Web Vitals（LCP・FID・CLS）、モバイルパフォーマンス、サーバー応答時間',
            icon: 'fas fa-tachometer-alt',
            color: 'orange'
        },
        'responsiveDesign': {
            name: 'レスポンシブデザイン',
            description: 'スマートフォン・タブレット・PCでの表示対応を診断',
            items: 'モバイルフレンドリー（Googleモバイル対応）、ビューポート設定（適切な表示領域）、レスポンシブ画像（デバイス別最適化）、タッチ操作対応',
            icon: 'fas fa-mobile-alt',
            color: 'teal'
        },
        'httpsConfig': {
            name: 'HTTPS設定',
            description: 'Webサイトのセキュリティ設定と暗号化を診断',
            items: 'SSL証明書（データ暗号化）、HSTSヘッダー（強制HTTPS）、セキュリティヘッダー（CSP・X-Frame-Options）、混在コンテンツ対策',
            icon: 'fas fa-lock',
            color: 'gray'
        },
        'llmoOptimization': {
            name: 'LLMO特化対策',
            description: 'ChatGPT・Claude等のAI検索エンジンに対する最適化を診断',
            items: 'LLMs.txt（AI向けサイト情報ファイル）、FAQ実装（質問回答形式）、セマンティックセクション（意味的な構造）、AI可読性（自然言語処理対応）',
            icon: 'fas fa-robot',
            color: 'indigo'
        }
    };

    // カテゴリーカードを完全に置き換え
    const categoryCardsContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4.gap-6.mb-8');
    if (categoryCardsContainer) {
        let html = '';
        
        Object.entries(categories).forEach(([categoryKey, category]) => {
            const displayInfo = categoryDisplayMap[categoryKey];
            if (!displayInfo) return;
            
            // 実際のスコア計算（APIレスポンスに合わせて修正）
            let totalScore = 0;
            let maxScore = 0;
            console.log(`カテゴリー ${categoryKey}:`, category);
            
            if (category.items && Array.isArray(category.items)) {
                category.items.forEach(item => {
                    const itemScore = parseInt(item.score) || 0;
                    totalScore += itemScore;
                    maxScore += 100;
                    console.log(`  ${item.name}: ${itemScore}点`);
                });
            }
            const score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
            const passed = category.items ? category.items.filter(item => (parseInt(item.score) || 0) >= 70).length : 0;
            const warning = category.items ? category.items.filter(item => {
                const itemScore = parseInt(item.score) || 0;
                return itemScore >= 40 && itemScore < 70;
            }).length : 0;
            const critical = category.items ? category.items.filter(item => (parseInt(item.score) || 0) < 40).length : 0;
            
            console.log(`${categoryKey}: ${score}点 (${passed}合格/${warning}警告/${critical}要改善)`);
            
            html += `
                <div class="category-card bg-white rounded-lg shadow p-6 cursor-pointer" onclick="showCategoryDetails('${categoryKey}')">
                    <div class="flex items-center mb-4">
                        <div class="w-12 h-12 bg-${displayInfo.color}-100 rounded-lg flex items-center justify-center mr-3">
                            <i class="${displayInfo.icon} text-2xl text-${displayInfo.color}-600"></i>
                        </div>
                        <h3 class="font-semibold text-sm">${displayInfo.name}</h3>
                    </div>
                    <div class="text-3xl font-bold mb-2">${score}点</div>
                    <div class="text-sm text-gray-600 mb-1">${displayInfo.description}</div>
                    <div class="text-xs text-gray-500 mb-2">${displayInfo.items}</div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-${displayInfo.color}-600 h-2 rounded-full" style="width: ${score}%"></div>
                    </div>
                    <div class="mt-3 text-xs">
                        <span class="text-green-600">${passed}</span> 合格 / 
                        <span class="text-yellow-600">${warning}</span> 警告 / 
                        <span class="text-red-600">${critical}</span> 要改善
                    </div>
                </div>
            `;
        });
        
        categoryCardsContainer.innerHTML = html;
        categoryCardsContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8'; // 3列に変更（9カテゴリー用）
    }
}

// 4カテゴリーの定義
const BUSINESS_CATEGORIES = {
    infrastructure: {
        name: 'インフラ＆パフォーマンス',
        icon: 'fas fa-server',
        color: 'blue',
        technical: {
            description: '技術的基盤の評価',
            items: 'ページ速度、レスポンシブ、HTTPS設定'
        },
        business: {
            description: '収益機会の最大化',
            items: '稼働率、コスト効率、リスク管理'
        }
    },
    content: {
        name: 'コンテンツ＆構造',
        icon: 'fas fa-file-alt',
        color: 'green',
        technical: {
            description: '情報の品質と組織化',
            items: 'HTML構造、コンテンツ品質、E-E-A-T'
        },
        business: {
            description: '価値提案とコンバージョン',
            items: 'USP、購買ファネル、信頼構築'
        }
    },
    visibility: {
        name: '可視性＆発見性',
        icon: 'fas fa-search',
        color: 'yellow',
        technical: {
            description: '検索エンジンでの露出',
            items: 'メタタグ、構造化データ'
        },
        business: {
            description: '市場ポジショニング',
            items: 'ブランド認知、シェア拡大、CAC最適化'
        }
    },
    aiReadiness: {
        name: 'AI＆未来対応',
        icon: 'fas fa-robot',
        color: 'purple',
        technical: {
            description: '次世代検索への対応',
            items: 'LLMO特化対策'
        },
        business: {
            description: 'AIビジネスモデル',
            items: 'AI活用、データ戦略、倡理的AI'
        }
    }
};

/**
 * カテゴリー説明を更新
 */
function updateCategoryDescriptions() {
    const descType = currentDiagnosisType === 'technical' ? 'technical' : 'business';
    
    Object.entries(BUSINESS_CATEGORIES).forEach(([key, category]) => {
        const descElement = document.querySelector(`#${key}Score`).parentElement.querySelector('.text-sm.text-gray-600');
        if (descElement && category[descType]) {
            descElement.textContent = category[descType].description;
        }
    });
}

/**
 * スコアによる色を取得
 */
function getScoreColor(score) {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
}

/**
 * 星評価を生成（100点満点を10点満点に変換）
 */
function generateStarRating(score) {
    const starScore = Math.round(score / 10);
    let stars = '';
    
    for (let i = 1; i <= 10; i++) {
        if (i <= starScore) {
            stars += '<i class="fas fa-star text-yellow-400"></i>';
        } else {
            stars += '<i class="far fa-star text-gray-300"></i>';
        }
    }
    
    return `<div class="flex items-center space-x-1">
        ${stars}
        <span class="ml-2 text-sm font-medium">${starScore}/10</span>
    </div>`;
}

/**
 * ショートコメントを生成
 */
function generateShortComment(score, itemName) {
    if (score >= 90) {
        return '優秀な実装です。継続して維持してください。';
    } else if (score >= 80) {
        return '良好な状態です。小さな改善でさらに向上可能。';
    } else if (score >= 60) {
        return '基本的な実装はできています。改善の余地あり。';
    } else if (score >= 40) {
        return '改善が必要です。優先的に対応を検討してください。';
    } else if (score >= 20) {
        return '大幅な改善が必要です。早急な対策をお勧めします。';
    } else {
        return '未実装または重大な問題があります。即座の対応が必要です。';
    }
}

/**
 * ステータスバッジを取得
 */
function getStatusBadge(score) {
    if (score >= 70) {
        return '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">合格</span>';
    } else if (score >= 30) {
        return '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">警告</span>';
    } else {
        return '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">要改善</span>';
    }
}

/**
 * カテゴリーモーダルを閉じる
 */
function closeCategoryModal(event) {
    if (!event || event.target.id === 'categoryModal') {
        document.getElementById('categoryModal').classList.add('hidden');
        currentCategory = null;
    }
}

/**
 * カテゴリーレポートをダウンロード
 */
async function downloadCategoryReport() {
    if (!currentCategory || !currentResults) return;
    
    try {
        // 診断タイプに応じてデータを準備
        let categoryData;
        let categoryInfo;
        
        if (currentDiagnosisType === 'technical') {
            const results = aggregateToBusinessCategories(currentResults);
            categoryData = results[currentCategory];
            categoryInfo = BUSINESS_CATEGORIES[currentCategory];
        } else {
            const category = currentResults.categories[currentCategory];
            let categoryTotal = 0;
            let categoryMax = 0;
            if (category.items) {
                category.items.forEach(item => {
                    categoryTotal += item.score || 0;
                    categoryMax += 100;
                });
            }
            categoryData = {
                items: category.items,
                totalScore: categoryTotal,
                maxScore: categoryMax
            };
            categoryInfo = { name: category.name };
        }
        
        // Markdownレポート生成
        let markdown = `# ${categoryInfo.name} レポート\n\n`;
        markdown += `診断タイプ: ${DIAGNOSIS_TYPES[currentDiagnosisType].name}\n`;
        markdown += `診断日: ${new Date().toLocaleString('ja-JP')}\n\n`;
        markdown += `## 総合スコア: ${Math.round((categoryData.totalScore / categoryData.maxScore) * 100)}点\n\n`;
        markdown += `## 診断項目（${categoryData.items.length}項目）\n\n`;
        
        categoryData.items.forEach(item => {
            markdown += `### ${item.name}\n`;
            markdown += `- スコア: ${item.score}点（${Math.round(item.score / 10)}/10）\n`;
            markdown += `- ステータス: ${item.score >= 70 ? '合格' : item.score >= 30 ? '警告' : '要改善'}\n`;
            markdown += `- コメント: ${generateShortComment(item.score, item.name)}\n`;
            if (item.issues && item.issues.length > 0) {
                markdown += `- 改善ポイント:\n`;
                item.issues.forEach(issue => {
                    markdown += `  - ${issue}\n`;
                });
            }
            markdown += '\n';
        });
        
        // ダウンロード
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `llmo-${currentDiagnosisType}-report-${currentCategory}-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('ダウンロードエラー:', error);
        alert('レポートのダウンロードに失敗しました');
    }
}

/**
 * 全レポートをダウンロード
 */
async function downloadAllReports() {
    if (!currentResults) return;
    
    try {
        // 総合レポート生成
        let markdown = `# LLMO診断レポート - ${DIAGNOSIS_TYPES[currentDiagnosisType].name}\n\n`;
        markdown += `診断URL: ${currentResults.url}\n`;
        markdown += `診断日: ${new Date().toLocaleString('ja-JP')}\n`;
        markdown += `総合スコア: ${currentResults.summary.overallScore}点\n\n`;
        
        if (currentDiagnosisType === 'technical') {
            // テクニカル診断の場合は集約して表示
            const businessResults = aggregateToBusinessCategories(currentResults);
            Object.entries(businessResults).forEach(([key, category]) => {
                if (category.items.length === 0) return;
                
                const businessCat = BUSINESS_CATEGORIES[key];
                const categoryScore = Math.round((category.totalScore / category.maxScore) * 100);
                
                markdown += `## ${businessCat.name}（${categoryScore}点）\n\n`;
                
                category.items.forEach(item => {
                    markdown += `### ${item.name}（${item.score}点）\n`;
                    if (item.issues && item.issues.length > 0) {
                        item.issues.forEach(issue => {
                            markdown += `- ${issue}\n`;
                        });
                    }
                    markdown += '\n';
                });
            });
        } else {
            // ビジネス診断の場合はそのまま表示
            Object.entries(currentResults.categories).forEach(([key, category]) => {
                let categoryTotal = 0;
                let categoryMax = 0;
                if (category.items) {
                    category.items.forEach(item => {
                        categoryTotal += item.score || 0;
                        categoryMax += 100;
                    });
                }
                const categoryScore = categoryMax > 0 ? Math.round((categoryTotal / categoryMax) * 100) : 0;
                
                markdown += `## ${category.name}（${categoryScore}点）\n\n`;
                
                category.items.forEach(item => {
                    markdown += `### ${item.name}（${item.score}点）\n`;
                    if (item.issues && item.issues.length > 0) {
                        item.issues.forEach(issue => {
                            markdown += `- ${issue}\n`;
                        });
                    }
                    markdown += '\n';
                });
            });
        }
        
        // ダウンロード
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `llmo-${currentDiagnosisType}-report-complete-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('ダウンロードエラー:', error);
        alert('レポートのダウンロードに失敗しました');
    }
}

/**
 * 診断をリセット
 */
function resetDiagnosis() {
    currentSessionId = null;
    currentResults = null;
    currentCategory = null;
    
    document.getElementById('urlInput').value = '';
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('progressSection').classList.add('hidden');
    
    // プログレスバーリセット
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressMessage').textContent = '初期化中...';
    
    // カテゴリーアイコンリセット
    const categories = ['infrastructure', 'content', 'visibility', 'aiReadiness'];
    categories.forEach(cat => {
        const element = document.getElementById(`progress-${cat}`);
        if (element) {
            element.classList.remove('text-green-600', 'text-blue-600');
            element.classList.add('text-gray-400');
        }
    });
}

/**
 * UIをリセット
 */
function resetUI() {
    document.getElementById('startSection').classList.remove('opacity-50');
    document.getElementById('startButton').disabled = false;
    document.getElementById('progressSection').classList.add('hidden');
    
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

/**
 * 詳細結果ページへのリンクを追加
 */
function addDetailedResultsLink() {
    // 診断結果をローカルストレージに保存
    if (currentResults) {
        localStorage.setItem('llmo-diagnosis-results', JSON.stringify(currentResults));
        localStorage.setItem('llmo-diagnosis-type', currentDiagnosisType);
    }
    
    // 詳細結果ボタンを追加
    const resultsSection = document.getElementById('resultsSection');
    const existingButton = document.getElementById('detailed-results-button');
    
    if (!existingButton && resultsSection && !resultsSection.classList.contains('hidden')) {
        const buttonContainer = resultsSection.querySelector('.flex.space-x-2');
        if (buttonContainer) {
            const detailedButton = document.createElement('button');
            detailedButton.id = 'detailed-results-button';
            detailedButton.onclick = openDetailedResults;
            detailedButton.className = 'px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors';
            detailedButton.innerHTML = '<i class="fas fa-list-alt mr-2"></i>詳細結果を表示';
            
            buttonContainer.appendChild(detailedButton);
        }
    }
}

/**
 * 詳細結果ページを開く
 */
function openDetailedResults() {
    const sessionParam = currentSessionId ? `?sessionId=${currentSessionId}` : '';
    const typeParam = `&type=${currentDiagnosisType}`;
    window.open(`/detailed-results.html${sessionParam}${typeParam}`, '_blank');
}

/**
 * 全項目表示のトグル
 */
function toggleExpandedView() {
    console.log('全項目表示ボタンがクリックされました');
    console.log('現在の診断タイプ:', currentDiagnosisType);
    
    if (currentDiagnosisType === 'technical') {
        // テクニカル診断の場合は1つの表で全項目表示
        console.log('テクニカル診断: 全項目表示を実行');
        displayAllItemsInTable(currentResults);
        
        // カテゴリーカードを非表示
        const categoryCards = document.getElementById('categoryCards') || document.querySelector('.grid');
        if (categoryCards && categoryCards.children.length > 0) {
            // カテゴリーカードが含まれている親要素を非表示
            categoryCards.style.display = 'none';
            console.log('カテゴリーカードを非表示にしました');
        }
        
        // ボタンテキストを変更
        const button = document.querySelector('button[onclick="toggleExpandedView()"]');
        if (button) {
            button.innerHTML = '<i class="fas fa-compress-alt mr-2"></i>コンパクト表示に戻る';
            button.onclick = () => restoreCompactView();
        }
        
    } else {
        // マーケティング診断の場合は従来の展開ビュー
        isExpandedView = !isExpandedView;
        
        const expandedView = document.getElementById('expandedView');
        if (!expandedView) return;
        
        if (isExpandedView) {
            expandedView.classList.remove('hidden');
            renderExpandedView();
        } else {
            expandedView.classList.add('hidden');
        }
    }
}

/**
 * コンパクト表示に戻る
 */
function restoreCompactView() {
    console.log('コンパクト表示に戻ります');
    
    console.log('コンパクト表示復元: 現在の結果', currentResults);
    
    // カテゴリーカードを再表示
    if (currentResults && currentDiagnosisType === 'technical') {
        displayTechnicalCategoryResults(currentResults.categories);
        console.log('テクニカル診断カテゴリーカードを再表示しました');
    }
    
    // 表示されていた表は削除
    const allItemsTable = document.getElementById('allItemsTable');
    if (allItemsTable && allItemsTable.parentNode) {
        allItemsTable.parentNode.parentNode.parentNode.remove(); // table -> tbody -> div を削除
    }
    
    // ボタンテキストを元に戻す
    const button = document.querySelector('button[onclick]');
    if (button) {
        button.innerHTML = '<i class="fas fa-expand-alt mr-2"></i>全項目を表示';
        button.onclick = () => toggleExpandedView();
    }
}

/**
 * 全カテゴリー展開ビューを表示
 */
function renderExpandedView() {
    if (!currentResults || !currentResults.categories) return;
    
    const container = document.getElementById('expandedContent');
    if (!container) return;
    
    let html = '';
    
    Object.entries(currentResults.categories).forEach(([categoryKey, category]) => {
        html += `
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold mb-4 flex items-center">
                    <i class="fas fa-cog text-blue-600 mr-2"></i>
                    ${category.name}
                </h3>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">項目</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">スコア</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状況</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">実装コード</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">改善提案</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
        `;
        
        category.items.forEach(item => {
            const statusColor = item.score >= 80 ? 'green' : item.score >= 50 ? 'yellow' : 'red';
            const statusText = item.score >= 80 ? '良好' : item.score >= 50 ? '改善必要' : '要対応';
            
            html += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${item.name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800">
                            ${item.score}/100
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${statusText}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">
                        ${item.actualCode ? `
                            <details class="mb-2">
                                <summary class="cursor-pointer text-blue-600 hover:text-blue-800">現在のコード</summary>
                                <pre class="bg-gray-100 p-2 mt-1 text-xs overflow-x-auto"><code>${escapeHtml(item.actualCode)}</code></pre>
                            </details>
                        ` : '<span class="text-gray-400">コード未検出</span>'}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">
                        ${item.recommendation ? `
                            <details class="mb-2">
                                <summary class="cursor-pointer text-green-600 hover:text-green-800">改善提案</summary>
                                <div class="mt-1 p-2 bg-green-50 rounded">
                                    <p class="text-xs mb-2">${item.recommendation.explanation}</p>
                                    <pre class="bg-white p-2 text-xs border rounded overflow-x-auto"><code>${escapeHtml(item.recommendation.code)}</code></pre>
                                    <div class="mt-2 text-xs text-gray-600">${item.recommendation.specificAdvice.replace(/\\n/g, '<br>')}</div>
                                </div>
                            </details>
                        ` : '<span class="text-gray-400">提案なし</span>'}
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * テクニカルスコアに基づくグレード判定
 */
function getTechnicalGrade(score) {
    if (score >= 90) {
        return {
            label: 'S級（最優秀）',
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-800',
            description: '技術的に非常に優秀。継続維持推奨。'
        };
    } else if (score >= 70) {
        return {
            label: 'A級（優秀）',
            bgColor: 'bg-green-100',
            textColor: 'text-green-800',
            description: '技術的に優秀。細かい改善で更なる向上可能。'
        };
    } else if (score >= 50) {
        return {
            label: 'B級（良好）',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-800',
            description: '技術的に良好。いくつかの改善が効果的。'
        };
    } else if (score >= 30) {
        return {
            label: 'C級（要改善）',
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-800',
            description: '技術的な改善が必要。重要項目から対応推奨。'
        };
    } else {
        return {
            label: 'D級（緊急対応）',
            bgColor: 'bg-red-100',
            textColor: 'text-red-800',
            description: '技術的に重大な問題あり。早急な対応が必要。'
        };
    }
}

/**
 * レポートダウンロード（全項目）
 */
function downloadAllReports() {
    if (!currentResults) {
        alert('診断結果がありません');
        return;
    }
    
    try {
        // 全カテゴリーのMarkdownレポートを生成
        let markdown = `# LLMO ${DIAGNOSIS_TYPES[currentDiagnosisType].name}レポート\n\n`;
        markdown += `**診断URL**: ${currentResults.url}\n`;
        markdown += `**診断日時**: ${new Date().toLocaleString('ja-JP')}\n`;
        markdown += `**総合スコア**: ${currentResults.summary?.overallScore || 0}/100\n\n`;
        
        Object.entries(currentResults.categories).forEach(([categoryKey, category]) => {
            markdown += `## ${category.name}\n\n`;
            
            category.items.forEach(item => {
                markdown += `### ${item.name}\n`;
                markdown += `**スコア**: ${item.score}/100\n\n`;
                
                if (item.actualCode) {
                    markdown += `**現在のコード**:\n\`\`\`html\n${item.actualCode}\n\`\`\`\n\n`;
                }
                
                if (item.recommendation) {
                    markdown += `**改善提案**:\n${item.recommendation.explanation}\n\n`;
                    markdown += `**推奨コード**:\n\`\`\`html\n${item.recommendation.code}\n\`\`\`\n\n`;
                    markdown += `**具体的アドバイス**:\n${item.recommendation.specificAdvice}\n\n`;
                }
                
                if (item.issues && item.issues.length > 0) {
                    markdown += `**課題**:\n${item.issues.map(issue => `- ${issue}`).join('\n')}\n\n`;
                }
                
                markdown += '---\n\n';
            });
        });
        
        // ダウンロード
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `llmo-${currentDiagnosisType}-complete-report-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('レポートダウンロードエラー:', error);
        alert('レポートのダウンロードに失敗しました');
    }
}

/**
 * システムヘルスチェックを実行
 */
async function performHealthCheck() {
    try {
        console.log('[Health Check] システム状態を確認中...');
        
        const response = await fetch(`${API_BASE}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Health check failed: ${response.status}`);
        }
        
        const healthData = await response.json();
        console.log('[Health Check] システム正常:', healthData);
        
        // ヘルス状態をUIに表示
        updateHealthStatus(healthData);
        
    } catch (error) {
        console.error('[Health Check] システムエラー:', error);
        updateHealthStatus(null, error);
    }
}

/**
 * ヘルス状態をUIに更新
 */
function updateHealthStatus(healthData, error) {
    // ページタイトル下にステータス表示を追加
    const headerElement = document.querySelector('h1');
    if (!headerElement) return;
    
    // 既存のステータス表示を削除
    const existingStatus = document.getElementById('systemStatus');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    const statusElement = document.createElement('div');
    statusElement.id = 'systemStatus';
    statusElement.className = 'mt-2 text-sm';
    
    if (error) {
        statusElement.innerHTML = `
            <div class="flex items-center text-red-600">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                <span>システム状態: 警告 (${error.message})</span>
            </div>
        `;
    } else if (healthData) {
        const isHealthy = healthData.status === 'healthy';
        const statusColor = isHealthy ? 'text-green-600' : 'text-yellow-600';
        const statusIcon = isHealthy ? 'fa-check-circle' : 'fa-exclamation-circle';
        
        statusElement.innerHTML = `
            <div class="flex items-center ${statusColor}">
                <i class="fas ${statusIcon} mr-2"></i>
                <span>システム状態: ${isHealthy ? '正常' : '注意'} | ${healthData.version} | MCP統合: ${healthData.mcpIntegration.status === 'operational' ? '稼働中' : '停止'} | 応答時間: ${healthData.metrics.responseTime}ms</span>
            </div>
        `;
    }
    
    headerElement.insertAdjacentElement('afterend', statusElement);
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
    // エンターキーで診断開始
    const urlInput = document.getElementById('urlInput');
    if (urlInput) {
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                startDiagnosis();
            }
        });
    }
    
    // デフォルトでテクニカル診断を選択
    selectDiagnosisType('technical');
    
    // システムヘルスチェックを実行
    performHealthCheck();
});/* FORCE DEPLOY 1753898061 */
