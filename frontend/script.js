const API_BASE = "http://127.0.0.1:8080"; // Backend port (updated)

let financialOverviewChart;
let donationChart;
let expenseBreakdownChart;
let healthIndicatorChart;

const currency = value => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

async function predictFinance() {
    const income = parseFloat(document.getElementById("incomeInput").value || "0");
    const expense = parseFloat(document.getElementById("expenseInput").value || "0");
    const donations = parseFloat(document.getElementById("donationInput").value || "0");
    const resultEl = document.getElementById("predictionResult");

    if (Number.isNaN(income) || Number.isNaN(expense) || Number.isNaN(donations)) {
        resultEl.innerText = "Enter numeric values for all fields.";
        return;
    }

    resultEl.innerText = "Predicting...";

    try {
        const response = await fetch(`${API_BASE}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ income, expense, donations })
        });

        const data = await response.json();

        if (!response.ok) {
            resultEl.innerText = data.detail || "Prediction failed.";
            return;
        }

        const { future_funding_required, confidence_score, risk_level } = data;

        resultEl.innerText = `Funding need: ${currency(future_funding_required)} · Confidence: ${confidence_score}% · Risk: ${risk_level}`;
    } catch (err) {
        resultEl.innerText = "Could not reach backend. Is it running?";
        console.error(err);
    }
}

async function uploadFile() {
    const file = document.getElementById("fileInput").files[0];
    const statusEl = document.getElementById("uploadStatus");

    if (!file) {
        statusEl.innerText = "Please select a file first.";
        return;
    }

    statusEl.innerText = "Uploading...";

    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_BASE}/upload-file`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            statusEl.innerText = data.detail || "Upload failed.";
            return;
        }

        const analysis = data.analysis;

        document.getElementById("incomeCard").innerText = `Total Income: ${currency(analysis.total_income)}`;
        document.getElementById("expenseCard").innerText = `Total Expense: ${currency(analysis.total_expense)}`;
        document.getElementById("donationCard").innerText = `Total Donations: ${currency(analysis.total_donations)}`;
        document.getElementById("surplusCard").innerText = `Surplus: ${currency(analysis.surplus_or_deficit)}`;
        const riskLevel = analysis.risk_level || (analysis.surplus_or_deficit < 0 ? "High" : "Low");
        document.getElementById("riskCard").innerText = `Risk Level: ${riskLevel}`;
        document.getElementById("stabilityCard").innerText = `Stability Score: ${analysis.stability_score}`;

        // Render all dashboard charts
        renderDashboard(analysis);

        const summaryList = document.getElementById("summaryList");
        summaryList.innerHTML = "";
        (analysis.summary || []).forEach(item => {
            const li = document.createElement("li");
            li.innerText = item;
            summaryList.appendChild(li);
        });

        statusEl.innerText = "Analysis complete.";
    } catch (err) {
        statusEl.innerText = "Could not reach backend. Is it running?";
        console.error(err);
    }
}

// Dashboard rendering function
function renderDashboard(analysis) {
    const { total_income, total_expense, total_donations, surplus_or_deficit, stability_score, monthly_burn_rate } = analysis;
    
    // 1. Financial Overview (Bar Chart)
    drawFinancialOverview(total_income, total_expense, surplus_or_deficit);
    
    // 2. Donation Analysis (Doughnut Chart)
    drawDonationChart(total_donations, total_income);
    
    // 3. Expense Breakdown (Pie Chart)
    drawExpenseBreakdown(total_expense, monthly_burn_rate, total_donations);
    
    // 4. Financial Health Indicator (Horizontal Bar)
    drawHealthIndicator(stability_score, surplus_or_deficit);
}

function drawFinancialOverview(income, expense, surplus) {
    if (financialOverviewChart) financialOverviewChart.destroy();
    
    const ctx = document.getElementById('financialOverviewChart');
    if (!ctx) return;
    
    financialOverviewChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expense', 'Surplus/Deficit'],
            datasets: [{
                label: 'Amount (₹)',
                data: [income, expense, Math.abs(surplus)],
                backgroundColor: [
                    'rgba(63, 184, 255, 0.8)',
                    'rgba(248, 105, 107, 0.8)',
                    surplus >= 0 ? 'rgba(79, 209, 197, 0.8)' : 'rgba(246, 199, 110, 0.8)'
                ],
                borderColor: [
                    'rgba(63, 184, 255, 1)',
                    'rgba(248, 105, 107, 1)',
                    surplus >= 0 ? 'rgba(79, 209, 197, 1)' : 'rgba(246, 199, 110, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${currency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function drawDonationChart(donations, income) {
    if (donationChart) donationChart.destroy();
    
    const ctx = document.getElementById('donationChart');
    if (!ctx) return;
    
    const otherIncome = Math.max(income - donations, 0);
    const donationPercent = income > 0 ? ((donations / income) * 100).toFixed(1) : 0;
    
    donationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [`Donations (${donationPercent}%)`, 'Other Income'],
            datasets: [{
                data: [donations, otherIncome],
                backgroundColor: [
                    'rgba(79, 209, 197, 0.8)',
                    'rgba(126, 141, 241, 0.8)'
                ],
                borderColor: [
                    'rgba(79, 209, 197, 1)',
                    'rgba(126, 141, 241, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: { color: '#e0e0f0' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${currency(context.parsed)}`;
                        }
                    }
                }
            }
        }
    });
}

