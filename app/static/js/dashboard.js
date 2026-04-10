var ventasChart = null;

async function loadDashboard() {
    var today = new Date();
    var options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dashboard-date').textContent =
        'Resumen de hoy, ' + today.toLocaleDateString('es-MX', options);

    await Promise.all([
        loadResumen(),
        loadStockBajo(),
        loadUltimasVentas(),
        loadVentasSemana(),
        loadClima()
    ]);
}

async function loadResumen() {
    try {
        var res = await apiFetch('/api/ventas/resumen');
        if (!res) return;
        var data = await res.json();

        document.getElementById('metric-ventas').textContent = data.num_ventas;
        document.getElementById('metric-total').textContent = formatMoney(data.total_dia);

        var totalProductos = 0;
        if (data.top_productos) {
            data.top_productos.forEach(function(p) {
                totalProductos += p.vendidos;
            });
        }
        document.getElementById('metric-productos').textContent = totalProductos;

        renderTopProductos(data.top_productos || []);
    } catch (err) {
        console.error('Error cargando resumen:', err);
    }
}

async function loadStockBajo() {
    try {
        var res = await apiFetch('/api/productos/stock-bajo');
        if (!res) return;
        var data = await res.json();
        document.getElementById('metric-stock').textContent = data.total;
    } catch (err) {
        console.error('Error cargando stock bajo:', err);
    }
}

async function loadUltimasVentas() {
    try {
        var res = await apiFetch('/api/ventas?limite=10');
        if (!res) return;
        var data = await res.json();

        var tbody = document.getElementById('tabla-ventas');

        if (!data.ventas || data.ventas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--vs-gray)">No hay ventas registradas</td></tr>';
            return;
        }

        var html = '';
        data.ventas.forEach(function(v) {
            var fecha = new Date(v.fecha);
            var fechaStr = fecha.toLocaleDateString('es-MX') + ' ' +
                          fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

            var badgeClass = v.metodo_pago === 'tarjeta' ? 'badge-tarjeta' : 'badge-efectivo';

            html += '<tr>' +
                '<td>#' + String(v.id).padStart(3, '0') + '</td>' +
                '<td>' + (v.cajero || 'N/A') + '</td>' +
                '<td>' + formatMoney(v.total) + '</td>' +
                '<td class="hide-mobile"><span class="badge-vs ' + badgeClass + '">' + v.metodo_pago + '</span></td>' +
                '<td class="hide-mobile" style="font-size:12px;color:var(--vs-gray)">' + fechaStr + '</td>' +
                '</tr>';
        });

        tbody.innerHTML = html;
    } catch (err) {
        console.error('Error cargando ventas:', err);
    }
}

function renderTopProductos(productos) {
    var container = document.getElementById('top-productos');

    if (!productos || productos.length === 0) {
        container.innerHTML = '<p style="font-size:13px;color:var(--vs-gray)">Sin ventas hoy</p>';
        return;
    }

    var maxVendido = productos[0].vendidos;
    var html = '';

    productos.forEach(function(p) {
        var porcentaje = Math.round((p.vendidos / maxVendido) * 100);
        html += '<div style="margin-bottom:12px">' +
            '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">' +
            '<span style="color:var(--vs-navy)">' + p.nombre + '</span>' +
            '<span style="color:var(--vs-gray)">' + p.vendidos + '</span>' +
            '</div>' +
            '<div class="progress-vs">' +
            '<div class="progress-vs-bar" style="width:' + porcentaje + '%;background:' +
            (porcentaje > 70 ? 'var(--vs-navy)' : 'var(--vs-lavender)') + '"></div>' +
            '</div></div>';
    });

    container.innerHTML = html;
}

async function loadVentasSemana() {
    try {
        var res = await apiFetch('/api/ventas?limite=100');
        if (!res) return;
        var data = await res.json();

        var labels = [];
        var valores = [];
        var dias = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        var hoy = new Date();

        var ventasPorDia = {};
        var keysOrden = [];

        for (var i = 6; i >= 0; i--) {
            var fecha = new Date(hoy);
            fecha.setDate(hoy.getDate() - i);
            var key = fecha.getFullYear() + '-' +
                String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
                String(fecha.getDate()).padStart(2, '0');
            labels.push(i === 0 ? 'Hoy' : dias[fecha.getDay()]);
            ventasPorDia[key] = 0;
            keysOrden.push(key);
        }

        if (data.ventas) {
            data.ventas.forEach(function(v) {
                var partes = v.fecha.split('T')[0];
                if (ventasPorDia.hasOwnProperty(partes)) {
                    ventasPorDia[partes] += v.total;
                }
            });
        }

        keysOrden.forEach(function(k) {
            valores.push(Math.round(ventasPorDia[k] * 100) / 100);
        });

        renderChart(labels, valores);
    } catch (err) {
        console.error('Error cargando ventas semana:', err);
    }
}

function renderChart(labels, valores) {
    var ctx = document.getElementById('chart-ventas').getContext('2d');

    if (ventasChart) {
        ventasChart.destroy();
    }

    ventasChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas ($)',
                data: valores,
                backgroundColor: valores.map(function(v, i) {
                    return i === valores.length - 1 ? '#2E3A5C' : '#DDD5F3';
                }),
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f3f4f6' },
                    ticks: {
                        font: { size: 11 },
                        color: '#9ca3af',
                        callback: function(value) { return '$' + value.toLocaleString(); }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 11 },
                        color: '#9ca3af'
                    }
                }
            }
        }
    });
}

async function loadClima() {
    try {
        var res = await apiFetch('/api/weather/Dolores Hidalgo');
        if (!res) return;
        var data = await res.json();

        if (data.temperatura !== undefined) {
            document.getElementById('clima-icono').src = data.icono_url;
            document.getElementById('clima-temp').textContent = data.temperatura;
            document.getElementById('clima-desc').textContent = data.descripcion;
            document.getElementById('clima-ciudad').textContent = data.ciudad;
            document.getElementById('widget-clima').style.display = 'flex';
        }
    } catch (err) {
        console.error('Error cargando clima:', err);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
});