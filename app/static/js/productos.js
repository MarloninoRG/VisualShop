var listaProductos = [];
var listaCategorias = [];

async function cargarTodo() {
    await cargarCategorias();
    await cargarListaProductos();
}

async function cargarCategorias() {
    try {
        var res = await apiFetch('/api/categorias');
        if (!res) return;
        listaCategorias = await res.json();

        var selectFiltro = document.getElementById('filtro-categoria');
        var selectForm = document.getElementById('producto-categoria');

        var opcionesFiltro = '<option value="">Todas las categorias</option>';
        var opcionesForm = '<option value="">Sin categoria</option>';

        listaCategorias.forEach(function(c) {
            opcionesFiltro += '<option value="' + c.id + '">' + c.nombre + '</option>';
            opcionesForm += '<option value="' + c.id + '">' + c.nombre + '</option>';
        });

        selectFiltro.innerHTML = opcionesFiltro;
        selectForm.innerHTML = opcionesForm;
    } catch (err) {
        console.error('Error cargando categorias:', err);
    }
}

async function cargarListaProductos() {
    try {
        var res = await apiFetch('/api/productos');
        if (!res) return;
        listaProductos = await res.json();
        renderTabla(listaProductos);
    } catch (err) {
        console.error('Error cargando productos:', err);
    }
}

function filtrarProductos() {
    var texto = document.getElementById('buscar-prod').value.toLowerCase().trim();
    var catId = document.getElementById('filtro-categoria').value;

    var filtrados = listaProductos.filter(function(p) {
        var coincideTexto = !texto || p.nombre.toLowerCase().includes(texto);
        var coincideCat = !catId || (p.categoria && p.categoria.id === parseInt(catId));
        return coincideTexto && coincideCat;
    });

    renderTabla(filtrados);
}

var filtrandoStockBajo = false;

function toggleStockBajo() {
    var btn = document.getElementById('btn-stock-bajo');

    if (filtrandoStockBajo) {
        filtrandoStockBajo = false;
        btn.style.background = 'var(--vs-lavender)';
        btn.style.color = 'var(--vs-navy)';
        btn.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Stock bajo';
        renderTabla(listaProductos);
    } else {
        filtrandoStockBajo = true;
        btn.style.background = '#fef2f2';
        btn.style.color = '#991b1b';
        btn.innerHTML = '<i class="bi bi-x"></i> Quitar filtro';
        var filtrados = listaProductos.filter(function(p) {
            return p.stock_bajo;
        });
        renderTabla(filtrados);
    }

    document.getElementById('buscar-prod').value = '';
    document.getElementById('filtro-categoria').value = '';
}