function drawExpenseBreakdown(totalExpense, burnRate, donations) {
    if (expenseBreakdownChart) expenseBreakdownChart.destroy();
    
    const ctx = document.getElementById('expenseBreakdownChart');
    if (!ctx) return;
    
    // Estimate categories based on available data
    const operational = burnRate || totalExpense * 0.5;
    const programCosts = totalExpense * 0.3;
    const administrative = totalExpense - operational - programCosts;
    
    expenseBreakdownChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Operational', 'Programs', 'Administrative'],
            datasets: [{
                data: [operational, programCosts, administrative],
                backgroundColor: [
                    'rgba(248, 105, 107, 0.8)',
                    'rgba(246, 199, 110, 0.8)',
                    'rgba(126, 141, 241, 0.8)'
                ],
                borderColor: [
                    'rgba(248, 105, 107, 1)',
                    'rgba(246, 199, 110, 1)',
                    'rgba(126, 141, 241, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: { color: '#e0e0f0' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = ((value / total) * 100).toFixed(1);
                            return `${label}: ${currency(value)} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
}

function drawHealthIndicator(stabilityScore, surplus) {
    if (healthIndicatorChart) healthIndicatorChart.destroy();
    
    const ctx = document.getElementById('healthIndicatorChart');
    if (!ctx) return;
    
    const score = stabilityScore || 0;
    const healthStatus = score >= 70 ? 'Healthy' : score >= 40 ? 'Moderate' : 'At Risk';
    const color = score >= 70 ? 'rgba(79, 209, 197, 0.8)' : score >= 40 ? 'rgba(246, 199, 110, 0.8)' : 'rgba(248, 105, 107, 0.8)';
    
    healthIndicatorChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Financial Health Score'],
            datasets: [{
                label: healthStatus,
                data: [score],
                backgroundColor: color,
                borderColor: color.replace('0.8', '1'),
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { 
                    display: true,
                    labels: { color: '#e0e0f0' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Score: ${context.parsed.x}/100`;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    min: 0, 
                    max: 100,
                    ticks: { color: '#e0e0f0' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: { 
                    ticks: { color: '#e0e0f0' },
                    grid: { display: false }
                }
            }
        }
    });
}

// Authentication functions
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.querySelectorAll('.tab-button')[0].classList.add('active');
    document.querySelectorAll('.tab-button')[1].classList.remove('active');
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.querySelectorAll('.tab-button')[0].classList.remove('active');
    document.querySelectorAll('.tab-button')[1].classList.add('active');
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const statusEl = document.getElementById('loginStatus');

    if (!email || !password) {
        statusEl.innerText = 'Please enter both email and password.';
        return;
    }

    if (password.length < 8) {
        statusEl.innerText = 'Password must be at least 8 characters long.';
        return;
    }

    statusEl.innerText = 'Logging in...';;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            statusEl.innerText = data.detail || 'Login failed.';
            return;
        }

        // Store user session for this tab only (clears on browser/tab close)
        sessionStorage.setItem('authenticated', 'true');
        sessionStorage.setItem('user_id', data.user_id);
        sessionStorage.setItem('email', data.email);
        
        // Show main content
        document.getElementById('authContainer').classList.add('hide');
        document.getElementById('mainContent').classList.add('show');
        statusEl.innerText = '';
    } catch (err) {
        statusEl.innerText = 'Could not reach backend. Is it running?';
        console.error(err);
    }
}

async function register() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const statusEl = document.getElementById('registerStatus');

    if (!email || !password || !confirmPassword) {
        statusEl.innerText = 'Please fill in all fields.';
        return;
    }

    if (password.length < 8) {
        statusEl.innerText = 'Password must be at least 8 characters long.';
        return;
    }

    if (password !== confirmPassword) {
        statusEl.innerText = 'Passwords do not match.';
        return;
    }

    statusEl.innerText = 'Registering...';

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            statusEl.innerText = data.detail || 'Registration failed.';
            return;
        }

        // Show success message and redirect to login
        statusEl.innerText = 'Registration successful! Redirecting to login...';
        
        // Clear registration form
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirmPassword').value = '';
        
        // Redirect to login tab after 2 seconds
        setTimeout(() => {
            showLogin();
            document.getElementById('loginEmail').focus();
        }, 2000);
    } catch (err) {
        statusEl.innerText = 'Could not reach backend. Is it running?';
        console.error(err);
    }
}

function logout() {
    // Clear both storages to ensure logout across flows
    sessionStorage.clear();
    localStorage.removeItem('authenticated');
    localStorage.removeItem('user_id');
    localStorage.removeItem('email');
    document.getElementById('authContainer').classList.remove('hide');
    document.getElementById('mainContent').classList.remove('show');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerConfirmPassword').value = '';
}

// Check authentication on page load (session-only)
window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('authenticated') === 'true') {
        document.getElementById('authContainer').classList.add('hide');
        document.getElementById('mainContent').classList.add('show');
    }
});

// Ensure session clears on tab/browser close
window.addEventListener('beforeunload', () => {
    try { sessionStorage.clear(); } catch {}
});