/**
 * NetFusion Dashboard App
 * Uses Supabase client-side queries for GSC data
 */

let trendChart = null;
let currentSiteUrl = null;
let currentDateRange = 28;
let cachedData = { keywords: null, pages: null, trends: null };

document.addEventListener('DOMContentLoaded', async () => {
    const { auth, googleApi, db } = window.NetFusion;
    const siteSelector = document.getElementById('site-selector');
    const connectOverlay = document.getElementById('connect-overlay');

    // 0. Setup UI Components
    setupMobileMenu();
    setupExportDropdown();
    setupLogoutButton();
    setupRefreshButton();
    setupDateRangeSelector();

    // 1. Check authentication state
    try {
        const user = await auth.getUser();

        if (!user) {
            connectOverlay.style.display = 'flex';
            return;
        }

        connectOverlay.style.display = 'none';

        // Update user info in sidebar
        updateUserInfo(user);

        // 2. Check for Google provider token
        const session = await auth.getSession();

        if (!session?.provider_token) {
            console.warn('No Google provider token available');
            siteSelector.innerHTML = '<option value="">請重新授權 Google 帳戶</option>';
            return;
        }

        // 3. Fetch GSC sites
        const sitesData = await googleApi.getSitesList();

        if (sitesData && sitesData.siteEntry && sitesData.siteEntry.length > 0) {
            siteSelector.innerHTML = '<option value="">請選擇網站...</option>';

            sitesData.siteEntry.forEach(site => {
                const option = document.createElement('option');
                option.value = site.siteUrl;
                option.textContent = site.siteUrl.replace('sc-domain:', '');
                siteSelector.appendChild(option);
            });

            // Save sites to Supabase for future reference
            try {
                await db.saveSites(sitesData.siteEntry);
            } catch (e) {
                console.warn('Could not save sites to DB:', e);
            }

            // Auto-select first site
            if (sitesData.siteEntry.length > 0) {
                siteSelector.selectedIndex = 1;
                updateDashboard(sitesData.siteEntry[0].siteUrl);
            }
        } else {
            siteSelector.innerHTML = '<option value="">無可用站點 (請先在 GSC 新增網站)</option>';
        }

    } catch (error) {
        console.error('Initialization error:', error);
        siteSelector.innerHTML = '<option value="">載入失敗 - ' + error.message + '</option>';
    }

    // 4. Handle Site Selection Change
    siteSelector.addEventListener('change', (e) => {
        if (e.target.value) {
            updateDashboard(e.target.value);
        }
    });

    // 5. Handle Table Toggles
    document.getElementById('btn-show-keywords').addEventListener('click', () => toggleTable('keywords'));
    document.getElementById('btn-show-pages').addEventListener('click', () => toggleTable('pages'));

});

