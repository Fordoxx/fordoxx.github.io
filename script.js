const ctx = document.getElementById('densityChart').getContext('2d');
let chart;

// Элементы управления
const sliders = {
    imbalance: document.getElementById('imbalance'),
    separation: document.getElementById('separation'),
    threshold: document.getElementById('threshold')
};

const labels = {
    imbalance: document.getElementById('label-imbalance'),
    separation: document.getElementById('label-separation'),
    threshold: document.getElementById('label-threshold')
};

// Функция нормального распределения (Гаусс)
function normalPDF(x, mu, sigma) {
    return Math.exp(-Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2))) / (sigma * Math.sqrt(2 * Math.PI));
}

function update() {
    const imbalance = sliders.imbalance.value / 100; // Доля класса 1
    const separation = sliders.separation.value / 10; // Расстояние между центрами
    const threshold = sliders.threshold.value / 100;
    
    // Обновляем текст ползунков
    labels.imbalance.innerText = `Дисбаланс классов: ${Math.round(imbalance * 100)}% (фрод)`;
    labels.separation.innerText = `Качество модели (Separation): ${separation.toFixed(2)}`;
    labels.threshold.innerText = `Порог отсечения (Threshold): ${threshold.toFixed(2)}`;

    const xValues = [];
    const dist0 = [];
    const dist1 = [];
    
    // Центры распределений
    const mu0 = 0.5 - separation/4;
    const mu1 = 0.5 + separation/4;
    const sigma = 0.15;

    let tp = 0, fp = 0, fn = 0, tn = 0;
    const samples = 1000;

    for (let i = 0; i <= 100; i++) {
        const x = i / 100;
        xValues.push(x);
        
        // Величины плотности, масштабированные на дисбаланс
        const p0 = normalPDF(x, mu0, sigma) * (1 - imbalance);
        const p1 = normalPDF(x, mu1, sigma) * imbalance;
        
        dist0.push(p0);
        dist1.push(p1);

        // Интегрируем для Confusion Matrix (упрощенно через площадь)
        if (x < threshold) {
            tn += p0;
            fn += p1;
        } else {
            fp += p0;
            tp += p1;
        }
    }

    // Нормализуем значения матрицы
    const total = tp + fp + fn + tn;
    const scale = 10000 / total; // Масштабируем до 10k транзакций для наглядности
    const vTP = Math.round(tp * scale);
    const vFP = Math.round(fp * scale);
    const vFN = Math.round(fn * scale);
    const vTN = Math.round(tn * scale);

    // Обновляем UI матрицы
    document.getElementById('val-tp').innerText = vTP;
    document.getElementById('val-fp').innerText = vFP;
    document.getElementById('val-tn').innerText = vTN;
    document.getElementById('val-fn').innerText = vFN;

    // Расчет метрик
    const acc = (vTP + vTN) / (vTP + vTN + vFP + vFN);
    const prec = vTP / (vTP + vFP) || 0;
    const rec = vTP / (vTP + vFN) || 0;
    const f1 = 2 * (prec * rec) / (prec + rec) || 0;

    document.getElementById('metric-acc').innerText = acc.toFixed(3);
    document.getElementById('metric-prec').innerText = prec.toFixed(3);
    document.getElementById('metric-rec').innerText = rec.toFixed(3);
    document.getElementById('metric-f1').innerText = f1.toFixed(3);

    updateChart(xValues, dist0, dist1, threshold);
}

function updateChart(xValues, d0, d1, threshold) {
    const data = {
        labels: xValues,
        datasets: [
            {
                label: 'Класс 0 (Норма)',
                data: d0,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Класс 1 (Фрод)',
                data: d1,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.2)',
                fill: true,
                tension: 0.4
            }
        ]
    };

    if (chart) {
        chart.data = data;
        chart.options.plugins.annotation.annotations.line1.value = threshold;
        chart.update('none');
    } else {
        chart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                elements: { point: { radius: 0 } },
                scales: {
                    y: { display: false },
                    x: { title: { display: true, text: 'Вероятность модели' } }
                },
                plugins: {
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                xMin: threshold,
                                xMax: threshold,
                                borderColor: 'black',
                                borderWidth: 2,
                                label: { content: 'Порог', enabled: true, position: 'top' }
                            }
                        }
                    }
                }
            },
            plugins: [{
                // Плагин для вертикальной линии порога без сторонних либ
                afterDraw: chart => {
                    const ctx = chart.ctx;
                    const xAxis = chart.scales.x;
                    const yAxis = chart.scales.y;
                    const x = xAxis.getPixelForValue(threshold * 100);
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, yAxis.top);
                    ctx.lineTo(x, yAxis.bottom);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#333';
                    ctx.setLineDash([5, 5]);
                    ctx.stroke();
                    ctx.restore();
                }
            }]
        });
    }
}

// Слушатели событий
sliders.imbalance.oninput = update;
sliders.separation.oninput = update;
sliders.threshold.oninput = update;

// Инициализация
update();
