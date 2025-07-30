/**
 * 詳細診断結果ページのJavaScript
 */

// グローバル変数
let currentResults = null;
let currentSessionId = null;

// API設定
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// 診断タイプ
 let currentDiagnosisType = 'technical';

/**
 * ページ初期化
 */
document.addEventListener('DOMContentLoaded', async () => {
    // URLパラメータから診断結果を取得
    const urlParams = new URLSearchParams(window.location.search);
    currentSessionId = urlParams.get('sessionId');
    const diagnosisType = urlParams.get('type') || 'technical';
    
    if (currentSessionId) {
        await loadDiagnosisResults(currentSessionId);
    } else {
        // ローカルストレージから取得
        const storedResults = localStorage.getItem('llmo-diagnosis-results');
        const storedType = localStorage.getItem('llmo-diagnosis-type');
        if (storedResults) {
            currentResults = JSON.parse(storedResults);
            currentDiagnosisType = storedType || 'technical';
            updateDiagnosisScores();
            renderDetailedResults();
            renderOverviewResults();
        } else {
            // デモデータで表示
            loadDemoData();
        }
    }
});

/**
 * デモデータの読み込み（メインダッシュボードと同じスコア）
 */
function loadDemoData() {
    currentResults = {
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        summary: {
            overallScore: 79,
            totalItems: 36,
            completedItems: 36
        },
        categories: {
            infrastructure: {
                name: 'インフラ＆パフォーマンス',
                description: 'サイトの技術的基盤、パフォーマンス、セキュリティに関する評価項目です。',
                items: [
                    { id: 'https_check', name: 'HTTPS使用', score: 100, issues: [] },
                    { id: 'mobile_friendly', name: 'モバイル対応', score: 85, issues: ['レスポンシブデザインの最適化'] },
                    { id: 'page_speed', name: 'ページ速度', score: 78, issues: ['画像最適化', 'CSS/JS圧縮'] },
                    { id: 'core_web_vitals', name: 'Core Web Vitals', score: 82, issues: ['LCP改善', 'CLS最適化'] },
                    { id: 'cdn_usage', name: 'CDN使用', score: 90, issues: ['静的リソース配信'] },
                    { id: 'compression', name: '圧縮設定', score: 88, issues: ['Gzip/Brotli圧縮'] },
                    { id: 'caching', name: 'キャッシュ設定', score: 75, issues: ['ブラウザキャッシュ設定'] },
                    { id: 'server_response', name: 'サーバー応答時間', score: 80, issues: ['レスポンス時間改善'] },
                    { id: 'resource_optimization', name: 'リソース最適化', score: 73, issues: ['画像圧縮', 'コード最適化'] }
                ],
                stats: { totalScore: 751, maxScore: 900, completedItems: 9 }
            },
            content: {
                name: 'コンテンツ＆構造',
                description: 'サイトのコンテンツ品質、情報構造、ユーザビリティに関する評価項目です。',
                items: [
                    { id: 'title_tag', name: 'タイトルタグ', score: 95, issues: ['タイトル長の最適化'] },
                    { id: 'meta_description', name: 'メタディスクリプション', score: 90, issues: ['魅力的な説明文'] },
                    { id: 'heading_structure', name: '見出し構造', score: 88, issues: ['H1-H6の適切な使用'] },
                    { id: 'content_quality', name: 'コンテンツ品質', score: 85, issues: ['オリジナルコンテンツ強化'] },
                    { id: 'internal_links', name: '内部リンク', score: 80, issues: ['関連ページへのリンク'] },
                    { id: 'image_optimization', name: '画像最適化', score: 75, issues: ['altテキスト追加', '画像圧縮'] },
                    { id: 'url_structure', name: 'URL構造', score: 92, issues: ['URL階層の最適化'] },
                    { id: 'breadcrumbs', name: 'パンくずリスト', score: 70, issues: ['ナビゲーション改善'] },
                    { id: 'content_freshness', name: 'コンテンツ更新頻度', score: 65, issues: ['定期的な更新'] }
                ],
                stats: { totalScore: 740, maxScore: 900, completedItems: 9 }
            },
            visibility: {
                name: '可視性＆発見性',
                description: '検索エンジンでの発見性、インデックス性、ソーシャルメディア対応に関する評価項目です。',
                items: [
                    { id: 'robots_txt', name: 'robots.txt', score: 100, issues: ['クローラー指示最適化'] },
                    { id: 'sitemap', name: 'XMLサイトマップ', score: 95, issues: ['サイトマップ更新'] },
                    { id: 'structured_data', name: '構造化データ', score: 80, issues: ['Schema.org実装'] },
                    { id: 'social_tags', name: 'ソーシャルタグ', score: 85, issues: ['OGタグ最適化'] },
                    { id: 'canonical_tags', name: 'カノニカルタグ', score: 90, issues: ['重複コンテンツ対策'] },
                    { id: 'meta_robots', name: 'メタロボットタグ', score: 88, issues: ['インデックス制御'] },
                    { id: 'search_console', name: 'Search Console連携', score: 75, issues: ['GSC設定確認'] },
                    { id: 'analytics', name: 'アナリティクス設定', score: 80, issues: ['GA4設定'] },
                    { id: 'local_seo', name: 'ローカルSEO', score: 60, issues: ['Googleビジネスプロフィール'] }
                ],
                stats: { totalScore: 753, maxScore: 900, completedItems: 9 }
            },
            aiReadiness: {
                name: 'AI＆未来対応',
                description: 'AI検索エンジン、音声検索、次世代検索技術への対応に関する評価項目です。',
                items: [
                    { id: 'semantic_html', name: 'セマンティックHTML', score: 85, issues: ['semantic要素の活用'] },
                    { id: 'voice_search', name: '音声検索対応', score: 70, issues: ['会話型クエリ対応'] },
                    { id: 'featured_snippets', name: 'Featured Snippet対応', score: 75, issues: ['構造化回答形式'] },
                    { id: 'entity_optimization', name: 'エンティティ最適化', score: 65, issues: ['知識グラフ対応'] },
                    { id: 'ai_content', name: 'AI対応コンテンツ', score: 60, issues: ['AIフレンドリーな文章'] },
                    { id: 'nlp_optimization', name: 'NLP最適化', score: 55, issues: ['自然言語処理対応'] },
                    { id: 'multimodal_content', name: 'マルチモーダルコンテンツ', score: 50, issues: ['画像・動画・音声統合'] },
                    { id: 'ai_accessibility', name: 'AIアクセシビリティ', score: 68, issues: ['AI読み上げ対応'] },
                    { id: 'future_readiness', name: '未来対応性', score: 72, issues: ['新技術への対応準備'] }
                ],
                stats: { totalScore: 600, maxScore: 900, completedItems: 9 }
            }
        }
    };
    
    renderDetailedResults();
    renderOverviewResults();
    renderImprovementPlan();
}