async function exportToPDF() {
    const btn = document.getElementById('btn-export-pdf');
    const originalText = btn.textContent;
    btn.textContent = '正在產生 PDF...';
    btn.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        const element = document.querySelector('.content-body');

        const canvas = await html2canvas(element, {
            backgroundColor: '#030712',
            scale: 2,
            logging: false,
            useCORS: true
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`NetFusion-SEO-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error('PDF Export Error:', error);
        alert('匯出失敗: ' + error.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function toggleTable(type) {
    const kTable = document.getElementById('keywords-table');
    const pTable = document.getElementById('pages-table');
    const kBtn = document.getElementById('btn-show-keywords');
    const pBtn = document.getElementById('btn-show-pages');

    if (type === 'keywords') {
        kTable.style.display = 'table';
        pTable.style.display = 'none';
        kBtn.className = 'btn-primary';
        pBtn.className = 'btn-secondary';
    } else {
        kTable.style.display = 'none';
        pTable.style.display = 'table';
        kBtn.className = 'btn-secondary';
        pBtn.className = 'btn-primary';
    }
}

/**
 * Orchestrate dashboard updates
 */
async function updateDashboard(siteUrl) {
    currentSiteUrl = siteUrl;
    resetUI();
    setLoading(true);

    try {
        // Fetch Data in Parallel
        const analyticsTask = fetchAnalytics(siteUrl);
        const trendsTask = fetchTrends(siteUrl);
        const pagesTask = fetchPages(siteUrl);

        await Promise.all([analyticsTask, trendsTask, pagesTask]);
    } catch (error) {
        console.error('Dashboard update error:', error);
        showToast('載入資料失敗', 'error');
    } finally {
        setLoading(false);
    }
}

function resetUI() {
    document.getElementById('stat-clicks').textContent = '...';
    document.getElementById('stat-impressions').textContent = '...';
    document.getElementById('stat-position').textContent = '...';
    document.getElementById('stat-ctr').textContent = '--%';
    document.getElementById('keywords-table-body').innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center;">正在載入...</td></tr>';
    document.getElementById('pages-table-body').innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center;">正在載入...</td></tr>';
}

/**
 * Fetch Keywords Analytics using Supabase/Google API
 */
async function fetchAnalytics(siteUrl) {
    const { googleApi, db } = window.NetFusion;

    try {
        const data = await googleApi.getSearchAnalytics(siteUrl, {
            dimensions: ['query'],
            days: currentDateRange,
            limit: 100
        });

        // Cache the data for CSV export
        if (data && data.rows) {
            cachedData.keywords = data.rows;
        }

        if (data && data.rows && data.rows.length > 0) {
            let totalClicks = 0;
            let totalImpressions = 0;
            let sumPosition = 0;

            const tableBody = document.getElementById('keywords-table-body');
            tableBody.innerHTML = '';

            data.rows.forEach((row, index) => {
                totalClicks += row.clicks;
                totalImpressions += row.impressions;
                sumPosition += row.position;

                // Inject into table (top 10 only)
                if (index < 10) {
                    const tr = document.createElement('tr');
                    const rankClass = row.position <= 3 ? 'rank-top' : (row.position <= 10 ? 'rank-good' : '');
                    tr.innerHTML = `
                        <td>${row.keys[0]}</td>
                        <td>${row.clicks}</td>
                        <td>${(row.ctr * 100).toFixed(1)}%</td>
                        <td class="${rankClass}">${row.position.toFixed(1)}</td>
                    `;
                    tableBody.appendChild(tr);
                }
            });

            const avgPosition = (sumPosition / data.rows.length).toFixed(1);
            const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

            document.getElementById('stat-clicks').textContent = totalClicks.toLocaleString();
            document.getElementById('stat-impressions').textContent = totalImpressions.toLocaleString();
            document.getElementById('stat-position').textContent = avgPosition;
            document.getElementById('stat-ctr').textContent = avgCtr + '%';

            // Save metrics to Supabase
            try {
                await db.saveMetrics(siteUrl, {
                    clicks: totalClicks,
                    impressions: totalImpressions,
                    ctr: parseFloat(avgCtr) / 100,
                    position: parseFloat(avgPosition)
                });
            } catch (e) {
                console.warn('Could not save metrics:', e);
            }

            // Generate AI Insights (client-side for now)
            generateAIInsights({
                totalClicks,
                totalImpressions,
                avgPosition,
                avgCtr,
                topKeywords: data.rows.slice(0, 5)
            });

        } else {
            document.getElementById('keywords-table-body').innerHTML =
                '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--color-text-muted);">此期間無資料</td></tr>';
        }
    } catch (error) {
        console.error('Fetch analytics error:', error);
        document.getElementById('keywords-table-body').innerHTML =
            `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #ef4444;">錯誤: ${error.message}</td></tr>`;
    }
}

/**
 * Fetch Top Pages using Google API
 */
async function fetchPages(siteUrl) {
    const { googleApi } = window.NetFusion;

    try {
        const data = await googleApi.getSearchAnalytics(siteUrl, {
            dimensions: ['page'],
            days: currentDateRange,
            limit: 20
        });

        // Cache pages data
        if (data && data.rows) {
            cachedData.pages = data.rows;
        }

        if (data && data.rows) {
            const tableBody = document.getElementById('pages-table-body');
            tableBody.innerHTML = '';

            data.rows.slice(0, 10).forEach(row => {
                const tr = document.createElement('tr');
                const path = row.keys[0].replace(/https?:\/\/[^\/]+/, '') || '/';
                tr.innerHTML = `
                    <td style="padding: 12px; font-size: 14px; color: var(--color-primary);">${path}</td>
                    <td style="padding: 12px; font-size: 14px;">${row.clicks}</td>
                    <td style="padding: 12px; font-size: 14px;">${row.impressions}</td>
                    <td style="padding: 12px; font-size: 14px;">${row.position.toFixed(1)}</td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            document.getElementById('pages-table-body').innerHTML =
                '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--color-text-muted);">此期間無資料</td></tr>';
        }
    } catch (error) {
        console.error('Fetch pages error:', error);
    }
}

/**
 * Fetch Trends for Chart using Google API
 */
async function fetchTrends(siteUrl) {
    const { googleApi } = window.NetFusion;

    try {
        const data = await googleApi.getSearchAnalytics(siteUrl, {
            dimensions: ['date'],
            days: currentDateRange,
            limit: currentDateRange
        });

        // Cache trends data
        if (data && data.rows) {
            cachedData.trends = data.rows;
        }

        if (data && data.rows) {
            // Sort by date
            const sortedRows = data.rows.sort((a, b) => a.keys[0].localeCompare(b.keys[0]));

            const labels = sortedRows.map(r => {
                const parts = r.keys[0].split('-');
                return `${parts[1]}/${parts[2]}`; // MM/DD
            });
            const clicks = sortedRows.map(r => r.clicks);
            const impressions = sortedRows.map(r => r.impressions);

            renderChart(labels, clicks, impressions);
        }
    } catch (error) {
        console.error('Fetch trends error:', error);
    }
}

/**
 * Render Chart.js
 */
function renderChart(labels, clicks, impressions) {
    const ctx = document.getElementById('trendChart').getContext('2d');

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '點擊次數',
                    data: clicks,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: '曝光次數',
                    data: impressions,
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.05)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.4)', maxRotation: 0 }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#38bdf8' },
                    title: { display: false }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    grid: { display: false },
                    ticks: { color: '#a855f7' },
                    title: { display: false }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

/**
 * Generate AI Insights (Client-side mock for now)
 * TODO: Can be enhanced with actual AI API later
 */
function generateAIInsights(stats) {
    const listContainer = document.querySelector('.recommendations-list');
    const insights = [];

    // Analyze data and generate insights
    const avgPos = parseFloat(stats.avgPosition);
    const ctr = parseFloat(stats.avgCtr);

    // Position-based insight
    if (avgPos > 10) {
        insights.push({
            title: '排名優化機會',
            description: `平均排名為 ${avgPos}，建議加強內容深度與反向連結策略，以提升搜尋排名。`,
            priority: 'high'
        });
    } else if (avgPos > 5) {
        insights.push({
            title: '進入前 5 名的機會',
            description: `目前平均排名 ${avgPos}，距離首頁前 5 名僅差一步，建議優化頁面標題與結構化資料。`,
            priority: 'medium'
        });
    }

    // CTR-based insight
    if (ctr < 2) {
        insights.push({
            title: 'CTR 偏低警告',
            description: `點擊率僅 ${stats.avgCtr}%，建議改善 Meta Description 與標題以提高吸引力。`,
            priority: 'high'
        });
    }

    // Top keyword insight
    if (stats.topKeywords && stats.topKeywords.length > 0) {
        const topKw = stats.topKeywords[0];
        if (topKw.position > 3 && topKw.position <= 10) {
            insights.push({
                title: `「${topKw.keys[0]}」衝刺前 3 名`,
                description: `此關鍵字目前排名第 ${topKw.position.toFixed(0)}，已在首頁範圍，有極大潛力提升至前 3 名。`,
                priority: 'actionable'
            });
        }
    }

    // Default insight if none
    if (insights.length === 0) {
        insights.push({
            title: '持續監控中',
            description: '目前數據表現穩定，建議持續追蹤並定期檢視競爭對手動態。',
            priority: 'info'
        });
    }

    // Render insights
    listContainer.innerHTML = '';
    insights.forEach(item => {
        const card = document.createElement('div');
        card.className = 'rec-card';

        const priorityColors = {
            high: 'border-left-color: #ef4444',
            medium: 'border-left-color: #f59e0b',
            actionable: 'border-left-color: #22c55e',
            info: 'border-left-color: var(--color-primary)'
        };

        card.style.cssText = priorityColors[item.priority] || '';

        card.innerHTML = `
            <div class="rec-info">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="margin: 0;">${item.title}</h4>
                    <span class="rec-badge"
                          style="padding: 2px 8px; border-radius: 4px; font-size: 10px; background: rgba(56, 189, 248, 0.1); color: var(--color-primary); border: 1px solid var(--color-border);">
                        ${item.priority.toUpperCase()}
                    </span>
                </div>
                <p style="margin: 0; color: var(--color-text-secondary); font-size: 14px;">${item.description}</p>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

/**
 * Setup Mobile Menu Toggle
 */
function setupMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (!menuBtn || !sidebar) return;

    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
    });

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // Close sidebar on nav item click (mobile)
    const navItems = sidebar.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('active');
            }
        });
    });
}

