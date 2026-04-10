const valueLabelsPlugin = {
    id: 'valueLabelsPlugin',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        ctx.font = '10px Inter, sans-serif';

        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;
            
            const firstPoint = meta.data[0];
            if (!firstPoint) return;
            
            const value = dataset.data[0].x;
            ctx.fillStyle = dataset.borderColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = i % 2 === 0 ? 'bottom' : 'top';
            ctx.fillText(`${value.toFixed(1)}`, firstPoint.x + 5, firstPoint.y);
        });
        ctx.restore();
    }
};

function getCommonPressureChartOptions(title, z_min, z_max) {
    const z_mid = (z_min + z_max) / 2;
    const isKeyLevel = (val) => Math.abs(val - z_min) < 1e-4 || Math.abs(val - z_max) < 1e-4 || Math.abs(val - z_mid) < 1e-4;

    return { 
        responsive: true, maintainAspectRatio: false, indexAxis: 'y', 
        plugins: { 
            title: { display: true, text: title }, 
            legend: { position: 'bottom' },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.parsed.x.toFixed(2)} kN/m² (Z=${context.parsed.y.toFixed(2)}m)`
                }
            }
        }, 
        scales: { 
            x: { title: { display: true, text: 'Pressure [kN/m²]' }, beginAtZero: true }, 
            y: { 
                type: 'linear', title: { display: true, text: 'Depth Z [m]' }, reverse: true, min: z_min, max: z_max,
                afterBuildTicks: axis => {
                    const targets = [z_min, z_mid, z_max];
                    targets.forEach(target => {
                        if (!axis.ticks.some(t => Math.abs(t.value - target) < 1e-4)) axis.ticks.push({ value: target });
                    });
                    axis.ticks.sort((a, b) => a.value - b.value);
                },
                ticks: { 
                    stepSize: 0.5, autoSkip: false,
                    callback: (value) => isKeyLevel(value) ? value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : value.toFixed(1),
                    color: (context) => (context.tick && isKeyLevel(context.tick.value)) ? '#000' : '#666',
                    font: (context) => (context.tick && isKeyLevel(context.tick.value)) ? { weight: 'bold' } : {}
                },
                grid: {
                    color: (context) => (context.tick && isKeyLevel(context.tick.value)) ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
                    lineWidth: (context) => (context.tick && isKeyLevel(context.tick.value)) ? 2 : 1
                }
            } 
        } 
    };
}

export function renderEreChart(ctx, chartInstance, data, E_max_re, thetaCrit) {
    if (chartInstance) chartInstance.destroy();
    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Ere(\u03D1) [kN]',
                data: data,
                borderColor: 'rgb(59 130 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3, pointRadius: 0, tension: 0.4, fill: true
            },
            {
                label: `Emax,re (${thetaCrit.toFixed(1)}° deg)`,
                data: [{ x: thetaCrit, y: E_max_re }],
                borderColor: 'rgb(239 68 68)',
                backgroundColor: 'rgb(239 68 68)',
                borderWidth: 1, pointRadius: 6, showLine: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { 
                title: { display: true, text: 'Earth Force E\u209a\u2090(\u03D1) vs. Sliding Angle \u03D1' }, 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kN (\u03D1=${context.parsed.x.toFixed(1)}°)`
                    }
                }
            },
            scales: {
                x: { 
                    type: 'linear',
                    title: { display: true, text: 'Sliding Angle \u03D1 [deg]', color: '#4b5563' }, 
                    min: 0, max: 90,
                    ticks: { stepSize: 5 }
                },
                y: { title: { display: true, text: 'Support Force E\u209a\u2090 [kN]', color: '#4b5563' }, beginAtZero: true }
            }
        }
    });
}

function renderGenericPressureChart(ctx, chartInstance, chartData, title) {
    const { depths } = chartData;
    if (!depths || depths.length === 0) return chartInstance;
    const z_min = depths[0];
    const z_max = depths[depths.length - 1];

    if (chartInstance) chartInstance.destroy();
    
    let datasets;

    // Check for the keys specific to Full/Partial Lowering scenarios
    if (chartData.p_support_op) {
        datasets = [
            {
                label: 'Provided Support (Operational)',
                data: chartData.p_support_op.map((p, i) => ({ x: p, y: depths[i] })),
                borderColor: 'rgb(249 115 22)', borderWidth: 3, pointRadius: 0, tension: 0.1,
            },
            {
                label: 'Provided Support (Min)',
                data: chartData.p_support_min.map((p, i) => ({ x: p, y: depths[i] })),
                borderColor: 'rgba(249, 115, 22, 0.5)', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0.1,
            },
            {
                label: 'Water Pressure (Unfactored)',
                data: chartData.p_water_unfactored.map((p, i) => ({ x: p, y: depths[i] })),
                borderColor: 'rgb(59 130 246)', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0.1,
            },
            {
                label: `Earth Pressure (Unfactored)`,
                data: chartData.p_earth_unfactored.map((p, i) => ({ x: p, y: depths[i] })),
                borderColor: 'rgb(139 69 19)', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0.1,
            }
        ];
    } 
    // Otherwise, assume No Lowering scenario keys
    else {
        datasets = [
            {
                label: 'Provided Support (Operational)',
                data: chartData.pressures_S_adv_min.map((p, i) => ({ x: p, y: depths[i] })),
                borderColor: 'rgb(249 115 22)', borderWidth: 3, pointRadius: 0, tension: 0.1,
            },
            {
                label: 'Provided Support (Min)',
                data: chartData.pressures_S_min.map((p, i) => ({ x: p, y: depths[i] })),
                borderColor: 'rgba(249, 115, 22, 0.5)', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0.1,
            },
            {
                label: 'Water Pressure (Unfactored)',
                data: chartData.pressures_W.map((p, i) => ({ x: p, y: depths[i] })),
                borderColor: 'rgb(59 130 246)', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0.1,
            },
            {
                label: `Earth Pressure (Unfactored)`,
                data: chartData.pressures_E_avg.map((p, i) => ({ x: p, y: depths[i] })),
                borderColor: 'rgb(139 69 19)', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0.1,
            }
        ];
    }

    return new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: getCommonPressureChartOptions(title, z_min, z_max),
        plugins: [valueLabelsPlugin]
    });
}

export function renderPressureChart(ctx, chartInstance, pressureResults) {
    return renderGenericPressureChart(ctx, chartInstance, pressureResults, 'Horizontal Pressure Distribution');
}

export function renderPressureChartFullLowering(ctx, chartInstance, results) {
    return renderGenericPressureChart(ctx, chartInstance, results, 'Horizontal Pressure Distribution (Full Lowering)');
}

export function renderPressureChartPartialLowering(ctx, chartInstance, results) {
    return renderGenericPressureChart(ctx, chartInstance, results, 'Horizontal Pressure Distribution (Partial Lowering)');
}