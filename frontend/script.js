const API_BASE = "http://127.0.0.1:8011"; // Backend port

let incomeExpenseChart;
let donationPieChart;

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

        drawIncomeExpenseChart(analysis.total_income, analysis.total_expense);
        drawDonationPieChart(analysis.total_donations, analysis.total_income);

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

function drawIncomeExpenseChart(income, expense) {
    if (incomeExpenseChart) incomeExpenseChart.destroy();

    const ctx = document.getElementById("incomeExpenseChart");
    incomeExpenseChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Income", "Expense"],
            datasets: [{
                label: "Amount (₹)",
                data: [income, expense],
                backgroundColor: ["#3fb8ff", "#f8696b"],
                borderRadius: 8
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function drawDonationPieChart(donations, income) {
    if (donationPieChart) donationPieChart.destroy();

    const ctx = document.getElementById("donationPieChart");
    donationPieChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Donations", "Other Income"],
            datasets: [{
                data: [donations, Math.max(income - donations, 0)],
                backgroundColor: ["#4fd1c5", "#7e8df1"],
                borderWidth: 0
            }]
        },
        options: { plugins: { legend: { position: "bottom" } } }
    });
}

// Auth functions
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

function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const statusEl = document.getElementById('loginStatus');

    if (!email || !password) {
        statusEl.innerText = 'Please fill in all fields.';
        return;
    }

    // Simple client-side check (for demo purposes)
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        localStorage.setItem('loggedInUser', email);
        showMainContent();
        statusEl.innerText = '';
    } else {
        statusEl.innerText = 'Invalid email or password.';
    }
}

function register() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const statusEl = document.getElementById('registerStatus');

    if (!email || !password || !confirmPassword) {
        statusEl.innerText = 'Please fill in all fields.';
        return;
    }

    if (password !== confirmPassword) {
        statusEl.innerText = 'Passwords do not match.';
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.find(u => u.email === email)) {
        statusEl.innerText = 'Email already registered.';
        return;
    }

    users.push({ email, password });
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('loggedInUser', email);
    showMainContent();
    statusEl.innerText = '';
}

function showMainContent() {
    document.getElementById('authContainer').classList.add('hide');
    document.getElementById('mainContent').classList.add('show');
    document.body.classList.add('logged-in');
}

function logout() {
    localStorage.removeItem('loggedInUser');
    location.reload();
}

// Check if user is logged in on page load
window.onload = function() {
    if (localStorage.getItem('loggedInUser')) {
        showMainContent();
    }
};
