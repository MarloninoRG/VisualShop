async function cargarVentas() {
    try {
        var fecha = document.getElementById('filtro-fecha').value;
        var url = '/api/ventas';

        if (fecha) {
            url += '?fecha=' + fecha;
        }

        var res = await apiFetch(url);
        if (!res) return;
        var data = await res.json();

        document.getElementById('ventas-total-count').textContent = data.total;

        var totalMonto = 0;
        if (data.ventas) {
            data.ventas.forEach(function(v) { totalMonto += v.total; });
        }
        document.getElementById('ventas-total-monto').textContent = formatMoney(totalMonto);

        renderTablaVentas(data.ventas || []);
    } catch (err) {
        console.error('Error cargando ventas:', err);
    }
}

function limpiarFiltro() {
    document.getElementById('filtro-fecha').value = '';
    cargarVentas();
}

function renderTablaVentas(ventas) {
    var tbody = document.getElementById('tabla-historial-ventas');

    if (!ventas || ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--vs-gray);padding:30px">No hay ventas registradas</td></tr>';
        return;
    }

    var html = '';
    ventas.forEach(function(v) {
        var fecha = new Date(v.fecha);
        var fechaStr = fecha.toLocaleDateString('es-MX') + ' ' +
            fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

        var badgeClass = v.metodo_pago === 'tarjeta' ? 'badge-tarjeta' : 'badge-efectivo';
        var numProductos = v.detalles ? v.detalles.length : 0;

        html += '<tr>' +
            '<td style="font-weight:500">#' + String(v.id).padStart(3, '0') + '</td>' +
            '<td>' + (v.cajero || 'N/A') + '</td>' +
            '<td>' + numProductos + ' item' + (numProductos > 1 ? 's' : '') + '</td>' +
            '<td style="font-weight:500">' + formatMoney(v.total) + '</td>' +
            '<td><span class="badge-vs ' + badgeClass + '">' + v.metodo_pago + '</span></td>' +
            '<td style="font-size:12px;color:var(--vs-gray)">' + fechaStr + '</td>' +
            '<td><button class="btn btn-sm" style="border:1px solid #e5e7eb;border-radius:6px;font-size:11px;color:var(--vs-navy)" onclick="verDetalleVenta(' + v.id + ')"><i class="bi bi-eye"></i></button></td>' +
            '</tr>';
    });

    tbody.innerHTML = html;
}

async function verDetalleVenta(id) {
    try {
        var res = await apiFetch('/api/ventas/' + id);
        if (!res) return;
        var venta = await res.json();

        var fecha = new Date(venta.fecha);
        var fechaStr = fecha.toLocaleDateString('es-MX') + ' ' +
            fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

        var html = '<div style="margin-bottom:16px">' +
            '<div class="d-flex justify-content-between mb-1">' +
            '<span style="font-size:13px;color:var(--vs-gray)">Ticket</span>' +
            '<span style="font-size:13px;font-weight:500;color:var(--vs-navy)">#' + String(venta.id).padStart(3, '0') + '</span></div>' +
            '<div class="d-flex justify-content-between mb-1">' +
            '<span style="font-size:13px;color:var(--vs-gray)">Cajero</span>' +
            '<span style="font-size:13px;color:var(--vs-navy)">' + (venta.cajero || 'N/A') + '</span></div>' +
            '<div class="d-flex justify-content-between mb-1">' +
            '<span style="font-size:13px;color:var(--vs-gray)">Fecha</span>' +
            '<span style="font-size:13px;color:var(--vs-navy)">' + fechaStr + '</span></div>' +
            '<div class="d-flex justify-content-between">' +
            '<span style="font-size:13px;color:var(--vs-gray)">Metodo</span>' +
            '<span class="badge-vs ' + (venta.metodo_pago === 'tarjeta' ? 'badge-tarjeta' : 'badge-efectivo') + '">' + venta.metodo_pago + '</span></div>' +
            '</div>';

        html += '<div style="border-top:1px solid #e5e7eb;padding-top:12px">';

        if (venta.detalles) {
            venta.detalles.forEach(function(d) {
                html += '<div class="d-flex justify-content-between align-items-center" style="padding:6px 0">' +
                    '<div><span style="font-size:13px;color:var(--vs-navy)">' + d.producto + '</span>' +
                    '<br><span style="font-size:11px;color:var(--vs-gray)">' + d.cantidad + ' x ' + formatMoney(d.precio_unitario) + '</span></div>' +
                    '<span style="font-size:13px;font-weight:500;color:var(--vs-navy)">' + formatMoney(d.subtotal) + '</span></div>';
            });
        }

        html += '</div>' +
            '<div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:8px;display:flex;justify-content:space-between">' +
            '<span style="font-size:16px;font-weight:500;color:var(--vs-navy)">Total</span>' +
            '<span style="font-size:18px;font-weight:500;color:var(--vs-navy)">' + formatMoney(venta.total) + '</span></div>';

        document.getElementById('detalle-venta-body').innerHTML = html;

        var modal = new bootstrap.Modal(document.getElementById('modal-detalle-venta'));
        modal.show();
    } catch (err) {
        alert('Error al cargar detalle');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    cargarVentas();
});