function renderTabla(productos) {
    var tbody = document.getElementById('tabla-productos');

    if (!productos || productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--vs-gray);padding:30px">No se encontraron productos</td></tr>';
        return;
    }

    var usuario = JSON.parse(localStorage.getItem('usuario'));
    var esAdmin = usuario && (usuario.rol === 'admin' || usuario.rol === 'supervisor');

    var html = '';
    productos.forEach(function(p) {
        var estadoBadge = p.stock_bajo
            ? '<span class="badge-vs badge-stock-bajo">Stock bajo</span>'
            : '<span class="badge-vs" style="background:#f0fdf4;color:#166534">Normal</span>';

        var acciones = '';
        if (esAdmin) {
            acciones = '<button class="btn btn-sm" style="border:1px solid #e5e7eb;border-radius:6px;font-size:11px;color:var(--vs-navy);margin-right:4px" onclick="abrirModalStock(' + p.id + ', \'' + p.nombre.replace(/'/g, "\\'") + '\')">' +
                '<i class="bi bi-box-seam"></i></button>' +
                '<button class="btn btn-sm" style="border:1px solid #e5e7eb;border-radius:6px;font-size:11px;color:var(--vs-navy);margin-right:4px" onclick="editarProducto(' + p.id + ')">' +
                '<i class="bi bi-pencil"></i></button>' +
                '<button class="btn btn-sm" style="border:1px solid #fecaca;border-radius:6px;font-size:11px;color:#991b1b" onclick="eliminarProducto(' + p.id + ', \'' + p.nombre.replace(/'/g, "\\'") + '\')">' +
                '<i class="bi bi-trash3"></i></button>';
        }

        html += '<tr>' +
            '<td><div><span style="font-weight:500">' + p.nombre + '</span>' +
            (p.codigo_barras ? '<br><span style="font-size:11px;color:var(--vs-gray)">' + p.codigo_barras + '</span>' : '') +
            '</div></td>' +
            '<td class="hide-mobile">' + (p.categoria ? p.categoria.nombre : '<span style="color:var(--vs-gray-light)">--</span>') + '</td>' +
            '<td style="font-weight:500">' + formatMoney(p.precio) + '</td>' +
            '<td>' + p.stock + ' <span style="font-size:11px;color:var(--vs-gray)">(min: ' + p.stock_minimo + ')</span></td>' +
            '<td class="hide-mobile">' + estadoBadge + '</td>' +
            '<td>' + acciones + '</td>' +
            '</tr>';
    });

    tbody.innerHTML = html;
}

function abrirModalProducto() {
    document.getElementById('modal-producto-titulo').textContent = 'Nuevo producto';
    document.getElementById('producto-id').value = '';
    document.getElementById('producto-nombre').value = '';
    document.getElementById('producto-precio').value = '';
    document.getElementById('producto-stock').value = '0';
    document.getElementById('producto-stock-minimo').value = '5';
    document.getElementById('producto-barcode').value = '';
    document.getElementById('producto-descripcion').value = '';
    document.getElementById('producto-categoria').value = '';

    var alertEl = document.getElementById('producto-alert');
    alertEl.style.display = 'none';

    var barcodeAlert = document.getElementById('barcode-search-alert');
    if (barcodeAlert) barcodeAlert.style.display = 'none';

    var modal = new bootstrap.Modal(document.getElementById('modal-producto'));
    modal.show();
}

function editarProducto(id) {
    var producto = listaProductos.find(function(p) { return p.id === id; });
    if (!producto) return;

    document.getElementById('modal-producto-titulo').textContent = 'Editar producto';
    document.getElementById('producto-id').value = producto.id;
    document.getElementById('producto-nombre').value = producto.nombre;
    document.getElementById('producto-precio').value = producto.precio;
    document.getElementById('producto-stock').value = producto.stock;
    document.getElementById('producto-stock-minimo').value = producto.stock_minimo;
    document.getElementById('producto-barcode').value = producto.codigo_barras || '';
    document.getElementById('producto-descripcion').value = producto.descripcion || '';
    document.getElementById('producto-categoria').value = producto.categoria ? producto.categoria.id : '';

    var alertEl = document.getElementById('producto-alert');
    alertEl.style.display = 'none';

    var modal = new bootstrap.Modal(document.getElementById('modal-producto'));
    modal.show();
}

async function guardarProducto() {
    var id = document.getElementById('producto-id').value;
    var nombre = document.getElementById('producto-nombre').value.trim();
    var precio = parseFloat(document.getElementById('producto-precio').value);
    var alertEl = document.getElementById('producto-alert');

    if (!nombre || isNaN(precio)) {
        alertEl.textContent = 'Nombre y precio son obligatorios';
        alertEl.className = 'alert-vs mb-3';
        alertEl.style.display = 'block';
        return;
    }

    var datos = {
        nombre: nombre,
        precio: precio,
        stock: parseInt(document.getElementById('producto-stock').value) || 0,
        stock_minimo: parseInt(document.getElementById('producto-stock-minimo').value) || 5,
        codigo_barras: document.getElementById('producto-barcode').value.trim() || null,
        descripcion: document.getElementById('producto-descripcion').value.trim(),
        categoria_id: document.getElementById('producto-categoria').value || null
    };

    if (datos.categoria_id) {
        datos.categoria_id = parseInt(datos.categoria_id);
    }

    var btn = document.getElementById('btn-guardar-producto');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        var url = id ? '/api/productos/' + id : '/api/productos';
        var method = id ? 'PUT' : 'POST';

        var res = await apiFetch(url, {
            method: method,
            body: JSON.stringify(datos)
        });

        var data = await res.json();

        if (!res.ok) {
            alertEl.textContent = data.error || 'Error al guardar';
            alertEl.className = 'alert-vs mb-3';
            alertEl.style.display = 'block';
            return;
        }

        var modal = bootstrap.Modal.getInstance(document.getElementById('modal-producto'));
        modal.hide();
        cargarListaProductos();

    } catch (err) {
        alertEl.textContent = 'Error de conexion';
        alertEl.className = 'alert-vs mb-3';
        alertEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar';
    }
}

async function eliminarProducto(id, nombre) {
    if (!confirm('Eliminar "' + nombre + '"? Esta accion no se puede deshacer.')) return;

    try {
        var res = await apiFetch('/api/productos/' + id, { method: 'DELETE' });
        if (!res) return;
        var data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Error al eliminar');
            return;
        }

        cargarListaProductos();
    } catch (err) {
        alert('Error de conexion');
    }
}

function abrirModalStock(id, nombre) {
    document.getElementById('stock-producto-id').value = id;
    document.getElementById('stock-producto-nombre').textContent = nombre;
    document.getElementById('stock-cantidad').value = 1;

    var modal = new bootstrap.Modal(document.getElementById('modal-stock'));
    modal.show();
}

async function ajustarStock(operacion) {
    var id = document.getElementById('stock-producto-id').value;
    var cantidad = parseInt(document.getElementById('stock-cantidad').value);

    if (!cantidad || cantidad <= 0) {
        alert('Ingresa una cantidad valida');
        return;
    }

    try {
        var res = await apiFetch('/api/productos/' + id + '/ajustar-stock', {
            method: 'PUT',
            body: JSON.stringify({
                cantidad: cantidad,
                operacion: operacion
            })
        });

        var data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Error al ajustar stock');
            return;
        }

        if (data.alerta) {
            alert(data.alerta);
        }

        var modal = bootstrap.Modal.getInstance(document.getElementById('modal-stock'));
        modal.hide();
        cargarListaProductos();

    } catch (err) {
        alert('Error de conexion');
    }
}

