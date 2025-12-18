define(['core/chartjs'], function(Chart) {
    // Paleta de colores SAVIO UTB
    const colorPalette = {
        mbti: [
            '#005B9A', '#FF8200', '#FFB600', '#00B5E2',
            '#78BE20', '#2C5234', '#652C8F', '#91268F',
            '#D0006F', '#AA182C', '#8B0304', '#E35205',
            '#385CAD', '#0077C8', '#00263A', '#00A9B7'
        ],
        introversion: ['#005B9A', '#FF8200'],
        sensacion: ['#00B5E2', '#FFB600'],
        pensamiento: ['#78BE20', '#652C8F'],
        juicio: ['#AA182C', '#0077C8']
    };

    // Configuración común para todas las gráficas
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
            duration: 1000,
            easing: 'easeOutQuart'
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    boxWidth: 15,
                    padding: 10,
                    font: {
                        size: 11
                    }
                }
            },
            title: {
                display: true,
                font: {
                    size: 14,
                    weight: '500'
                },
                padding: {
                    top: 5,
                    bottom: 15
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 43, 73, 0.8)',
                titleFont: {
                    size: 12
                },
                bodyFont: {
                    size: 12
                },
                padding: 8,
                cornerRadius: 4
            }
        }
    };

    // Helper: safe-parse mbti data if it's a JSON string
    function parseIfNeeded(data) {
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error('Error parsing data:', e);
                return {};
            }
        }
        return data || {};
    }

    // Crear gráfico pie MBTI (función reutilizable fuera de init para evitar nesting)
    function createMBTIChartFromData(elementId, mbtiDataRaw, strings) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const ctx = el.getContext('2d');

        const mbtiData = parseIfNeeded(mbtiDataRaw);
        const mbtiLabels = [];
        const mbtiValues = [];
        const mbtiColors = [];
        let colorIndex = 0;

        Object.keys(mbtiData || {}).forEach(key => {
            if (mbtiData[key] > 0) {
                mbtiLabels.push(key);
                mbtiValues.push(mbtiData[key]);
                mbtiColors.push(colorPalette.mbti[colorIndex % colorPalette.mbti.length]);
                colorIndex++;
            }
        });

        if (mbtiLabels.length === 0) {
            el.parentNode.innerHTML =
                '<div class="alert alert-info text-center" style="margin-top: 20px;">' +
                strings.sin_datos_estudiantes + '</div>';
            return;
        }

        // Merge common options with specific pie config (shallow merge is fine for our needs here)
        const options = Object.assign({}, commonOptions, {
            plugins: Object.assign({}, commonOptions.plugins, {
                title: Object.assign({}, commonOptions.plugins.title, {
                    display: true,
                    text: strings.titulo_distribucion_mbti
                }),
                legend: Object.assign({}, commonOptions.plugins.legend, {
                    position: 'top'
                }),
                tooltip: Object.assign({}, commonOptions.plugins.tooltip, {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) {
                                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((context.parsed / total) * 100);
                                label += context.parsed + ' (' + percentage + '%)';
                            }
                            return label;
                        }
                    }
                })
            })
        });

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: mbtiLabels,
                datasets: [{
                    data: mbtiValues,
                    backgroundColor: mbtiColors,
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    hoverOffset: 4
                }]
            },
            options: options
        });
    }

    // Crear gráfico de barras reutilizable
    function createBarChartFromData(elementId, title, labels, data, colors, strings) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const ctx = el.getContext('2d');

        if (!data || !data.length || data.every(v => v === 0)) {
            el.parentNode.innerHTML =
                '<div class="alert alert-info text-center" style="margin-top: 10px;">' +
                strings.sin_datos_estudiantes + '</div>';
            return;
        }

        const maxValue = Math.max(...data);
        const yMax = Math.ceil(maxValue * 1.1);

        const options = Object.assign({}, commonOptions, {
            indexAxis: 'x',
            scales: {
                y: Object.assign({}, commonOptions.scales && commonOptions.scales.y, {
                    beginAtZero: true,
                    max: yMax,
                    ticks: {
                        stepSize: 1,
                        precision: 0,
                        font: { size: 11 }
                    },
                    grid: { color: 'rgba(0, 43, 73, 0.05)', drawBorder: false }
                }),
                x: { grid: { display: false, drawBorder: false }, ticks: { font: { size: 11 } } }
            },
            plugins: Object.assign({}, commonOptions.plugins, {
                title: Object.assign({}, commonOptions.plugins.title, { display: true, text: title }),
                legend: { display: false },
                tooltip: Object.assign({}, commonOptions.plugins.tooltip, {
                    callbacks: {
                        label: function(context) {
                            return strings.num_estudiantes_header + ': ' + (context.parsed && context.parsed.y !== undefined ? context.parsed.y : context.parsed);
                        }
                    }
                })
            })
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: strings.num_estudiantes_header,
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 0,
                    borderRadius: 2,
                    barPercentage: 0.8,
                    categoryPercentage: 0.9
                }]
            },
            options: options
        });
    }

    return {
        init: function(mbtiData, aspectData, strings) {
            // Crear todas las gráficas usando las funciones externas y un arreglo de configuración para evitar nesting
            createMBTIChartFromData('mbtiChart', mbtiData, strings);

            // Respetar posibles claves con/sin acentos en aspectData
            const getAspect = (keyVariants, fallback = 0) => {
                for (let k of keyVariants) {
                    if (aspectData && (aspectData[k] !== undefined)) return aspectData[k] || 0;
                }
                return fallback;
            };

            const barCharts = [
                {
                    id: 'generalTrendChart',
                    title: strings.introversion_extroversion,
                    labels: [strings.Introvertido, strings.Extrovertido],
                    data: [getAspect(['Introvertido','Introversion']), getAspect(['Extrovertido','Extroversion'])],
                    colors: colorPalette.introversion
                },
                {
                    id: 'infoProcessingChart',
                    title: strings.sensacion_intuicion,
                    labels: [strings.Sensing, strings.Intuicion],
                    data: [getAspect(['Sensing','Sensacion']), getAspect(['Intuición','Intuicion','Intuicion'])],
                    colors: colorPalette.sensacion
                },
                {
                    id: 'decisionMakingChart',
                    title: strings.pensamiento_sentimiento,
                    labels: [strings.Pensamiento, strings.Sentimiento],
                    data: [getAspect(['Pensamiento']), getAspect(['Sentimiento'])],
                    colors: colorPalette.pensamiento
                },
                {
                    id: 'organizationChart',
                    title: strings.juicio_percepcion,
                    labels: [strings.Juicio, strings.Percepcion],
                    data: [getAspect(['Juicio']), getAspect(['Percepción','Percepcion'])],
                    colors: colorPalette.juicio
                }
            ];

            barCharts.forEach(cfg => createBarChartFromData(cfg.id, cfg.title, cfg.labels, cfg.data, cfg.colors, strings));
        }
    };
});