/**
 * 診断スコアを更新
 */
function updateDiagnosisScores() {
    if (!currentResults) return;
    
    // テクニカル診断のスコア
    const technicalScore = currentDiagnosisType === 'technical' ? currentResults.summary.overallScore : '--';
    document.getElementById('technical-score').textContent = technicalScore;
    
    // マーケティング診断のスコア（ビジネス診断）
    const marketingScore = currentDiagnosisType === 'business' ? currentResults.summary.overallScore : '--';
    document.getElementById('marketing-score').textContent = marketingScore;
}

/**
 * 診断詳細を表示
 */
function showDiagnosisDetail(type) {
    // TODO: 各診断タイプの詳細ページへの遷移またはモーダル表示
    alert(`${type === 'technical' ? 'テクニカル' : 'マーケティング'}36項目診断の詳細を表示します`);
}

/**
 * タブ切り替え
 */
function switchTab(tabName) {
    // タブボタンの状態を更新
    const tabs = ['overview', 'detailed', 'improvement'];
    tabs.forEach(tab => {
        const button = document.getElementById(`tab-${tab}`);
        const content = document.getElementById(`content-${tab}`);
        
        if (tab === tabName) {
            button.classList.add('tab-active', 'border-blue-500', 'text-blue-600');
            button.classList.remove('text-gray-500', 'border-transparent');
            content.classList.remove('hidden');
        } else {
            button.classList.remove('tab-active', 'border-blue-500', 'text-blue-600');
            button.classList.add('text-gray-500', 'border-transparent');
            content.classList.add('hidden');
        }
    });
}

/**
 * 詳細診断結果の描画
 */