async function buscarBarcodeDesdeMod() {
    var codigo = document.getElementById('producto-barcode').value.trim();
    var alertEl = document.getElementById('barcode-search-alert');

    if (!codigo) {
        alertEl.textContent = 'Escribe un codigo de barras';
        alertEl.className = 'alert-vs mb-3';
        alertEl.style.display = 'block';
        return;
    }

    var btn = document.getElementById('btn-buscar-barcode');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        var res = await apiFetch('/api/barcode/' + codigo);
        if (!res) return;
        var data = await res.json();

        if (data.encontrado) {
            document.getElementById('producto-nombre').value = data.sugerencia.nombre || '';
            document.getElementById('producto-descripcion').value = data.sugerencia.descripcion || data.sugerencia.marca || '';

            alertEl.textContent = 'Producto encontrado: ' + (data.sugerencia.nombre || 'Sin nombre') + ' (' + (data.sugerencia.marca || 'Sin marca') + ')';
            alertEl.className = 'alert-vs success mb-3';
            alertEl.style.display = 'block';
        } else {
            alertEl.textContent = 'No se encontro en la base de datos externa. Llena los campos manualmente.';
            alertEl.className = 'alert-vs mb-3';
            alertEl.style.display = 'block';
        }
    } catch (err) {
        alertEl.textContent = 'Error al buscar codigo de barras';
        alertEl.className = 'alert-vs mb-3';
        alertEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-search"></i>';
    }
}

function abrirModalCategoria() {
    document.getElementById('nueva-categoria-nombre').value = '';
    var alertEl = document.getElementById('categoria-alert');
    if (alertEl) alertEl.style.display = 'none';

    renderListaCategorias();

    var modal = new bootstrap.Modal(document.getElementById('modal-categorias'));
    modal.show();
}

function renderListaCategorias() {
    var container = document.getElementById('lista-categorias');

    if (!listaCategorias || listaCategorias.length === 0) {
        container.innerHTML = '<p style="font-size:13px;color:var(--vs-gray);text-align:center">No hay categorias creadas</p>';
        return;
    }

    var html = '';
    listaCategorias.forEach(function(c) {
        var numProductos = listaProductos.filter(function(p) {
            return p.categoria && p.categoria.id === c.id;
        }).length;

        html += '<div class="d-flex justify-content-between align-items-center" style="padding:8px 0;border-bottom:1px solid #f3f4f6">' +
            '<div>' +
            '<span style="font-size:13px;font-weight:500;color:var(--vs-navy)">' + c.nombre + '</span>' +
            '<span style="font-size:11px;color:var(--vs-gray);margin-left:8px">' + numProductos + ' producto' + (numProductos !== 1 ? 's' : '') + '</span>' +
            '</div>' +
            '<button class="btn btn-sm" style="border:1px solid #fecaca;border-radius:6px;font-size:11px;color:#991b1b" onclick="eliminarCategoria(' + c.id + ', \'' + c.nombre.replace(/'/g, "\\'") + '\')">' +
            '<i class="bi bi-trash3"></i></button>' +
            '</div>';
    });

    container.innerHTML = html;
}

async function crearCategoria() {
    var nombre = document.getElementById('nueva-categoria-nombre').value.trim();
    var alertEl = document.getElementById('categoria-alert');

    if (!nombre) {
        alertEl.textContent = 'Escribe un nombre para la categoria';
        alertEl.className = 'alert-vs mb-3';
        alertEl.style.display = 'block';
        return;
    }

    try {
        var res = await apiFetch('/api/categorias', {
            method: 'POST',
            body: JSON.stringify({ nombre: nombre })
        });

        var data = await res.json();

        if (!res.ok) {
            alertEl.textContent = data.error || 'Error al crear categoria';
            alertEl.className = 'alert-vs mb-3';
            alertEl.style.display = 'block';
            return;
        }

        alertEl.textContent = 'Categoria "' + nombre + '" creada';
        alertEl.className = 'alert-vs success mb-3';
        alertEl.style.display = 'block';

        document.getElementById('nueva-categoria-nombre').value = '';

        await cargarCategorias();
        renderListaCategorias();

    } catch (err) {
        alertEl.textContent = 'Error de conexion';
        alertEl.className = 'alert-vs mb-3';
        alertEl.style.display = 'block';
    }
}

async function eliminarCategoria(id, nombre) {
    if (!confirm('Eliminar la categoria "' + nombre + '"?')) return;

    try {
        var res = await apiFetch('/api/categorias/' + id, { method: 'DELETE' });
        var data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Error al eliminar');
            return;
        }

        await cargarCategorias();
        renderListaCategorias();
        cargarListaProductos();

    } catch (err) {
        alert('Error de conexion');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    cargarTodo();
});