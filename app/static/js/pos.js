var todosProductos = [];
var carrito = [];
var metodoPago = 'efectivo';
var tasaUSD = null;
var ultimaVenta = null;

async function cargarProductos() {
    try {
        var res = await apiFetch('/api/productos');
        if (!res) return;
        var data = await res.json();
        todosProductos = data;
        renderProductos(todosProductos);
        cargarCategorias();
    } catch (err) {
        console.error('Error cargando productos:', err);
    }
}

function cargarCategorias() {
    var container = document.getElementById('categorias-filtro');
    var categorias = [];

    todosProductos.forEach(function(p) {
        if (p.categoria && categorias.indexOf(p.categoria.nombre) === -1) {
            categorias.push(p.categoria.nombre);
        }
    });

    var html = '<button class="btn btn-sm filtro-cat active" data-cat="todas" onclick="filtrarCategoria(\'todas\', this)">Todas</button>';
    categorias.forEach(function(cat) {
        html += '<button class="btn btn-sm filtro-cat" data-cat="' + cat + '" onclick="filtrarCategoria(\'' + cat + '\', this)">' + cat + '</button>';
    });

    container.innerHTML = html;
}

function filtrarCategoria(categoria, btn) {
    document.querySelectorAll('.filtro-cat').forEach(function(b) {
        b.classList.remove('active');
    });
    btn.classList.add('active');

    if (categoria === 'todas') {
        renderProductos(todosProductos);
    } else {
        var filtrados = todosProductos.filter(function(p) {
            return p.categoria && p.categoria.nombre === categoria;
        });
        renderProductos(filtrados);
    }
}

function buscarProductos() {
    var texto = document.getElementById('buscar-producto').value.toLowerCase().trim();

    if (!texto) {
        renderProductos(todosProductos);
        return;
    }

    var filtrados = todosProductos.filter(function(p) {
        return p.nombre.toLowerCase().includes(texto) ||
               (p.codigo_barras && p.codigo_barras.includes(texto));
    });

    renderProductos(filtrados);
}

async function buscarBarcode() {
    var texto = document.getElementById('buscar-producto').value.trim();
    if (!texto) {
        alert('Escribe un codigo de barras primero');
        return;
    }

    try {
        var res = await apiFetch('/api/barcode/' + texto);
        if (!res) return;
        var data = await res.json();

        if (data.encontrado) {
            alert('Producto encontrado: ' + data.sugerencia.nombre + ' (' + data.sugerencia.marca + ')');
        } else {
            alert('Producto no encontrado en la base de datos externa');
        }
    } catch (err) {
        alert('Error al buscar codigo de barras');
    }
}

function renderProductos(productos) {
    var container = document.getElementById('grid-productos');

    if (!productos || productos.length === 0) {
        container.innerHTML = '<div class="col-12 text-center" style="padding:40px;color:var(--vs-gray)">' +
            '<i class="bi bi-search" style="font-size:32px"></i>' +
            '<p style="margin:8px 0 0;font-size:13px">No se encontraron productos</p></div>';
        return;
    }

    var html = '';
    productos.forEach(function(p) {
        var stockClase = p.stock_bajo ? 'stock-bajo' : '';
        var stockTexto = p.stock_bajo ? 'bajo' : '';

        html += '<div class="col-6 col-md-4 col-xl-3">' +
            '<div class="producto-card ' + stockClase + '" onclick="agregarAlCarrito(' + p.id + ')">' +
            '<p class="producto-nombre">' + p.nombre + '</p>' +
            '<p class="producto-precio">' + formatMoney(p.precio) + '</p>' +
            '<p class="producto-stock ' + stockTexto + '">Stock: ' + p.stock + '</p>' +
            '</div></div>';
    });

    container.innerHTML = html;
}