/**
 * Setup Export Dropdown
 */
function setupExportDropdown() {
    const exportBtn = document.getElementById('btn-export');
    const exportMenu = document.getElementById('export-menu');
    const exportPdfBtn = document.getElementById('btn-export-pdf');
    const exportCsvBtn = document.getElementById('btn-export-csv');

    if (!exportBtn || !exportMenu) return;

    exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', () => {
        exportMenu.style.display = 'none';
    });

    exportPdfBtn?.addEventListener('click', () => {
        exportMenu.style.display = 'none';
        exportToPDF();
    });

    exportCsvBtn?.addEventListener('click', () => {
        exportMenu.style.display = 'none';
        exportToCSV();
    });
}

/**
 * Setup Logout Button
 */
function setupLogoutButton() {
    const logoutBtn = document.getElementById('btn-logout');
    const reauthBtn = document.getElementById('btn-reauth');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await window.NetFusion.auth.signOut();
            } catch (err) {
                console.error('Logout error:', err);
                showToast('登出失敗', 'error');
            }
        });
    }

    if (reauthBtn) {
        reauthBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await window.NetFusion.auth.signInWithGoogle();
            } catch (err) {
                console.error('Auth error:', err);
                showToast('授權失敗: ' + err.message, 'error');
            }
        });
    }
}

