async function cargarUsuarios() {
    try {
        var res = await apiFetch('/api/auth/me');
        if (!res) return;
        var data = await res.json();

        if (data.usuario.rol !== 'admin') {
            document.getElementById('tabla-usuarios').innerHTML =
                '<tr><td colspan="6" style="text-align:center;color:#991b1b;padding:30px">No tienes permisos para ver esta seccion</td></tr>';
            return;
        }

        var resUsers = await apiFetch('/api/auth/usuarios');
        if (!resUsers) return;

        var usuarios = await resUsers.json();
        renderTablaUsuarios(usuarios);
    } catch (err) {
        console.error('Error:', err);
    }
}

function renderTablaUsuarios(usuarios) {
    var tbody = document.getElementById('tabla-usuarios');

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--vs-gray);padding:30px">No hay usuarios</td></tr>';
        return;
    }

    var lista = Array.isArray(usuarios) ? usuarios : [usuarios];
    var miUsuario = JSON.parse(localStorage.getItem('usuario'));

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

        var esSelf = miUsuario && miUsuario.id === u.id;

        var acciones = '<button class="btn btn-sm" style="border:1px solid #e5e7eb;border-radius:6px;font-size:11px;color:var(--vs-navy);margin-right:4px" onclick="abrirModalEditar(' + u.id + ')" title="Editar"><i class="bi bi-pencil"></i></button>' +
            '<button class="btn btn-sm" style="border:1px solid #e5e7eb;border-radius:6px;font-size:11px;color:var(--vs-navy);margin-right:4px" onclick="abrirModalResetPassword(' + u.id + ', \'' + u.nombre.replace(/'/g, "\\'") + '\')" title="Cambiar contrasena"><i class="bi bi-key"></i></button>';

        if (!esSelf) {
            var toggleIcon = u.activo ? 'bi-person-slash' : 'bi-person-check';
            var toggleColor = u.activo ? 'color:#991b1b;border:1px solid #fecaca' : 'color:#166534;border:1px solid #bbf7d0';
            var toggleTitle = u.activo ? 'Desactivar' : 'Activar';
            acciones += '<button class="btn btn-sm" style="border-radius:6px;font-size:11px;' + toggleColor + '" onclick="toggleUsuario(' + u.id + ', \'' + u.nombre.replace(/'/g, "\\'") + '\', ' + u.activo + ')" title="' + toggleTitle + '"><i class="bi ' + toggleIcon + '"></i></button>';
        }

        html += '<tr>' +
            '<td><div class="d-flex align-items-center gap-2">' +
            '<div style="width:32px;height:32px;border-radius:50%;background:var(--vs-lavender);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:var(--vs-navy)">' + iniciales + '</div>' +
            '<span style="font-weight:500">' + u.nombre + '</span></div></td>' +
            '<td style="font-size:12px">' + u.email + '</td>' +
            '<td><span class="badge-vs" style="' + rolColor + '">' + u.rol + '</span></td>' +
            '<td>' + estadoBadge + '</td>' +
            '<td class="hide-mobile" style="font-size:12px;color:var(--vs-gray)">' + fechaStr + '</td>' +
            '<td>' + acciones + '</td>' +
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

function abrirModalEditar(id) {
    apiFetch('/api/auth/usuarios').then(function(res) {
        return res.json();
    }).then(function(usuarios) {
        var u = usuarios.find(function(usr) { return usr.id === id; });
        if (!u) return;

        document.getElementById('editar-usuario-id').value = u.id;
        document.getElementById('editar-usuario-nombre').value = u.nombre;
        document.getElementById('editar-usuario-email').value = u.email;
        document.getElementById('editar-usuario-rol').value = u.rol;

        var alertEl = document.getElementById('editar-usuario-alert');
        if (alertEl) alertEl.style.display = 'none';

        var modal = new bootstrap.Modal(document.getElementById('modal-editar-usuario'));
        modal.show();
    });
}

async function guardarEdicionUsuario() {
    var id = document.getElementById('editar-usuario-id').value;
    var nombre = document.getElementById('editar-usuario-nombre').value.trim();
    var email = document.getElementById('editar-usuario-email').value.trim();
    var rol = document.getElementById('editar-usuario-rol').value;
    var alertEl = document.getElementById('editar-usuario-alert');

    if (!nombre || !email) {
        alertEl.textContent = 'Nombre y email son obligatorios';
        alertEl.className = 'alert-vs mb-3';
        alertEl.style.display = 'block';
        return;
    }

    try {
        var res = await apiFetch('/api/auth/editar-usuario/' + id, {
            method: 'PUT',
            body: JSON.stringify({ nombre: nombre, email: email, rol: rol })
        });

        var data = await res.json();

        if (!res.ok) {
            alertEl.textContent = data.error || 'Error al editar';
            alertEl.className = 'alert-vs mb-3';
            alertEl.style.display = 'block';
            return;
        }

        var modal = bootstrap.Modal.getInstance(document.getElementById('modal-editar-usuario'));
        modal.hide();
        cargarUsuarios();
    } catch (err) {
        alertEl.textContent = 'Error de conexion';
        alertEl.className = 'alert-vs mb-3';
        alertEl.style.display = 'block';
    }
}

function abrirModalResetPassword(id, nombre) {
    document.getElementById('reset-usuario-id').value = id;
    document.getElementById('reset-usuario-nombre').textContent = nombre;
    document.getElementById('reset-password-nueva').value = '';

    var alertEl = document.getElementById('reset-password-alert');
    if (alertEl) alertEl.style.display = 'none';

    var modal = new bootstrap.Modal(document.getElementById('modal-reset-password'));
    modal.show();
}

async function guardarResetPassword() {
    var id = document.getElementById('reset-usuario-id').value;
    var password = document.getElementById('reset-password-nueva').value;
    var alertEl = document.getElementById('reset-password-alert');

    if (!password) {
        alertEl.textContent = 'Escribe la nueva contrasena';
        alertEl.className = 'alert-vs mb-3';
        alertEl.style.display = 'block';
        return;
    }

    try {
        var res = await apiFetch('/api/auth/reset-password', {
            method: 'PUT',
            body: JSON.stringify({ usuario_id: parseInt(id), password_nueva: password })
        });

        var data = await res.json();

        if (!res.ok) {
            alertEl.textContent = data.error || 'Error al cambiar contrasena';
            alertEl.className = 'alert-vs mb-3';
            alertEl.style.display = 'block';
            return;
        }

        alertEl.textContent = data.mensaje;
        alertEl.className = 'alert-vs success mb-3';
        alertEl.style.display = 'block';

        document.getElementById('reset-password-nueva').value = '';
    } catch (err) {
        alertEl.textContent = 'Error de conexion';
        alertEl.className = 'alert-vs mb-3';
        alertEl.style.display = 'block';
    }
}

async function toggleUsuario(id, nombre, activo) {
    var accion = activo ? 'desactivar' : 'activar';
    if (!confirm(accion.charAt(0).toUpperCase() + accion.slice(1) + ' a "' + nombre + '"?')) return;

    try {
        var res = await apiFetch('/api/auth/desactivar-usuario/' + id, { method: 'PUT' });
        var data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Error');
            return;
        }

        cargarUsuarios();
    } catch (err) {
        alert('Error de conexion');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    cargarUsuarios();
});