function agregarAlCarrito(productoId) {
    var producto = todosProductos.find(function(p) { return p.id === productoId; });
    if (!producto) return;

    var itemExistente = carrito.find(function(item) { return item.id === productoId; });

    if (itemExistente) {
        if (itemExistente.cantidad >= producto.stock) {
            alert('No hay suficiente stock de ' + producto.nombre);
            return;
        }
        itemExistente.cantidad++;
    } else {
        if (producto.stock <= 0) {
            alert('Producto sin stock: ' + producto.nombre);
            return;
        }
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1,
            stock: producto.stock
        });
    }

    renderCarrito();
}

function cambiarCantidad(productoId, cambio) {
    var item = carrito.find(function(i) { return i.id === productoId; });
    if (!item) return;

    var nuevaCantidad = item.cantidad + cambio;

    if (nuevaCantidad <= 0) {
        quitarDelCarrito(productoId);
        return;
    }

    if (nuevaCantidad > item.stock) {
        alert('Stock insuficiente. Disponible: ' + item.stock);
        return;
    }

    item.cantidad = nuevaCantidad;
    renderCarrito();
}

function quitarDelCarrito(productoId) {
    carrito = carrito.filter(function(i) { return i.id !== productoId; });
    renderCarrito();
}

function vaciarCarrito() {
    if (carrito.length === 0) return;
    if (!confirm('Vaciar el carrito?')) return;
    carrito = [];
    renderCarrito();
}

function renderCarrito() {
    var container = document.getElementById('carrito-items');
    var countEl = document.getElementById('carrito-count');
    var subtotalEl = document.getElementById('carrito-subtotal');
    var totalEl = document.getElementById('carrito-total');
    var usdEl = document.getElementById('carrito-usd');
    var btnCobrar = document.getElementById('btn-cobrar');

    if (carrito.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--vs-gray-light);font-size:13px;padding:30px 0">Agrega productos al carrito</p>';
        countEl.textContent = '0 items';
        subtotalEl.textContent = '$0.00';
        totalEl.textContent = '$0.00';
        usdEl.textContent = '';
        btnCobrar.disabled = true;
        return;
    }

    var total = 0;
    var totalItems = 0;
    var html = '';

    carrito.forEach(function(item) {
        var subtotal = item.precio * item.cantidad;
        total += subtotal;
        totalItems += item.cantidad;

        html += '<div class="carrito-item">' +
            '<div class="carrito-item-qty">' +
            '<button onclick="cambiarCantidad(' + item.id + ', -1)">-</button>' +
            '<span>' + item.cantidad + '</span>' +
            '<button onclick="cambiarCantidad(' + item.id + ', 1)">+</button>' +
            '</div>' +
            '<div class="carrito-item-info">' +
            '<p class="carrito-item-nombre">' + item.nombre + '</p>' +
            '<p class="carrito-item-precio">' + formatMoney(item.precio) + ' c/u</p>' +
            '</div>' +
            '<span class="carrito-item-subtotal">' + formatMoney(subtotal) + '</span>' +
            '<button class="carrito-item-remove" onclick="quitarDelCarrito(' + item.id + ')">' +
            '<i class="bi bi-x"></i></button>' +
            '</div>';
    });

    container.innerHTML = html;
    countEl.textContent = totalItems + ' item' + (totalItems > 1 ? 's' : '');
    subtotalEl.textContent = formatMoney(total);
    totalEl.textContent = formatMoney(total);
    btnCobrar.disabled = false;

    if (tasaUSD) {
        usdEl.textContent = 'USD $' + (total * tasaUSD).toFixed(2);
    }
}

function seleccionarMetodo(metodo, btn) {
    metodoPago = metodo;
    document.querySelectorAll('.metodo-btn').forEach(function(b) {
        b.classList.remove('active');
    });
    btn.classList.add('active');
}

