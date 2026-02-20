const addButton = document.getElementById("addButton");
const totalPointsDisplay = document.getElementById("totalPoints");
const projectionText = document.getElementById("projectionText");

const TARGET_POINTS = 10000;

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
    startDate: new Date().toISOString(),
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
  const start = new Date(data.startDate);
  const today = new Date();
  return Math.floor((today - start) / 86400000) + 1;
}

function getTotalPoints() {
  return data.dailyRecords.reduce((sum, r) => sum + r.points, 0);
}

function updateDisplay() {
  const total = getTotalPoints();
  totalPointsDisplay.textContent = `${total} / ${TARGET_POINTS}`;

  const days = getDaysPassed();
  const pace = total / days;
  const projected = Math.round(pace * 150);

  projectionText.innerHTML = `
  ${days} 日経過<br>
  このペースだと夏休みまでに ${projected} ポイントになります。
`;
  updateChart();
}

addButton.addEventListener("click", () => {

    let value;
  
    while (true) {
  
      const input = prompt("何ポイント投入しますか？（整数）");
  
      if (input === null) return; // キャンセルで終了
  
      value = Number(input);
  
      // 数値でない場合
      if (!Number.isFinite(value)) {
        alert("数値を入力してください");
        continue;
      }
  
      // 整数でない場合
      if (!Number.isInteger(value)) {
        alert("整数で入力してください");
        continue;
      }
  
      // 0は禁止（必要なら消してください）
      if (value === 0) {
        alert("0以外の整数を入力してください");
        continue;
      }
  
      break; // 条件を満たしたらループ脱出
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
  
  });
const ctx = document.getElementById("pointChart").getContext("2d");

let chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
        label: "累計ポイント推移",
        data: [],
        fill: false,
        tension: 0.2,
        borderWidth: 4,
        pointRadius: 3
      }]
  }
});

function updateChart() {
    const start = new Date(data.startDate);
    const today = new Date();
  
    const daysPassed = Math.floor((today - start) / 86400000) + 1;
  
    let cumulativeData = [];
    let labels = [];
    let cumulative = 0;
  
    for (let i = 0; i < daysPassed; i++) {
      const currentDate = new Date(start.getTime() + i * 86400000)
        .toISOString()
        .split("T")[0];
  
      const record = data.dailyRecords.find(r => r.date === currentDate);
  
      if (record) {
        cumulative += record.points;
      }
  
      cumulativeData.push(cumulative);
      labels.push(`Day ${i + 1}`);
    }
  
    if (viewMode === "15" && cumulativeData.length > 15) {
      cumulativeData = cumulativeData.slice(-15);
      labels = labels.slice(-15);
    }
  
    chart.data.labels = labels;
    chart.data.datasets[0].data = cumulativeData;
    // 累計割合
// 累計割合（0〜1）
const total = getTotalPoints();
const ratio = Math.min(total / TARGET_POINTS, 1);

// Hue を 0〜360 に変化させる
const hue = Math.floor(360 * ratio);

// 彩度と明度は固定
const dynamicColor = `hsl(${hue}, 80%, 50%)`;

chart.data.datasets[0].borderColor = dynamicColor;
chart.data.datasets[0].pointBackgroundColor = dynamicColor;
chart.data.datasets[0].backgroundColor = dynamicColor;
chart.data.datasets[0].pointBorderColor = dynamicColor;
    chart.update();
  }
const resetButton = document.getElementById("resetButton");

resetButton.addEventListener("click", () => {
  if (confirm("本当に消去しますか？")) {
    localStorage.removeItem("studyData");
    location.reload();
  }
});

updateDisplay();