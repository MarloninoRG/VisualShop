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
            '<td class="hide-mobile">' + numProductos + ' item' + (numProductos > 1 ? 's' : '') + '</td>' +
            '<td style="font-weight:500">' + formatMoney(v.total) + '</td>' +
            '<td class="hide-mobile"><span class="badge-vs ' + badgeClass + '">' + v.metodo_pago + '</span></td>' +
            '<td class="hide-mobile" style="font-size:12px;color:var(--vs-gray)">' + fechaStr + '</td>' +
            '<td><button class="btn btn-sm" style="border:1px solid #e5e7eb;border-radius:6px;font-size:11px;color:var(--vs-navy);margin-right:4px" onclick="verDetalleVenta(' + v.id + ')" title="Ver detalle"><i class="bi bi-eye"></i></button>' +
            '<button class="btn btn-sm" style="border:1px solid #e5e7eb;border-radius:6px;font-size:11px;color:var(--vs-navy);margin-right:4px" onclick="descargarTicket(' + v.id + ')" title="Descargar ticket"><i class="bi bi-download"></i></button>' +
            '<button class="btn btn-sm" style="border:1px solid #e5e7eb;border-radius:6px;font-size:11px;color:var(--vs-navy)" onclick="facturarVenta(' + v.id + ')" title="Facturar"><i class="bi bi-receipt"></i></button></td>' +
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

async function descargarTicket(id) {
    try {
        var res = await apiFetch('/api/ventas/' + id);
        if (!res) return;
        var v = await res.json();

        var jsPDF = window.jspdf.jsPDF;
        var doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 200]
        });

        var y = 10;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('VisualShop', 40, y, { align: 'center' });
        y += 5;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Sistema de Punto de Venta', 40, y, { align: 'center' });
        y += 4;
        doc.text('Dolores Hidalgo, Gto.', 40, y, { align: 'center' });
        y += 6;

        doc.setDrawColor(200);
        doc.line(5, y, 75, y);
        y += 5;

        doc.setFontSize(8);
        doc.text('Ticket: #' + String(v.id).padStart(3, '0'), 5, y);
        y += 4;

        var fecha = new Date(v.fecha);
        var fechaStr = fecha.toLocaleDateString('es-MX') + ' ' +
            fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        doc.text('Fecha: ' + fechaStr, 5, y);
        y += 4;
        doc.text('Cajero: ' + (v.cajero || 'N/A'), 5, y);
        y += 4;
        doc.text('Metodo: ' + v.metodo_pago, 5, y);
        y += 5;

        doc.line(5, y, 75, y);
        y += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('Producto', 5, y);
        doc.text('Cant', 45, y);
        doc.text('Subtotal', 75, y, { align: 'right' });
        y += 4;

        doc.setFont('helvetica', 'normal');

        if (v.detalles) {
            v.detalles.forEach(function(d) {
                doc.text(d.producto.substring(0, 22), 5, y);
                doc.text(String(d.cantidad), 48, y);
                doc.text('$' + d.subtotal.toFixed(2), 75, y, { align: 'right' });
                y += 4;
                doc.setFontSize(7);
                doc.text('  $' + d.precio_unitario.toFixed(2) + ' c/u', 5, y);
                doc.setFontSize(8);
                y += 4;
            });
        }

        y += 1;
        doc.line(5, y, 75, y);
        y += 5;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', 5, y);
        doc.text('$' + v.total.toFixed(2), 75, y, { align: 'right' });
        y += 8;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Gracias por su compra!', 40, y, { align: 'center' });
        y += 3;
        doc.text('VisualShop - UTNG 2026', 40, y, { align: 'center' });

        doc.save('ticket_' + String(v.id).padStart(3, '0') + '.pdf');
    } catch (err) {
        alert('Error al generar ticket');
    }
}

async function facturarVenta(ventaId) {
    var nombre = prompt('Nombre o razon social del cliente:\n(Dejar vacio para Publico en General)');
    if (nombre === null) return;

    var rfc = '';
    var email = '';

    if (nombre) {
        rfc = prompt('RFC del cliente:');
        if (rfc === null) return;

        email = prompt('Email del cliente (para enviar la factura):');
        if (email === null) return;
    }

    var datos = {
        venta_id: ventaId,
        cliente: {}
    };

    if (nombre) {
        datos.cliente = {
            legal_name: nombre,
            tax_id: rfc || 'XAXX010101000',
            email: email || ''
        };
    }

    try {
        var btn = event.target.closest('button');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        var res = await apiFetch('/api/facturas/crear', {
            method: 'POST',
            body: JSON.stringify(datos)
        });

        var data = await res.json();

        if (!res.ok) {
            alert('Error: ' + (data.error || 'No se pudo crear la factura') + '\n' + (data.detalle || ''));
            return;
        }

        var mensaje = 'Factura creada exitosamente!\n\n' +
            'UUID: ' + (data.factura.uuid || 'Sandbox') + '\n' +
            'Total: $' + data.factura.total + '\n\n' +
            'Deseas descargar el PDF?';

        if (confirm(mensaje)) {
            window.open('/api/facturas/descargar/' + data.factura.id + '/pdf', '_blank');
        }

    } catch (err) {
        alert('Error de conexion al facturar');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-receipt"></i>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    cargarVentas();
});