async function procesarVenta() {
    if (carrito.length === 0) return;

    var btnCobrar = document.getElementById('btn-cobrar');
    btnCobrar.disabled = true;
    btnCobrar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando...';

    var productos = carrito.map(function(item) {
        return {
            producto_id: item.id,
            cantidad: item.cantidad
        };
    });

    try {
        var res = await apiFetch('/api/ventas', {
            method: 'POST',
            body: JSON.stringify({
                metodo_pago: metodoPago,
                productos: productos
            })
        });

        var data = await res.json();

        if (!res.ok) {
            alert('Error: ' + (data.error || 'No se pudo procesar la venta'));
            return;
        }

        document.getElementById('venta-ticket-id').textContent = String(data.venta.id).padStart(3, '0');
        document.getElementById('venta-total-final').textContent = formatMoney(data.venta.total);
        ultimaVenta = data.venta;

        var modal = new bootstrap.Modal(document.getElementById('modal-venta-exitosa'));
        modal.show();

        carrito = [];
        renderCarrito();
        cargarProductos();

    } catch (err) {
        alert('Error de conexion con el servidor');
    } finally {
        btnCobrar.disabled = false;
        btnCobrar.innerHTML = '<i class="bi bi-check-circle"></i> Cobrar';
    }
}

function cerrarModalVenta() {
    var modal = bootstrap.Modal.getInstance(document.getElementById('modal-venta-exitosa'));
    if (modal) modal.hide();
}

async function cargarTasaUSD() {
    try {
        var res = await apiFetch('/api/exchange/rates');
        if (!res) return;
        var data = await res.json();
        tasaUSD = data.tasas.USD;
    } catch (err) {
        console.error('Error cargando tasa USD:', err);
    }
}

function descargarTicketPDF() {
    if (!ultimaVenta) return;

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200]
    });

    var v = ultimaVenta;
    var y = 10;

    /* Encabezado */
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

    /* Linea divisora */
    doc.setDrawColor(200);
    doc.line(5, y, 75, y);
    y += 5;

    /* Info del ticket */
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

    /* Linea divisora */
    doc.line(5, y, 75, y);
    y += 5;

    /* Encabezado de productos */
    doc.setFont('helvetica', 'bold');
    doc.text('Producto', 5, y);
    doc.text('Cant', 45, y);
    doc.text('Subtotal', 75, y, { align: 'right' });
    y += 4;

    doc.setFont('helvetica', 'normal');

    /* Productos */
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

    /* Linea divisora */
    y += 1;
    doc.line(5, y, 75, y);
    y += 5;

    /* Total */
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 5, y);
    doc.text('$' + v.total.toFixed(2), 75, y, { align: 'right' });
    y += 8;

    /* Pie */
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Gracias por su compra!', 40, y, { align: 'center' });
    y += 3;
    doc.text('VisualShop - UTNG 2026', 40, y, { align: 'center' });

    /* Descargar */
    doc.save('ticket_' + String(v.id).padStart(3, '0') + '.pdf');
}

function enviarWhatsApp() {
    if (!ultimaVenta) return;

    var v = ultimaVenta;
    var mensaje = '*VisualShop - Ticket #' + String(v.id).padStart(3, '0') + '*\n\n';

    if (v.detalles) {
        v.detalles.forEach(function(d) {
            mensaje += d.cantidad + 'x ' + d.producto + ' - $' + d.subtotal.toFixed(2) + '\n';
        });
    }

    mensaje += '\n*Total: $' + v.total.toFixed(2) + '*\n';
    mensaje += 'Metodo: ' + v.metodo_pago + '\n';

    var fecha = new Date(v.fecha);
    mensaje += 'Fecha: ' + fecha.toLocaleDateString('es-MX') + ' ' +
        fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + '\n';
    mensaje += '\nGracias por su compra!';

    var url = 'https://wa.me/?text=' + encodeURIComponent(mensaje);
    window.open(url, '_blank');
}

function enviarCorreo() {
    if (!ultimaVenta) return;

    var email = prompt('Ingresa el correo del cliente:');
    if (!email) return;

    enviarTicketPorCorreo(ultimaVenta.id, email);
}

async function enviarTicketPorCorreo(ventaId, email) {
    try {
        var res = await apiFetch('/api/email/ticket', {
            method: 'POST',
            body: JSON.stringify({
                venta_id: ventaId,
                email: email
            })
        });

        var data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Error al enviar correo');
            return;
        }

        alert('Ticket enviado a ' + email);
    } catch (err) {
        alert('Error de conexion al enviar correo');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();
    cargarTasaUSD();
});