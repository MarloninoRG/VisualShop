async function cargarUsuarios() {
    try {
        var res = await apiFetch('/api/auth/me');
        if (!res) return;
        var data = await res.json();

        if (data.usuario.rol !== 'admin') {
            document.getElementById('tabla-usuarios').innerHTML =
                '<tr><td colspan="5" style="text-align:center;color:#991b1b;padding:30px">No tienes permisos para ver esta seccion</td></tr>';
            return;
        }

        var resUsers = await apiFetch('/api/auth/usuarios');
        if (!resUsers || resUsers.status === 404) {
            cargarUsuariosFallback();
            return;
        }

        var usuarios = await resUsers.json();
        renderTablaUsuarios(usuarios);
    } catch (err) {
        cargarUsuariosFallback();
    }
}

async function cargarUsuariosFallback() {
    try {
        var res = await apiFetch('/api/auth/me');
        if (!res) return;
        var data = await res.json();
        renderTablaUsuarios([data.usuario]);
    } catch (err) {
        console.error('Error:', err);
    }
}

function renderTablaUsuarios(usuarios) {
    var tbody = document.getElementById('tabla-usuarios');

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--vs-gray);padding:30px">No hay usuarios</td></tr>';
        return;
    }

    var lista = Array.isArray(usuarios) ? usuarios : [usuarios];

    var html = '';
    lista.forEach(function(u) {
        var iniciales = u.nombre.split(' ').map(function(n) { return n[0]; }).join('').substring(0, 2).toUpperCase();

        var fecha = new Date(u.creado_en);
        var fechaStr = fecha.toLocaleDateString('es-MX');

        var rolColor = u.rol === 'admin' ? 'background:#FAECE7;color:#712B13'
            : u.rol === 'supervisor' ? 'background:#FAEEDA;color:#633806'
            : 'background:#E1F5EE;color:#085041';

        var estadoBadge = u.activo
            ? '<span class="badge-vs" style="background:#f0fdf4;color:#166534">Activo</span>'
            : '<span class="badge-vs badge-stock-bajo">Inactivo</span>';

        html += '<tr>' +
            '<td><div class="d-flex align-items-center gap-2">' +
            '<div style="width:32px;height:32px;border-radius:50%;background:var(--vs-lavender);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:var(--vs-navy)">' + iniciales + '</div>' +
            '<span style="font-weight:500">' + u.nombre + '</span></div></td>' +
            '<td style="font-size:12px">' + u.email + '</td>' +
            '<td><span class="badge-vs" style="' + rolColor + '">' + u.rol + '</span></td>' +
            '<td>' + estadoBadge + '</td>' +
            '<td style="font-size:12px;color:var(--vs-gray)">' + fechaStr + '</td>' +
            '</tr>';
    });

    tbody.innerHTML = html;
}

function abrirModalUsuario() {
    document.getElementById('usuario-nombre').value = '';
    document.getElementById('usuario-email').value = '';
    document.getElementById('usuario-password').value = '';
    document.getElementById('usuario-rol').value = 'cajero';

    var alertEl = document.getElementById('usuario-alert');
    alertEl.style.display = 'none';

    var modal = new bootstrap.Modal(document.getElementById('modal-usuario'));
    modal.show();
}

async function guardarUsuario() {
    var nombre = document.getElementById('usuario-nombre').value.trim();
    var email = document.getElementById('usuario-email').value.trim();
    var password = document.getElementById('usuario-password').value;
    var rol = document.getElementById('usuario-rol').value;
    var alertEl = document.getElementById('usuario-alert');

    if (!nombre || !email) {
        alertEl.textContent = 'Nombre y email son obligatorios';
        alertEl.className = 'alert-vs mb-3';
        alertEl.style.display = 'block';
        return;
    }

    var datos = {
        nombre: nombre,
        email: email,
        rol: rol
    };

    if (password) {
        datos.password = password;
    }

    var btn = document.getElementById('btn-guardar-usuario');
    btn.disabled = true;
    btn.textContent = 'Registrando...';

    try {
        var res = await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(datos)
        });

        var data = await res.json();

        if (!res.ok) {
            alertEl.textContent = data.error || 'Error al registrar';
            alertEl.className = 'alert-vs mb-3';
            alertEl.style.display = 'block';
            return;
        }

        var modal = bootstrap.Modal.getInstance(document.getElementById('modal-usuario'));
        modal.hide();
        cargarUsuarios();

    } catch (err) {
        alertEl.textContent = 'Error de conexion';
        alertEl.className = 'alert-vs mb-3';
        alertEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Registrar';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    cargarUsuarios();
});