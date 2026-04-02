/* Verificar autenticacion */
function checkAuth() {
    var token = localStorage.getItem('access_token');
    var usuario = localStorage.getItem('usuario');

    if (!token || !usuario) {
        window.location.href = '/';
        return null;
    }

    renovarToken();
    return JSON.parse(usuario);
}

async function renovarToken() {
    var refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return;

    try {
        var res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + refreshToken,
                'Content-Type': 'application/json'
            }
        });

        if (res.ok) {
            var data = await res.json();
            localStorage.setItem('access_token', data.access_token);
        }
    } catch (err) {
        /* Si falla la renovacion, el usuario sigue con su token actual */
    }
}

/* Cargar datos del usuario en el sidebar */
function loadUserInfo() {
    var usuario = checkAuth();
    if (!usuario) return;

    var nombre = usuario.nombre || 'Usuario';
    var iniciales = nombre.split(' ').map(function(n) { return n[0]; }).join('').substring(0, 2).toUpperCase();

    document.getElementById('user-avatar').textContent = iniciales;
    document.getElementById('user-name').textContent = nombre;
    document.getElementById('user-role').textContent = usuario.rol;

    /* Ocultar menus segun el rol */
    var rol = usuario.rol;

    var navDashboard = document.querySelector('a[href="/dashboard"]');
    var navPos = document.querySelector('a[href="/pos"]');
    var navProductos = document.querySelector('a[href="/productos"]');
    var navVentas = document.querySelector('a[href="/ventas"]');
    var navUsuarios = document.getElementById('nav-usuarios');

    if (rol === 'cajero') {
        if (navDashboard) navDashboard.style.display = 'none';
        if (navProductos) navProductos.style.display = 'none';
        if (navVentas) navVentas.style.display = 'none';
        if (navUsuarios) navUsuarios.style.display = 'none';
    } else if (rol === 'supervisor') {
        if (navUsuarios) navUsuarios.style.display = 'none';
    } else if (rol === 'admin') {
        /* Admin ve todo */
    }
}

/* Toggle sidebar en mobile */
function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
}

/* Cerrar sesion */
function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usuario');
    window.location.href = '/';
}

/* Hacer peticiones autenticadas a la API */
async function apiFetch(url, options) {
    var token = localStorage.getItem('access_token');

    if (!options) options = {};
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = 'Bearer ' + token;
    options.headers['Content-Type'] = 'application/json';

    var res = await fetch(url, options);

    if (res.status === 401) {
        handleLogout();
        return null;
    }

    return res;
}

/* Formatear dinero */
function formatMoney(amount) {
    return '$' + Number(amount).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function verificarAccesoPagina() {
    var usuario = JSON.parse(localStorage.getItem('usuario'));
    if (!usuario) return;

    var ruta = window.location.pathname;
    var rol = usuario.rol;

    if (rol === 'cajero') {
        if (ruta === '/dashboard' || ruta === '/productos' || ruta === '/ventas' || ruta === '/usuarios') {
            window.location.href = '/pos';
        }
    } else if (rol === 'supervisor') {
        if (ruta === '/usuarios') {
            window.location.href = '/dashboard';
        }
    }
}

/* Cargar info al abrir la pagina */
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
    verificarAccesoPagina();
});