function renderDetailedResults() {
    if (!currentResults) return;
    
    const container = document.getElementById('detailed-results-container');
    let html = '';
    
    Object.entries(currentResults.categories).forEach(([categoryKey, category]) => {
        const categoryClass = categoryKey.replace(/([A-Z])/g, '-$1').toLowerCase();
        
        html += `
            <div class="category-section ${categoryClass}">
                <h3 class="text-lg font-semibold mb-4">${getCategoryNumber(categoryKey)}. ${category.name}</h3>
                <div class="space-y-4">
        `;
        
        category.items.forEach((item, index) => {
            const starRating = generateStarRating(item.score);
            const scoreBadge = generateScoreBadge(item.score);
            const itemNumber = getCategoryNumber(categoryKey) + '-' + (index + 1);
            
            html += `
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-medium">${itemNumber}. ${item.name}</h4>
                        <div class="flex items-center space-x-3">
                            <div class="flex">${starRating}</div>
                            <div class="${scoreBadge.class}">${scoreBadge.text}</div>
                        </div>
                    </div>
                    <div class="text-sm text-gray-600">
                        ${item.issues && item.issues.length > 0 ? item.issues.join(', ') : '優秀な実装です。改善の必要なし'}
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * 総合評価結果の描画
 */
function renderOverviewResults() {
    if (!currentResults) return;
    
    // 総合スコアの円グラフを更新
    const overallScore = currentResults.summary.overallScore;
    const overallScoreText = document.getElementById('overview-score-text');
    const overallScoreCircle = document.getElementById('overview-score-circle');
    
    if (overallScoreText) {
        overallScoreText.textContent = overallScore;
    }
    
    if (overallScoreCircle) {
        const circumference = 2 * Math.PI * 80;
        const offset = circumference - (overallScore / 100) * circumference;
        setTimeout(() => {
            overallScoreCircle.style.strokeDashoffset = offset;
        }, 100);
    }
    
    // 期待される成果を更新
    const expectedResults = document.getElementById('expected-results');
    if (expectedResults) {
        const targetScore = Math.min(100, overallScore + 16);
        expectedResults.textContent = `• スコア向上: ${overallScore}点 → ${targetScore}点 (+16点)`;
    }
    
    // 9カテゴリースコアグリッドを更新
    const categoryScoresGrid = document.getElementById('category-scores-grid');
    if (categoryScoresGrid && currentResults.categories) {
        let categoryHtml = '';
        const colors = ['blue', 'green', 'purple', 'yellow', 'red', 'indigo', 'pink', 'gray', 'orange'];
        
        Object.entries(currentResults.categories).forEach(([key, category], index) => {
            const color = colors[index % colors.length];
            const categoryScore = Math.round((category.stats.totalScore / category.stats.maxScore) * 10);
            const percentage = Math.round((category.stats.totalScore / category.stats.maxScore) * 100);
            
            categoryHtml += `
                <div class="bg-${color}-50 p-4 rounded-lg">
                    <h3 class="font-semibold text-${color}-800 mb-2">${index + 1}. ${category.name}</h3>
                    <div class="text-2xl font-bold text-${color}-600 mb-1">${categoryScore}/10</div>
                    <div class="w-full bg-${color}-200 rounded-full h-2">
                        <div class="bg-${color}-600 h-2 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        });
        
        categoryScoresGrid.innerHTML = categoryHtml;
    }
    
    // 改善優先度TOP10を生成
    const priorityList = document.getElementById('priority-list');
    const allItems = [];
    
    Object.values(currentResults.categories).forEach(category => {
        category.items.forEach(item => {
            allItems.push({
                ...item,
                categoryName: category.name
            });
        });
    });
    
    // スコアの低い順にソート
    const priorityItems = allItems.sort((a, b) => a.score - b.score).slice(0, 10);
    
    let priorityHtml = '';
    priorityItems.forEach((item, index) => {
        const impact = item.score < 30 ? '+15点' : item.score < 60 ? '+10点' : '+5点';
        priorityHtml += `
            <div class="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-center">
                    <div class="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        ${index + 1}
                    </div>
                    <div>
                        <div class="font-medium">${item.name} (現在: ${item.score}点)</div>
                        <div class="text-sm text-gray-600">${item.categoryName}</div>
                    </div>
                </div>
                <div class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    ${impact}
                </div>
            </div>
        `;
    });
    priorityList.innerHTML = priorityHtml;
    
    // 強み・弱みリストを生成
    const strengthsList = document.getElementById('strengths-list');
    const weaknessesList = document.getElementById('weaknesses-list');
    
    const strengths = allItems.filter(item => item.score >= 70);
    const weaknesses = allItems.filter(item => item.score < 70);
    
    let strengthsHtml = '';
    strengths.forEach(item => {
        strengthsHtml += `
            <li class="flex items-center">
                <i class="fas fa-check text-green-500 mr-2"></i>
                <span>${item.name} (${item.score}点)</span>
            </li>
        `;
    });
    strengthsList.innerHTML = strengthsHtml;
    
    let weaknessesHtml = '';
    weaknesses.forEach(item => {
        weaknessesHtml += `
            <li class="flex items-center">
                <i class="fas fa-times text-red-500 mr-2"></i>
                <span>${item.name} (${item.score}点)</span>
            </li>
        `;
    });
    weaknessesList.innerHTML = weaknessesHtml;
}

/**
 * 改善計画の描画
 */
function renderImprovementPlan() {
    if (!currentResults) return;
    
    // 現在スコアと目標スコアを更新
    const currentScore = currentResults.summary.overallScore;
    const targetScore = Math.min(100, currentScore + 16); // +16点目標
    
    const currentScoreElement = document.getElementById('current-score');
    const targetScoreElement = document.getElementById('target-score');
    
    if (currentScoreElement) currentScoreElement.textContent = `${currentScore}点`;
    if (targetScoreElement) targetScoreElement.textContent = `${targetScore}点`;
    
    const container = document.getElementById('priority-improvements');
    if (!container) return;
    
    const allItems = [];
    
    Object.values(currentResults.categories).forEach(category => {
        category.items.forEach(item => {
            allItems.push({
                ...item,
                categoryName: category.name
            });
        });
    });
    
    // 最優先改善項目（最低スコア10項目）
    const priorityItems = allItems.sort((a, b) => a.score - b.score).slice(0, 10);
    
    let html = '';
    priorityItems.forEach((item, index) => {
        const improvement = item.score < 30 ? '+15点' : item.score < 60 ? '+10点' : '+5点';
        html += `
            <div class="bg-white border border-red-300 rounded-lg p-3">
                <div class="font-semibold text-red-800">${index + 1}. ${item.name}</div>
                <div class="text-sm text-gray-600">現在: ${item.score}点 → 改善効果: ${improvement}</div>
                <div class="text-xs text-gray-500 mt-1">${item.categoryName}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

/**
 * 星評価を生成
 */
function generateStarRating(score) {
    const maxStars = 10;
    const filledStars = Math.floor(score / 10);
    let html = '';
    
    for (let i = 0; i < maxStars; i++) {
        if (i < filledStars) {
            html += '<i class="fas fa-star star-rating"></i>';
        } else {
            html += '<i class="fas fa-star star-empty"></i>';
        }
    }
    
    return html;
}

/**
 * スコアバッジを生成
 */
function generateScoreBadge(score) {
    if (score >= 90) {
        return { class: 'score-badge score-excellent', text: `${score}点` };
    } else if (score >= 70) {
        return { class: 'score-badge score-good', text: `${score}点` };
    } else if (score >= 50) {
        return { class: 'score-badge score-fair', text: `${score}点` };
    } else {
        return { class: 'score-badge score-poor', text: `${score}点` };
    }
}

/**
 * カテゴリー番号を取得
 */
function getCategoryNumber(categoryKey) {
    const mapping = {
        infrastructure: '1',
        content: '4', 
        visibility: '3',
        aiReadiness: '9'
    };
    return mapping[categoryKey] || '1';
}

/**
 * 戻るボタン
 */
function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = '/';
    }
}

/**
 * 診断結果の読み込み
 */
async function loadDiagnosisResults(sessionId) {
    try {
        const response = await fetch(`${API_BASE}/results/${sessionId}`);
        if (response.ok) {
            currentResults = await response.json();
            renderDetailedResults();
            renderOverviewResults();
            renderImprovementPlan();
        } else {
            console.error('診断結果の取得に失敗しました');
            loadDemoData();
        }
    } catch (error) {
        console.error('API呼び出しエラー:', error);
        loadDemoData();
    }
}