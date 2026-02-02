/**
 * NetFusion Dashboard App
 * Handles fetching data from backend and updating the Aurora Night UI
 */

let trendChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    const siteSelector = document.getElementById('site-selector');

    // 1. Fetch sites and populate the selector
    try {
        const response = await fetch('/api/sites');

        if (response.status === 401) {
            document.getElementById('connect-overlay').style.display = 'flex';
            return;
        } else {
            document.getElementById('connect-overlay').style.display = 'none';
        }

        const data = await response.json();

        if (data && data.siteEntry) {
            siteSelector.innerHTML = '<option value="">請選擇網站...</option>';
            data.siteEntry.forEach(site => {
                const option = document.createElement('option');
                option.value = site.siteUrl;
                option.textContent = site.siteUrl.replace('sc-domain:', '');
                siteSelector.appendChild(option);
            });

            // Auto-select the first one if available
            if (data.siteEntry.length > 0) {
                siteSelector.selectedIndex = 1;
                updateDashboard(data.siteEntry[0].siteUrl);
            }
        } else {
            siteSelector.innerHTML = '<option value="">無可用站點 (請先授權)</option>';
        }
    } catch (error) {
        console.error('Fetch sites error:', error);
        siteSelector.innerHTML = '<option value="">載入失敗</option>';
    }

    // 2. Handle Site Selection Change
    siteSelector.addEventListener('change', (e) => {
        if (e.target.value) {
            updateDashboard(e.target.value);
        }
    });

    // 3. Handle Table Toggles
    document.getElementById('btn-show-keywords').addEventListener('click', () => toggleTable('keywords'));
    document.getElementById('btn-show-pages').addEventListener('click', () => toggleTable('pages'));

    // 4. Handle PDF Export
    document.getElementById('btn-export-pdf').addEventListener('click', exportToPDF);
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
        alert('匯出失敗，請稍後再試。');
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
    // 1. Reset UI states
    resetUI();

    // 2. Fetch Data in Parallel
    const analyticsTask = fetchAnalytics(siteUrl);
    const trendsTask = fetchTrends(siteUrl);
    const pagesTask = fetchPages(siteUrl);

    await Promise.all([analyticsTask, trendsTask, pagesTask]);
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
 * Fetch Keywords Analytics
 */
async function fetchAnalytics(siteUrl) {
    try {
        const response = await fetch(`/api/analytics?siteUrl=${encodeURIComponent(siteUrl)}`);
        const data = await response.json();

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
            const avgCtr = ((totalClicks / totalImpressions) * 100).toFixed(2);

            document.getElementById('stat-clicks').textContent = totalClicks.toLocaleString();
            document.getElementById('stat-impressions').textContent = totalImpressions.toLocaleString();
            document.getElementById('stat-position').textContent = avgPosition;
            document.getElementById('stat-ctr').textContent = avgCtr + '%';

            // Trigger AI Insights
            fetchAIInsights({
                totalClicks,
                totalImpressions,
                avgPosition,
                avgCtr,
                topData: data.rows.slice(0, 10).map(r => ({
                    query: r.keys[0],
                    clicks: r.clicks,
                    ctr: (r.ctr * 100).toFixed(1) + '%',
                    position: r.position.toFixed(1)
                }))
            });
        }
    } catch (error) {
        console.error('Fetch analytics error:', error);
    }
}

/**
 * Fetch Top Pages
 */
async function fetchPages(siteUrl) {
    try {
        const response = await fetch(`/api/pages?siteUrl=${encodeURIComponent(siteUrl)}`);
        const data = await response.json();

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
        }
    } catch (error) {
        console.error('Fetch pages error:', error);
    }
}

/**
 * Fetch Trends for Chart
 */
async function fetchTrends(siteUrl) {
    try {
        const response = await fetch(`/api/trends?siteUrl=${encodeURIComponent(siteUrl)}`);
        const data = await response.json();

        if (data && data.rows) {
            const labels = data.rows.map(r => r.keys[0].split('-').slice(1).join('/')); // MM/DD
            const clicks = data.rows.map(r => r.clicks);
            const impressions = data.rows.map(r => r.impressions);

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
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.4)' }
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
 * Fetch AI Insights
 */
async function fetchAIInsights(stats) {
    const listContainer = document.querySelector('.recommendations-list');
    listContainer.innerHTML = '<div class="rec-card"><p>AI 正在進行深度診斷...</p></div>';

    try {
        const response = await fetch('/api/ai-insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: stats })
        });
        const insights = await response.json();

        if (Array.isArray(insights)) {
            listContainer.innerHTML = '';
            insights.forEach(item => {
                const card = document.createElement('div');
                card.className = 'rec-card';
                card.innerHTML = `
                    <div class="rec-info">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h4 style="margin: 0;">${item.title}</h4>
                            <span class="rec-badge badge-${item.priority.toLowerCase()}" 
                                  style="padding: 2px 8px; border-radius: 4px; font-size: 10px; background: rgba(56, 189, 248, 0.1); color: var(--color-primary); border: 1px solid var(--color-border);">
                                ${item.priority}
                            </span>
                        </div>
                        <p style="margin: 0; color: var(--color-text-secondary); font-size: 14px;">${item.description}</p>
                    </div>
                `;
                listContainer.appendChild(card);
            });
        }
    } catch (error) {
        listContainer.innerHTML = '<div class="rec-card"><p>暫時無法獲取 AI 建議。</p></div>';
    }
}