/**
 * Setup Refresh Button
 */
function setupRefreshButton() {
    const refreshBtn = document.getElementById('btn-refresh');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            if (!currentSiteUrl) return;

            const icon = refreshBtn.querySelector('svg');
            icon?.classList.add('refresh-spin');
            refreshBtn.disabled = true;

            // Clear cache and reload
            cachedData = { keywords: null, pages: null, trends: null };
            await updateDashboard(currentSiteUrl);

            icon?.classList.remove('refresh-spin');
            refreshBtn.disabled = false;
            showToast('資料已更新', 'success');
        });
    }
}

/**
 * Setup Date Range Selector
 */
function setupDateRangeSelector() {
    const dateRange = document.getElementById('date-range');

    if (dateRange) {
        dateRange.addEventListener('change', async (e) => {
            currentDateRange = parseInt(e.target.value);
            if (currentSiteUrl) {
                cachedData = { keywords: null, pages: null, trends: null };
                await updateDashboard(currentSiteUrl);
            }
        });
    }
}

/**
 * Export to CSV
 */
function exportToCSV() {
    if (!cachedData.keywords) {
        showToast('請先載入資料', 'error');
        return;
    }

    try {
        const rows = [['關鍵字', '點擊', '曝光', 'CTR', '平均排名']];

        cachedData.keywords.forEach(row => {
            rows.push([
                row.keys[0],
                row.clicks,
                row.impressions,
                (row.ctr * 100).toFixed(2) + '%',
                row.position.toFixed(1)
            ]);
        });

        const csvContent = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `NetFusion-Keywords-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        showToast('CSV 匯出成功', 'success');
    } catch (error) {
        console.error('CSV Export Error:', error);
        showToast('匯出失敗', 'error');
    }
}

/**
 * Show Toast Notification
 */
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#38bdf8'}" stroke-width="2">
            ${type === 'success' ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' :
              type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' :
              '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'}
        </svg>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

/**
 * Show/Hide Global Loader
 */
function setLoading(loading) {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.display = loading ? 'block' : 'none';
    }
}

/**
 * Update User Info in Sidebar
 */
function updateUserInfo(user) {
    const avatar = document.getElementById('user-avatar');
    const name = document.getElementById('user-name');
    const email = document.getElementById('user-email');

    if (user) {
        if (avatar) avatar.textContent = (user.email || 'U').charAt(0).toUpperCase();
        if (name) name.textContent = user.user_metadata?.full_name || user.email?.split('@')[0] || '用戶';
        if (email) email.textContent = user.email || '';
    }
}
