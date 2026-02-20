const addButton = document.getElementById("addButton");
const totalPointsDisplay = document.getElementById("totalPoints");
const projectionText = document.getElementById("projectionText");

const TARGET_POINTS = 10000;
// ▼▼ 追加 ▼▼
const START_DATE = new Date(2026, 1, 21); // 2026/02/21（※月は0始まり）
const END_DATE = new Date(2026, 6, 19);   // 2026/07/19
// ▲▲ 追加 ▲▲
let viewMode = "all"; // "all" or "15"

const viewAllButton = document.getElementById("viewAll");
const view15Button = document.getElementById("view15");

viewAllButton.addEventListener("click", () => {
  viewMode = "all";
  updateChart();
});

view15Button.addEventListener("click", () => {
  viewMode = "15";
  updateChart();
});

let rawData = JSON.parse(localStorage.getItem("studyData"));

let data;

if (!rawData) {
  data = {
    startDate: START_DATE.toISOString(), // ←変更
    dailyRecords: []
  };
} else if (rawData.dailyRecords) {
  data = rawData;
} else if (rawData.dailyPoints) {
  // 旧データを変換
  data = {
    startDate: rawData.startDate,
    dailyRecords: rawData.dailyPoints.map((p, i) => ({
      date: new Date(
        new Date(rawData.startDate).getTime() + i * 86400000
      ).toISOString().split("T")[0],
      points: p
    }))
  };
} else {
  data = {
    startDate: new Date().toISOString(),
    dailyRecords: []
  };
}

function saveData() {
  localStorage.setItem("studyData", JSON.stringify(data));
}

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function getDaysPassed() {
  const today = new Date();
  const diff = Math.floor((today - START_DATE) / 86400000) + 1;
  return Math.max(diff, 0); // 開始前は0
}

function getTotalPoints() {
  return data.dailyRecords.reduce((sum, r) => sum + r.points, 0);
}

function updateDisplay() {
  const total = getTotalPoints();
  totalPointsDisplay.textContent = `${total} / ${TARGET_POINTS}`;

  const daysPassed = getDaysPassed();

  const totalPeriodDays =
    Math.floor((END_DATE - START_DATE) / 86400000) + 1;

  const pace = daysPassed > 0 ? total / daysPassed : 0;

  const projected = Math.round(pace * totalPeriodDays);

  projectionText.innerHTML = `
  ${daysPassed} 日経過<br>
  7/19までに ${projected} ポイントの予測です。
  `;

  updateChart();
}

const pointInput = document.getElementById("pointInput");

addButton.addEventListener("click", () => {
  const value = Number(pointInput.value);

  // バリデーション
  if (!Number.isFinite(value) || !Number.isInteger(value) || value === 0) {
    alert("1以上の整数を入力してください");
    return;
  }

  const today = getTodayString();
  const existing = data.dailyRecords.find(r => r.date === today);

  if (existing) {
    existing.points += value;
  } else {
    data.dailyRecords.push({ date: today, points: value });
  }

  saveData();
  updateDisplay();

  // 入力欄をクリア
  pointInput.value = "";
});
const ctx = document.getElementById("pointChart").getContext("2d");

const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "実績",
        data: [],
        borderWidth: 3,
        tension: 0.3,
        fill: false
      },
      {
        label: "予測",
        data: [],
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        borderDash: [6, 6]
      }
    ]
  },
  options: {
    responsive: true,

  interaction: {
    mode: 'nearest',
    intersect: false
  },

  events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],

    plugins: {
      legend: {
        labels: {
          generateLabels(chart) {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => ({
              text: dataset.label,
              fillStyle: dataset.borderColor,   // ← ここが重要
              strokeStyle: dataset.borderColor, // ← ここも重要
              lineWidth: 3,
              hidden: !chart.isDatasetVisible(i),
              index: i
            }));
          }
        }
      }
    }
  }
});
ctx.canvas.addEventListener('click', function (evt) {

  const points = chart.getElementsAtEventForMode(
    evt,
    'nearest',
    { intersect: false },
    true
  );

  if (points.length) {
    const firstPoint = points[0];

    chart.setActiveElements([{
      datasetIndex: firstPoint.datasetIndex,
      index: firstPoint.index
    }]);

    chart.tooltip.setActiveElements([{
      datasetIndex: firstPoint.datasetIndex,
      index: firstPoint.index
    }], {
      x: evt.x,
      y: evt.y
    });

    chart.update();
  }
});

function updateChart() {

  const daysPassed = getDaysPassed();

  const totalPeriodDays =
    Math.floor((END_DATE - START_DATE) / 86400000) + 1;

  let labels = [];
  let actualData = [];
  let predictedData = [];

  let cumulative = 0;

  const total = getTotalPoints();
  const pace = daysPassed > 0 ? total / daysPassed : 0;

  for (let i = 0; i < totalPeriodDays; i++) {

    const currentDate = new Date(
      START_DATE.getTime() + i * 86400000
    );

    const iso = currentDate.toISOString().split("T")[0];

    const label =
      (currentDate.getMonth() + 1) + "/" +
      currentDate.getDate();

    const record = data.dailyRecords.find(r => r.date === iso);

    if (record) {
      cumulative += record.points;
    }

    labels.push(label);

    if (i < daysPassed) {
      actualData.push(cumulative);
      predictedData.push(null);
    } else {
      actualData.push(null);
      predictedData.push(
        Math.round(total + pace * (i - daysPassed + 1))
      );
    }
  }

  // ▼▼ 直近表示の修正 ▼▼
  if (viewMode === "15") {

    const FUTURE_DAYS = 7; // ←未来を何日見せるか

    const startIndex = Math.max(daysPassed - 15, 0);
    const endIndex = Math.min(
      daysPassed + FUTURE_DAYS,
      totalPeriodDays
    );

    labels = labels.slice(startIndex, endIndex);
    actualData = actualData.slice(startIndex, endIndex);
    predictedData = predictedData.slice(startIndex, endIndex);
  }
  // ▲▲ 修正ここまで ▲▲

  chart.data.labels = labels;
  chart.data.datasets[0].data = actualData;
  chart.data.datasets[1].data = predictedData;

  const ratio = Math.min(total / TARGET_POINTS, 1);
  const hue = Math.floor(360 * ratio);
  const dynamicColor = `hsl(${hue}, 80%, 50%)`;

  chart.data.datasets[0].borderColor = dynamicColor;
  chart.data.datasets[0].pointBackgroundColor = dynamicColor;

  chart.data.datasets[1].borderColor = "rgba(0,0,0,0.3)";
  chart.data.datasets[1].borderDash = [6, 6];
// ▼▼ ここを追加 ▼▼

// viewMode が "15" のときだけ予測に点を表示
if (viewMode === "15") {
  chart.data.datasets[1].pointRadius = 3;
  chart.data.datasets[1].pointHoverRadius = 5;
} else {
  chart.data.datasets[1].pointRadius = 0;
  chart.data.datasets[1].pointHoverRadius = 0;
}

// ▲▲ 追加ここまで ▲▲
  chart.update();
}
const resetButton = document.getElementById("resetButton");

resetButton.addEventListener("click", () => {
  if (confirm("本当に消去しますか？")) {
    localStorage.removeItem("studyData");
    location.reload();
  }
});
// 追加
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

updateDisplay();